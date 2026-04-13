document.addEventListener('DOMContentLoaded', function() {
    const pluginTable = document.getElementById('plugin-list');
    const searchInput = document.getElementById('search');
  
    // Lấy dữ liệu plugin từ bộ nhớ
    chrome.storage.local.get(['pluginData'], function(result) {
      let pluginData = result.pluginData || [];
      displayPlugins(pluginData);
  
      // Xử lý tìm kiếm
      searchInput.addEventListener('input', function() {
        const query = searchInput.value.toLowerCase();
        const filteredData = pluginData.filter(plugin => plugin.name.toLowerCase().includes(query));
        displayPlugins(filteredData);
      });
    });
  
    // Hiển thị danh sách plugin
    function displayPlugins(pluginData) {
      pluginTable.innerHTML = '';
  
      pluginData.forEach(plugin => {
        let row = document.createElement('tr');
        let nameCell = document.createElement('td');
        let typeCell = document.createElement('td');
        let actionCell = document.createElement('td');
        let disableButton = document.createElement('button');
  
        nameCell.textContent = plugin.name;
        typeCell.textContent = plugin.type;
        disableButton.textContent = plugin.enabled ? 'Disable' : 'Enable';
        disableButton.disabled = plugin.type === 'Plugin'; // Chỉ cho phép vô hiệu hóa extension
  
        disableButton.addEventListener('click', function() {
          // Xử lý bật/tắt extension
          plugin.enabled = !plugin.enabled;
          disableButton.textContent = plugin.enabled ? 'Disable' : 'Enable';
          updatePluginStatus(plugin);
        });
  
        actionCell.appendChild(disableButton);
        row.appendChild(nameCell);
        row.appendChild(typeCell);
        row.appendChild(actionCell);
        pluginTable.appendChild(row);
      });
    }
  
    // Cập nhật trạng thái của plugin hoặc extension
    function updatePluginStatus(plugin) {
      chrome.management.setEnabled(plugin.id, plugin.enabled);
      chrome.storage.local.get(['pluginData'], function(result) {
        let pluginData = result.pluginData || [];
        let index = pluginData.findIndex(p => p.id === plugin.id);
        if (index !== -1) {
          pluginData[index] = plugin;
          chrome.storage.local.set({ pluginData: pluginData });
        }
      });
    }
  });
  