# MySnapDrop – Current Architecture

This document describes the current structure and behavior of the project so we can track changes over time.

## 1. High-Level Overview

- **Goal**: Simple local-network file sharing, similar to Snapdrop.
- **Backend**: Node.js + Express (file uploads, listing, download, delete, clear-all).
- **Frontend**:
  - Legacy static HTML/JS UI served from `server/public/index.html` (kept as a fallback/reference).
  - React SPA in `client/` used during development via Vite, talking to the Express API.
- **Dev tooling**: `mysnapdrop.sh` top-level script to start/stop server and client.

## 2. Repository Layout

- `server/`
  - `index.js`: Express server implementation and routes.
  - `package.json`, `package-lock.json`, `node_modules/`: server dependencies (`express`, `express-fileupload`, etc.).
  - `public/index.html`: legacy browser-only UI, still functional.
  - `uploads/`: uploaded files storage (ignored by Git).
- `client/`
  - `package.json`, `package-lock.json`, `node_modules/`: React/Vite dependencies.
  - `vite.config.mts`: Vite config (React plugin, dev server, API proxy).
  - `index.html`: Vite entry HTML for the React app (includes QRCode script and locked viewport meta).
  - `src/main.jsx`: React bootstrapping (renders `<App />` into `#root` and applies extra touch/zoom handlers).
  - `src/App.jsx`: main React app component with upload logic, notifications, and dialogs.
  - `src/components/DropZone.jsx`: drag-and-drop + click-to-select file input and selected files preview.
  - `src/components/FileControls.jsx`: Upload / Clear Selected Files controls.
  - `src/components/UploadedFilesList.jsx`: uploaded files list with per-file delete, clear-all action, and progress bars.
  - `src/components/QrSection.jsx`: QR code trigger and modal using the globally injected QRCode library.
  - `src/styles.css`: global styling, layout, and responsive behavior.
- Root
  - `mysnapdrop.sh`: helper script to manage server/client processes.
  - `IMPROVEMENT_PLAN.md`: planned and partially completed UI/UX improvements.
  - `WORKFLOW.md`: collaboration and review workflow.
  - `ARCHITECTURE.md`: this document.
  - `.gitignore`: ignores `node_modules`, `uploads`, `server/uploads`, and PID files.
  - `.server.pid`, `.client.pid`: runtime PID files produced by `mysnapdrop.sh`.

## 3. Backend (server/)

### 3.1 Express Server (`server/index.js`)

- **Port**: `3000`.
- **Static assets**:
  - `publicDir = path.join(__dirname, "public")`.
  - `app.use(express.static(publicDir))`.
- **Uploads**:
  - Directory: `uploadsDir = path.join(__dirname, "uploads")`.
  - Created on startup if missing.
  - Also creates a temp directory: `os.tmpdir() + "snapdrop-uploads"` for `express-fileupload` temp files.
- **File upload middleware**:
  - `useTempFiles: true`, `tempFileDir: tempDir`.
  - `safeFileNames: true`, `preserveExtension: true`.
- **Routes**:
  - `GET /`
    - Sends `public/index.html` from `server/public`.
    - (Legacy UI entry; React dev UI uses Vite on a separate port.)
  - `POST /upload`
    - Expects `req.files.file`.
    - Handles both single file and array form.
    - Sanitizes filename and prevents path traversal.
    - Avoids overwriting by adding a timestamp if the sanitized name already exists.
  - `GET /files`
    - Returns JSON array of filenames stored in `uploads/`.
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
- **Local network access log**:
  - On startup prints `http://<local-ip>:3000` where `<local-ip>` is inferred from `os.networkInterfaces()`.

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
  - Intercepts `gesturestart` to prevent pinch-zoom where supported.
  - Intercepts rapid `touchend` events to mitigate double-tap zoom.
  - Note: modern mobile browsers may still allow zoom for accessibility; this is a best-effort layer.

### 4.3 App Component (`client/src/App.jsx`)

Manages application state and wires components to the backend API.

- **State**:
  - `selectedFiles`: files chosen for upload.
  - `uploadedFiles`: filenames currently on the server.
  - `uploadProgress`: per-file upload progress percentages.
  - `notifications`: single active toast notification (success, error, info, warning).
  - `confirmClearAllOpen`: whether the “clear all uploaded files” confirmation dialog is open.
- **Notifications**:
  - `showNotification(type, message)`:
    - Replaces any existing toast with a new one (no stacking).
    - Auto-dismisses after ~3.5 seconds.
  - Toasts are rendered in a bottom-center `.toast-container`.
- **API integration**:
  - `fetchFiles()`:
    - `GET /files`, populates `uploadedFiles`.
    - On failure shows an error toast.
  - `uploadFileWithRetry(file)`:
    - Uses `XMLHttpRequest` to `POST /upload`.
    - Tracks upload progress via `xhr.upload.onprogress` → updates `uploadProgress[file.name]`.
    - Retries on status `0` or 5xx with exponential backoff (up to 3 attempts).
    - On success:
      - Shows success toast per file.
      - Clears progress entry and refreshes the list via `fetchFiles()`.
    - On final failure:
      - Shows error toast and clears progress entry.
  - `handleDeleteFile(filename)`:
    - `DELETE /files/:filename`.
    - Shows success or error toast based on response text and status.
    - Refreshes `uploadedFiles` via `fetchFiles()`.
  - `performClearAllUploaded()`:
    - First attempts bulk `DELETE /files`:
      - On success, shows success toast, clears `uploadedFiles`, and refetches.
      - On non-404 error, shows error toast.
    - If bulk is unavailable / 404 or bulk request fails:
      - Falls back to deleting each file via `DELETE /files/:filename` in a loop.
      - Summarizes results with success/warning/error toast.
    - Closes the confirmation dialog afterwards.
