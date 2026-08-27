using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace ChronoCordInstaller
{
    internal static class ReferenceEntryPoint
    {
        [STAThread]
        private static int Main(string[] args)
        {
            Dictionary<string, string> options = ParseArgs(args);
            try
            {
                if (options.ContainsKey("smoke-test")) return Program.SmokeTest();
                string installDir = GetOption(options, "dir", Program.DefaultInstallDir());
                if (options.ContainsKey("silent")) return Program.InstallSilent(installDir, null);

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                ReferenceInstallerForm form = new ReferenceInstallerForm(installDir);
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
    }

    internal sealed class ReferenceInstallerForm : Form
    {
        private readonly RoundedTextBox installPath;
        private readonly Button alterButton;
        private readonly PurpleButton installButton;
        private readonly Label finePrint;
        private readonly Label errorLabel;
        private readonly Label progressTitle;
        private readonly Label progressPercent;
        private readonly Label stagePrepare;
        private readonly Label stageInstall;
        private readonly Label stageFinish;
        private readonly ReferenceProgressBar progressBar;
        private readonly Button closeButton;
        private readonly Button minimizeButton;
        private bool installing;
        private bool installed;
        internal int ExitCode { get; private set; }

        internal ReferenceInstallerForm(string initialPath)
        {
            Text = "ChronoCord Installer";
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(920, 560);
            MinimumSize = MaximumSize = new Size(920, 560);
            BackColor = Color.FromArgb(9, 7, 14);
            ForeColor = Color.FromArgb(243, 239, 250);
            Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            DoubleBuffered = true;
            ExitCode = 0;

            ReferenceBackground root = new ReferenceBackground();
            root.Dock = DockStyle.Fill;
            Controls.Add(root);

            ReferencePanel left = new ReferencePanel(true);
            left.Location = new Point(0, 0);
            left.Size = new Size(443, 560);
            root.Controls.Add(left);

            ReferencePanel right = new ReferencePanel(false);
            right.Location = new Point(443, 0);
            right.Size = new Size(477, 560);
            root.Controls.Add(right);

            Label brand = MakeLabel("●  CHRONOCORD", 17, 18, 170, 20, 9F, FontStyle.Bold, Color.FromArgb(227, 211, 246));
            brand.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            left.Controls.Add(brand);

            OrbitVisual orbit = new OrbitVisual();
            orbit.Location = new Point(54, 62);
            orbit.Size = new Size(336, 300);
            left.Controls.Add(orbit);

            Label kicker = MakeLabel("S E U  E S P A Ç O ,   S E U  R I T M O", 47, 375, 325, 20, 7.3F, FontStyle.Bold, Color.FromArgb(196, 167, 223));
            left.Controls.Add(kicker);
            Label hero1 = MakeLabel("Entre no", 47, 403, 300, 42, 24F, FontStyle.Bold, Color.FromArgb(247, 243, 252));
            left.Controls.Add(hero1);
            Label hero2 = MakeLabel("ChronoCord.", 47, 438, 320, 42, 24F, FontStyle.Bold, Color.FromArgb(247, 243, 252));
            left.Controls.Add(hero2);
            Label description = MakeLabel("Voz, mensagens, mídia compartilhada e seus ciclos reunidos\r\nem um só lugar.", 48, 486, 345, 43, 8.5F, FontStyle.Regular, Color.FromArgb(191, 183, 201));
            left.Controls.Add(description);

            VersionPill pill = new VersionPill("Versão " + Program.Version);
            pill.Location = new Point(52, 79);
            pill.Size = new Size(94, 27);
            right.Controls.Add(pill);

            Label title = MakeLabel("Pronto para instalar", 52, 128, 350, 38, 20F, FontStyle.Bold, Color.FromArgb(244, 241, 249));
            right.Controls.Add(title);
            Label subtitle = MakeLabel("Configure o local e instale o ChronoCord com uma experiência limpa\r\ne direta.", 52, 169, 374, 45, 8.5F, FontStyle.Regular, Color.FromArgb(169, 160, 181));
            right.Controls.Add(subtitle);

            Label pathLabel = MakeLabel("LOCAL DE INSTALAÇÃO", 52, 235, 220, 18, 7F, FontStyle.Bold, Color.FromArgb(223, 215, 231));
            right.Controls.Add(pathLabel);

            installPath = new RoundedTextBox(initialPath);
            installPath.Location = new Point(52, 254);
            installPath.Size = new Size(372, 43);
            right.Controls.Add(installPath);

            alterButton = new GhostButton("Alterar");
            alterButton.Location = new Point(363, 262);
            alterButton.Size = new Size(54, 28);
            alterButton.Click += ChooseFolder;
            right.Controls.Add(alterButton);
            alterButton.BringToFront();

            progressTitle = MakeLabel("Preparando instalação…", 52, 330, 270, 18, 8.5F, FontStyle.Regular, Color.FromArgb(190, 181, 204));
            progressTitle.Visible = false;
            right.Controls.Add(progressTitle);
            progressPercent = MakeLabel("0%", 376, 330, 48, 18, 8F, FontStyle.Bold, Color.FromArgb(205, 181, 238));
            progressPercent.TextAlign = ContentAlignment.MiddleRight;
            progressPercent.Visible = false;
            right.Controls.Add(progressPercent);

            progressBar = new ReferenceProgressBar();
            progressBar.Location = new Point(52, 354);
            progressBar.Size = new Size(372, 8);
            progressBar.Visible = false;
            right.Controls.Add(progressBar);

            stagePrepare = MakeLabel("Preparar", 52, 371, 100, 17, 7.5F, FontStyle.Regular, Color.FromArgb(139, 130, 151));
            stageInstall = MakeLabel("Instalar", 188, 371, 100, 17, 7.5F, FontStyle.Regular, Color.FromArgb(139, 130, 151));
            stageFinish = MakeLabel("Concluir", 324, 371, 100, 17, 7.5F, FontStyle.Regular, Color.FromArgb(139, 130, 151));
            stagePrepare.Visible = stageInstall.Visible = stageFinish.Visible = false;
            right.Controls.Add(stagePrepare); right.Controls.Add(stageInstall); right.Controls.Add(stageFinish);

            errorLabel = MakeLabel("", 52, 396, 372, 37, 8F, FontStyle.Regular, Color.FromArgb(255, 127, 146));
            errorLabel.Visible = false;
            right.Controls.Add(errorLabel);

            installButton = new PurpleButton("Instalar ChronoCord");
            installButton.Location = new Point(52, 451);
            installButton.Size = new Size(372, 46);
            installButton.Click += InstallOrOpen;
            right.Controls.Add(installButton);

            finePrint = MakeLabel("Ao continuar, os arquivos do aplicativo serão instalados apenas para este usuário.", 58, 507, 360, 27, 7.2F, FontStyle.Regular, Color.FromArgb(116, 107, 128));
            finePrint.TextAlign = ContentAlignment.TopCenter;
            right.Controls.Add(finePrint);

            minimizeButton = ChromeButton("—");
            minimizeButton.Location = new Point(847, 9);
            minimizeButton.Click += delegate { WindowState = FormWindowState.Minimized; };
            root.Controls.Add(minimizeButton);
            minimizeButton.BringToFront();

            closeButton = ChromeButton("×");
            closeButton.Location = new Point(883, 8);
            closeButton.Click += delegate { if (!installing) Close(); };
            root.Controls.Add(closeButton);
            closeButton.BringToFront();

            root.MouseDown += DragWindow;
            left.MouseDown += DragWindow;
            right.MouseDown += DragWindow;
            brand.MouseDown += DragWindow;
            title.MouseDown += DragWindow;

            Resize += delegate { UpdateRoundedRegion(); };
            Shown += delegate { UpdateRoundedRegion(); };
        }

        private static Label MakeLabel(string text, int x, int y, int width, int height, float size, FontStyle style, Color color)
        {
            Label label = new Label();
            label.Text = text;
            label.Location = new Point(x, y);
            label.Size = new Size(width, height);
            label.Font = new Font("Segoe UI", size, style);
            label.ForeColor = color;
            label.BackColor = Color.Transparent;
            label.AutoSize = false;
            return label;
        }

        private static Button ChromeButton(string text)
        {
            Button button = new Button();
            button.Text = text;
            button.Size = new Size(31, 28);
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderSize = 0;
            button.FlatAppearance.MouseOverBackColor = Color.FromArgb(37, 31, 48);
            button.FlatAppearance.MouseDownBackColor = Color.FromArgb(50, 42, 63);
            button.BackColor = Color.Transparent;
            button.ForeColor = Color.FromArgb(198, 190, 207);
            button.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            button.TabStop = false;
            button.Cursor = Cursors.Hand;
            return button;
        }

        private void ChooseFolder(object sender, EventArgs e)
        {
            if (installing) return;
            using (FolderBrowserDialog dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Escolha onde instalar o ChronoCord";
                dialog.SelectedPath = installPath.Value;
                if (dialog.ShowDialog(this) == DialogResult.OK && !string.IsNullOrWhiteSpace(dialog.SelectedPath))
                    installPath.Value = dialog.SelectedPath;
            }
        }

        private void InstallOrOpen(object sender, EventArgs e)
        {
            if (installed)
            {
                if (Program.LaunchInstalled(installPath.Value)) Close();
                else ShowError("O ChronoCord instalado não foi encontrado.");
                return;
            }
            if (installing) return;
            string target = installPath.Value.Trim();
            if (target.Length == 0) { ShowError("Escolha um local de instalação válido."); return; }

            installing = true;
            errorLabel.Visible = false;
            installButton.Enabled = false;
            alterButton.Enabled = false;
            closeButton.Enabled = false;
            installPath.Enabled = false;
            ShowProgress(true);
            UpdateProgress(3, "Preparando instalação…");

            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    int exit = Program.InstallSilent(target, delegate(int value, string text)
                    {
                        BeginInvoke((MethodInvoker)delegate { UpdateProgress(value, text); });
                    });
                    BeginInvoke((MethodInvoker)delegate
                    {
                        if (exit != 0)
                        {
                            installing = false;
                            installButton.Enabled = true;
                            alterButton.Enabled = true;
                            closeButton.Enabled = true;
                            installPath.Enabled = true;
                            ShowError("A instalação foi interrompida (código " + exit + ").");
                            return;
                        }
                        UpdateProgress(100, "Instalação concluída");
                        installing = false;
                        installed = true;
                        installButton.Enabled = true;
                        closeButton.Enabled = true;
                        installButton.MarkComplete("Abrir ChronoCord");
                        finePrint.Text = "Tudo pronto. O ChronoCord foi instalado com sucesso.";
                        finePrint.ForeColor = Color.FromArgb(111, 211, 179);
                    });
                }
                catch (Exception error)
                {
                    BeginInvoke((MethodInvoker)delegate
                    {
                        installing = false;
                        installButton.Enabled = true;
                        alterButton.Enabled = true;
                        closeButton.Enabled = true;
                        installPath.Enabled = true;
                        ShowError(error.Message);
                    });
                }
            });
        }

        private void ShowProgress(bool visible)
        {
            progressTitle.Visible = progressPercent.Visible = progressBar.Visible = visible;
            stagePrepare.Visible = stageInstall.Visible = stageFinish.Visible = visible;
        }

        private void UpdateProgress(int value, string text)
        {
            int bounded = Math.Max(0, Math.Min(100, value));
            progressBar.Value = bounded;
            progressPercent.Text = bounded + "%";
            progressTitle.Text = string.IsNullOrWhiteSpace(text) ? "Instalando…" : text;
            Color dim = Color.FromArgb(139, 130, 151);
            Color active = Color.FromArgb(212, 175, 255);
            Color done = Color.FromArgb(93, 215, 174);
            stagePrepare.ForeColor = bounded >= 34 ? done : (bounded > 0 ? active : dim);
            stageInstall.ForeColor = bounded >= 88 ? done : (bounded >= 34 ? active : dim);
            stageFinish.ForeColor = bounded >= 100 ? done : (bounded >= 88 ? active : dim);
        }

        private void ShowError(string message)
        {
            errorLabel.Text = message;
            errorLabel.Visible = true;
        }

        private void UpdateRoundedRegion()
        {
            using (GraphicsPath path = UiDrawing.RoundedRect(new Rectangle(0, 0, Width, Height), 27))
            {
                Region old = Region;
                Region = new Region(path);
                if (old != null) old.Dispose();
            }
        }

        private void DragWindow(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Left) return;
            Native.ReleaseCapture();
            Native.SendMessage(Handle, 0xA1, new IntPtr(2), IntPtr.Zero);
        }
    }

    internal sealed class ReferenceBackground : Panel
    {
        internal ReferenceBackground()
        {
            DoubleBuffered = true;
            BackColor = Color.FromArgb(10, 8, 15);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (Pen border = new Pen(Color.FromArgb(112, 120, 54, 159), 1F))
            using (GraphicsPath path = UiDrawing.RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), 27))
                e.Graphics.DrawPath(border, path);
        }
    }

    internal sealed class ReferencePanel : Panel
    {
        private readonly bool left;
        internal ReferencePanel(bool leftPanel)
        {
            left = leftPanel;
            DoubleBuffered = true;
            BackColor = Color.Transparent;
        }

        protected override void OnPaintBackground(PaintEventArgs e)
        {
            Rectangle rect = ClientRectangle;
            if (rect.Width <= 0 || rect.Height <= 0) return;
            Color start = left ? Color.FromArgb(31, 18, 49) : Color.FromArgb(16, 13, 23);
            Color end = left ? Color.FromArgb(11, 8, 16) : Color.FromArgb(11, 9, 16);
            using (LinearGradientBrush brush = new LinearGradientBrush(rect, start, end, left ? 115F : 90F))
                e.Graphics.FillRectangle(brush, rect);
            if (left)
            {
                using (GraphicsPath glowPath = new GraphicsPath())
                {
                    glowPath.AddEllipse(-60, -70, 500, 500);
                    using (PathGradientBrush glow = new PathGradientBrush(glowPath))
                    {
                        glow.CenterColor = Color.FromArgb(58, 138, 46, 201);
                        glow.SurroundColors = new Color[] { Color.Transparent };
                        e.Graphics.FillPath(glow, glowPath);
                    }
                }
            }
        }
    }

    internal sealed class OrbitVisual : Control
    {
        private readonly System.Windows.Forms.Timer timer;
        private float phase;

        internal OrbitVisual()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
            timer = new System.Windows.Forms.Timer();
            timer.Interval = 32;
            timer.Tick += delegate { phase += 1.6F; if (phase >= 360F) phase -= 360F; Invalidate(); };
            timer.Start();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) timer.Dispose();
            base.Dispose(disposing);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            PointF c = new PointF(Width / 2F, Height / 2F);

            using (Pen outer = new Pen(Color.FromArgb(62, 151, 64, 211), 1.5F))
                g.DrawEllipse(outer, c.X - 145, c.Y - 145, 290, 290);
            using (Pen mid = new Pen(Color.FromArgb(69, 155, 67, 214), 1F))
            {
                mid.DashStyle = DashStyle.Dash;
                mid.DashPattern = new float[] { 2F, 3F };
                g.DrawEllipse(mid, c.X - 112, c.Y - 112, 224, 224);
            }
            using (Pen inner = new Pen(Color.FromArgb(42, 161, 80, 222), 1F))
                g.DrawEllipse(inner, c.X - 84, c.Y - 84, 168, 168);

            GraphicsState saved = g.Save();
            g.TranslateTransform(c.X, c.Y);
            g.RotateTransform(-14F + (float)Math.Sin(phase * Math.PI / 180D) * 1.3F);
            RectangleF glowRect = new RectangleF(-76, -34, 152, 68);
            using (GraphicsPath glowPath = new GraphicsPath())
            {
                glowPath.AddEllipse(glowRect);
                using (PathGradientBrush glow = new PathGradientBrush(glowPath))
                {
                    glow.CenterColor = Color.FromArgb(205, 190, 64, 255);
                    glow.SurroundColors = new Color[] { Color.FromArgb(0, 91, 25, 135) };
                    g.FillPath(glow, glowPath);
                }
            }
            using (Pen ringGlow = new Pen(Color.FromArgb(125, 189, 67, 255), 16F))
                g.DrawEllipse(ringGlow, -62, -18, 124, 36);
            using (Pen ring = new Pen(Color.FromArgb(239, 177, 48, 255), 8F))
                g.DrawEllipse(ring, -62, -18, 124, 36);
            using (Pen ringHighlight = new Pen(Color.FromArgb(205, 235, 133, 255), 2F))
                g.DrawArc(ringHighlight, -58, -15, 116, 30, 195, 118);
            g.Restore(saved);

            using (GraphicsPath planetGlowPath = new GraphicsPath())
            {
                planetGlowPath.AddEllipse(c.X - 43, c.Y - 43, 86, 86);
                using (PathGradientBrush planetGlow = new PathGradientBrush(planetGlowPath))
                {
                    planetGlow.CenterColor = Color.FromArgb(112, 111, 31, 170);
                    planetGlow.SurroundColors = new Color[] { Color.Transparent };
                    g.FillPath(planetGlow, planetGlowPath);
                }
            }
            using (SolidBrush planet = new SolidBrush(Color.FromArgb(2, 1, 5)))
                g.FillEllipse(planet, c.X - 33, c.Y - 33, 66, 66);
            using (Pen edge = new Pen(Color.FromArgb(120, 107, 29, 166), 2F))
                g.DrawEllipse(edge, c.X - 33, c.Y - 33, 66, 66);
            using (SolidBrush shadow = new SolidBrush(Color.FromArgb(38, 79, 18, 119)))
                g.FillEllipse(shadow, c.X - 22, c.Y - 22, 29, 28);

            DrawOrbitDot(g, c, 112F, phase, 3.2F, Color.FromArgb(235, 209, 130, 255));
            DrawOrbitDot(g, c, 145F, phase * .62F + 90F, 2.7F, Color.FromArgb(210, 171, 95, 247));
            DrawOrbitDot(g, c, 84F, -phase * .8F + 220F, 2.3F, Color.FromArgb(190, 198, 114, 255));
        }

        private static void DrawOrbitDot(Graphics g, PointF c, float radius, float degrees, float size, Color color)
        {
            double a = degrees * Math.PI / 180D;
            float x = c.X + (float)Math.Cos(a) * radius;
            float y = c.Y + (float)Math.Sin(a) * radius;
            using (SolidBrush glow = new SolidBrush(Color.FromArgb(65, color)))
                g.FillEllipse(glow, x - size * 2F, y - size * 2F, size * 4F, size * 4F);
            using (SolidBrush dot = new SolidBrush(color))
                g.FillEllipse(dot, x - size / 2F, y - size / 2F, size, size);
        }
    }

    internal sealed class VersionPill : Control
    {
        private readonly string value;
        internal VersionPill(string text)
        {
            value = text;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
        }
        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath path = UiDrawing.RoundedRect(rect, 13))
            using (SolidBrush bg = new SolidBrush(Color.FromArgb(71, 84, 35, 105)))
            using (Pen border = new Pen(Color.FromArgb(110, 145, 59, 189)))
            {
                e.Graphics.FillPath(bg, path);
                e.Graphics.DrawPath(border, path);
            }
            using (SolidBrush dot = new SolidBrush(Color.FromArgb(92, 224, 185))) e.Graphics.FillEllipse(dot, 10, 11, 6, 6);
            using (Font font = new Font("Segoe UI", 7.5F, FontStyle.Bold))
            using (SolidBrush text = new SolidBrush(Color.FromArgb(215, 204, 226)))
                e.Graphics.DrawString(value, font, text, 22, 6);
        }
    }

    internal sealed class RoundedTextBox : Control
    {
        private readonly TextBox inner;
        internal string Value { get { return inner.Text; } set { inner.Text = value ?? ""; } }
        internal RoundedTextBox(string initial)
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
            inner = new TextBox();
            inner.BorderStyle = BorderStyle.None;
            inner.BackColor = Color.FromArgb(23, 19, 31);
            inner.ForeColor = Color.FromArgb(202, 194, 210);
            inner.Font = new Font("Segoe UI", 8F);
            inner.Text = initial ?? "";
            inner.Location = new Point(13, 13);
            inner.Size = new Size(290, 20);
            Controls.Add(inner);
        }
        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            inner.Width = Math.Max(20, Width - 80);
        }
        protected override void OnEnabledChanged(EventArgs e)
        {
            base.OnEnabledChanged(e);
            inner.Enabled = Enabled;
        }
        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath path = UiDrawing.RoundedRect(rect, 11))
            using (SolidBrush bg = new SolidBrush(Color.FromArgb(23, 19, 31)))
            using (Pen border = new Pen(Color.FromArgb(64, 58, 75)))
            {
                e.Graphics.FillPath(bg, path);
                e.Graphics.DrawPath(border, path);
            }
        }
    }

    internal sealed class GhostButton : Button
    {
        internal GhostButton(string text)
        {
            Text = text;
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = 1;
            FlatAppearance.BorderColor = Color.FromArgb(79, 66, 93);
            FlatAppearance.MouseOverBackColor = Color.FromArgb(42, 34, 52);
            BackColor = Color.FromArgb(30, 25, 39);
            ForeColor = Color.FromArgb(211, 202, 221);
            Font = new Font("Segoe UI", 7.2F, FontStyle.Regular);
            Cursor = Cursors.Hand;
            TabStop = false;
        }
    }

    internal sealed class PurpleButton : Button
    {
        private bool complete;
        internal PurpleButton(string text)
        {
            Text = text;
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = 0;
            BackColor = Color.FromArgb(145, 54, 244);
            ForeColor = Color.White;
            Font = new Font("Segoe UI", 8.8F, FontStyle.Bold);
            Cursor = Cursors.Hand;
            TabStop = false;
            complete = false;
        }
        internal void MarkComplete(string text)
        {
            complete = true;
            Text = text;
            BackColor = Color.FromArgb(55, 171, 135);
        }
        protected override void OnPaint(PaintEventArgs pevent)
        {
            pevent.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            Color a = complete ? Color.FromArgb(68, 185, 148) : Color.FromArgb(170, 67, 255);
            Color b = complete ? Color.FromArgb(43, 145, 118) : Color.FromArgb(116, 43, 235);
            using (GraphicsPath path = UiDrawing.RoundedRect(rect, 12))
            using (LinearGradientBrush gradient = new LinearGradientBrush(rect, a, b, LinearGradientMode.Horizontal))
                pevent.Graphics.FillPath(gradient, path);
            TextRenderer.DrawText(pevent.Graphics, Text, Font, rect, ForeColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
        }
    }

    internal sealed class ReferenceProgressBar : Control
    {
        private int value;
        internal int Value { get { return value; } set { this.value = Math.Max(0, Math.Min(100, value)); Invalidate(); } }
        internal ReferenceProgressBar()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
        }
        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle trackRect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath trackPath = UiDrawing.RoundedRect(trackRect, 4))
            using (SolidBrush track = new SolidBrush(Color.FromArgb(47, 39, 57))) e.Graphics.FillPath(track, trackPath);
            int fill = (int)Math.Round((Width - 1) * (value / 100.0));
            if (fill <= 0) return;
            Rectangle fillRect = new Rectangle(0, 0, Math.Max(7, fill), Height - 1);
            using (GraphicsPath fillPath = UiDrawing.RoundedRect(fillRect, 4))
            using (LinearGradientBrush gradient = new LinearGradientBrush(fillRect, Color.FromArgb(189, 74, 255), Color.FromArgb(111, 45, 236), LinearGradientMode.Horizontal))
                e.Graphics.FillPath(gradient, fillPath);
        }
    }

    internal static class UiDrawing
    {
        internal static GraphicsPath RoundedRect(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int d = Math.Max(2, radius * 2);
            if (rect.Width <= d || rect.Height <= d) { path.AddRectangle(rect); return path; }
            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    internal static class Native
    {
        [DllImport("user32.dll")]
        internal static extern bool ReleaseCapture();
        [DllImport("user32.dll")]
        internal static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
    }
}
