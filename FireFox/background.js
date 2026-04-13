let pluginData = [];

// Lấy danh sách các extension hiện có
chrome.management.getAll(function(extensions) {
  extensions.forEach(ext => {
    pluginData.push({
      id: ext.id,
      name: ext.name,
      type: ext.type === 'extension' ? 'Extension' : 'Plugin',
      enabled: ext.enabled
    });
  });

  // Lưu dữ liệu plugin và extension vào bộ nhớ cục bộ
  chrome.storage.local.set({ pluginData: pluginData });
});

// Lắng nghe sự kiện cập nhật trạng thái của extension
chrome.management.onEnabled.addListener(function(ext) {
  updatePluginData(ext, true);
});

chrome.management.onDisabled.addListener(function(ext) {
  updatePluginData(ext, false);
});

function updatePluginData(extension, isEnabled) {
  chrome.storage.local.get(['pluginData'], function(result) {
    let pluginData = result.pluginData || [];
    let index = pluginData.findIndex(plugin => plugin.id === extension.id);
    if (index !== -1) {
      pluginData[index].enabled = isEnabled;
      chrome.storage.local.set({ pluginData: pluginData });
    }
  });
}
