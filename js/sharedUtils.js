const DefaultState = {
    Theme: 'Auto',
    Layout: 'GridLayout',
    GridColumns: 5,
    IconSize: 'normal',
    ShowDevBadge: true,
    ShowThemeToggle: true,
    ShowLayoutToggle: true,
    PopupSelectedProfile: '',
    Groups: { "My Profile": [] },
    CustomInfo: {}
};

async function LoadAppState() {
    const localData = await chrome.storage.local.get(['ProManager_State']);
    let localState = localData.ProManager_State || {};

    try {
        const syncData = await chrome.storage.sync.get(['ProManager_SyncState']);
        if (syncData.ProManager_SyncState) {
            const preservedCustomInfo = localState.CustomInfo || {};
            localState = { ...localState, ...syncData.ProManager_SyncState };
            localState.CustomInfo = preservedCustomInfo;
        }
    } catch (e) { console.warn("Sync read failed", e); }

    return { ...DefaultState, ...localState };
}

async function SaveAppState(state) {
    Object.keys(state.CustomInfo || {}).forEach(id => {
        if (state.CustomInfo[id].icon) {
            delete state.CustomInfo[id].icon;
        }
    });
    await chrome.storage.local.set({ ProManager_State: state });

    try {
        await chrome.storage.sync.set({ ProManager_SyncState: state });
    } catch (e) {
        console.warn("Cloud Sync failed", e);
    }
}

async function GetExtensions() {
    const exts = await new Promise(res => chrome.management.getAll(res));
    return exts
        .filter(e => e.id !== chrome.runtime.id && e.type === 'extension')
        .sort((a, b) => a.name.localeCompare(b.name));
}

function GetBestIcon(icons) {
    if (!icons || !icons.length) return 'icons/NoExtensionIcon.png';
    return icons.sort((a, b) => b.size - a.size)[0].url;
}

const ColorCache = {};
function GetDominantColor(imgUrl) {
    return new Promise((resolve) => {
        if (ColorCache[imgUrl]) return resolve(ColorCache[imgUrl]);
        const img = new Image(); img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
            try {
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 16) {
                    if (data[i + 3] > 128) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; }
                }
                const res = count > 0 ? { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) } : { r: 37, g: 33, b: 108 };
                ColorCache[imgUrl] = res; resolve(res);
            } catch (e) { resolve({ r: 37, g: 33, b: 108 }); }
        };
        img.onerror = () => resolve({ r: 37, g: 33, b: 108 }); img.src = imgUrl;
    });
}

function ApplyThemeAndLayout(state) {
    if (state.Theme === 'Auto') {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.className = isDark ? 'DarkMode' : 'LightMode';
    } else {
        document.body.className = state.Theme;
    }

    // Fixed CSS Property Variables so the sliders work correctly
    document.documentElement.style.setProperty('--AdnMgrGridColumns', state.GridColumns);
    const sizeMap = { 'small': '32px', 'normal': '48px', 'large': '64px' };
    document.documentElement.style.setProperty('--AdnMgrIconBgSize', sizeMap[state.IconSize] || '44px');
}