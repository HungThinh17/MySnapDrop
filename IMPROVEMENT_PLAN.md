# MySnapDrop – Creative Minimalist UI/UX Improvement Plan

This plan translates the current “creative minimalist” design direction into concrete, implementable tasks for the React app.

## 1. Structure & Layout (Card-Deck)

- [ ] Refine header structure:
  - [ ] Left-align app name as a clear brand/title.
  - [ ] Add a small “Online” status indicator (accent-colored dot + label) aligned to the right.
- [ ] Make main sections feel like a stacked card deck:
  - [ ] Ensure transfer area and files area have consistent card styles (padding, radius, shadow, border).
  - [ ] On mobile, stack cards vertically with clear separation and comfortable margins.
  - [ ] On larger screens, keep the current 2-column layout but visually balance card widths and spacing.
- [ ] Turn uploaded files into “micro-cards/chips”:
  - [ ] Reduce vertical spacing and tighten each row’s height.
  - [ ] Apply a subtle shadow or border emphasis to each file row for elevation.
  - [ ] Make the list scroll smoothly when many files are present.

## 2. Typography (Clean + Expressive)

- [ ] Introduce two font roles:
  - [ ] Display font for headers/branding (e.g., Poppins/Montserrat bold).
  - [ ] Body font for everything else (e.g., Inter/Roboto).
- [ ] Apply typography hierarchy:
  - [ ] Use display font + slightly increased letter-spacing for the app title and section headers.
  - [ ] Use body font with consistent sizes for file names, hints, and button labels.
  - [ ] Ensure good contrast and readability for small text on mobile.

## 3. Color Palette (Minimal + Accent)

- [ ] Define a unified color system:
  - [ ] Background: soft off-white / very light gray (already close, finalize exact value).
  - [ ] Accent: a single strong accent color (e.g., teal or violet) to apply consistently.
  - [ ] Text: near-black for primary text and medium gray for secondary text.
- [ ] Normalize existing colors:
  - [ ] Update primary buttons, links, and drag-over state to use the accent color.
  - [ ] Harmonize error/success colors with the accent and neutrals (no random reds/blues).
  - [ ] Ensure the QR modal, toasts, and dialogs follow the same palette.

## 4. Iconography & File Representation

- [ ] Standardize icon style:
  - [ ] Keep using outline/duotone-style icons (e.g., the current trash icon).
  - [ ] Add icons where useful (upload, clear all, maybe info/help) without clutter.
- [ ] Add file-type indicators:
  - [ ] Map common extensions (`.jpg`, `.png`, `.pdf`, `.zip`, `.mp4`, etc.) to small file-type icons.
  - [ ] Show a tiny icon next to each filename in the uploaded files list.
  - [ ] Reserve a small accent-colored detail on these icons for a consistent visual language.

## 5. Micro-Interactions & Feedback

- [ ] Enhance hover/focus states:
  - [ ] Files list: on hover (desktop), slightly increase shadow and change background color subtly.
  - [ ] Buttons: add a consistent hover/active treatment (scale/brightness/shadow) that feels responsive but not noisy.
- [ ] Drag & drop feedback:
  - [ ] When dragging files over the drop zone, emphasize the border and background using the accent color (glow effect).
  - [ ] Keep drag-over state clearly visible even on small screens.
- [ ] Dialogs and modals:
  - [ ] Add a short fade/scale animation for opening/closing the QR modal.
  - [ ] Add similar animation for the “Clear all uploaded files” confirmation dialog.

## 6. Mobile-First Polish

- [ ] Verify and refine mobile behavior:
  - [ ] Ensure the drop zone, buttons, and file chips look balanced on narrow screens.
  - [ ] Confirm that long filenames never cause horizontal scrolling (use truncation/wrap where needed).
  - [ ] Ensure toasts and dialogs fit comfortably within the viewport (max-width rules already applied).
- [ ] Optimize touch targets:
  - [ ] Make all tap areas (buttons, icons, links) large enough and spaced sufficiently.
  - [ ] Keep key actions reachable without awkward scrolling or zoom.

## 7. Optional Future Enhancements

These are not required now but align with the same minimalist direction:

- [ ] PWA support (manifest, service worker, offline shell).
- [ ] Dark mode with the same accent color and card structure.
- [ ] Additional metadata in file list (size, upload time) displayed subtly below the filename.
- [ ] Simple "About" or "Help" dialog explaining how to use the app and QR feature.

We can work through these sections one by one. If you want, we can prioritize (e.g., start with color + typography, then micro-interactions, then icons) before implementing. 

## 8. Electron Desktop Packaging (New)

Wrap the existing server + React frontend into a cross-platform desktop app.

- [ ] Decide Electron architecture:
  - [ ] Use a root-level `electron-main` entry (e.g., `electron/main.js`) that starts the Express server and opens a `BrowserWindow`.
  - [ ] For development, point the window at the Vite dev server (`http://localhost:5173`).
  - [ ] For production, point the window at the built app served by Express (or a local `file://` URL).
- [ ] Set up Electron dependencies and scripts:
  - [ ] Add Electron to the project (either root or a dedicated `desktop/` folder).
  - [ ] Add npm scripts for:
    - [ ] `electron:dev` – start server, start Vite, then launch Electron.
    - [ ] `electron:build` – build client, prepare server, package Electron app.
- [ ] Integrate backend server with Electron:
  - [ ] Ensure the Express server from `server/index.js` can be required/started from the Electron main process.
  - [ ] Handle port selection (default 3000) and ensure only one server instance starts.
  - [ ] Gracefully shut down the server when the Electron app quits.
- [ ] Wire up the frontend inside Electron:
  - [ ] In dev: `BrowserWindow.loadURL("http://localhost:5173")` (using the proxy to the Express API).
  - [ ] In production: `BrowserWindow.loadURL("http://localhost:3000")` or `loadFile` for the built React bundle, depending on the chosen architecture.
  - [ ] Confirm file upload/download paths work correctly in the Electron context (local filesystem vs app folder).
- [ ] Add basic Electron app polish:
  - [ ] Use `mysnapdropico.png` as the window/taskbar icon where supported.
  - [ ] Set a sensible app name and about metadata.
  - [ ] Disable default menu (or keep a minimal one) to preserve the clean look.
- [ ] Packaging and distribution:
  - [ ] Choose a packaging tool (e.g., `electron-builder` or `electron-forge`) and configure:
    - [ ] App ID, product name, icons.
    - [ ] Output folders for Windows/macOS/Linux (as needed).
  - [ ] Ensure the packaged app bundles the server, static frontend, and Electron main process together.
  - [ ] Document how to build and run the desktop app in README or a short `DESKTOP.md`.
