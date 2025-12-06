# MySnapDrop – Current Architecture (2025-12-06)

This document describes the current structure and responsibilities of the project so we can track changes over time.

## 1. High-Level Overview

- **Goal**: Simple local-network file sharing, similar to Snapdrop.
- **Backend**: Node.js + Express (file uploads, listing, download, delete).
- **Frontend**:
  - Legacy static HTML/JS UI served from `server/public/index.html` (still present).
  - New React frontend in `client/` (used during development via Vite, talking to the same backend API).
- **Dev tooling**: `mysnapdrop.sh` top-level script to start/stop server and client.

## 2. Repository Layout

- `server/`
  - `index.js`: Express server implementation.
  - `package.json`, `package-lock.json`, `node_modules/`: server dependencies (`express`, `express-fileupload`, etc.).
  - `public/index.html`: legacy browser-only UI, still functional.
  - `uploads/`: uploaded files storage (ignored by Git).
- `client/`
  - `package.json`, `package-lock.json`, `node_modules/`: React/Vite dependencies.
  - `vite.config.mts`: Vite config (React plugin, dev server, API proxy).
  - `index.html`: Vite entry HTML for the React app (includes QRCode script).
  - `src/main.jsx`: React bootstrapping (renders `<App />` into `#root`).
  - `src/App.jsx`: main React app component with upload logic.
  - `src/components/DropZone.jsx`: drag-and-drop + click-to-select file input and selected files preview.
  - `src/components/FileControls.jsx`: Upload / Clear Selected Files controls.
  - `src/components/UploadedFilesList.jsx`: list of uploaded files with download + remove actions.
  - `src/components/QrSection.jsx`: QR code area using the globally injected QRCode library.
  - `src/styles.css`: global styling for the React app.
- Root
  - `mysnapdrop.sh`: helper script to manage server/client processes.
  - `IMPROVEMENT_PLAN.md`: planned React migration + UI/UX improvements.
  - `WORKFLOW.md`: collaboration and review workflow.
  - `ARCHITECTURE.md`: this document.
  - `.gitignore`: ignores `node_modules`, `uploads`, `server/uploads`, and PID files.
  - `.server.pid`, `.client.pid`: runtime PID files produced by `mysnapdrop.sh`.

## 3. Backend (server/)

### 3.1 Express Server (`server/index.js`)

- **Port**: `3000`.
- **Static assets**:
  - `publicDir = path.join(__dirname, 'public')`.
  - `app.use(express.static(publicDir))`.
- **Uploads**:
  - Directory: `uploadsDir = path.join(__dirname, 'uploads')`.
  - Created on startup if missing.
  - Also creates a temp directory: `os.tmpdir() + 'snapdrop-uploads'` for `express-fileupload` temp files.
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
    - Avoids overwrite by adding timestamp if needed.
  - `GET /files`
    - Returns JSON array of filenames stored in `uploads/`.
  - `GET /download/:filename`
    - Downloads a specific file from `uploads/`.
  - `DELETE /files/:filename`
    - Deletes a specific file from `uploads/`.
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
  - `host: "0.0.0.0"` → accessible from other devices on the LAN.
  - `port: 5173`.
- Proxy:
  - `/upload`, `/files`, `/download` → `http://localhost:3000`.
  - This lets the React frontend call the same Express API without CORS issues in dev.

### 4.2 React App Structure

- `index.html`
  - Basic HTML shell with `<div id="root">`.
  - Includes QRCode library via `<script src="https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js">`.
- `src/main.jsx`
  - Renders `<App />` inside `#root` using `ReactDOM.createRoot`.
- `src/App.jsx`
  - Manages:
    - `selectedFiles` (files chosen for upload).
    - `uploadedFiles` (files fetched from `/files`).
    - `uploadProgress` (per-file progress values during upload).
  - Side effects:
    - On mount, fetches `/files` to populate `uploadedFiles`.
  - Upload logic:
    - Uses `XMLHttpRequest` to `POST /upload` (matching legacy behavior).
    - Tracks progress and simple retry strategy:
      - Retries on status `0` (network) or 5xx, up to 3 attempts with exponential backoff.
    - On success, shows an `alert` and refreshes file list.
  - Delete logic:
    - `fetch` `DELETE /files/:filename`, shows `alert`, then refreshes list.
  - Renders:
    - `<DropZone />` with current selection.
    - `<FileControls />` (Upload + Clear).
    - `<UploadedFilesList />` with current `uploadedFiles` + progress.
    - `<QrSection />` (QR pointing to current host/port).

### 4.3 Components

- `DropZone.jsx`
  - Drag & drop area for files.
  - Hidden `<input type="file" multiple>` triggered on click.
  - Calls `onFilesSelected(files[])` when user selects/drops files.
  - Displays list of selected file names.
- `FileControls.jsx`
  - `Upload` button:
    - Disabled when no files selected.
    - Calls `onUpload()` when clicked.
  - `Clear Selected Files` button:
    - Calls `onClear()` to empty `selectedFiles`.
- `UploadedFilesList.jsx`
  - Shows current `files` (from `/files`) as rows.
  - Each row:
    - Download link to `/download/<filename>`.
    - Remove button → `onDelete(filename)`.
    - Optional progress bar when file is in `uploadingFiles`.
- `QrSection.jsx`
  - On mount:
    - Uses `window.location.hostname` and `window.location.port` to build the URL.
    - Creates a QR code using the globally available `window.QRCode`.
  - Purpose:
    - Let another device on the same network open the same URL quickly.

### 4.4 Styling (`src/styles.css`)

- Defines base layout:
  - `.app-root`: full-height flex column.
  - `.app-main`: responsive grid (1 column on small screens, 2 columns from `min-width: 768px`).
  - Cards for transfer area and files area.
- Styles for:
  - `.drop-zone` (drag highlight, cursor, spacing).
  - Buttons (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`).
  - Uploaded file rows, links, actions, and progress bars.
  - QR section text and container.

## 5. Dev & Run Workflow

- **Server**:
  - Node project under `server/` (`server/package.json`).
  - You can run manually with:
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
    - React app: `http://localhost:5173` (or `http://<local-ip>:5173` from other devices on LAN).
    - API: `http://localhost:3000` (or `http://<local-ip>:3000`).

## 6. Status vs. Improvement Plan

- Current status:
  - React frontend is a functional rewrite of the basic legacy UI.
  - No major UI/UX improvements yet (alerts still used, basic styling, no PWA).
  - Architecture is split cleanly into `server/` and `client/`.
- Planned improvements:
  - See `IMPROVEMENT_PLAN.md` for detailed React/UI/UX enhancements (responsiveness, no-select/no-zoom, toasts, better layout, accessibility, eventual PWA support).

This document should be updated when we:
- Change how server or client is started.
- Introduce a real build pipeline for serving the React app from Express.
- Modify the API surface or significant UI structure.

