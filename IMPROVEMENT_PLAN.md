# MySnapDrop – Frontend Improvement Plan

This checklist covers migrating the UI to React and improving the overall UX/visual design. We can adjust or re‑prioritize items after your review.

## 1. Frontend Architecture & Setup

- [ ] Decide project structure (`server/` for Express, `client/` for React).
- [ ] Initialize React app (e.g., Vite + React + TypeScript or JavaScript).
- [ ] Configure development proxy or API base URL for `/upload`, `/files`, `/download/:filename`.
- [ ] Add shared config file for server URL (LAN usage, future env support).
- [ ] Set up basic linting/formatting to keep React code consistent.

## 2. Rebuild Existing UI in React

- [ ] Create `AppLayout` component (header, main content area, footer).
- [ ] Implement `DropZone` component with drag & drop and click‑to‑select behavior.
- [ ] Implement `FilePickerControls` component (Select, Upload, Clear buttons).
- [ ] Implement `SelectedFilesList` component to preview files before upload.
- [ ] Implement `UploadManager` logic (React hooks/state) to manage:
  - [ ] Selected files queue.
  - [ ] Upload in progress state (per file).
  - [ ] Retry attempts logic similar to current implementation.
- [ ] Implement `UploadedFilesList` component to display files from `/files`.
- [ ] Implement `QrSection` component to render QR code for the current host URL.
- [ ] Port current networking behavior to `fetch` (or axios) in React:
  - [ ] `POST /upload` with progress tracking.
  - [ ] `GET /files` to refresh uploaded file list.
  - [ ] `GET /download/:filename` for download links.
  - [ ] `DELETE /files/:filename` for removing files.

## 3. Layout & Responsive Design

- [ ] Define responsive layout breakpoints for:
  - [ ] Phone (small screens).
  - [ ] Tablet (medium screens).
  - [ ] Desktop (large screens).
- [ ] Design single‑column layout for phones (stacked sections).
- [ ] Design two‑column layout for tablets/desktops (transfer area + files/QR/info).
- [ ] Ensure the main transfer area (drop zone + buttons + selected files) is always prominent and easily reachable.
- [ ] Make buttons and touch targets large enough on mobile (minimum recommended sizes).
- [ ] Adjust font sizes, paddings, and margins per breakpoint for comfortable reading and interaction.

## 4. Visual Design & Professional Look

- [ ] Define a simple design system:
  - [ ] Primary/secondary colors and neutrals.
  - [ ] Typography (font family, sizes, weights).
  - [ ] Spacing scale and border radius.
- [ ] Restyle header with a clear title and short description/tagline.
- [ ] Restyle `DropZone` as a prominent card:
  - [ ] Add icon/illustration and supporting text.
  - [ ] Clear drag & drop/tap instructions.
  - [ ] Hover/drag‑over visual feedback.
- [ ] Redesign buttons with consistent primary/secondary styling and disabled states.
- [ ] Redesign uploaded file items into clean rows/cards:
  - [ ] Filename, size, and (optional) upload time.
  - [ ] Inline download and remove actions with icons.
- [ ] Add subtle shadows, borders, and hover states for a more polished look.
- [ ] Create consistent spacing between sections (header, transfer area, QR, file list, footer).

## 5. Interaction, Feedback & Restrictions

- [ ] Replace `alert()` popups with in‑app notifications/toasts:
  - [ ] Success (file uploaded, file deleted).
  - [ ] Error (upload failed, network error).
  - [ ] Info (no files selected, cleared selection).
- [ ] Implement clear upload state indicators:
  - [ ] Show when uploads are in progress and how many files remain.
  - [ ] Show when all uploads are successful.
  - [ ] Highlight partial failures with specific messages.
- [ ] Add inline error messages near the drop zone or selected files when needed.
- [ ] Disable text selection where appropriate:
  - [ ] Apply `user-select: none` to body/main UI components.
  - [ ] Allow selection only where it makes sense (e.g., maybe file names if needed).
- [ ] Prevent zoom actions as much as possible:
  - [ ] Configure `<meta name="viewport">` to reduce pinch/zoom and double‑tap zoom.
  - [ ] Use `touch-action`/gesture handling to avoid accidental zoom while interacting.
- [ ] Ensure drag & drop works well on desktop while tap‑to‑select remains primary on touch devices.

## 6. File Management UX Enhancements

- [ ] Show detailed selected files list before upload:
  - [ ] Filename and size.
  - [ ] Individual remove from queue.
- [ ] Provide clear per‑file progress bars and statuses (“Queued”, “Uploading…”, “Uploaded”, “Failed”).
- [ ] Auto‑refresh uploaded file list after uploads and deletes.
- [ ] Add manual “Refresh” action for the uploaded file list.
- [ ] Add optional sorting (e.g., by upload time or name) if we store these properties.
- [ ] Add a “Clear all uploaded files” action with confirmation dialog.

## 7. Mobile & Tablet Optimizations

- [ ] Make primary actions (Select, Upload) easy to reach on phone screens (e.g., sticky bottom action bar or well‑placed buttons).
- [ ] Ensure QR code section does not push main transfer area below the fold on small screens (collapsible or smaller card).
- [ ] Ensure all interactive elements have adequate touch areas and spacing.
- [ ] Test layout and interactions on:
  - [ ] Common phone resolutions (portrait/landscape).
  - [ ] Tablet resolutions.
  - [ ] Desktop browsers.

## 8. Accessibility & Quality

- [ ] Use semantic HTML structure within React components (headings, landmarks, lists).
- [ ] Add `aria-label`/`aria-live` where needed (e.g., toasts, progress).
- [ ] Ensure keyboard navigation works (tab order, focus states).
- [ ] Maintain visible focus outlines for all interactive elements.
- [ ] Provide text alternatives or labels for icons/buttons.
- [ ] Add basic loading indicators for:
  - [ ] Initial file list fetch.
  - [ ] QR code generation if needed.
- [ ] Avoid layout shifts by reserving space for toasts, progress bars, and QR code.

## 9. Future Enhancements (Optional, Later)

- [ ] Turn the React frontend into a full PWA (manifest, service worker, offline shell).
- [ ] Add light/dark theme toggle.
- [ ] Support basic metadata (e.g., who uploaded, device name) if needed.
- [ ] Internationalization (i18n) for multi‑language support.

After your review, we can adjust this list (add/remove items, change priority) and then start implementing from the top sections down.

