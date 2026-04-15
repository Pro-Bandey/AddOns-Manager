// js/Popup.js

document.addEventListener('DOMContentLoaded', () => {
    
    const AppState = new Proxy({
        Extensions:[],
        SearchQuery: '',
        Theme: 'LightMode',
        SortBy: 'name',
        Workspaces: {} // Stores Workspace Profiles
    }, {
        set(target, property, value) {
            target[property] = value;
            if (property === 'Extensions' || property === 'SearchQuery' || property === 'SortBy') {
                RenderPopupUI();
            }
            if (property === 'Theme') {
                document.body.className = value;
            }
            if (property === 'Workspaces') {
                RenderWorkspacesUI();
            }
            return true;
        }
    });

    const ExtensionList = document.getElementById('ExtensionList');
    const SearchInput = document.getElementById('SearchInput');
    const CountInstalled = document.getElementById('CountInstalled');
    const CountDisabled = document.getElementById('CountDisabled');
    
    const WorkspaceList = document.getElementById('WorkspaceList');
    const BtnSaveWorkspace = document.getElementById('BtnSaveWorkspace');

    function LoadSettings() {
        chrome.storage.local.get(['AppTheme', 'AppSortBy', 'AppWorkspaces'], (data) => {
            AppState.Theme = data.AppTheme || 'LightMode';
            AppState.SortBy = data.AppSortBy || 'name';
            AppState.Workspaces = data.AppWorkspaces || {};
            
            document.getElementById('InputTheme').value = AppState.Theme;
            document.getElementById('InputSort').value = AppState.SortBy;
        });
    }

    function SaveSettings() {
        chrome.storage.local.set({
            AppTheme: AppState.Theme,
            AppSortBy: AppState.SortBy,
            AppWorkspaces: AppState.Workspaces
        });
    }

    function GetBestIcon(icons) {
        if (!icons || icons.length === 0) return 'icons/NoExtensionIcon.png';
        icons.sort((a, b) => b.size - a.size);
        return icons[0].url;
    }

    // --- WORKSPACE LOGIC ---
    function RenderWorkspacesUI() {
        const keys = Object.keys(AppState.Workspaces);
        if (keys.length === 0) {
            WorkspaceList.innerHTML = `<span style="font-size: 12px; color: var(--ColorOutline);">No workspaces saved.</span>`;
            return;
        }

        WorkspaceList.innerHTML = keys.map(name => `
            <div class="WorkspaceChip" data-action="apply" data-name="${name}">
                ${name}
                <button class="BtnDeleteChip" data-action="delete" data-name="${name}">✖</button>
            </div>
        `).join('');
    }

    BtnSaveWorkspace.addEventListener('click', () => {
        const name = prompt("Enter a name for this workspace (e.g. 'Dev Mode'):");
        if (!name || name.trim() === '') return;
        
        // Save IDs of all currently ENABLED extensions
        const enabledIds = AppState.Extensions.filter(ext => ext.enabled).map(ext => ext.id);
        
        // Clone object to trigger Proxy render
        const newWorkspaces = { ...AppState.Workspaces };
        newWorkspaces[name.trim()] = enabledIds;
        
        AppState.Workspaces = newWorkspaces;
        SaveSettings();
    });

    WorkspaceList.addEventListener('click', async (e) => {
        const target = e.target;
        
        // Delete Workspace
        if (target.closest('[data-action="delete"]')) {
            e.stopPropagation(); // Prevent trigger of apply
            const name = target.closest('[data-action="delete"]').getAttribute('data-name');
            const newWorkspaces = { ...AppState.Workspaces };
            delete newWorkspaces[name];
            AppState.Workspaces = newWorkspaces;
            SaveSettings();
            return;
        }

        // Apply Workspace
        if (target.closest('[data-action="apply"]')) {
            const name = target.closest('[data-action="apply"]').getAttribute('data-name');
            const targetIds = AppState.Workspaces[name];
            
            // Visual feedback
            const chip = target.closest('.WorkspaceChip');
            chip.style.backgroundColor = 'var(--ColorPrimaryContainer)';
            
            // Async batch processing for high performance
            const promises = AppState.Extensions.map(ext => {
                const shouldBeEnabled = targetIds.includes(ext.id);
                if (ext.enabled !== shouldBeEnabled) {
                    return new Promise(res => chrome.management.setEnabled(ext.id, shouldBeEnabled, res));
                }
                return Promise.resolve();
            });

            await Promise.all(promises);
            LoadExtensions(); // Refresh view
        }
    });
    // ----------------------

    function RenderPopupUI() {
        const query = AppState.SearchQuery.toLowerCase();
        let visibleExtensions = AppState.Extensions.filter(ext => 
            ext.name.toLowerCase().includes(query) || (ext.description && ext.description.toLowerCase().includes(query))
        );

        visibleExtensions.sort((a, b) => {
            if (AppState.SortBy === 'status') {
                if (a.enabled === b.enabled) return a.name.localeCompare(b.name);
                return a.enabled ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        CountInstalled.textContent = AppState.Extensions.length;
        CountDisabled.textContent = AppState.Extensions.filter(ext => !ext.enabled).length;

        if (visibleExtensions.length === 0) {
            ExtensionList.innerHTML = `<p style="text-align: center; color: var(--ColorOutline); margin-top: 20px;">No extensions found.</p>`;
            return;
        }

        ExtensionList.innerHTML = visibleExtensions.map(ext => `
            <div class="ExtensionCard ${!ext.enabled ? 'IsDisabled' : ''}" data-id="${ext.id}">
                <img src="${GetBestIcon(ext.icons)}" alt="" class="ExtensionIcon">
                <div class="ExtensionInfo">
                    <h3 class="ExtensionTitle">${ext.name}</h3>
                    <p class="ExtensionDescription">${ext.description || 'No description provided.'}</p>
                </div>
                <div class="ExtensionActions">
                    <div class="ToggleSwitch ${ext.enabled ? 'IsActive' : ''}" data-action="toggle" data-id="${ext.id}"></div>
                    <button class="IconButton" data-action="uninstall" data-id="${ext.id}" title="Uninstall">🗑</button>
                </div>
            </div>
        `).join('');
    }

    function LoadExtensions() {
        chrome.management.getAll((extensions) => {
            AppState.Extensions = extensions.filter(ext => ext.id !== chrome.runtime.id && ext.type === 'extension');
        });
    }

    // Modal & Settings Interaction
    document.getElementById('BtnSettings').addEventListener('click', () => document.getElementById('SettingsBackdrop').classList.add('IsVisible'));
    document.getElementById('BtnCloseSettings').addEventListener('click', () => document.getElementById('SettingsBackdrop').classList.remove('IsVisible'));
    document.getElementById('InputTheme').addEventListener('change', (e) => { AppState.Theme = e.target.value; SaveSettings(); });
    document.getElementById('InputSort').addEventListener('change', (e) => { AppState.SortBy = e.target.value; SaveSettings(); });

    // Extension List Delegation
    ExtensionList.addEventListener('click', (event) => {
        const target = event.target;
        if (target.closest('.ToggleSwitch')) {
            const toggleBtn = target.closest('.ToggleSwitch');
            const id = toggleBtn.getAttribute('data-id');
            const ext = AppState.Extensions.find(e => e.id === id);
            toggleBtn.classList.toggle('IsActive');
            toggleBtn.closest('.ExtensionCard').classList.toggle('IsDisabled');
            chrome.management.setEnabled(id, !ext.enabled, () => LoadExtensions());
        }
        if (target.closest('[data-action="uninstall"]')) {
            const id = target.closest('[data-action="uninstall"]').getAttribute('data-id');
            chrome.management.uninstall(id, { showConfirmDialog: true }, () => {
                if (!chrome.runtime.lastError) LoadExtensions();
            });
        }
    });

    let searchTimeout;
    SearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => AppState.SearchQuery = e.target.value, 150);
    });

    document.getElementById('BtnFullscreen').addEventListener('click', () => chrome.tabs.create({ url: 'index.html' }));
    
    document.getElementById('BtnDisableAll').addEventListener('click', async () => {
        const promises = AppState.Extensions.map(ext => ext.enabled ? new Promise(res => chrome.management.setEnabled(ext.id, false, res)) : Promise.resolve());
        await Promise.all(promises);
        LoadExtensions();
    });

    document.getElementById('BtnEnableAll').addEventListener('click', async () => {
        const promises = AppState.Extensions.map(ext => !ext.enabled ? new Promise(res => chrome.management.setEnabled(ext.id, true, res)) : Promise.resolve());
        await Promise.all(promises);
        LoadExtensions();
    });

    LoadSettings();
    LoadExtensions();
});