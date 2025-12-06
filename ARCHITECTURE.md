# MySnapDrop – Current Architecture

This document describes the current structure and behavior of the project so we can track changes over time.

## 1. High-Level Overview

- **Goal**: Simple local-network file sharing, similar to Snapdrop.
- **Backend**: Node.js + Express (file uploads, listing, metadata, download, delete, clear-all).
- **Frontend**:
  - Legacy static HTML/JS UI served from `server/public/index.html` (kept as a fallback/reference).
  - React SPA in `client/` used during development via Vite, talking to the Express API.
- **Desktop**: Electron wrapper (under `electron/`) that starts the Express backend and loads the React app in a native window, with packaging via `electron-builder`.
- **Dev tooling**:
  - `mysnapdrop.sh` bash script to start/stop server and client for web development.
  - Root-level `package.json` with scripts for setup (`npm run setup`), cleaning (`npm run clean`), desktop dev (`npm run electron:dev`), and packaging (`npm run build`).

## 2. Repository Layout

- `server/`
  - `index.js`: Express server implementation and routes.
  - `package.json`, `package-lock.json`, `node_modules/`: server dependencies (`express`, `express-fileupload`, etc.).
  - `public/index.html`: legacy browser-only UI, still functional.
  - `uploads/`: uploaded files storage (ignored by Git).
- `client/`
  - `package.json`, `package-lock.json`, `node_modules/`: React/Vite dependencies.
  - `vite.config.mts`: Vite config (React plugin, dev server, API proxy).
  - `index.html`: Vite entry HTML for the React app (includes QRCode script, Google fonts, manifest, viewport meta, favicon).
  - `public/manifest.webmanifest`: PWA manifest (name, colors, icons pointing to `mysnapdropico.png`).
  - `public/sw.js`: service worker for caching the app shell (`/`, `/index.html`).
  - `public/mysnapdropico.png`: app icon used by PWA/shortcut.
  - `src/main.jsx`: React bootstrapping (renders `<App />` into `#root`, applies extra touch/zoom handlers, and manages service worker registration/unregistration depending on environment).
  - `src/App.jsx`: main React app component with upload logic, notifications, dialogs, theme and server-status handling.
  - `src/components/DropZone.jsx`: drag-and-drop + click-to-select file input and selected files preview.
  - `src/components/FileControls.jsx`: Upload / Clear Selected Files controls.
  - `src/components/UploadedFilesList.jsx`: uploaded files list with per-file delete, clear-all action, file-type icons, and metadata (size, progress).
  - `src/components/QrSection.jsx`: QR trigger and modal using the globally injected QRCode library, resolving the correct LAN URL via a `/status` API.
  - `src/styles.css`: global styling, layout, theming, and responsive behavior.
- Root
  - `package.json`, `package-lock.json`, `node_modules/`: shared tooling and desktop/Electron dependencies (`electron`, `electron-builder`, `concurrently`, `rimraf`, `express`, `express-fileupload`, etc.) plus root scripts (`setup`, `clean`, `build`, `electron:dev`).
  - `electron/main.js`: Electron main process entry that starts the backend (in production) and opens a `BrowserWindow` pointing at the React app.
  - `electron/preload.js`: Electron preload script that exposes safe desktop helpers (clear cache + reload, toggle devtools, context menu wiring) to the renderer via `window.mysnapdropDesktop`.
  - `DESKTOP.md`: short guide for running and packaging the desktop/Electron app.
  - `dist_electron/`: output directory for packaged Electron builds (`win-unpacked`, installer `.exe`, etc.).
  - `mysnapdrop.sh`: helper script to manage server/client processes (`start-server`, `stop-server`, `start-client`, `stop-client`, `start-all`).
  - `IMPROVEMENT_PLAN.md`: planned and completed UI/UX improvements.
  - `WORKFLOW.md`: collaboration and review workflow.
  - `ARCHITECTURE.md`: this document.
  - `.gitignore`: ignores `node_modules`, `uploads`, `server/uploads`, and `.server.pid`, `.client.pid`.
  - `.server.pid`, `.client.pid`: runtime PID files produced by `mysnapdrop.sh`.

## 3. Backend (server/)

