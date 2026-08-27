using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;

namespace ChronoCordUpdater
{
    internal static class Program
    {
        internal const int MaxRedirects = 5;
        internal const int ExitWaitMilliseconds = 20000;
        internal const string ManifestUrl = "__MANIFEST_URL__";
        internal const string ReleaseRepo = "__RELEASE_REPO__";
        private const string UserAgent = "ChronoCord-Updater/1.0.3";

        private sealed class ReleaseAsset
        {
            public string name { get; set; }
            public string browser_download_url { get; set; }
            public long size { get; set; }
        }

        private sealed class ReleaseInfo
        {
            public string tag_name { get; set; }
            public string name { get; set; }
            public string body { get; set; }
            public ReleaseAsset[] assets { get; set; }
        }

        private sealed class ManifestInfo
        {
            public string product { get; set; }
            public string version { get; set; }
            public string url { get; set; }
            public string sha256 { get; set; }
            public long size { get; set; }
        }

        private sealed class UpdateInfo
        {
            public string Version;
            public string Url;
            public string Sha256;
            public long Size;
        }

        [STAThread]
        private static int Main(string[] args)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            Dictionary<string, string> options = ParseArgs(args);
            if (options.ContainsKey("smoke-test")) return SmokeTest();

            string current = GetOption(options, "current", "0.0.0");
            string appExe = GetOption(options, "app-exe", string.Empty);
            int pid = ParseInt(GetOption(options, "pid", "0"));

            try
            {
                UpdateInfo info = ResolveLatest();
                if (info == null || CompareVersions(info.Version, current) <= 0) return 0;
                if (string.IsNullOrWhiteSpace(appExe)) throw new InvalidOperationException("O caminho do ChronoCord instalado não foi informado.");

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                UpdateForm form = new UpdateForm(info.Version);
                form.Shown += delegate
                {
                    Thread worker = new Thread(delegate()
                    {
                        try
                        {
                            PerformUpdate(info, pid, appExe, form);
                            form.SafeComplete();
                        }
                        catch (Exception error)
                        {
                            form.SafeFail(error.Message);
                        }
                    });
                    worker.IsBackground = true;
                    worker.Start();
                };
                Application.Run(form);
                return form.Failed ? 2 : 0;
            }
            catch
            {
                return 1;
            }
        }

        internal static int SmokeTest()
        {
            Uri manifest;
            bool manifestOk = Uri.TryCreate(ManifestUrl, UriKind.Absolute, out manifest) && manifest.Scheme == Uri.UriSchemeHttps;
            bool releaseOk = !string.IsNullOrWhiteSpace(ReleaseRepo) && ReleaseRepo != "__RELEASE_REPO__";
            return manifestOk || releaseOk ? 0 : 3;
        }

        private static Dictionary<string, string> ParseArgs(string[] args)
        {
            Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (string raw in args ?? new string[0])
            {
                if (!raw.StartsWith("--", StringComparison.Ordinal)) continue;
                string body = raw.Substring(2);
                int split = body.IndexOf('=');
                if (split < 0) result[body] = "true";
                else result[body.Substring(0, split)] = body.Substring(split + 1);
            }
            return result;
        }

        private static string GetOption(Dictionary<string, string> options, string name, string fallback)
        {
            string value;
            return options.TryGetValue(name, out value) ? value : fallback;
        }

        private static int ParseInt(string raw)
        {
            int value;
            return int.TryParse(raw, out value) ? value : 0;
        }

        private static UpdateInfo ResolveLatest()
        {
            if (!string.IsNullOrWhiteSpace(ReleaseRepo) && ReleaseRepo != "__RELEASE_REPO__")
            {
                try { return ResolveGithubRelease(); }
                catch { }
            }
            return ResolveManifest();
        }

        private static UpdateInfo ResolveGithubRelease()
        {
            string json = RequestText("https://api.github.com/repos/" + ReleaseRepo + "/releases/latest", 0, 4 * 1024 * 1024, "application/vnd.github+json");
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = 4 * 1024 * 1024;
            ReleaseInfo release = serializer.Deserialize<ReleaseInfo>(json);
            if (release == null || release.assets == null) throw new InvalidDataException("Release inválida.");

            ReleaseAsset installer = null;
            ReleaseAsset checksum = null;
            foreach (ReleaseAsset asset in release.assets)
            {
                if (asset == null || string.IsNullOrWhiteSpace(asset.name)) continue;
                if (Regex.IsMatch(asset.name, "^ChronoCord-Installer-.*\\.exe$", RegexOptions.IgnoreCase)) installer = asset;
                if (Regex.IsMatch(asset.name, "^ChronoCord-Installer-.*\\.exe\\.sha256$", RegexOptions.IgnoreCase)) checksum = asset;
            }
            if (installer == null || checksum == null) throw new InvalidDataException("A release não contém o instalador único e seu checksum.");
            string checksumText = RequestText(checksum.browser_download_url, 0, 1024 * 1024, "text/plain");
            Match match = Regex.Match(checksumText, "[a-fA-F0-9]{64}");
            if (!match.Success) throw new InvalidDataException("Checksum SHA-256 inválido.");
            string version = Regex.Replace(release.tag_name ?? "", "^(chronocord-)?v", "", RegexOptions.IgnoreCase);
            return new UpdateInfo { Version = version, Url = installer.browser_download_url, Sha256 = match.Value.ToLowerInvariant(), Size = installer.size };
        }

