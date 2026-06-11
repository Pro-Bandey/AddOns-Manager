importScripts('sharedUtils.js');

// 1. SCHEDULER & TEMPORARY TIMER ENGINE
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("ScheduleCheck", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    // A. Handle Ephemeral Timers
    if (alarm.name.startsWith("TempDisable_")) {
        const extId = alarm.name.replace("TempDisable_", "");
        chrome.management.setEnabled(extId, false, () => {
            if (chrome.runtime.lastError) console.warn("Failed to auto-disable temporary extension:", extId);
        });
        chrome.alarms.clear(alarm.name);
        return;
    }

    // B. Handle Recurring Schedules
    if (alarm.name === "ScheduleCheck") {
        const AppState = await LoadAppState();
        if (!AppState.Schedules || AppState.Schedules.length === 0) return;

        const now = new Date();
        const currentDay = now.getDay().toString(); // 0 (Sun) to 6 (Sat)
        const currentDate = now.getDate().toString();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        AppState.Schedules.forEach(sched => {
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
        
        if (rule.type === 'extension' || !rule.type) {
            // Target is an extension ID
            const targetId = rule.extId || rule.target;
            chrome.management.get(targetId, (extInfo) => {
                if (chrome.runtime.lastError || !extInfo) return;
                if (extInfo.enabled !== shouldEnable) {
                    chrome.management.setEnabled(targetId, shouldEnable, () => chrome.runtime.lastError);
                }
            });
        } else if (rule.type === 'profile' && AppState.Groups[rule.target]) {
            // Target is a complete Profile Profile
            const extList = AppState.Groups[rule.target];
            extList.forEach(id => {
                chrome.management.get(id, (extInfo) => {
                    if (chrome.runtime.lastError || !extInfo) return;
                    if (extInfo.enabled !== shouldEnable) {
                        chrome.management.setEnabled(id, shouldEnable, () => chrome.runtime.lastError);
                    }
                });
            });
        }
    });
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (!chrome.runtime.lastError && tab && tab.url) EvaluateSiteRules(tab.url);
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) EvaluateSiteRules(changeInfo.url);
});