- **Selection & upload rules**:
  - `handleFilesSelected(files)`:
    - Merges new files into `selectedFiles` while avoiding exact duplicates in the current selection (same name + size).
    - For duplicates, increments a skipped count and shows an info toast like `X duplicate file(s) were skipped.`.
  - `handleUpload()`:
    - If no selected files, shows info toast.
    - Compares `selectedFiles` against `uploadedFiles`:
      - Files whose name already exists on the server are skipped.
      - Shows a warning toast indicating how many will be skipped (with a short preview of names).
    - If no new files remain, shows info toast and returns.
    - Uploads only new files via `uploadFileWithRetry`.
    - Clears `selectedFiles` after starting uploads.
- **Rendering**:
  - Top-level layout:
    - Header with app title and subtitle.
    - Main grid with:
      - Transfer area: `DropZone` + `FileControls`.
      - Files area: `UploadedFilesList`.
    - Footer:
      - `QrSection` (QR trigger and modal).
      - Author line: `Author: hungti17 - nphung75@gmail.com`.
  - Dialogs:
    - QR modal (for scanning on another device).
    - Clear-all confirmation modal (before bulk deletion).

### 4.4 Components

- **`DropZone.jsx`**
  - Drag & drop area plus a hidden `<input type="file" multiple>` triggered on click.
  - Instruction text “Drag and drop files here or click to select” only shows when there are no selected files.
  - Calls `onFilesSelected(files[])` when files are selected or dropped.
  - Displays selected files:
    - Splits each filename into base name + extension.
    - Truncates the base name in JS to a maximum length with `…` (e.g., `very-long-name… .txt`).
    - Shows the full name in the `title` tooltip.

- **`FileControls.jsx`**
  - Buttons below the drop zone:
    - `Upload` (primary):
      - Disabled when `selectedFiles` is empty.
      - Calls `onUpload()`.
    - `Clear Selected Files` (secondary):
      - Always visible; clears current selection via `onClear()`.

- **`UploadedFilesList.jsx`**
  - Shows current `files` (from `/files`) as rows.
  - Each row:
    - A download link to `/download/<filename>`.
    - The filename rendered with the same base/ext truncation logic as selected files.
    - A trash icon button (no text) to remove the file:
      - Calls `onDelete(filename)`.
    - Optional progress bar when file is in `uploadingFiles`.
  - Footer inside the section:
    - `Clear all uploaded files` button (secondary):
      - Always visible but disabled when there are no uploaded files.
      - Calls `onClearAll()` (which opens the confirmation dialog).

- **`QrSection.jsx`**
  - Renders a footer line: `Open on another device — Click here`.
  - Clicking “Click here”:
    - Opens a modal overlay.
    - Generates a QR code for the current host/port using the global `window.QRCode` from the script in `index.html`.
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
  - `.icon-button`:
    - Compact padding for icon-only buttons (trash icon in uploaded list).

- **File name handling & responsiveness**:
  - Selected and uploaded filenames:
    - JS-level truncation of base name, with extension shown in full.
    - Additional CSS ellipsis in `.selected-file-item` and `.file-name-main` to guard against overflow.
  - `.uploaded-file-row`, `.uploaded-file-link`, `.file-name`:
    - Use `flex` with `min-width: 0` and `max-width: 100%` so long names cannot expand the layout horizontally.
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

- **Toasts**:
  - `.toast-container`:
    - Fixed at the bottom center of the viewport.
  - `.toast`:
    - Bounded by `max-width: 90vw` to fit on small screens.
    - Colored by type (success, error, info, warning).

- **Footer**:
  - `.app-footer`:
    - Centered text for QR trigger and author line.
    - Subtle top border to separate it from content.

## 5. Dev & Run Workflow

- **Server**:
  - Node project under `server/` (`server/package.json`).
  - Run manually with:
    - `cd server && node index.js`
- **Client (React)**:
  - Node project under `client/`.
  - Run dev server:
    - `cd client && npm run dev`
- **Combined (recommended during development)**:
  - Use `mysnapdrop.sh` from project root (Git Bash / WSL / any Bash shell):
    - `./mysnapdrop.sh start-server` – start Express backend.
    - `./mysnapdrop.sh stop-server` – stop backend via `.server.pid`.
    - `./mysnapdrop.sh start-client` – start React/Vite dev server.
    - `./mysnapdrop.sh stop-client` – stop client via `.client.pid`.
    - `./mysnapdrop.sh start-all` – start both server and client.
  - Access:
    - React app: `http://localhost:5173` or `http://<local-ip>:5173` from other devices on LAN.
    - API: `http://localhost:3000` or `http://<local-ip>:3000`.

## 6. Status vs. Improvement Plan

- **Current status**:
  - React frontend is in place with:
    - Responsive layout across phone/tablet/desktop.
    - Drag-and-drop uploads, per-file progress, duplicate handling, and filename truncation.
    - In-app toasts instead of `alert()` for success/error/info.
    - Clear-all uploaded files flow with confirmation dialog.
    - QR modal to open the app on another device.
    - Basic zoom and text-selection restrictions for a more app-like feel.
  - Backend supports per-file and bulk deletion, with safer download error handling.
  - Architecture is cleanly split into `server/` and `client/` with a lightweight dev script (`mysnapdrop.sh`).
- **Planned / optional future work** (see `IMPROVEMENT_PLAN.md` for details):
  - Full PWA support (manifest, service worker, offline shell).
  - More polished design system (icons, animations, theming).
  - Dark mode, additional metadata, or internationalization if needed.

This document should be updated when we:
- Change how the server or client are started/built.
- Introduce a production build pipeline for serving the React app from Express.
- Modify the API surface or significant UI structures.