### 3.1 Express Server (`server/index.js`)

- **Port**:
  - Defaults to `3000`.
  - Can be overridden via `process.env.MYSD_SERVER_PORT` (used by desktop/Electron or advanced setups).
- **Static assets**:
  - `publicDir = path.join(__dirname, "public")`.
  - `clientDistDir = path.join(__dirname, "..", "client", "dist")`.
  - If `client/dist` exists:
    - `app.use(express.static(clientDistDir))` to serve the built React app (HTML/JS/CSS).
    - `app.use("/assets", express.static(path.join(clientDistDir, "assets")))` to explicitly serve hashed Vite bundles under `/assets/...`.
  - Always mounts legacy assets:
    - `app.use(express.static(publicDir))` so the original static UI remains available as a fallback.
- **Uploads**:
  - Default directory: `defaultUploadsDir = path.join(__dirname, "uploads")`.
  - Effective directory: `uploadsDir = process.env.MYSD_UPLOADS_DIR || defaultUploadsDir`.
    - In the packaged Electron app, `MYSD_UPLOADS_DIR` is pointed at `app.getPath("userData")/uploads` so uploads are stored in a writable per-user folder instead of the read-only app bundle.
  - Created on startup if missing.
  - Also creates a temp directory: `os.tmpdir() + "snapdrop-uploads"` for `express-fileupload` temp files.
- **File upload middleware**:
  - `useTempFiles: true`, `tempFileDir: tempDir`.
  - `safeFileNames: true`, `preserveExtension: true`.
- **Routes**:
  - `GET /`
    - If `client/dist/index.html` exists, serves the built React app shell.
    - Otherwise falls back to `public/index.html` from `server/public` (legacy UI).
  - `POST /upload`
    - Expects `req.files.file`.
    - Handles both single file and array form.
    - Sanitizes filename and prevents path traversal.
    - Avoids overwriting by adding a timestamp if the sanitized name already exists.
  - `GET /files`
    - Returns JSON array of filenames stored in `uploads/`.
  - `GET /files/meta`
    - Returns an array of file metadata objects for regular files in `uploads/`:
      - `{ name, size, mtimeMs }`.
    - Uses `fs.statSync` to gather size and modification time, skipping non-files and failures.
  - `GET /download/:filename`
    - Downloads a specific file from `uploads/`.
    - Defensive callback:
      - If an error occurs after headers are sent (e.g., client aborts), logs the error instead of sending a second response (avoids `ERR_HTTP_HEADERS_SENT`).
      - Treats aborted connections (`ECONNABORTED`, `ECONNRESET`) as non-fatal.
  - `DELETE /files/:filename`
    - Deletes a specific file from `uploads/` if it exists.
    - Returns `404` if the file is missing.
  - `DELETE /files`
    - Bulk clear endpoint.
    - Iterates all entries in `uploads/`, deleting regular files.
    - Returns a plain-text message:
      - `Deleted N uploaded file(s).` or
      - `No uploaded files to clear.`.
    - On failure, returns `500` with `Failed to clear all uploaded files.`.
  - `GET /status`
    - Reports basic server status and LAN URL:
      - `ip`: local IPv4 address chosen via `os.networkInterfaces()` (or `null` if not found).
      - `port`: effective port number.
      - `origin`: computed as `http://<ip-or-host>:<port>`.
    - Used by the React client (QR section) to generate QR codes that point at the correct LAN URL when the app is running on a desktop machine.
- **Local network access log**:
  - On startup prints `http://<local-ip>:<port>` where `<local-ip>` is inferred from `os.networkInterfaces()`.
  - Server listens on `0.0.0.0` so it is reachable from other devices on the same network (subject to OS firewall rules).

### 3.2 Legacy Browser UI (`server/public/index.html`)

- Plain HTML + inline CSS + vanilla JS.
- Features:
  - Drag & drop and click-to-select file upload.
  - Per-file progress bars using `XMLHttpRequest`.
  - Retry logic for uploads on network / 5xx errors.
  - List of uploaded files with download and remove buttons.
  - QR code pointing to `http://<hostname>:<port>` using `qrcodejs`.
- This is kept as a reference and fallback while the React UI is developed.

## 4. Frontend (client/)

