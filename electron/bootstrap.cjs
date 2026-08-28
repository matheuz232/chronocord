const { ipcMain, desktopCapturer, clipboard } = require('electron');

ipcMain.handle('clipboard:write-text', (_event, text = '') => {
  const value = String(text ?? '');
  if (!value || value.length > 4096) throw new Error('Texto inválido para copiar.');
  clipboard.writeText(value);
  return { ok: true };
});

ipcMain.handle('media:get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });

  return sources
    .filter((source) => source?.id && (source.id.startsWith('screen:') || source.id.startsWith('window:')))
    .sort((a, b) => Number(b.id.startsWith('screen:')) - Number(a.id.startsWith('screen:')))
    .slice(0, 48)
    .map((source) => ({
      id: source.id,
      name: String(source.name || 'Fonte sem nome').slice(0, 200),
      type: source.id.startsWith('screen:') ? 'screen' : 'window',
      displayId: source.display_id || '',
      thumbnail: source.thumbnail?.isEmpty?.() ? '' : (source.thumbnail?.toDataURL?.() || ''),
      appIcon: source.appIcon?.isEmpty?.() ? null : (source.appIcon?.toDataURL?.() || null),
    }));
});

require('./main.cjs');
