importScripts('sharedUtils.js');

// 1. TIME-BASED SCHEDULING (Alarms API)
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("ScheduleCheck", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "ScheduleCheck") {
        const AppState = await LoadAppState();
        if (!AppState.Schedules || AppState.Schedules.length === 0) return;

        const now = new Date();
        const currentDay = now.getDay().toString(); // 0 (Sun) to 6 (Sat)
        const currentDate = now.getDate().toString();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        AppState.Schedules.forEach(sched => {
            // Check if Time matches
            if (sched.time === currentTime) {
                const dayMatch = sched.days && sched.days.includes(currentDay);
                const dateMatch = sched.dates && sched.dates.includes(currentDate);

                if (dayMatch || dateMatch) {
                    const enable = sched.action === 'enable';
                    if (sched.type === 'extension') {
                        chrome.management.setEnabled(sched.target, enable, () => {
                            if (chrome.runtime.lastError) console.warn("Ext toggle failed");
                        });
                    } else if (sched.type === 'profile' && AppState.Groups[sched.target]) {
                        // Toggle all extensions in the profile
                        AppState.Groups[sched.target].forEach(extId => {
                            chrome.management.setEnabled(extId, enable, () => chrome.runtime.lastError);
                        });
                    }
                }
            }
        });
    }
});

// 2. SITE-BASED AUTO TOGGLES (Tabs API)
async function EvaluateSiteRules(url) {
    if (!url || !url.startsWith('http')) return;

    let domain = "";
    try { domain = new URL(url).hostname; } catch (e) { return; }

    const AppState = await LoadAppState();
    if (!AppState.SiteRules || AppState.SiteRules.length === 0) return;

    AppState.SiteRules.forEach(rule => {
        const isMatch = domain.includes(rule.domain);
        const shouldEnable = rule.action === 'enable' ? isMatch : !isMatch;
        // If domain matches, apply action. If not, apply opposite.
        
        chrome.management.get(rule.extId, (extInfo) => {
            if (chrome.runtime.lastError) return;
            if (extInfo.enabled !== shouldEnable) {
                chrome.management.setEnabled(rule.extId, shouldEnable, () => chrome.runtime.lastError);
            }
        });
    });
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (!chrome.runtime.lastError && tab.url) EvaluateSiteRules(tab.url);
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) EvaluateSiteRules(changeInfo.url);
});