        private static UpdateInfo ResolveManifest()
        {
            string json = RequestText(ManifestUrl, 0, 1024 * 1024, "application/json");
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            ManifestInfo manifest = serializer.Deserialize<ManifestInfo>(json);
            if (manifest == null || !string.Equals(manifest.product, "ChronoCord", StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Manifesto de atualização inválido.");
            EnsureHttps(manifest.url);
            if (!Regex.IsMatch(manifest.sha256 ?? "", "^[a-fA-F0-9]{64}$")) throw new InvalidDataException("Checksum do manifesto inválido.");
            return new UpdateInfo { Version = manifest.version, Url = manifest.url, Sha256 = manifest.sha256.ToLowerInvariant(), Size = manifest.size };
        }

        private static string RequestText(string url, int redirects, int maxBytes, string accept)
        {
            if (redirects > MaxRedirects) throw new InvalidOperationException("Muitos redirecionamentos.");
            Uri uri = EnsureHttps(url);
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(uri);
            request.AllowAutoRedirect = false;
            request.UserAgent = UserAgent;
            request.Accept = accept;
            request.Timeout = 15000;
            request.ReadWriteTimeout = 15000;
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                int status = (int)response.StatusCode;
                string location = response.Headers[HttpResponseHeader.Location];
                if (status >= 300 && status < 400 && !string.IsNullOrWhiteSpace(location))
                {
                    Uri next = new Uri(uri, location);
                    EnsureHttps(next.AbsoluteUri);
                    return RequestText(next.AbsoluteUri, redirects + 1, maxBytes, accept);
                }
                if (status < 200 || status >= 300) throw new WebException("HTTP " + status);
                using (Stream stream = response.GetResponseStream())
                using (MemoryStream memory = new MemoryStream())
                {
                    byte[] buffer = new byte[8192];
                    int read;
                    int total = 0;
                    while ((read = stream.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        total += read;
                        if (total > maxBytes) throw new InvalidDataException("Resposta inesperadamente grande.");
                        memory.Write(buffer, 0, read);
                    }
                    return Encoding.UTF8.GetString(memory.ToArray()).Trim();
                }
            }
        }

        private static void DownloadFile(string url, string destination, UpdateForm form, int redirects)
        {
            if (redirects > MaxRedirects) throw new InvalidOperationException("Muitos redirecionamentos ao baixar a atualização.");
            Uri uri = EnsureHttps(url);
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(uri);
            request.AllowAutoRedirect = false;
            request.UserAgent = UserAgent;
            request.Timeout = 120000;
            request.ReadWriteTimeout = 120000;
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                int status = (int)response.StatusCode;
                string location = response.Headers[HttpResponseHeader.Location];
                if (status >= 300 && status < 400 && !string.IsNullOrWhiteSpace(location))
                {
                    Uri next = new Uri(uri, location);
                    EnsureHttps(next.AbsoluteUri);
                    DownloadFile(next.AbsoluteUri, destination, form, redirects + 1);
                    return;
                }
                if (status != 200) throw new WebException("Download HTTP " + status);
                long total = response.ContentLength;
                long done = 0;
                using (Stream input = response.GetResponseStream())
                using (FileStream output = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    byte[] buffer = new byte[1024 * 1024];
                    int read;
                    while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        output.Write(buffer, 0, read);
                        done += read;
                        int percent = total > 0 ? (int)Math.Min(100, done * 100L / total) : 0;
                        form.SafeProgress(5 + (percent * 65 / 100), "Baixando atualização…");
                    }
                }
            }
        }

        private static Uri EnsureHttps(string raw)
        {
            Uri uri;
            if (!Uri.TryCreate(raw, UriKind.Absolute, out uri) || uri.Scheme != Uri.UriSchemeHttps) throw new InvalidOperationException("A atualização deve usar HTTPS.");
            return uri;
        }

        private static string Sha256File(string path)
        {
            using (SHA256 sha = SHA256.Create())
            using (FileStream stream = File.OpenRead(path))
            {
                byte[] digest = sha.ComputeHash(stream);
                StringBuilder text = new StringBuilder(digest.Length * 2);
                foreach (byte value in digest) text.Append(value.ToString("x2"));
                return text.ToString();
            }
        }