### 4.1 Vite Configuration (`client/vite.config.mts`)

- Uses `@vitejs/plugin-react`.
- Dev server:
  - `host: "0.0.0.0"` – accessible from other devices on the LAN.
  - `port: 5173`.
- Proxy:
  - `/upload`, `/files`, `/download` → `http://localhost:3000`.
  - Lets the React frontend call the Express API without CORS issues in dev.

### 4.2 React Entry (`client/src/main.jsx`)

- Renders `<App />` inside `#root` using `ReactDOM.createRoot` and `React.StrictMode`.
- Imports global styles from `styles.css`.
- Adds best-effort zoom-prevention handlers (in addition to viewport meta):
  - Intercepts `gesturestart` to try to prevent pinch-zoom where supported.
  - Intercepts rapid `touchend` events to mitigate double-tap zoom.
  - Note: modern mobile browsers may still allow zoom for accessibility; this is a best-effort layer.
- Service worker behavior:
  - On `window.load`, checks the user agent to detect Electron.
  - In Electron (desktop app):
    - Unregisters any existing service workers for the current origin.
    - Does **not** register `/sw.js`, ensuring the desktop app always uses the latest HTML/JS from the backend.
  - In regular browsers:
    - Registers `/sw.js` (if supported) to cache the app shell for faster loads and basic offline support.
    - Logs registration failures to `console.error` but does not block the app.

### 4.3 App Component (`client/src/App.jsx`)

The `App` component manages core state and coordinates API calls and UI components.

- **State**:
  - `selectedFiles`: `File[]` chosen for upload.
  - `uploadedFiles`: metadata for files on the server:
    - `{ name: string; size: number; mtimeMs: number }`.
  - `uploadProgress`: object keyed by filename with percentage values for in-flight uploads.
  - `notifications`: single active toast (type + message).
  - `confirmClearAllOpen`: whether the “clear all uploaded files” confirmation dialog is open.
  - `aboutOpen`: whether the About dialog is open.
  - `theme`: `"light"` or `"dark"`; toggles a CSS class on `<body>`.
  - `serverOnline`: boolean indicating whether the last fetch to the backend succeeded.
  - `hasShownOfflineToast`: guards against spamming offline toasts while the server remains unreachable.
- **Derived values**:
  - `uploadingFiles`:
    - `Object.keys(uploadProgress)`; used to show progress bars for filenames currently uploading.
  - `selectionSummary`:
    - A small string summarizing selected files, e.g., `3 files · 12.4 MB`.
    - Computed from `selectedFiles` count and total size.
  - `canUpload`:
    - `selectedFiles.length > 0 && serverOnline`.
    - Controls the Upload button disabled state.
- **Theme and server status effects**:
  - When `theme` changes:
    - Adds or removes `theme-dark` class on `document.body`.
  - When `fetchFiles()` succeeds:
    - Sets `serverOnline = true` and resets `hasShownOfflineToast`.
  - When `fetchFiles()` fails:
    - Sets `serverOnline = false` and, on the first failure of an offline period, shows an error toast.
- **Notifications**:
  - `showNotification(type, message)`:
    - Replaces the current toast with `{ id, type, message }`.
    - Auto-dismisses after ~3.5 seconds.
  - Toasts are rendered in a bottom-center `.toast-container` and can be dismissed by click.
