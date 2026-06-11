# AddOns Manager 
![Logo](icons/128.png)
A lightweight, strictly vanilla Chrome Extension Manager designed with **Material Design 3 (M3)** guidelines. Effortlessly manage, group, schedule, and inspect your browser extensions without the footprint of heavy third-party frameworks. 

![Users](https://img.shields.io/badge/Users-600+-yellow)
![Total Downloads](https://img.shields.io/badge/Downloads-700+-blue)
![Daily Installs](https://img.shields.io/badge/Daily%20Visitor-40--55-orange)
![Build](https://img.shields.io/badge/Build-Passing-lime)
![Maintenance](https://img.shields.io/badge/Maintained-Yes-success)

## ✨ Key Features

- **🎨 Dynamic Material Design 3 UI**: The interface dynamically extracts the dominant color from each extension's icon using a background canvas algorithm, applying matching visual tints to hover states and custom right-click menus.
- **🗂️ Profiles & Workspaces**: Create custom groups (e.g., "Work Mode", "Reading", "Dev Tools"). Switch profiles from the popup to instantly enable/disable massive batches of extensions with a single click.
- **⌛ Ephemeral Timers (Temporary Enable)**: Temporarily activate extensions for a selected duration (1 minute to 4 hours). The extension automatically disables itself once the timer expires, helping preserve system memory.
- **🌐 Advanced Site-Based Rules**: Set automated, domain-specific rules to enable or disable individual extensions **or entire profiles** dynamically when navigating to matching website domains.
- **⏰ Time-Based Scheduler**: Design recurring daily plans or specify monthly calendar dates to enable/disable workspace profiles or individual add-ons automatically.
- **🛡️ Security & Risk Assessor**: Performs static reviews of extension manifest clearances to group them into High, Medium, and Low risk. Features a collapsible inspector outlining exactly what access privileges each extension possesses.
- **🔍 Typo-Tolerant Fuzzy Search**: Utilizes real-time, sequence-aware fuzzy search matching for finding specific extensions quickly, even with typos.
- **💬 Async Custom Dialog Overlays**: Fully custom, non-blocking input modal boxes and warning dialogs built directly into the DOM, eliminating standard browser-native blocking dialogs (`alert`, `confirm`, `prompt`).
- **♿ Accessible Focus States**: Full support for keyboard-tabbed navigation with clear interactive outline indicator highlights (`:focus-visible`) and keyboard trigger actions.
- **⚡ Zero Dependencies**: Built entirely with Vanilla JS and CSS3 variables for maximum browser performance and minimal memory overhead.
- **📱 Advanced Layout Engine**: Choose between Grid, List, and Compact views. Adjust Grid Columns (4 to 7) and Icon Sizes with intuitive sliders on the dashboard.
- **✏️ Custom Aliases**: Give extensions custom, recognizable alias names directly from the Dashboard.
- **☁️ Google Account Sync**: Automatically syncs profiles, themes, and configuration structures across all your devices using Chrome's native sync storage.
- **💾 Backup, Merge, & Restore**: Export your curated profiles, rules, and settings to a `.json` file, with support to overwrite or merge configurations on new devices.

---

## 🛠️ Usage Guide

### 📂 Workspace Profiles & Multi-Select
- **Switching Profiles**: Open the popup and select a profile from the top dropdown. This action instantly disables all extensions *not* mapped to that profile, and enables those that are.
- **Batch Actions**: Toggle multi-select mode in the popup to choose several extensions, then enable, disable, uninstall, or add them to workspace profiles simultaneously from the sliding footer drawer.
- **Locking/Pinning**: Right-click any extension in the popup and click **Lock/Unlock** to bind or unbind it from the currently selected workspace profile.

### ⌛ Temporary Activation (Timer Mode)
- Right-click an extension in the popup and choose **Enable Temporarily...**.
- Select your target duration from the modal window. The extension turns on instantly, and a background alarm processes its teardown automatically once time is up.

### 🌐 Site-Based Auto-Toggles
- Navigate to the **Site Rules** tab in the Dashboard.
- Provide a target website domain (e.g., `github.com`), select whether to toggle an individual extension or a complete profile, set the target, choose your behavior (Enable/Disable), and save.

### ⏰ Automated Scheduling
- Under the **Schedules** tab, designate your action time.
- Map the target (extension or profile group) and choose repeating days of the week (e.g., Monday through Friday) or specific days of the month (e.g., `1, 15, 30`).

### 🛡️ Auditing Permissions
- Visit the **Security View** tab on the dashboard to view High, Medium, and Low risk summaries.
- Click on any extension card to expand a detailed inspector breakdown explaining the security implications of its active permissions.

---

## 🔒 Permissions Justification

This extension operates locally and uses standard browser APIs securely:

- `management`: Required to query, enable, disable, and uninstall other extensions.
- `storage`: Required to save layout preferences, rule structures, and custom name mappings locally and to Google Cloud Sync.
- `tabs`: Required to evaluate site-based automatic rules on active browser pages and load option panels.
- `alarms`: Required to process recurring schedules and calculate temporary activation teardowns.

---

_Built to make power-browsing effortless._