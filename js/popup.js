document.addEventListener('DOMContentLoaded', async () => {
    const AppState = await LoadAppState();

    const BoxActives = document.getElementById('BoxActives');
    const BoxInActives = document.getElementById('BoxInActives');
    const Search = document.getElementById('SearchInput');
    const ProfileSelect = document.getElementById('ProfileSelect');
    
    // Multi-select elements
    const BtnMulti = document.getElementById('BtnMulti');
    const BatchBar = document.getElementById('BatchBar');
    const BatchCount = document.getElementById('BatchCount');
    const BatchProfileSelect = document.getElementById('BatchProfileSelect');

    const LayoutSel = document.getElementById('LayoutSelect');
    const ThemeSel = document.getElementById('ThemeSelect');
    
    let isMultiMode = false;
    let selectedExts = new Set();
    let ContextExtId = null;

    if (!AppState.ShowThemeToggle && ThemeSel) ThemeSel.style.display = 'none';
    if (!AppState.ShowLayoutToggle && LayoutSel) LayoutSel.style.display = 'none';

    LayoutSel.innerHTML = `<option value="GridLayout">Grid</option><option value="ListLayout">List</option><option value="CompactLayout">Compact</option>`;
    LayoutSel.value = AppState.Layout;
    ThemeSel.value = AppState.Theme;

    // Load Profiles into Dropdowns
    Object.keys(AppState.Groups).forEach(g => {
        ProfileSelect.appendChild(new Option(g, g));
        BatchProfileSelect.appendChild(new Option(g, g));
    });

    if (AppState.PopupSelectedProfile && AppState.Groups[AppState.PopupSelectedProfile]) {
        ProfileSelect.value = AppState.PopupSelectedProfile;
    } else {
        ProfileSelect.value = "";
    }

    // Toggle Multi-Select Mode
    BtnMulti.addEventListener('click', () => {
        isMultiMode = !isMultiMode;
        BtnMulti.classList.toggle('ActiveMode', isMultiMode);
        BatchBar.classList.toggle('IsVisible', isMultiMode);
        if (!isMultiMode) {
            selectedExts.clear();
            Render();
        }
    });

    function UpdateBatchUI() {
        BatchCount.innerText = `${selectedExts.size} selected`;
    }

    async function Render() {
        ApplyThemeAndLayout(AppState);
        BoxActives.className = `BoxActives ${AppState.Layout}`;
        BoxInActives.className = `BoxInActives ${AppState.Layout}`;

        const exts = await GetExtensions();
        const query = Search.value.toLowerCase();
        const profile = AppState.Groups[ProfileSelect.value];

        BoxActives.innerHTML = '';
        BoxInActives.innerHTML = '';

        for (const ext of exts) {
            const custom = AppState.CustomInfo[ext.id] || {};
            const name = custom.name || ext.name;
            const iconUrl = GetBestIcon(ext.icons);

            if (!name.toLowerCase().includes(query)) continue;

            const isDev = ext.installType === 'development';
            const isInProfile = profile && profile.includes(ext.id);

            const li = document.createElement('li');
            li.dataset.id = ext.id;
            li.style.backgroundImage = `url("${iconUrl}")`;
            
            if (selectedExts.has(ext.id)) li.classList.add('SelectedForBatch');

            li.innerHTML = `
                ${isDev && AppState.ShowDevBadge ? '<i>DEV</i>' : ''}
                ${isInProfile ? '<svg class="pin"><use href="icons/icons.svg#icon-pin">>/use></svg>' : ''}
                <span>${name}</span>
            `;

            li.addEventListener('click', () => {
                if (isMultiMode) {
                    if (selectedExts.has(ext.id)) selectedExts.delete(ext.id);
                    else selectedExts.add(ext.id);
                    li.classList.toggle('SelectedForBatch');
                    UpdateBatchUI();
                } else {
                    chrome.management.setEnabled(ext.id, !ext.enabled, Render);
                }
            });

            li.addEventListener('contextmenu', async (e) => {
                if (isMultiMode) return;
                e.preventDefault();
                ContextExtId = ext;

                const menu = document.getElementById('rightClickMenu');
                menu.style.left = `${e.clientX}px`;
                menu.style.top = `${e.clientY}px`;
                menu.classList.add('IsVisible');

                const color = await GetDominantColor(iconUrl);
                document.getElementById('ctxName').innerText = name;
                document.getElementById('ctxName').style.background = `rgb(${color.r}, ${color.g}, ${color.b})`;
                menu.querySelectorAll('li').forEach(el => el.style.background = `rgb(${color.r}, ${color.g}, ${color.b})`);

                const ctxLock = document.getElementById('ctxLock');
                if (ProfileSelect.value) {
                    ctxLock.style.display = 'block';
                    const inProf = AppState.Groups[ProfileSelect.value].includes(ext.id);
                    ctxLock.innerText = inProf ? 'Unlock' : 'Lock';
                } else {
                    ctxLock.style.display = 'none';
                }

                document.getElementById('ctxOptions').toggleAttribute('disabled', !ext.optionsUrl);
                document.getElementById('ctxHomepage').toggleAttribute('disabled', !ext.homepageUrl);
            });

            if (ext.enabled) BoxActives.appendChild(li);
            else BoxInActives.appendChild(li);
        }
        document.getElementById('DisableHeader').style.display = BoxInActives.innerHTML ? 'block' : 'none';
        UpdateBatchUI();
    }

    // Context Menu Handlers
    document.addEventListener('click', () => document.getElementById('rightClickMenu').classList.remove('IsVisible'));
    document.getElementById('ctxOptions').addEventListener('click', () => { if (ContextExtId.optionsUrl) chrome.tabs.create({ url: ContextExtId.optionsUrl }); });
    document.getElementById('ctxHomepage').addEventListener('click', () => { if (ContextExtId.homepageUrl) chrome.tabs.create({ url: ContextExtId.homepageUrl }); });
    document.getElementById('ctxUninstall').addEventListener('click', () => chrome.management.uninstall(ContextExtId.id, { showConfirmDialog: true }, Render));
    document.getElementById('ctxReload').addEventListener('click', () => {
        chrome.management.setEnabled(ContextExtId.id, false, () => chrome.management.setEnabled(ContextExtId.id, true, Render));
    });
    document.getElementById('ctxLock').addEventListener('click', () => {
        const grp = AppState.Groups[ProfileSelect.value];
        if (grp.includes(ContextExtId.id)) grp.splice(grp.indexOf(ContextExtId.id), 1);
        else grp.push(ContextExtId.id);
        SaveAppState(AppState); Render();
    });

    // Batch Action Handlers
    document.getElementById('BtnBatchEnable').addEventListener('click', async () => {
        const promises = Array.from(selectedExts).map(id => new Promise(r => chrome.management.setEnabled(id, true, () => { chrome.runtime.lastError; r(); })));
        await Promise.all(promises); Render();
    });
    
    document.getElementById('BtnBatchDisable').addEventListener('click', async () => {
        const promises = Array.from(selectedExts).map(id => new Promise(r => chrome.management.setEnabled(id, false, () => { chrome.runtime.lastError; r(); })));
        await Promise.all(promises); Render();
    });

    document.getElementById('BtnBatchUninstall').addEventListener('click', async () => {
        if(confirm("Uninstalling multiple extensions will trigger Chrome's native confirmation dialog for each one. Proceed?")) {
            for (const id of selectedExts) {
                await new Promise(r => chrome.management.uninstall(id, { showConfirmDialog: true }, () => { chrome.runtime.lastError; r(); }));
            }
            selectedExts.clear(); Render();
        }
    });

    BatchProfileSelect.addEventListener('change', (e) => {
        const grpName = e.target.value;
        if (grpName && AppState.Groups[grpName]) {
            selectedExts.forEach(id => {
                if (!AppState.Groups[grpName].includes(id)) AppState.Groups[grpName].push(id);
            });
            SaveAppState(AppState);
            e.target.value = ""; // Reset dropdown
            alert(`Added ${selectedExts.size} extensions to ${grpName}`);
            Render();
        }
    });

    Search.addEventListener('input', Render);
    ProfileSelect.addEventListener('change', async (e) => { 
        const selectedProfile = e.target.value;
        AppState.PopupSelectedProfile = selectedProfile; 
        SaveAppState(AppState); 

        if (selectedProfile && AppState.Groups[selectedProfile]) {
            const profileExtIds = AppState.Groups[selectedProfile];
            const exts = await GetExtensions();
            const promises = exts.map(ext => {
                const shouldBeEnabled = profileExtIds.includes(ext.id);
                if (ext.enabled !== shouldBeEnabled) {
                    return new Promise(res => {
                        chrome.management.setEnabled(ext.id, shouldBeEnabled, () => { chrome.runtime.lastError; res(); });
                    });
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
        }
        Render(); 
    });

    LayoutSel.addEventListener('change', (e) => { AppState.Layout = e.target.value; SaveAppState(AppState); Render(); });
    ThemeSel.addEventListener('change', (e) => { AppState.Theme = e.target.value; SaveAppState(AppState); Render(); });
    document.getElementById('BtnDashboard').addEventListener('click', () => chrome.tabs.create({ url: 'dashboard.html' }));

    Render();
});