- **API integration**:
  - `fetchFiles()`:
    - Tries `GET /files/meta` first:
      - If OK and returns an array, maps it to `{ name, size, mtimeMs }` objects and sets `uploadedFiles`.
    - If `/files/meta` is unavailable or fails:
      - Falls back to `GET /files` (names-only).
      - Maps names to `{ name, size: 0, mtimeMs: 0 }`.
    - On any error after both attempts:
      - Marks `serverOnline = false` and (once per offline period) shows an error toast.
  - `uploadFileWithRetry(file)`:
    - Uses `XMLHttpRequest` to `POST /upload`.
    - Tracks upload progress and updates `uploadProgress[file.name]`.
    - Retries on status `0` or 5xx with exponential backoff (up to 3 attempts).
    - On success:
      - Shows a success toast per file.
      - Clears progress entry and refreshes `uploadedFiles` via `fetchFiles()`.
    - On final failure:
      - Shows an error toast and clears progress entry.
  - `handleDeleteFile(filename)`:
    - If `serverOnline` is `false`, shows an error toast and returns early.
    - Otherwise sends `DELETE /files/:filename`.
    - Shows success or error toast based on response text and status.
    - Refreshes `uploadedFiles` via `fetchFiles()`.
  - `performClearAllUploaded()`:
    - Called when the user confirms clear-all in the modal.
    - First attempts bulk `DELETE /files`:
      - On success, shows a success toast, clears `uploadedFiles`, and refetches.
      - On non-404 error, shows an error toast and closes the dialog.
    - If bulk is unavailable / 404 or request fails:
      - Falls back to deleting each file via `DELETE /files/:filename` in a loop using current `uploadedFiles`.
      - Summarizes results with success/warning/error toast.
      - Refetches the list and closes the dialog.
- **Background syncing & desktop helpers**:
  - Periodically refreshes `uploadedFiles` while no uploads are in progress, keeping open clients in sync with changes from other devices/sessions.
  - In the desktop/Electron app, double-clicking the root app area (`.app-root`) calls `window.mysnapdropDesktop.clearCacheAndReload()`, which clears Electron’s HTTP cache/storage and reloads the window ignoring cache.
- **Selection & upload rules**:
  - `handleFilesSelected(files)`:
    - Merges new files into `selectedFiles`.
    - Avoids exact duplicates in the current selection (same name + size).
    - For duplicates, increments a skipped count and shows an info toast like `X duplicate file(s) were skipped.`.
  - `handleUpload()`:
    - If `serverOnline` is `false`, shows an error toast and returns.
    - If no selected files, shows an info toast and returns.
    - Compares `selectedFiles` against `uploadedFiles` by filename:
      - Files whose name already exists on the server are added to a `skipped` list.
      - Shows a warning toast indicating how many will be skipped (with a short preview of filenames).
    - Uploads only new files via `uploadFileWithRetry`.
    - If no new files remain, shows an info toast and returns.
    - Clears `selectedFiles` after starting uploads.
- **Rendering**:
  - Top-level layout:
    - Header with:
      - App title and subtitle.
      - Right-aligned status section:
        - Green/red status dot that reflects `serverOnline`.
        - Theme toggle (“Dark mode” / “Light mode”).
    - Main grid:
      - Transfer area: `DropZone` + `FileControls` + selection summary and offline hint.
      - Files area: `UploadedFilesList`.
    - Footer:
      - `QrSection` (QR trigger and modal).
      - Author line: `Author: hungti17 – nphung75@gmail.com` and an “About” link.
  - Dialogs:
    - QR modal (for scanning on another device).
    - Clear-all confirmation modal (before bulk deletion).
    - About modal explaining how to use the app and QR feature.
  - Offline hint:
    - When `serverOnline` is `false`, shows a small red hint under the upload controls explaining that the server is offline and actions are disabled until the backend is started.

### 4.4 Components

- **`DropZone.jsx`**
  - Drag & drop area plus a hidden `<input type="file" multiple>` triggered on click.
  - Instruction text “Drag and drop files here or click to select” only shows when there are no selected files.
  - Calls `onFilesSelected(files[])` when files are selected or dropped.
  - Displays selected files:
    - Splits each filename into base name + extension.
    - Truncates the base name in JS to a maximum length with `…`, e.g., `very-long-name… .txt`.
    - Shows the full name in the `title` tooltip.

- **`FileControls.jsx`**
  - Buttons below the drop zone:
    - `Upload` (primary):
      - Disabled if `selectedFiles` is empty or `serverOnline` is `false`.
      - Shows an upload icon plus label.
      - Calls `onUpload()`.
    - `Clear Selected Files` (secondary):
      - Shows a clear/“X” icon plus label.
      - Calls `onClear()` to empty `selectedFiles`.

