// js/Main.js

document.addEventListener('DOMContentLoaded', () => {

    // 1. Reactive State Management
    const AppState = new Proxy({
        Extensions: [],
        SearchQuery: '',
        SelectedExtension: null
    }, {
        set(target, property, value) {
            target[property] = value;
            if (property === 'Extensions' || property === 'SearchQuery') {
                RenderGridUI();
            }
            if (property === 'SelectedExtension') {
                UpdateSidebarUI();
            }
            return true;
        }
    });

    // 2. DOM Elements
    const ExtensionGrid = document.getElementById('ExtensionGrid');
    const SearchInput = document.getElementById('SearchInput');

    // Sidebar Elements
    const SelectedIcon = document.getElementById('SelectedIcon');
    const SelectedTitle = document.getElementById('SelectedTitle');
    const SelectedDesc = document.getElementById('SelectedDesc');
    const CountInstalled = document.getElementById('CountInstalled');
    const CountDisabled = document.getElementById('CountDisabled');


    function LoadSettings() {
        chrome.storage.local.get(['AppTheme', 'AppSortBy'], (data) => {
            AppState.Theme = data.AppTheme || 'LightMode';
            AppState.SortBy = data.AppSortBy || 'name';

            if (document.getElementById('InputTheme')) document.getElementById('InputTheme').value = AppState.Theme;
            if (document.getElementById('InputSort')) document.getElementById('InputSort').value = AppState.SortBy;
        });
    }

    function SaveSettings() {
        chrome.storage.local.set({ AppTheme: AppState.Theme, AppSortBy: AppState.SortBy });
    }

    // Inside RenderGridUI(), update the sorting just before generating the HTML:
    visibleExtensions.sort((a, b) => {
        if (AppState.SortBy === 'status') {
            if (a.enabled === b.enabled) return a.name.localeCompare(b.name);
            return a.enabled ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
    function GetBestIcon(icons) {
        if (!icons || icons.length === 0) return 'icons/NoExtensionIcon.png';
        icons.sort((a, b) => b.size - a.size);
        return icons[0].url;
    }

    // 3. Render Dashboard Grid
    function RenderGridUI() {
        const query = AppState.SearchQuery.toLowerCase();
        const visibleExtensions = AppState.Extensions.filter(ext =>
            ext.name.toLowerCase().includes(query) ||
            ext.description.toLowerCase().includes(query)
        );

        CountInstalled.textContent = AppState.Extensions.length;
        CountDisabled.textContent = AppState.Extensions.filter(ext => !ext.enabled).length;

        if (visibleExtensions.length === 0) {
            ExtensionGrid.innerHTML = `<h2 style="grid-column: 1/-1; text-align: center; color: var(--ColorOutline);">No extensions found.</h2>`;
            return;
        }

        ExtensionGrid.innerHTML = visibleExtensions.map(ext => `
            <div class="GridCard ${!ext.enabled ? 'IsDisabled' : ''}" data-id="${ext.id}">
                <div class="GridCardHeader">
                    <img src="${GetBestIcon(ext.icons)}" alt="${ext.name} Icon" class="GridCardIcon">
                    <div class="ToggleSwitch ${ext.enabled ? 'IsActive' : ''}" data-action="toggle" data-id="${ext.id}"></div>
                </div>
                <div class="ExtensionInfo">
                    <h3 class="ExtensionTitle">${ext.name}</h3>
                    <p class="ExtensionDescription">${ext.description || 'No description provided.'}</p>
                </div>
                <button class="IconButton" data-action="uninstall" data-id="${ext.id}" title="Uninstall" style="align-self: flex-end;">🗑</button>
            </div>
        `).join('');

        // Auto-select first item if none selected
        if (!AppState.SelectedExtension && visibleExtensions.length > 0) {
            AppState.SelectedExtension = visibleExtensions[0];
        }
    }

    // 4. Render Sidebar
    function UpdateSidebarUI() {
        if (!AppState.SelectedExtension) return;
        const ext = AppState.SelectedExtension;

        SelectedIcon.src = GetBestIcon(ext.icons);
        SelectedTitle.textContent = ext.name;
        SelectedDesc.textContent = ext.description || "No description provided.";
    }

    function LoadExtensions() {
        chrome.management.getAll((extensions) => {
            const filtered = extensions.filter(ext => ext.id !== chrome.runtime.id && ext.type === 'extension');
            AppState.Extensions = filtered;

            // If the currently selected extension was uninstalled, reset selection
            if (AppState.SelectedExtension) {
                const stillExists = filtered.find(e => e.id === AppState.SelectedExtension.id);
                if (!stillExists) AppState.SelectedExtension = filtered[0] || null;
            }
        });
    }

    // 5. Event Delegation for Grid
    ExtensionGrid.addEventListener('click', (event) => {
        const target = event.target;

        // Handle Toggle Click
        if (target.classList.contains('ToggleSwitch') || target.closest('.ToggleSwitch')) {
            const toggleBtn = target.classList.contains('ToggleSwitch') ? target : target.closest('.ToggleSwitch');
            const id = toggleBtn.getAttribute('data-id');
            const ext = AppState.Extensions.find(e => e.id === id);

            chrome.management.setEnabled(id, !ext.enabled, () => LoadExtensions());
            return; // Prevent card click logic
        }

        // Handle Uninstall Click
        if (target.closest('[data-action="uninstall"]')) {
            const id = target.closest('[data-action="uninstall"]').getAttribute('data-id');
            chrome.management.uninstall(id, { showConfirmDialog: true }, () => {
                if (!chrome.runtime.lastError) LoadExtensions();
            });
            return; // Prevent card click logic
        }

        // Handle Card Click (Select Extension)
        const card = target.closest('.GridCard');
        if (card) {
            const id = card.getAttribute('data-id');
            AppState.SelectedExtension = AppState.Extensions.find(e => e.id === id);
        }
    });

    // 6. Listeners
    SearchInput.addEventListener('input', (e) => {
        AppState.SearchQuery = e.target.value;
    });

    document.getElementById('BtnDisableAll').addEventListener('click', () => {
        AppState.Extensions.forEach(ext => {
            if (ext.enabled) chrome.management.setEnabled(ext.id, false);
        });
        setTimeout(LoadExtensions, 500);
    });

    document.getElementById('BtnEnableAll').addEventListener('click', () => {
        AppState.Extensions.forEach(ext => {
            if (!ext.enabled) chrome.management.setEnabled(ext.id, true);
        });
        setTimeout(LoadExtensions, 500);
    });

    // Init
    LoadExtensions();
});