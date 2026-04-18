# AddOns Manager 
![Logo](icons/128.png)
A blazing-fast, strictly vanilla Chrome Extension Manager inspired by **Material Design 3 (M3)**. Effortlessly manage, group, and customize your browser extensions without the bloat of heavy 3rd-party frameworks. 


![Users](https://img.shields.io/badge/Users-600+-yellow)
![Total Downloads](https://img.shields.io/badge/Downloads-700+-blue)
![Daily Installs](https://img.shields.io/badge/Daily%20Visitor-40--55-orange)
![Build](https://img.shields.io/badge/Build-Passing-lime)
![Maintenance](https://img.shields.io/badge/Maintained-Yes-success)

## ✨ Key Features

- **🎨 Dynamic Material Design 3 UI**: The interface dynamically extracts the dominant color from each extension's icon using a background canvas algorithm, automatically applying beautiful, matching tints to hover states and custom right-click menus.
- **🗂️ Profiles & Workspaces**: Create custom groups (e.g., "Work Mode", "Reading", "Dev Tools"). Switch profiles from the popup to instantly enable/disable massive batches of extensions with a single click.
- **⚡ Zero Dependencies**: Completely rewritten from the ground up without Bootstrap, Angular, or jQuery. Pure Vanilla JS and CSS3 for absolute maximum performance and zero lag.
- **📱 Advanced Layout Engine**: Choose between Grid, List, and Compact views. Use the dashboard sliders to precisely adjust Grid Columns (5 to 10) and Icon Sizes.
- **✏️ Custom Aliases**: Give extensions custom, recognizable names directly from the Dashboard.
- **☁️ Google Account Sync**: Automatically syncs your Profiles, Themes, and Layout settings across all your devices using Chrome's native sync storage.
- **🖱️ Smart Context Menu**: Right-click any extension in the popup to instantly access Options, Homepage, Uninstall, Reload, or to "Lock/Unlock" it into your current active profile.
- **💾 Import & Export**: Back up your carefully curated profiles and settings to a `.json` file and restore them anywhere.
- **🌓 Auto-Theming**: Supports Light, Dark, and "Auto" (syncs with your Operating System's color scheme).

## 🛠️ Usage Guide

- **Switching Profiles**: Open the popup and use the top dropdown. Selecting a profile will instantly disable all extensions _not_ in that profile, and enable all extensions _in_ it.
- **Locking Extensions**: Want to add an extension to your current profile? Right-click it in the popup and click **Lock**. A small colored dot will appear on the icon to indicate it is part of the active profile.
- **Dashboard Settings**: Click the ⚙️ icon in the popup to open the full dashboard. Here you can tweak column counts, toggle visibility of UI elements, and rename your extensions.
- **Reloading Extensions**: If an extension crashes or gets stuck, right-click it in the popup and click **Reload**.

## 🔒 Permissions Justification

This extension requires minimal permissions to operate securely:

- `management`: Required to fetch, enable, disable, and uninstall your extensions.
- `storage`: Required to save your layout preferences, profiles, and custom aliases locally and to Google Cloud Sync.
- `tabs`: Required to open extension Option pages and Homepages in a new browser tab.

---

_Built to make power-browsing effortless._
