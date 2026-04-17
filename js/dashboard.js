
document.addEventListener('DOMContentLoaded', async () => {
    let AppState = await LoadAppState();
    let ActiveGroup = Object.keys(AppState.Groups)[0];

    document.querySelectorAll('.SidebarItem').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.SidebarItem').forEach(i => i.classList.remove('IsActive'));
            document.querySelectorAll('.TabPanel').forEach(p => p.classList.remove('IsVisible'));
            item.classList.add('IsActive');
            document.getElementById(item.dataset.tab).classList.add('IsVisible');
        });
    });

    const Sizes = ['small', 'normal', 'large'];
    document.querySelectorAll('input[name="Theme"]').forEach(r => { if (r.value === AppState.Theme) r.checked = true; r.addEventListener('change', e => { AppState.Theme = e.target.value; SaveAppState(AppState); ApplyThemeAndLayout(AppState); }); });
    document.querySelectorAll('input[name="Layout"]').forEach(r => { if (r.value === AppState.Layout) r.checked = true; r.addEventListener('change', e => { AppState.Layout = e.target.value; SaveAppState(AppState); }); });

    const colInput = document.getElementById('GridColumns'); colInput.value = AppState.GridColumns; document.getElementById('ColVal').innerText = AppState.GridColumns;
    colInput.addEventListener('input', e => { AppState.GridColumns = e.target.value; document.getElementById('ColVal').innerText = e.target.value; SaveAppState(AppState); ApplyThemeAndLayout(AppState); });

    const sizeInput = document.getElementById('IconSize'); sizeInput.value = Sizes.indexOf(AppState.IconSize);
    sizeInput.addEventListener('input', e => { AppState.IconSize = Sizes[e.target.value]; SaveAppState(AppState); ApplyThemeAndLayout(AppState); });

    const togTheme = document.getElementById('ShowTheme'); togTheme.checked = AppState.ShowThemeToggle; togTheme.addEventListener('change', e => { AppState.ShowThemeToggle = e.target.checked; SaveAppState(AppState); });
    const togDev = document.getElementById('ShowDev'); togDev.checked = AppState.ShowDevBadge; togDev.addEventListener('change', e => { AppState.ShowDevBadge = e.target.checked; SaveAppState(AppState); RenderGroups(); });

    ApplyThemeAndLayout(AppState);

    document.getElementById('BtnExport').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "ProManager_Backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('BtnImport').addEventListener('click', () => document.getElementById('ImportFile').click());

    document.getElementById('ImportFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedState = JSON.parse(event.target.result);
                AppState = { ...AppState, ...importedState };
                await SaveAppState(AppState);
                alert("Settings imported successfully!");
                location.reload();
            } catch (err) {
                alert("Invalid backup file!");
            }
        };
        reader.readAsText(file);
    });

    async function RenderGroups() {
        const tabs = document.getElementById('ProfileTabs'); tabs.innerHTML = '';
        Object.keys(AppState.Groups).forEach(group => {
            const li = document.createElement('li');
            if (group === ActiveGroup) li.className = 'cur';
            li.innerHTML = `${group} <i class="group-del"></i><i class="group-renam"></i>`;

            li.querySelector('.group-del').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete profile ${group}?`)) { delete AppState.Groups[group]; ActiveGroup = Object.keys(AppState.Groups)[0] || null; SaveAppState(AppState); RenderGroups(); }
            });
            li.querySelector('.group-renam').addEventListener('click', (e) => {
                e.stopPropagation();
                const newName = prompt('New Name:', group);
                if (newName && newName !== group && !AppState.Groups[newName]) {
                    AppState.Groups[newName] = AppState.Groups[group];
                    delete AppState.Groups[group]; if (ActiveGroup === group) ActiveGroup = newName; SaveAppState(AppState); RenderGroups();
                }
            });
            li.addEventListener('click', () => { ActiveGroup = group; RenderGroups(); });
            tabs.appendChild(li);
        });

        const addBtn = document.createElement('li'); addBtn.className = 'group-add-btn'; addBtn.innerText = '+';
        addBtn.addEventListener('click', () => { const n = prompt('Profile Name:'); if (n && !AppState.Groups[n]) { AppState.Groups[n] = []; ActiveGroup = n; SaveAppState(AppState); RenderGroups(); } });
        tabs.appendChild(addBtn);

        const grid = document.getElementById('GroupGrid'); grid.innerHTML = '';
        const exts = await GetExtensions();

        exts.forEach(ext => {
            const custom = AppState.CustomInfo[ext.id] || {};
            const li = document.createElement('li');
            li.style.backgroundImage = `url("${custom.icon || GetBestIcon(ext.icons)}")`;
            if (ActiveGroup && !AppState.Groups[ActiveGroup].includes(ext.id)) { li.style.filter = 'grayscale(100%)'; li.style.opacity = '0.5'; }
            li.innerHTML = `<span>${custom.name || ext.name}</span>`;

            li.addEventListener('click', () => {
                if (!ActiveGroup) return;
                const grp = AppState.Groups[ActiveGroup];
                if (grp.includes(ext.id)) grp.splice(grp.indexOf(ext.id), 1); else grp.push(ext.id);
                SaveAppState(AppState); RenderGroups();
            });

            li.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                chrome.management.get(ext.id, (info) => {
                    document.getElementById('ModName').innerText = custom.name || info.name;
                    document.getElementById('ModVer').innerHTML = `<b>Version:</b> ${info.version}`;
                    document.getElementById('ModDesc').innerHTML = `<b>Description:</b> ${info.description}`;
                    document.getElementById('ModPerm').innerHTML = `<b>Permissions:</b> ${(info.permissions || []).join(', ') || 'None'}`;
                    document.getElementById('ModHome').innerHTML = info.homepageUrl ? `<a href="${info.homepageUrl}" target="_blank">Homepage</a>` : '';
                    document.getElementById('InfoModal').classList.add('IsVisible');
                });
            });
            grid.appendChild(li);
        });
        document.getElementById('BtnCloseInfoModal').addEventListener('click', () => {
            document.getElementById('InfoModal').classList.remove('IsVisible');
        });
    }

    async function RenderNameEdit() {
        const grid = document.getElementById('NameGrid');
        grid.innerHTML = '';
        const exts = await GetExtensions();

        exts.forEach(ext => {
            const custom = AppState.CustomInfo[ext.id] || {};
            const card = document.createElement('div');
            card.className = 'CardEditRow';
            card.innerHTML = `
                <img src="${GetBestIcon(ext.icons)}" style="width:44px; height:44px; margin:0 auto; border-radius:8px;">
                <input type="text" value="${custom.name || ext.name}" style="padding:4px; margin-top:8px;" placeholder="Alias Name">
            `;

            card.querySelector('input[type="text"]').addEventListener('input', e => {
                if (!AppState.CustomInfo[ext.id]) AppState.CustomInfo[ext.id] = {};
                AppState.CustomInfo[ext.id].name = e.target.value;
                SaveAppState(AppState);
            });

            grid.appendChild(card);
        });
    }
    RenderGroups(); RenderNameEdit();
});