        private static void PerformUpdate(UpdateInfo info, int pid, string appExe, UpdateForm form)
        {
            string tempInstaller = Path.Combine(Path.GetTempPath(), "ChronoCord-Installer-" + info.Version + ".exe");
            try
            {
                form.SafeProgress(3, "Baixando atualização…");
                DownloadFile(info.Url, tempInstaller, form, 0);
                form.SafeProgress(74, "Verificando atualização…");
                string actual = Sha256File(tempInstaller);
                if (!string.Equals(actual, info.Sha256, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("A verificação de integridade falhou. O instalador foi descartado.");

                form.SafeProgress(80, "Atualizando ChronoCord…");
                StopPreviousProcess(pid);
                string installDir = Path.GetDirectoryName(appExe) ?? string.Empty;
                ProcessStartInfo install = new ProcessStartInfo(tempInstaller, "--silent --dir=\"" + installDir + "\"");
                install.UseShellExecute = false;
                install.CreateNoWindow = true;
                using (Process process = Process.Start(install))
                {
                    if (process == null) throw new InvalidOperationException("Não foi possível iniciar o instalador da atualização.");
                    process.WaitForExit();
                    if (process.ExitCode != 0) throw new InvalidOperationException("Instalador encerrou com código " + process.ExitCode + ".");
                }

                form.SafeProgress(96, "Concluindo…");
                if (!File.Exists(appExe)) throw new FileNotFoundException("O ChronoCord atualizado não foi encontrado para reiniciar.", appExe);
                form.SafeProgress(100, "Abrindo o ChronoCord…");
                ProcessStartInfo launch = new ProcessStartInfo(appExe);
                launch.WorkingDirectory = Path.GetDirectoryName(appExe) ?? Environment.CurrentDirectory;
                launch.UseShellExecute = true;
                Process.Start(launch);
            }
            finally
            {
                try { if (File.Exists(tempInstaller)) File.Delete(tempInstaller); } catch { }
            }
        }

        private static void StopPreviousProcess(int pid)
        {
            if (pid <= 0) return;
            try
            {
                using (Process previous = Process.GetProcessById(pid))
                {
                    try { previous.Kill(); } catch { }
                    if (!previous.WaitForExit(ExitWaitMilliseconds)) throw new TimeoutException("O ChronoCord não encerrou a tempo para atualizar.");
                }
            }
            catch (ArgumentException) { }
        }

        private static int CompareVersions(string left, string right)
        {
            int[] a = VersionParts(left);
            int[] b = VersionParts(right);
            for (int i = 0; i < 3; i++)
            {
                if (a[i] != b[i]) return a[i].CompareTo(b[i]);
            }
            return 0;
        }

        private static int[] VersionParts(string raw)
        {
            string clean = Regex.Replace(raw ?? "", "^v", "", RegexOptions.IgnoreCase).Split('-')[0];
            string[] parts = clean.Split('.');
            int[] values = new int[] { 0, 0, 0 };
            for (int i = 0; i < values.Length && i < parts.Length; i++) int.TryParse(parts[i], out values[i]);
            return values;
        }
    }

    internal sealed class UpdateForm : Form
    {
        private readonly Label status;
        private readonly ProgressBar progress;
        internal bool Failed { get; private set; }

        internal UpdateForm(string version)
        {
            Text = "ChronoCord Updater";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(18, 14, 30);
            ForeColor = Color.White;
            ClientSize = new Size(420, 190);

            Label title = new Label();
            title.Text = "ChronoCord " + version;
            title.Font = new Font("Segoe UI", 16F, FontStyle.Bold);
            title.AutoSize = true;
            title.Location = new Point(26, 24);
            Controls.Add(title);

            status = new Label();
            status.Text = "Verificando atualização…";
            status.Font = new Font("Segoe UI", 10F);
            status.AutoSize = false;
            status.Location = new Point(28, 78);
            status.Size = new Size(360, 24);
            Controls.Add(status);

            progress = new ProgressBar();
            progress.Minimum = 0;
            progress.Maximum = 100;
            progress.Value = 1;
            progress.Style = ProgressBarStyle.Continuous;
            progress.Location = new Point(28, 116);
            progress.Size = new Size(360, 16);
            Controls.Add(progress);
        }

        internal void SafeProgress(int value, string text)
        {
            if (IsDisposed) return;
            BeginInvoke((MethodInvoker)delegate
            {
                progress.Value = Math.Max(0, Math.Min(100, value));
                status.Text = text;
            });
        }

        internal void SafeComplete()
        {
            if (IsDisposed) return;
            BeginInvoke((MethodInvoker)delegate
            {
                progress.Value = 100;
                status.Text = "Abrindo o ChronoCord…";
                Timer timer = new Timer();
                timer.Interval = 650;
                timer.Tick += delegate { timer.Stop(); Close(); };
                timer.Start();
            });
        }

        internal void SafeFail(string message)
        {
            if (IsDisposed) return;
            BeginInvoke((MethodInvoker)delegate
            {
                Failed = true;
                status.Text = message;
                MessageBox.Show(this, message, "ChronoCord Updater", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
            });
        }
    }
}
