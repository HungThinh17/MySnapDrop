# MySnapDrop – UI/UX Improvement Plan

This document tracks visual and UX work for the React client. The focus is a clean, minimalist experience that:

- Feels lightweight and touch-friendly on phones.
- Feels more like a file explorer on tablets and desktop screens, especially when managing many files.

---

## 1. High-Level Goals

- Keep the phone experience almost exactly as it is today: simple, card-based, and optimized for quick sharing.
- On tablets and desktops, evolve the files area into a layout that feels closer to a file explorer (denser rows, columns, bulk actions, keyboard/mouse friendly).
- Reuse the existing backend API (upload, list, download, delete, clear-all) as much as possible.
- Avoid surprising behavior when resizing the window or switching devices.

---

## 2. Current State (Already Implemented)

These foundations are already in place and should be preserved:

- **Layout & structure**
  - Card-style transfer area and files area with consistent padding, radius, and shadow.
  - Header with left-aligned app title and a live “online/offline” indicator.
  - Responsive layout that stacks on narrow screens and shows two columns on wider screens.
- **Typography & colors**
  - Display font for branding/headers, body font for content.
  - Centralized color tokens (background, accent, danger, success, muted text) and a cohesive light theme.
- **Micro-interactions**
  - Drag-over feedback on the drop zone.
  - Button hover/active states.
  - Toast notifications for success/error/info.
  - Animated QR and confirmation modals.
- **File representation**
  - File-type icons for common extensions.
  - File size display and a cleaned-up file list.
- **Platform features**
  - PWA manifest + service worker shell caching.
  - Dark mode with a theme toggle.
  - Electron desktop wrapper and packaging.
  - Simple “About” dialog.

The rest of this plan focuses on upcoming work.

---

## 3. Desktop/Tablet “File Explorer” Layout

**Goal:** When the app runs on a tablet or desktop-sized screen, show an explorer-style files view suitable for managing many items. On phones, keep the current minimal card layout.

### 3.1 UX Behavior

- **Phones (small screens)**
  - Keep existing layout and interactions.
  - Optimize for quick single-file or few-file transfers.
- **Tablets / desktops (medium+ screens)**
  - The transfer card stays largely the same.
  - The files area becomes an “explorer”:
    - Denser rows in a list/table.
    - Columns: Name, Size, Modified (when available).
    - Multi-select and bulk actions (delete / clear).
    - Sorting by name, size, and modified time.
    - Optional quick filters (e.g., by type: images, documents, archives).

### 3.2 Technical Approach

- **Layout mode detection**
  - Use a combination of viewport width and pointer type:
    - Example: treat `min-width: 768px` with `pointer: fine` as “explorer-capable”.
  - Implement a small React hook (e.g., `useLayoutMode`) that returns `"phone"` or `"explorer"`.
  - Optionally expose a manual override in settings (e.g., “Use compact explorer layout on this device”).

- **Component structure**
  - `App.jsx`
    - Derive `layoutMode` via the hook.
    - Pass `layoutMode` down to the files area and any components that need it.
  - `UploadedFilesList.jsx`
    - Accept a `variant` or `layoutMode` prop.
    - Render the current stacked/card list for `phone`.
    - Render an explorer variant for `explorer`:
      - Toolbar with sort dropdown/toggles and “Delete selected” / “Clear all”.
      - List/table body with columns and selection checkboxes.
  - **State & selection**
    - Track a set of `selectedFileNames` for the explorer layout.
    - Reuse existing delete / clear-all logic, but allow bulk delete using the selection.

- **Data and API usage**
  - Rely on `/files/meta` for name, size, and `mtimeMs` where available.
  - When the server only supports `/files`, fall back to name-only but keep the explorer layout (with missing columns handled gracefully).
  - No backend changes in the first phase; treat everything as a flat root folder.

- **Styling**
  - Add explorer-specific classes in `styles.css` (e.g., `.files-explorer`, `.files-table`, `.files-row`).
  - Under a tablet/desktop media query, switch the files section to the explorer variant.
  - Ensure the layout collapses cleanly back to the phone variant when the viewport shrinks.

### 3.3 Incremental Implementation Steps

- [ ] Implement `useLayoutMode` hook (viewport + pointer detection, with resize listener).
- [ ] Thread `layoutMode` into `App.jsx` and `UploadedFilesList.jsx`.
- [ ] Add a basic explorer variant:
  - [ ] Toolbar with sort options and a simple “Delete selected” button.
  - [ ] Table/list layout with columns and checkboxes.
- [ ] Wire up selection + bulk actions using existing delete / clear-all endpoints.
- [ ] Add explorer-specific styles (denser rows, column alignment, hover/focus states).
- [ ] Test behavior across:
  - [ ] Phone portrait (card layout only).
  - [ ] Small tablet landscape.
- [ ] Laptop/desktop with resize and zoom.
- [ ] Consider adding a user-visible “View” toggle (Card / Explorer) if automatic detection ever feels wrong.

### 3.4 Future (Optional) Folder/Hierarchy Support

If we later want real folder management instead of a flat list:

- [ ] Extend the server to understand paths (e.g., `/upload?path=Photos/2025/`).
- [ ] Adjust list endpoints to return `type: "file" | "folder"` and nested paths.
- [ ] Add a sidebar tree or breadcrumb navigation in the explorer view.
- [ ] Support create/rename/move operations for folders and files.
- [ ] Carefully migrate existing uploads so they still appear in the new structure.

---

## 4. Smaller UX Polish Items

These are lower priority and can be tackled when convenient:

- [ ] Show relative timestamps (“5 minutes ago”) using `mtimeMs` from `/files/meta`.
- [ ] Improve long filename handling in the explorer view (tooltips, inline rename prep).
- [ ] Minor copy tweaks for toasts, empty states, and offline messaging.
- [ ] Optional: add a lightweight settings panel (theme toggle, view mode preferences).

