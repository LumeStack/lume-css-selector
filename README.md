<div align="center">
  <img src="Lume-css-selector.png" alt="Lume CSS Selector" width="120" />

  # Lume CSS Selector

  **Chrome DevTools extension for visually building CSS selectors**

  [![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](manifest.json)
  [![Manifest](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

  > Build precise CSS selectors by clicking element attributes — designed for test automation with Selenium, Cypress, and Playwright.
</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Installation](#-installation)
- [How to Use](#-how-to-use)
  - [1. Open the panel](#1-open-the-panel)
  - [2. Select an element](#2-select-an-element)
  - [3. Build the selector](#3-build-the-selector)
  - [4. Navigate matches](#4-navigate-matches)
  - [5. Copy the selector](#5-copy-the-selector)
- [Chip Types](#-chip-types)
- [Toolbar Reference](#-toolbar-reference)
- [Architecture](#-architecture)
  - [File Structure](#file-structure)
  - [How It Works](#how-it-works)
  - [Selector Building Logic](#selector-building-logic)
  - [Highlight Mechanism](#highlight-mechanism)
  - [Only Visible Filter](#only-visible-filter)
- [Development](#-development)
  - [Regenerating Icons](#regenerating-icons)
- [Browser Compatibility](#-browser-compatibility)

---

## 🔍 Overview

**Lume CSS Selector** is a Chrome DevTools extension that adds a sidebar panel inside the **Elements** tab. Instead of writing CSS selectors by hand, you click on element attribute chips — tags, IDs, classes, data attributes, ARIA roles, and more — and the extension assembles the selector for you in real time, highlights all matching elements on the page, and shows the match count.

It is particularly useful for:

- **QA Engineers** building locators for Selenium or Cypress
- **Frontend Developers** debugging element targeting
- **Automation teams** that need reliable, unique selectors fast

---

## ✨ Features

| Feature | Description |
|---|---|
| **Visual selector building** | Click chips to compose selectors — no typing required |
| **Full attribute exposure** | Shows every attribute on every ancestor: `data-*`, `aria-*`, `role`, custom attrs |
| **Live highlight** | Matching elements are outlined in blue on the page as you build |
| **Match counter** | Real-time `X / N` count of matching elements |
| **Prev / Next navigation** | Jump through each matching element with `«` / `»` buttons |
| **Per-chip count badges** | Each selected class or attribute chip shows its own individual match count |
| **Auto-scroll on single match** | When only one element matches, it scrolls into view automatically |
| **Only Visible filter** | Toggle to count/highlight only visible elements (excludes `display:none`, `visibility:hidden`, zero-size) |
| **Ancestor-aware combinators** | Uses `>` (direct child) or ` ` (descendant) combinators based on the actual DOM path |
| **Copy to clipboard** | One-click copy of the built selector |
| **Refresh** | Re-reads the selected element without switching DevTools focus |
| **Dark theme** | Styled to match Chrome DevTools dark mode |

---

## 📦 Installation

### From Chrome Web Store *(coming soon)*

Search for **Lume CSS Selector** in the [Chrome Web Store](https://chrome.google.com/webstore).

### Load Unpacked (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `css-selector-lume` folder
6. Open any webpage → press `F12` → go to the **Elements** tab → click the **Lume CSS Selector** sub-tab

> **Note:** The extension only works inside Chrome DevTools. It has no browser toolbar button.

---

## 🚀 How to Use

### 1. Open the panel

Open Chrome DevTools (`F12` or `Ctrl+Shift+I`), go to the **Elements** tab, and click the **Lume CSS Selector** tab in the sidebar panel strip.

### 2. Select an element

Click any element on the page using the DevTools element picker (the cursor icon in the top-left of DevTools), or click directly in the Elements tree. The panel will immediately display the element's ancestor hierarchy as a flat list of rows.

Each row represents one node in the DOM path from a top-level ancestor down to your selected element. The **selected element** is highlighted with a distinct background at the bottom of the list.

### 3. Build the selector

Each row contains clickable **chips** representing every attribute of that node:

```
div  #main-content  .container  .dark-mode  [data-theme="dark"]  [aria-label="Main"]  :nth-child(2)
```

Click any chip to **toggle it on/off**:
- Selected chips turn **blue** and are included in the CSS selector
- When you select a class or attribute chip, a **badge** appears showing how many elements on the page match that single chip alone
- The combined selector updates instantly in the status bar at the bottom

You can select chips from **multiple ancestor rows** to build a scoped selector (e.g., `div.container > button.submit`).

### 4. Navigate matches

The counter in the toolbar shows `- / N` when matches exist. Use the navigation buttons to step through each match:

| Button | Action |
|--------|--------|
| `«` | Go to previous match |
| `»` | Go to next match |

Each match is **scrolled into view** instantly and briefly highlighted with an **orange outline** to distinguish it from the persistent blue selector highlight.

When only **one element** matches, it is scrolled into view automatically without needing to press navigation buttons.

### 5. Copy the selector

Click the **copy** icon button (📋) in the toolbar. The selector is copied to your clipboard. The button turns green briefly to confirm the copy.

---

## 🎨 Chip Types

Chips are color-coded by attribute type, inspired by VS Code's syntax theme:

| Color | Type | Example |
|-------|------|---------|
| ⬜ White-grey | Tag name | `div`, `button`, `input` |
| 🔵 Light blue | ID | `#submit-btn` |
| 🟢 Teal | CSS class | `.btn-primary` |
| 🟠 Orange | `data-*` attribute | `[data-testid="login"]` |
| 🟡 Yellow | `style` attribute | `[style="display:block"]` |
| 🔴 Salmon | `aria-*` / `role` | `[aria-label="Close"]` |
| 🟣 Purple | `:nth-child` | `:nth-child(3)` |
| ⬜ Grey | Other attributes | `[type="text"]`, `[href]` |

Attribute values longer than 34 characters are **truncated** in the chip label with `...`, but the full value is always used in the CSS selector. Hover over a chip to see its full text in a tooltip.

---

## 🛠 Toolbar Reference

```
[ « ]  [ - / - ]  [ » ]     [ ↺ ]  [ 👁 ]  [ ⧉ ]
```

| Button | Label | Description |
|--------|-------|-------------|
| `«` | Previous | Navigate to the previous matching element |
| `- / -` | Counter | Shows `current / total` matches. `- / -` = no selector built. `- / N` = selector built, not navigating |
| `»` | Next | Navigate to the next matching element |
| ↺ | Refresh | Re-reads `$0` (the selected element) from DevTools. Useful after dynamic DOM changes |
| 👁 | Only Visible | Toggle to filter out hidden elements from the match count and navigation |
| ⧉ | Copy | Copies the current selector to the clipboard |

**Status bar** (below the toolbar): Shows the current selector in orange when active, or `Click attributes to build query` when idle.

---

## 🏗 Architecture

### File Structure

```
css-selector-lume/
├── manifest.json          # Extension manifest (Manifest V3)
├── devtools.html          # DevTools page entry point
├── devtools.js            # Registers the sidebar panel
├── panel.html             # Panel UI structure
├── panel.css              # Dark theme styles
├── panel.js               # All extension logic
├── generate-icons.js      # Node.js script to generate PNG icons from source image
├── Lume-css-selector.png  # Source icon image (firefly with magnifying glass)
├── icons/
│   ├── icon16.png         # 16×16 extension icon
│   ├── icon48.png         # 48×48 extension icon
│   └── icon128.png        # 128×128 extension icon
└── package.json           # Dev dependency: sharp (for icon generation)
```

### How It Works

The extension uses Chrome's **DevTools Extension APIs** (Manifest V3) with no background service worker — the panel runs entirely in the DevTools context and has direct access to `chrome.devtools.*`.

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome DevTools                          │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │ Elements tab │    │  Lume CSS Selector (sidebar pane) │   │
│  │              │    │                                    │   │
│  │  $0 ──────────────► onSelectionChanged event          │   │
│  │  (selected   │    │       │                            │   │
│  │   element)   │    │       ▼                            │   │
│  └──────────────┘    │  inspectedWindow.eval()            │   │
│                       │  (GET_ELEMENT_INFO script)        │   │
│                       │       │                            │   │
│                       │       ▼                            │   │
│                       │  renderHierarchy()                 │   │
│                       │  → chip click → buildSelector()   │   │
│                       │  → inspectedWindow.eval()          │   │
│                       │    (highlight + count script)     │   │
│                       └──────────────────────────────────┘   │
│                                    │                          │
│                       ┌────────────▼──────────────────────┐  │
│                       │       Inspected Page              │  │
│                       │  [data-css-lume] outline injected  │  │
│                       └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Entry flow:**

1. `manifest.json` declares `devtools_page: "devtools.html"`
2. `devtools.js` calls `chrome.devtools.panels.elements.createSidebarPane("Lume CSS Selector")` and loads `panel.html` via `sidebar.setPage()`
3. `panel.js` listens to `chrome.devtools.panels.elements.onSelectionChanged` to detect when the user selects a new element
4. On each selection change, `GET_ELEMENT_INFO` — a self-invoking JS function — is injected into the inspected page via `chrome.devtools.inspectedWindow.eval()`, using `$0` (the DevTools reference to the currently selected element)
5. The script traverses up the DOM (up to 15 levels) and returns a structured `{ path: [...] }` object with all attributes for each ancestor
6. The panel renders the hierarchy as clickable chip rows

### Selector Building Logic

Each node in the path has an independent **state object**:

```js
{ tag: false, id: false, classes: Set(), attrs: Set(), nth: false }
```

When chips are clicked, the corresponding state is toggled. `buildSelector()` iterates all node states and produces a CSS selector string:

- Adjacent selected nodes use `>` (direct child combinator)
- Non-adjacent selected nodes use ` ` (descendant combinator)

Example: selecting `div` from row 0 and `.btn` from row 3 produces `div .btn`; selecting from rows 0 and 1 produces `div > span`.

### Highlight Mechanism

When the selector changes, a script is injected into the inspected page that:

1. Removes the previous highlight: strips `data-css-lume` attributes and removes the injected `<style id="__css-lume-style">` tag
2. Runs `document.querySelectorAll(selector)` (filtered by visibility if "Only Visible" is active)
3. Adds `data-css-lume="true"` to each matching element
4. Injects a `<style>` tag that applies `outline: 2px solid #4d9cf9` to `[data-css-lume]`
5. Returns the count of matching elements

When navigating with Prev/Next, a separate script scrolls the target element into view (`behavior: "instant"`) and applies a temporary **orange outline** for 800ms to distinguish it from the persistent blue highlight.

### Only Visible Filter

When the "Only Visible" toggle is active, a visibility check function is prepended to the injected scripts:

```js
function iv(e) {
  var s = window.getComputedStyle(e);
  return s.display !== "none"
    && s.visibility !== "hidden"
    && s.opacity !== "0"
    && e.offsetWidth > 0
    && e.offsetHeight > 0;
}
```

This mirrors the visibility logic used by Selenium's `is_displayed()` method, making the extension ideal for writing reliable Selenium locators.

---

## 💻 Development

### Regenerating Icons

The icons are generated from `Lume-css-selector.png` using the `sharp` Node.js library.

**Install dependencies:**

```bash
npm install
```

**Generate icons:**

```bash
node generate-icons.js
```

This creates `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png` from the source image with transparent background padding (`fit: contain`).

**Reload the extension** in `chrome://extensions` after any file changes by clicking the ↺ refresh icon on the extension card.

---

## 🌐 Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 88+ | ✅ Full support |
| Edge (Chromium) | ✅ Full support |
| Firefox | ❌ Not supported (uses Chrome-specific DevTools API) |
| Safari | ❌ Not supported |

> Requires Chrome 88+ for full Manifest V3 and `chrome.devtools` API support.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/LumeStack">LumeStack</a></sub>
</div>
