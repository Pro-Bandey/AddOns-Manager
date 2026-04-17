
document.addEventListener('DOMContentLoaded', async () => {
    const AppState = await LoadAppState();

    const BoxActives = document.getElementById('BoxActives');
    const BoxInActives = document.getElementById('BoxInActives');
    const Search = document.getElementById('SearchInput');
    const ProfileSelect = document.getElementById('ProfileSelect');

    const LayoutSel = document.getElementById('LayoutSelect');
    const ThemeSel = document.getElementById('ThemeSelect');
    if (!AppState.ShowThemeToggle) ThemeSel.style.display = 'none';

    LayoutSel.innerHTML = `<option value="GridLayout">Grid</option><option value="ListLayout">List</option><option value="CompactLayout">Content</option>`;
    LayoutSel.value = AppState.Layout;
    ThemeSel.value = AppState.Theme;

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
            if (profile && !profile.includes(ext.id)) continue;

            const isDev = ext.installType === 'development';

            const li = document.createElement('li');
            li.dataset.id = ext.id;
            li.style.backgroundImage = `url("${iconUrl}")`;
            li.innerHTML = `
                ${isDev && AppState.ShowDevBadge ? '<i>DEV</i>' : ''}
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

                document.getElementById('ctxName').innerText = name;
                // menu.querySelectorAll('li').forEach(el => el.style.background = `var(${rgbVar})`;

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
    ProfileSelect.addEventListener('change', Render);
    LayoutSel.addEventListener('change', (e) => { AppState.Layout = e.target.value; SaveAppState(AppState); Render(); });
    ThemeSel.addEventListener('change', (e) => { AppState.Theme = e.target.value; SaveAppState(AppState); Render(); });
    document.getElementById('BtnDashboard').addEventListener('click', () => chrome.tabs.create({ url: 'dashboard.html' }));

    Object.keys(AppState.Groups).forEach(g => {
        const opt = document.createElement('option'); opt.value = g; opt.innerText = g;
        ProfileSelect.appendChild(opt);
    });

    Render();
});