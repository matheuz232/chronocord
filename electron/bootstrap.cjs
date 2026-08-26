const { ipcMain, desktopCapturer } = require('electron');

ipcMain.handle('media:get-desktop-sources', async (_event, options = {}) => {
  const requestedTypes = Array.isArray(options.types) ? options.types : ['screen', 'window'];
  const types = requestedTypes.filter((type) => type === 'screen' || type === 'window');
  const sources = await desktopCapturer.getSources({
    types: types.length ? types : ['screen', 'window'],
    thumbnailSize: { width: 480, height: 270 },
    fetchWindowIcons: false,
  });

  return sources.map((source) => ({
    id: source.id,
    name: String(source.name || 'Fonte sem nome').slice(0, 200),
    type: source.id.startsWith('screen:') ? 'screen' : 'window',
    displayId: source.display_id || '',
    thumbnail: source.thumbnail?.isEmpty?.() ? '' : (source.thumbnail?.toDataURL?.() || ''),
  }));
});

require('./main.cjs');
