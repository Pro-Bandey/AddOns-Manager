chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!changeInfo.url) return;

    const data = await chrome.storage.local.get(['AppRules']);
    const rules = data.AppRules || [];

    for (const rule of rules) {
        if (changeInfo.url.includes(rule.matchUrl)) {
            rule.extensionIds.forEach(id => {
                chrome.management.setEnabled(id, true);
            });
        }
    }
});