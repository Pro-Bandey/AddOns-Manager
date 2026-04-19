document.addEventListener('DOMContentLoaded', async () => {
    const AppState = await LoadAppState();

    const BoxActives = document.getElementById('BoxActives');
    const BoxInActives = document.getElementById('BoxInActives');
    const Search = document.getElementById('SearchInput');
    const ProfileSelect = document.getElementById('ProfileSelect');

    const LayoutSel = document.getElementById('LayoutSelect');
    const ThemeSel = document.getElementById('ThemeSelect');
    
    if (!AppState.ShowThemeToggle && ThemeSel) ThemeSel.style.display = 'none';
    if (!AppState.ShowLayoutToggle && LayoutSel) LayoutSel.style.display = 'none';

    LayoutSel.innerHTML = `<option value="GridLayout">Grid</option><option value="ListLayout">List</option><option value="CompactLayout">Compact</option>`;
    LayoutSel.value = AppState.Layout;
    ThemeSel.value = AppState.Theme;

    // Load the Profiles into the Dropdown
    Object.keys(AppState.Groups).forEach(g => {
        const opt = document.createElement('option'); opt.value = g; opt.innerText = g;
        ProfileSelect.appendChild(opt);
    });

    // Remember the last selected profile from Storage
    if (AppState.PopupSelectedProfile && AppState.Groups[AppState.PopupSelectedProfile]) {
        ProfileSelect.value = AppState.PopupSelectedProfile;
    } else {
        ProfileSelect.value = "";
    }

    let ContextExtId = null;

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
            
            li.innerHTML = `
                ${isDev && AppState.ShowDevBadge ? '<i>DEV</i>' : ''}
                ${isInProfile ? '<span style="position:absolute;left: 0px;top: 0px;width: 15px;height: 15px;background-color: var(--AdnMgrColorPrimaryContainer);border-radius:50%;border:2px solid var(--AdnMgrColorCard);z-index:2;box-shadow:0 1px 2px rgba(0,0,0,0.3);"></span>' : ''}
                <span>${name}</span>
            `;

            li.addEventListener('click', () => {
                chrome.management.setEnabled(ext.id, !ext.enabled, Render);
            });

            li.addEventListener('contextmenu', async (e) => {
                e.preventDefault();
                ContextExtId = ext;

                const menu = document.getElementById('rightClickMenu');
                menu.style.left = `${e.clientX}px`;
                menu.style.top = `${e.clientY}px`;
                menu.classList.add('IsVisible');

                const color = await GetDominantColor(iconUrl);
                const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;
                document.getElementById('ctxName').innerText = name;
                document.getElementById('ctxName').style.background = rgb;
                menu.querySelectorAll('li').forEach(el => el.style.background = rgb);

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
    }

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

    Search.addEventListener('input', Render);
    
    // --- FIXED: Instantly Enable/Disable extensions based on selected profile ---
    ProfileSelect.addEventListener('change', async (e) => { 
        const selectedProfile = e.target.value;
        AppState.PopupSelectedProfile = selectedProfile; 
        SaveAppState(AppState); 

        // If a specific profile is selected, update Chrome extensions
        if (selectedProfile && AppState.Groups[selectedProfile]) {
            const profileExtIds = AppState.Groups[selectedProfile];
            const exts = await GetExtensions();

            // Create a batch of promises to switch extensions synchronously
            const promises = exts.map(ext => {
                const shouldBeEnabled = profileExtIds.includes(ext.id);
                // Only ask Chrome to toggle if the state needs to change
                if (ext.enabled !== shouldBeEnabled) {
                    return new Promise(res => {
                        chrome.management.setEnabled(ext.id, shouldBeEnabled, () => {
                            if(chrome.runtime.lastError) { /* Ignore extensions we can't control */ }
                            res();
                        });
                    });
                }
                return Promise.resolve();
            });

            // Wait for all toggles to finish, then render
            await Promise.all(promises);
        }

        Render(); 
    });

    LayoutSel.addEventListener('change', (e) => { AppState.Layout = e.target.value; SaveAppState(AppState); Render(); });
    ThemeSel.addEventListener('change', (e) => { AppState.Theme = e.target.value; SaveAppState(AppState); Render(); });
    document.getElementById('BtnDashboard').addEventListener('click', () => chrome.tabs.create({ url: 'dashboard.html' }));

    Render();
});