- **`UploadedFilesList.jsx`**
  - Shows current `files` (metadata from `/files/meta` or names transformed by the client) as rows.
  - Each row:
    - Download link to `/download/<filename>`.
    - File-type icon:
      - Base “document” icon, color-coded by kind:
        - Image, video, audio, archive, doc, other.
    - Truncated filename (base + extension).
    - Optional size label, e.g., `1.2 MB`, when size is known.
    - Trash icon button to remove the file:
      - Calls `onDelete(filename)` and is disabled only logically when the server is offline (guarded in `App`).
    - Optional progress bar when filename is in `uploadingFiles`, using `uploadProgress[name]`.
  - Footer inside the section:
    - `Clear all uploaded files` button (secondary):
      - Always visible but disabled when there are no uploaded files.
      - Calls `onClearAll()` (which opens the confirmation dialog).

- **`QrSection.jsx`**
  - Renders a footer line: `Open on another device — Click here`.
  - Clicking “Click here”:
    - Opens a modal overlay.
    - Calls `GET /status` to ask the backend for the best LAN URL (`origin`), falling back to `window.location` if the endpoint is unavailable, then generates a QR code for that URL using the global `window.QRCode` from the script in `index.html`.
  - QR modal:
    - Centered card with title “Scan to open”, the QR code, and a Close button.
    - Clicking outside the card also closes it.

### 4.5 Styling (`client/src/styles.css`)

- **Base layout**:
  - `html, body, #root`:
    - `height: 100%`, no margins, and `overflow-x: hidden` to prevent horizontal scroll.
  - `.app-root`:
    - Full-height flex column.
    - Centered with `max-width` and `margin: 0 auto`.
    - `width: 100%` with `overflow-x: hidden` to constrain content.
  - `.app-main`:
    - Grid layout:
      - Single column on small screens.
      - Two columns (`3fr 2fr`) from `min-width: 768px` (transfer area + files area).
  - `.transfer-area`, `.files-area`:
    - Card-style surfaces with border, radius, and soft box shadow.

