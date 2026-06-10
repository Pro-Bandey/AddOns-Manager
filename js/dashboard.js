document.addEventListener('DOMContentLoaded', async () => {
    let AppState = await LoadAppState();
    let ActiveGroup = Object.keys(AppState.Groups)[0];

    // Navigation Drawer Setup
    document.querySelectorAll('.SidebarItem').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.SidebarItem').forEach(i => i.classList.remove('IsActive'));
            document.querySelectorAll('.TabPanel').forEach(p => p.classList.remove('IsVisible'));
            item.classList.add('IsActive');
            document.getElementById(item.dataset.tab).classList.add('IsVisible');
        });
    });

    document.getElementById('BtnCloseInfoModal').addEventListener('click', () => {
        document.getElementById('InfoModal').classList.remove('IsVisible');
    });
    document.addEventListener('click', () => {
        document.getElementById('InfoModal').classList.remove('IsVisible');
    });

    // General Settings Setup
    const Sizes = ['small', 'normal', 'large'];
    document.querySelectorAll('input[name="Theme"]').forEach(r => { if (r.value === AppState.Theme) r.checked = true; r.addEventListener('change', e => { AppState.Theme = e.target.value; SaveAppState(AppState); ApplyThemeAndLayout(AppState); }); });
    document.querySelectorAll('input[name="Layout"]').forEach(r => { if (r.value === AppState.Layout) r.checked = true; r.addEventListener('change', e => { AppState.Layout = e.target.value; SaveAppState(AppState); }); });

    const colInput = document.getElementById('GridColumns'); colInput.value = AppState.GridColumns; document.getElementById('ColVal').innerText = AppState.GridColumns;
    colInput.addEventListener('input', e => { AppState.GridColumns = e.target.value; document.getElementById('ColVal').innerText = e.target.value; SaveAppState(AppState); ApplyThemeAndLayout(AppState); });

    const sizeInput = document.getElementById('IconSize'); sizeInput.value = Sizes.indexOf(AppState.IconSize);
    sizeInput.addEventListener('input', e => { AppState.IconSize = Sizes[e.target.value]; SaveAppState(AppState); ApplyThemeAndLayout(AppState); });

    const togTheme = document.getElementById('ShowTheme');
    if (togTheme) { togTheme.checked = AppState.ShowThemeToggle; togTheme.addEventListener('change', e => { AppState.ShowThemeToggle = e.target.checked; SaveAppState(AppState); }); }

    const togDev = document.getElementById('ShowDev');
    if (togDev) { togDev.checked = AppState.ShowDevBadge; togDev.addEventListener('change', e => { AppState.ShowDevBadge = e.target.checked; SaveAppState(AppState); RenderGroups(); }); }

    ApplyThemeAndLayout(AppState);

    // Backup & Restore
    document.getElementById('BtnExport').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "AddOns-Manager_Backup.json");
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


    // ------------ PROFILES RENDERER ------------
    async function RenderGroups() {
        const tabs = document.getElementById('ProfileTabs'); tabs.innerHTML = '';
        Object.keys(AppState.Groups).forEach(group => {
            const li = document.createElement('li');
            if (group === ActiveGroup) li.className = 'cur';
            li.innerHTML = `${group} <i class="group-del"><svg class="icon"><use href="icons/icons.svg#icon-delete"></use></svg></i><i class="group-renam"><svg class="icon"><use href="icons/icons.svg#icon-pen"></use></svg></i>`;

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
    }

    // ------------ NAME EDIT RENDERER ------------
    async function RenderNameEdit() {
        const grid = document.getElementById('NameGrid'); grid.innerHTML = '';
        const exts = await GetExtensions();
        exts.forEach(ext => {
            const custom = AppState.CustomInfo[ext.id] || {};
            const card = document.createElement('div');
            card.className = 'CardEditRow';
            card.innerHTML = `
                <img src="${GetBestIcon(ext.icons)}" style="width:44px; height:44px; margin:0 auto; border-radius:8px;">
                <input type="text" value="${custom.name || ext.name}" style="padding:4px;margin-top:8px;border-radius: var(--AdnMgrShapePill);outline: none;border: .5px solid var(--AdnMgrColorOnSidebar);" placeholder="Alias Name">
            `;
            card.querySelector('input[type="text"]').addEventListener('input', e => {
                if (!AppState.CustomInfo[ext.id]) AppState.CustomInfo[ext.id] = {};
                AppState.CustomInfo[ext.id].name = e.target.value; SaveAppState(AppState);
            });
            grid.appendChild(card);
        });
    }

    // ------------ SITE RULES RENDERER ------------
    async function RenderSiteRules() {
        const exts = await GetExtensions();
        const sel = document.getElementById('RuleExtSelect');
        sel.innerHTML = '';
        exts.forEach(e => sel.appendChild(new Option(e.name, e.id)));

        const list = document.getElementById('RulesList'); list.innerHTML = '';
        if (!AppState.SiteRules) AppState.SiteRules = [];

        AppState.SiteRules.forEach(rule => {
            const extName = exts.find(e => e.id === rule.extId)?.name || 'Unknown Ext';
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="InfoText">On <b>${rule.domain}</b> &rarr; <span style="color:${rule.action==='enable'?'var(--AdnMgrColorSuccess)':'var(--AdnMgrColorError)'}">${rule.action.toUpperCase()}</span> <b>${extName}</b></div>
                <button title="Remove Rule"><svg class="icon"><use href="icons/icons.svg#icon-delete"></use></svg></button>
            `;
            li.querySelector('button').addEventListener('click', () => {
                AppState.SiteRules = AppState.SiteRules.filter(r => r.id !== rule.id);
                SaveAppState(AppState); RenderSiteRules();
            });
            list.appendChild(li);
        });
    }

    document.getElementById('BtnAddRule').addEventListener('click', () => {
        const domain = document.getElementById('RuleDomain').value.trim();
        const extId = document.getElementById('RuleExtSelect').value;
        const action = document.getElementById('RuleActionSelect').value;
        if (domain && extId) {
            AppState.SiteRules.push({ id: Date.now().toString(), domain, extId, action });
            SaveAppState(AppState); RenderSiteRules();
            document.getElementById('RuleDomain').value = '';
        } else { alert("Domain is required"); }
    });

    // ------------ SCHEDULES RENDERER ------------
    async function RenderSchedules() {
        const exts = await GetExtensions();
        const typeSel = document.getElementById('SchedType');
        const targetSel = document.getElementById('SchedTarget');
        
        function populateTargets() {
            targetSel.innerHTML = '';
            if (typeSel.value === 'extension') {
                exts.forEach(e => targetSel.appendChild(new Option(e.name, e.id)));
            } else {
                Object.keys(AppState.Groups).forEach(g => targetSel.appendChild(new Option(g, g)));
            }
        }
        typeSel.removeEventListener('change', populateTargets);
        typeSel.addEventListener('change', populateTargets);
        if(targetSel.options.length === 0) populateTargets();

        const list = document.getElementById('SchedsList'); list.innerHTML = '';
        if (!AppState.Schedules) AppState.Schedules = [];

        AppState.Schedules.forEach(sched => {
            const targetName = sched.type === 'extension' ? (exts.find(e => e.id === sched.target)?.name || 'Unknown') : `Profile: ${sched.target}`;
            const dayMap = {0:"Sun", 1:"Mon", 2:"Tue", 3:"Wed", 4:"Thu", 5:"Fri", 6:"Sat"};
            const daysStr = sched.days ? sched.days.map(d => dayMap[d]).join(', ') : '';
            const datesStr = sched.dates ? `Dates: ${sched.dates.join(', ')}` : '';
            const conds = [daysStr, datesStr].filter(Boolean).join(' | ');

            const li = document.createElement('li');
            li.innerHTML = `
                <div class="InfoText">
                    <b>${sched.time}</b> &rarr; <span style="color:${sched.action==='enable'?'var(--AdnMgrColorSuccess)':'var(--AdnMgrColorError)'}">${sched.action.toUpperCase()}</span> <b>${targetName}</b>
                    <div style="font-size:12px; color:var(--AdnMgrColorOnSurfaceVariant); margin-top:4px;">${conds}</div>
                </div>
                <button title="Remove Schedule"><svg class="icon"><use href="icons/icons.svg#icon-delete"></use></svg></button>
            `;
            li.querySelector('button').addEventListener('click', () => {
                AppState.Schedules = AppState.Schedules.filter(s => s.id !== sched.id);
                SaveAppState(AppState); RenderSchedules();
            });
            list.appendChild(li);
        });
    }

    document.getElementById('BtnAddSched').addEventListener('click', () => {
        const time = document.getElementById('SchedTime').value;
        if (!time) return alert("Time is required!");

        const days = Array.from(document.querySelectorAll('input[name="SchedDay"]:checked')).map(cb => cb.value);
        const datesRaw = document.getElementById('SchedDates').value;
        const dates = datesRaw.split(',').map(d => d.trim()).filter(d => d && !isNaN(d));

        AppState.Schedules.push({
            id: Date.now().toString(),
            type: document.getElementById('SchedType').value,
            target: document.getElementById('SchedTarget').value,
            action: document.getElementById('SchedAction').value,
            time: time,
            days: days.length > 0 ? days : null,
            dates: dates.length > 0 ? dates : null
        });
        SaveAppState(AppState); RenderSchedules();
        document.getElementById('SchedDates').value = '';
    });

    // ------------ SECURITY AUDIT RENDERER ------------
    async function RenderSecurityAudit() {
        const grid = document.getElementById('RiskGrid'); grid.innerHTML = '';
        const exts = await GetExtensions();
        let counts = { High: 0, Medium: 0, Low: 0 };

        exts.forEach(ext => {
            const riskLevel = AssessRisk(ext.permissions, ext.hostPermissions);
            counts[riskLevel]++;

            const permissionsStr = [...(ext.permissions||[]), ...(ext.hostPermissions||[])].join(', ') || 'None';

            const row = document.createElement('div');
            row.className = 'RiskAuditRow';
            row.innerHTML = `
                <img src="${GetBestIcon(ext.icons)}" />
                <div class="RiskAuditDetails">
                    <div class="RiskAuditName">${ext.name}</div>
                    <div class="RiskAuditPermissions"><b>Access:</b> ${permissionsStr}</div>
                </div>
                <div class="RiskBadge ${riskLevel.toLowerCase()}">${riskLevel}</div>
            `;
            grid.appendChild(row);
        });

        document.getElementById('RiskCountHigh').innerText = counts.High;
        document.getElementById('RiskCountMed').innerText = counts.Medium;
        document.getElementById('RiskCountLow').innerText = counts.Low;
    }

    // Init All Modules
    RenderGroups(); 
    RenderNameEdit();
    RenderSiteRules();
    RenderSchedules();
    RenderSecurityAudit();
});