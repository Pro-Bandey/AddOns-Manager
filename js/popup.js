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

    // Temporary modal elements
    const TempModal = document.getElementById('TempModal');
    const BtnNoTempModal = document.getElementById('BtnNoTempModal');
    const BtnOkTempModal = document.getElementById('BtnOkTempModal');
    const TempDuration = document.getElementById('TempDuration');

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

    // Fuzzy Matching Logic Utility
    function fuzzyMatch(text, query) {
        if (!query) return true;
        text = text.toLowerCase();
        query = query.toLowerCase();
        let textIdx = 0, queryIdx = 0;
        while (textIdx < text.length && queryIdx < query.length) {
            if (text[textIdx] === query[queryIdx]) {
                queryIdx++;
            }
            textIdx++;
        }
        return queryIdx === query.length;
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
        const query = Search.value;
        const profile = AppState.Groups[ProfileSelect.value];

        BoxActives.innerHTML = '';
        BoxInActives.innerHTML = '';

        for (const ext of exts) {
            const custom = AppState.CustomInfo[ext.id] || {};
            const name = custom.name || ext.name;
            const iconUrl = GetBestIcon(ext.icons);

            // Fuzzy Match check
            if (!fuzzyMatch(name, query)) continue;

            const isDev = ext.installType === 'development';
            const isInProfile = profile && profile.includes(ext.id);

            const li = document.createElement('li');
            li.dataset.id = ext.id;
            li.tabIndex = 0; // Accessible keyboard focus path
            li.style.backgroundImage = `url("${iconUrl}")`;

            if (selectedExts.has(ext.id)) li.classList.add('SelectedForBatch');

            li.innerHTML = `
                ${isDev && AppState.ShowDevBadge ? '<svg class="dev"><use href="icons/icons.svg#icon-dev"></use></svg>' : ''}
                ${isInProfile ? '<svg class="pin"><use href="icons/icons.svg#icon-pin"></use></svg>' : ''}
                <span>${name}</span>
            `;

            // Setup keyboard listeners
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    li.click();
                }
            });

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
                showContextMenu(e.pageX, e.pageY);


                const menu = document.getElementById('rightClickMenu');
                const color = await GetDominantColor(iconUrl);
                document.getElementById('ctxName').innerText = name;
                document.getElementById('ctxName').style.background = `rgb(${color.r}, ${color.g}, ${color.b})`;
                menu.querySelectorAll('li').forEach(el => el.style.background = `rgb(${color.r}, ${color.g}, ${color.b})`);

                const ctxLock = document.getElementById('ctxLock');
                const ctxTempEnable = document.getElementById('ctxTempEnable');
                const ctxReload = document.getElementById('ctxReload');
                if (ProfileSelect.value) {
                    const inProf = AppState.Groups[ProfileSelect.value].includes(ext.id);
                    ctxLock.innerText = inProf ? 'Unlock' : 'Lock';
                    ctxTempEnable.style.display = inProf ? 'none' : 'block';
                    ctxReload.style.display = inProf ? 'blob' : 'none';
                } else {
                    ctxLock.style.display = 'none';
                    ctxTempEnable.style.display = 'none';
                    ctxReload.style.display = 'block';
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

    function showContextMenu(x, y) {
        const contextMenu = document.getElementById('rightClickMenu');
        contextMenu.classList.add('IsVisible');
        if (x + contextMenu.offsetWidth > window.innerWidth) x = window.innerWidth - contextMenu.offsetWidth - 5;
        if (y + contextMenu.offsetHeight > window.innerHeight) y = window.innerHeight - contextMenu.offsetHeight - 5;
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
    }
    // Context Menu Actions
    document.addEventListener('click', () => document.getElementById('rightClickMenu').classList.remove('IsVisible'));
    document.getElementById('ctxOptions').addEventListener('click', () => { if (ContextExtId.optionsUrl) chrome.tabs.create({ url: ContextExtId.optionsUrl }); });
    document.getElementById('ctxHomepage').addEventListener('click', () => { if (ContextExtId.homepageUrl) chrome.tabs.create({ url: ContextExtId.homepageUrl }); });
    document.getElementById('ctxUninstall').addEventListener('click', () => chrome.management.uninstall(ContextExtId.id, { showConfirmDialog: true }, Render));
    document.getElementById('ctxReload').addEventListener('click', () => {
        chrome.management.setEnabled(ContextExtId.id, false, () => chrome.management.setEnabled(ContextExtId.id, true, Render));
    });

    // Lock context Profile group action
    document.getElementById('ctxLock').addEventListener('click', () => {
        const grp = AppState.Groups[ProfileSelect.value];
        if (grp.includes(ContextExtId.id)) grp.splice(grp.indexOf(ContextExtId.id), 1);
        else grp.push(ContextExtId.id);
        SaveAppState(AppState); Render();
    });

    // Temporary Timer Action Initiator
    document.getElementById('ctxTempEnable').addEventListener('click', (e) => {
        e.stopPropagation();
        TempModal.style.display = 'flex';
    });

    BtnNoTempModal.addEventListener('click', () => {
        TempModal.style.display = 'none';
    });

    BtnOkTempModal.addEventListener('click', async () => {
        const minutes = parseInt(TempDuration.value, 10);
        if (ContextExtId) {
            chrome.management.setEnabled(ContextExtId.id, true, async () => {
                const alarmName = "TempDisable_" + ContextExtId.id;
                await chrome.alarms.create(alarmName, { delayInMinutes: minutes });
                TempModal.style.display = 'none';
                Render();
            });
        }
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
        if (confirm("Uninstalling multiple extensions will trigger native confirmation alerts. Continue?")) {
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
            alert(`Added ${selectedExts.size} extensions to profile: ${grpName}`);
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