- **Forms and buttons**:
  - Buttons (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`):
    - Mobile-first: full-width by default; become auto-width with a minimum width on larger screens.
    - Consistent colors, hover states, and disabled styling.
    - Minimum height for comfortable touch targets.
  - `.icon-button`:
    - Compact padding for icon-only buttons (trash icon in uploaded list).
  - `.btn-icon`, `.btn-label`:
    - Small icon + label layout for primary actions.

- **File name handling & responsiveness**:
  - Selected and uploaded filenames:
    - JS-level truncation of the base name, with extension shown in full.
    - Additional CSS ellipsis in `.selected-file-item` and `.file-name-main` to guard against overflow.
  - `.uploaded-file-row`, `.uploaded-file-link`, `.file-name`:
    - Use flexbox with `min-width: 0` and `max-width: 100%` so long names cannot expand the layout horizontally.
  - Global overflow:
    - Top-level containers and modals are clamped to `<= 90vw` width so they stay inside the viewport.

- **Zoom and selection**:
  - `body`:
    - Disables text selection (`user-select: none`) across the app.
    - Removes tap highlight on mobile.
  - `index.html` viewport:
    - `initial-scale=1`, `minimum-scale=1`, `maximum-scale=1`, `user-scalable=no` to discourage zoom.
  - Buttons:
    - `touch-action: manipulation` to reduce double-tap zoom.

- **Toasts and dialogs**:
  - `.toast-container`:
    - Fixed at the bottom center of the viewport.
  - `.toast`:
    - Bounded by `max-width: 90vw` to fit on small screens.
    - Colored by type (success, error, info, warning).
    - Short slide/fade-in animation for appearance.
  - `.qr-modal`, `.confirm-modal`:
    - Centered cards with fade/scale-in animations for opening.

- **Footer and header**:
  - `.app-header`:
    - Row layout with title/description on the left and status/theme toggle on the right.
    - Status dot color reflects backend availability.
  - `.app-footer`:
    - Centered text for QR trigger and author line.
    - Subtle top border to separate it from content.

- **Dark theme overrides**:
  - `body.theme-dark`:
    - Overrides key CSS variables for a dark palette:
      - Dark background and surface.
      - Darker borders.
      - Light text and muted text.
    - Uses a dark radial gradient background.
  - The rest of the app consumes these variables, so dark mode works without duplicating styles.

## 5. Dev & Run Workflow

- **Initial setup (all parts)**:
  - From project root: `npm run setup` installs dependencies for root, `server/`, and `client/`.
- **Server**:
  - Node project under `server/` (`server/package.json`).
  - Run manually with:
    - `cd server && node index.js`
    - Or with a custom port: `MYSD_SERVER_PORT=3001 node index.js`
  - Listens on `0.0.0.0:<port>`, so other devices on the LAN can access `http://<local-ip>:<port>` (subject to OS firewall rules).
- **Client (React)**:
  - Node project under `client/`.
  - Run dev server:
    - `cd client && npm run dev`
  - In dev, the React app proxies API calls to `http://localhost:3000`.
- **Combined web dev (server + client)**:
  - Use `mysnapdrop.sh` from project root (Git Bash / WSL / any Bash shell):
    - `./mysnapdrop.sh start-server` – start Express backend.
    - `./mysnapdrop.sh stop-server` – stop backend via `.server.pid`.
    - `./mysnapdrop.sh start-client` – start React/Vite dev server.
    - `./mysnapdrop.sh stop-client` – stop client via `.client.pid`.
    - `./mysnapdrop.sh start-all` – start both server and client.
  - Access:
    - React app: `http://localhost:5173` or `http://<local-ip>:5173` from other devices on LAN.
    - API: `http://localhost:3000` or `http://<local-ip>:3000`.
- **Desktop dev (Electron)**:
  - From project root:
    - `npm run electron:dev`:
      - Starts the Express backend on port `3000`.
      - Starts the Vite dev server for the React client on port `5173`.
      - Launches Electron pointing at `http://localhost:5173` with live reload/devtools.
- **Desktop production build (Electron)**:
  - From project root:
    - `npm run clean` (optional, resets build artifacts and uploads).
    - `npm run build`:
      - Builds the React client into `client/dist`.
      - Packages the Electron app using `electron-builder` into `dist_electron/`.
  - Running the packaged app:
    - `dist_electron/win-unpacked/MySnapDrop.exe` (or the installed `.exe`) starts the backend on `0.0.0.0:3000` and serves the built React app at `http://localhost:3000` inside Electron.
    - Other devices on the LAN can access `http://<desktop-ip>:3000` in a browser while the desktop app is running.

## 6. Status vs. Improvement Plan

- **Current status**:
  - React frontend is in place with:
    - Responsive layout across phone/tablet/desktop.
    - Drag-and-drop uploads, per-file progress, duplicate handling, and filename truncation.
    - In-app toasts instead of `alert()` for success/error/info.
    - Clear-all uploaded files flow with confirmation dialog and fallback logic.
    - QR modal to open the app on another device.
    - Basic zoom and text-selection restrictions for a more app-like feel.
    - Dark mode toggle (light/dark themes) using CSS variables.
    - Status dot and offline hint that reflect server availability and guard actions when offline.
    - File metadata display (size) and color-coded file-type icons in the uploaded list.
    - Selection summary showing count and total size of selected files.
    - About dialog explaining usage and QR feature.
  - Backend supports per-file and bulk deletion, safe downloads, filenames sanitization, and metadata via `/files/meta`.
  - PWA basics are wired: manifest, icon, and shell service worker for the web version (service worker is disabled in the Electron desktop app to avoid stale bundles).
  - Desktop/Electron wrapper exists with:
    - Dev flow (`npm run electron:dev`) that runs server, Vite dev client, and Electron together.
    - Packaged app (`npm run build`) that starts the backend inside Electron, serves the built React app, and exposes cache-clearing/devtools helpers via a context menu and double-click gesture.
  - Architecture is cleanly split into `server/`, `client/`, and desktop wrapper (root `package.json` + `electron/`), with `mysnapdrop.sh` as an optional lightweight dev script for web-only flows.
- **Planned / optional future work** (see `IMPROVEMENT_PLAN.md` for details):
  - Deeper PWA capabilities (offline caching of assets beyond the shell, better offline UI messaging).
  - More polished design system (finer typography tuning, more micro-animations).
  - Internationalization (i18n) and additional metadata if needed.

This document should be updated when we:
- Change how the server or client are started/built.
- Introduce a production build pipeline for serving the React app from Express.
- Modify the API surface or significant UI structures.
