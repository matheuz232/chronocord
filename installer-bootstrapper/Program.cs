using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace ChronoCordInstaller
{
    internal static class Program
    {
        internal const string Version = "__VERSION__";
        internal const string PayloadMagic = "CCP10301";
        internal const int TrailerSize = 48;

        private sealed class PayloadInfo
        {
            public long Offset;
            public long Length;
            public byte[] Hash;
        }

        [STAThread]
        private static int Main(string[] args)
        {
            Dictionary<string, string> options = ParseArgs(args);
            try
            {
                if (options.ContainsKey("smoke-test")) return SmokeTest();
                string installDir = GetOption(options, "dir", DefaultInstallDir());
                if (options.ContainsKey("silent")) return InstallSilent(installDir, null);

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                InstallerForm form = new InstallerForm(installDir);
                Application.Run(form);
                return form.ExitCode;
            }
            catch (Exception error)
            {
                if (!options.ContainsKey("silent"))
                    MessageBox.Show(error.Message, "ChronoCord Installer", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 2;
            }
        }

        internal static int SmokeTest()
        {
            PayloadInfo payload = ReadPayloadInfo(Application.ExecutablePath);
            return VerifyPayload(Application.ExecutablePath, payload) ? 0 : 3;
        }

        internal static int InstallSilent(string installDir, Action<int, string> progress)
        {
            string payloadPath = null;
            try
            {
                progress = progress ?? delegate { };
                progress(8, "Verificando pacote…");
                PayloadInfo payload = ReadPayloadInfo(Application.ExecutablePath);
                payloadPath = ExtractAndVerify(Application.ExecutablePath, payload, progress);
                progress(48, "Instalando o ChronoCord…");
                int exit = RunSetup(payloadPath, installDir);
                if (exit != 0) return exit;
                progress(96, "Finalizando…");
                return 0;
            }
            finally
            {
                if (!string.IsNullOrWhiteSpace(payloadPath))
                {
                    try { if (File.Exists(payloadPath)) File.Delete(payloadPath); } catch { }
                }
            }
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
                else result[body.Substring(0, split)] = body.Substring(split + 1).Trim('"');
            }
            return result;
        }

        private static string GetOption(Dictionary<string, string> options, string name, string fallback)
        {
            string value;
            return options.TryGetValue(name, out value) && !string.IsNullOrWhiteSpace(value) ? value : fallback;
        }

        internal static string DefaultInstallDir()
        {
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            return Path.Combine(local, "Programs", "ChronoCord");
        }

        private static PayloadInfo ReadPayloadInfo(string executablePath)
        {
            using (FileStream stream = new FileStream(executablePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                if (stream.Length <= TrailerSize + 1024 * 1024) throw new InvalidDataException("O pacote do ChronoCord está incompleto.");
                stream.Seek(-TrailerSize, SeekOrigin.End);
                byte[] magicBytes = ReadExactly(stream, 8);
                string magic = Encoding.ASCII.GetString(magicBytes);
                if (!string.Equals(magic, PayloadMagic, StringComparison.Ordinal)) throw new InvalidDataException("Assinatura do pacote interno inválida.");
                byte[] lengthBytes = ReadExactly(stream, 8);
                ulong unsignedLength = BitConverter.ToUInt64(lengthBytes, 0);
                if (unsignedLength > long.MaxValue) throw new InvalidDataException("Tamanho de pacote inválido.");
                long payloadLength = (long)unsignedLength;
                byte[] expectedHash = ReadExactly(stream, 32);
                long offset = stream.Length - TrailerSize - payloadLength;
                if (payloadLength < 1024 * 1024 || offset <= 0) throw new InvalidDataException("O pacote interno tem tamanho inválido.");
                return new PayloadInfo { Offset = offset, Length = payloadLength, Hash = expectedHash };
            }
        }

        private static byte[] ReadExactly(Stream stream, int count)
        {
            byte[] buffer = new byte[count];
            int offset = 0;
            while (offset < count)
            {
                int read = stream.Read(buffer, offset, count - offset);
                if (read <= 0) throw new EndOfStreamException("Pacote interno truncado.");
                offset += read;
            }
            return buffer;
        }

        private static bool VerifyPayload(string executablePath, PayloadInfo payload)
        {
            using (FileStream input = new FileStream(executablePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            using (SHA256 sha = SHA256.Create())
            {
                input.Position = payload.Offset;
                byte[] buffer = new byte[1024 * 1024];
                long remaining = payload.Length;
                while (remaining > 0)
                {
                    int wanted = (int)Math.Min(buffer.Length, remaining);
                    int read = input.Read(buffer, 0, wanted);
                    if (read <= 0) throw new EndOfStreamException("Pacote interno truncado.");
                    sha.TransformBlock(buffer, 0, read, buffer, 0);
                    remaining -= read;
                }
                sha.TransformFinalBlock(new byte[0], 0, 0);
                return FixedEquals(sha.Hash, payload.Hash);
            }
        }

        private static string ExtractAndVerify(string executablePath, PayloadInfo payload, Action<int, string> progress)
        {
            string destination = Path.Combine(Path.GetTempPath(), "ChronoCord-Setup-" + Version + "-" + Guid.NewGuid().ToString("N") + ".exe");
            using (FileStream input = new FileStream(executablePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            using (FileStream output = new FileStream(destination, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            using (SHA256 sha = SHA256.Create())
            {
                input.Position = payload.Offset;
                byte[] buffer = new byte[1024 * 1024];
                long remaining = payload.Length;
                long done = 0;
                while (remaining > 0)
                {
                    int wanted = (int)Math.Min(buffer.Length, remaining);
                    int read = input.Read(buffer, 0, wanted);
                    if (read <= 0) throw new EndOfStreamException("Pacote interno truncado.");
                    output.Write(buffer, 0, read);
                    sha.TransformBlock(buffer, 0, read, buffer, 0);
                    remaining -= read;
                    done += read;
                    int percent = 10 + (int)Math.Min(32, done * 32L / payload.Length);
                    progress(percent, "Preparando arquivos…");
                }
                sha.TransformFinalBlock(new byte[0], 0, 0);
                if (!FixedEquals(sha.Hash, payload.Hash))
                {
                    output.Close();
                    try { File.Delete(destination); } catch { }
                    throw new InvalidDataException("A verificação SHA-256 do pacote interno falhou.");
                }
            }
            return destination;
        }

        private static bool FixedEquals(byte[] left, byte[] right)
        {
            if (left == null || right == null || left.Length != right.Length) return false;
            int diff = 0;
            for (int i = 0; i < left.Length; i++) diff |= left[i] ^ right[i];
            return diff == 0;
        }

        private static int RunSetup(string setupPath, string installDir)
        {
            Directory.CreateDirectory(installDir);
            ProcessStartInfo info = new ProcessStartInfo(setupPath, "/S /D=" + installDir);
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            using (Process process = Process.Start(info))
            {
                if (process == null) throw new InvalidOperationException("Não foi possível iniciar o instalador interno.");
                process.WaitForExit();
                return process.ExitCode;
            }
        }

        internal static bool LaunchInstalled(string installDir)
        {
            string exe = Path.Combine(installDir, "ChronoCord.exe");
            if (!File.Exists(exe)) return false;
            ProcessStartInfo launch = new ProcessStartInfo(exe);
            launch.WorkingDirectory = installDir;
            launch.UseShellExecute = true;
            Process.Start(launch);
            return true;
        }
    }

    internal sealed class AnimatedProgress : Control
    {
        private int value;
        private int pulse;

        internal int Value
        {
            get { return value; }
            set { this.value = Math.Max(0, Math.Min(100, value)); Invalidate(); }
        }

        internal int Pulse
        {
            get { return pulse; }
            set { pulse = value; Invalidate(); }
        }

        internal AnimatedProgress()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint, true);
            Height = 12;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle bounds = new Rectangle(0, 0, Math.Max(1, Width - 1), Math.Max(1, Height - 1));
            using (GraphicsPath trackPath = Rounded(bounds, 6))
            using (SolidBrush track = new SolidBrush(Color.FromArgb(55, 255, 255, 255)))
                e.Graphics.FillPath(track, trackPath);

            int fillWidth = Math.Max(4, (int)((Width - 1) * (Value / 100.0)));
            Rectangle fillRect = new Rectangle(0, 0, fillWidth, Math.Max(1, Height - 1));
            using (GraphicsPath fillPath = Rounded(fillRect, 6))
            using (LinearGradientBrush gradient = new LinearGradientBrush(fillRect, Color.FromArgb(232, 163, 61), Color.FromArgb(176, 125, 240), LinearGradientMode.Horizontal))
                e.Graphics.FillPath(gradient, fillPath);

            if (Value > 2)
            {
                int glowX = (pulse % Math.Max(1, fillWidth + 40)) - 30;
                Rectangle glow = new Rectangle(glowX, 0, 34, Height);
                using (LinearGradientBrush shine = new LinearGradientBrush(glow, Color.Transparent, Color.FromArgb(120, Color.White), LinearGradientMode.Horizontal))
                    e.Graphics.FillRectangle(shine, glow);
            }
        }

        private static GraphicsPath Rounded(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int d = radius * 2;
            if (rect.Width <= d || rect.Height <= d) { path.AddRectangle(rect); return path; }
            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    internal sealed class InstallerForm : Form
    {
        private readonly TextBox pathBox;
        private readonly Label status;
        private readonly AnimatedProgress progress;
        private readonly Button installButton;
        private readonly Button browseButton;
        private readonly Button closeButton;
        private readonly System.Windows.Forms.Timer animationTimer;
        private int targetProgress;
        private int displayedProgress;
        private int pulse;
        private bool installing;
        internal int ExitCode { get; private set; }

        internal InstallerForm(string initialPath)
        {
            Text = "ChronoCord Installer";
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(820, 500);
            BackColor = Color.FromArgb(14, 12, 24);
            ForeColor = Color.White;
            Font = new Font("Segoe UI", 10F);

            GradientPanel backdrop = new GradientPanel();
            backdrop.Dock = DockStyle.Fill;
            Controls.Add(backdrop);

            closeButton = MakeButton("×", 758, 18, 42, 34, false);
            closeButton.Font = new Font("Segoe UI", 15F, FontStyle.Regular);
            closeButton.Click += delegate { if (!installing) Close(); };
            backdrop.Controls.Add(closeButton);

            Label brand = new Label();
            brand.Text = "CHRONOCORD";
            brand.Font = new Font("Segoe UI", 24F, FontStyle.Bold);
            brand.ForeColor = Color.FromArgb(245, 238, 255);
            brand.AutoSize = true;
            brand.Location = new Point(54, 50);
            backdrop.Controls.Add(brand);

            Label title = new Label();
            title.Text = "Instalar ChronoCord " + Program.Version;
            title.Font = new Font("Segoe UI", 21F, FontStyle.Bold);
            title.ForeColor = Color.White;
            title.AutoSize = true;
            title.Location = new Point(54, 126);
            backdrop.Controls.Add(title);

            Label subtitle = new Label();
            subtitle.Text = "Discord shape, Chronos soul — instalação rápida e protegida por SHA-256.";
            subtitle.Font = new Font("Segoe UI", 10.5F);
            subtitle.ForeColor = Color.FromArgb(184, 176, 207);
            subtitle.AutoSize = true;
            subtitle.Location = new Point(58, 174);
            backdrop.Controls.Add(subtitle);

            Label folderLabel = new Label();
            folderLabel.Text = "Pasta de instalação";
            folderLabel.ForeColor = Color.FromArgb(220, 214, 235);
            folderLabel.AutoSize = true;
            folderLabel.Location = new Point(58, 232);
            backdrop.Controls.Add(folderLabel);

            pathBox = new TextBox();
            pathBox.Text = initialPath;
            pathBox.Location = new Point(60, 260);
            pathBox.Size = new Size(560, 28);
            pathBox.BackColor = Color.FromArgb(28, 24, 48);
            pathBox.ForeColor = Color.White;
            pathBox.BorderStyle = BorderStyle.FixedSingle;
            backdrop.Controls.Add(pathBox);

            browseButton = MakeButton("Procurar", 632, 258, 116, 32, false);
            browseButton.Click += ChooseFolder;
            backdrop.Controls.Add(browseButton);

            status = new Label();
            status.Text = "Pronto para instalar.";
            status.ForeColor = Color.FromArgb(184, 176, 207);
            status.AutoSize = false;
            status.Location = new Point(60, 328);
            status.Size = new Size(688, 28);
            backdrop.Controls.Add(status);

            progress = new AnimatedProgress();
            progress.Location = new Point(60, 365);
            progress.Size = new Size(688, 14);
            progress.Value = 0;
            backdrop.Controls.Add(progress);

            installButton = MakeButton("Instalar", 568, 414, 180, 46, true);
            installButton.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            installButton.Click += StartInstall;
            backdrop.Controls.Add(installButton);

            animationTimer = new System.Windows.Forms.Timer();
            animationTimer.Interval = 28;
            animationTimer.Tick += delegate
            {
                pulse += 4;
                progress.Pulse = pulse;
                if (displayedProgress < targetProgress)
                {
                    displayedProgress += Math.Max(1, (targetProgress - displayedProgress) / 12);
                    if (displayedProgress > targetProgress) displayedProgress = targetProgress;
                    progress.Value = displayedProgress;
                }
            };
            animationTimer.Start();

            MouseDown += DragStart;
            backdrop.MouseDown += DragStart;
        }

        private Button MakeButton(string text, int x, int y, int width, int height, bool accent)
        {
            Button button = new Button();
            button.Text = text;
            button.Location = new Point(x, y);
            button.Size = new Size(width, height);
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderSize = accent ? 0 : 1;
            button.FlatAppearance.BorderColor = Color.FromArgb(90, 79, 124);
            button.BackColor = accent ? Color.FromArgb(232, 163, 61) : Color.FromArgb(35, 30, 58);
            button.ForeColor = accent ? Color.FromArgb(20, 15, 12) : Color.White;
            button.Cursor = Cursors.Hand;
            return button;
        }

        private void ChooseFolder(object sender, EventArgs e)
        {
            if (installing) return;
            using (FolderBrowserDialog dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Escolha onde instalar o ChronoCord";
                dialog.SelectedPath = Directory.Exists(pathBox.Text) ? pathBox.Text : Program.DefaultInstallDir();
                if (dialog.ShowDialog(this) == DialogResult.OK && !string.IsNullOrWhiteSpace(dialog.SelectedPath)) pathBox.Text = dialog.SelectedPath;
            }
        }

        private void StartInstall(object sender, EventArgs e)
        {
            if (installing) return;
            string installDir;
            try { installDir = Path.GetFullPath(pathBox.Text.Trim()); }
            catch { MessageBox.Show(this, "Escolha uma pasta de instalação válida.", "ChronoCord Installer", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
            installing = true;
            installButton.Enabled = false;
            browseButton.Enabled = false;
            pathBox.Enabled = false;
            closeButton.Enabled = false;
            SetProgress(4, "Verificando pacote…");

            Thread worker = new Thread(delegate()
            {
                int code = Program.InstallSilent(installDir, delegate(int value, string text) { SafeProgress(value, text); });
                if (code != 0) { SafeFail("A instalação terminou com o código " + code + ".", code); return; }
                SafeProgress(100, "ChronoCord instalado. Abrindo…");
                try { Program.LaunchInstalled(installDir); } catch { }
                Thread.Sleep(700);
                BeginInvoke((MethodInvoker)delegate { ExitCode = 0; Close(); });
            });
            worker.IsBackground = true;
            worker.Start();
        }

        private void SafeProgress(int value, string text)
        {
            if (IsDisposed) return;
            BeginInvoke((MethodInvoker)delegate { SetProgress(value, text); });
        }

        private void SetProgress(int value, string text)
        {
            targetProgress = Math.Max(targetProgress, Math.Max(0, Math.Min(100, value)));
            status.Text = text;
        }

        private void SafeFail(string message, int code)
        {
            if (IsDisposed) return;
            BeginInvoke((MethodInvoker)delegate
            {
                ExitCode = code == 0 ? 2 : code;
                installing = false;
                status.Text = message;
                MessageBox.Show(this, message, "ChronoCord Installer", MessageBoxButtons.OK, MessageBoxIcon.Error);
                installButton.Enabled = true;
                browseButton.Enabled = true;
                pathBox.Enabled = true;
                closeButton.Enabled = true;
            });
        }

        private void DragStart(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Left) return;
            Native.ReleaseCapture();
            Native.SendMessage(Handle, 0xA1, new IntPtr(2), IntPtr.Zero);
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (installing) { e.Cancel = true; return; }
            animationTimer.Stop();
            base.OnFormClosing(e);
        }
    }

    internal sealed class GradientPanel : Panel
    {
        internal GradientPanel() { DoubleBuffered = true; }
        protected override void OnPaintBackground(PaintEventArgs e)
        {
            Rectangle rect = ClientRectangle;
            using (LinearGradientBrush gradient = new LinearGradientBrush(rect, Color.FromArgb(14, 12, 24), Color.FromArgb(35, 24, 58), 28F))
                e.Graphics.FillRectangle(gradient, rect);
            using (SolidBrush glow = new SolidBrush(Color.FromArgb(40, 232, 163, 61)))
                e.Graphics.FillEllipse(glow, -80, -120, 430, 330);
        }
    }

    internal static class Native
    {
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        internal static extern bool ReleaseCapture();
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        internal static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
    }
}
