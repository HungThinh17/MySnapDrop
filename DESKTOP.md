# MySnapDrop Desktop (Electron) Guide

This document explains how to run and package the Electron desktop version of MySnapDrop.

## 1. Prerequisites

- Node.js and npm installed.
- Dependencies installed for each part of the project:
  - `cd server && npm install`
  - `cd client && npm install`
  - From the project root: `npm install`

## 2. Development Workflow

From the project root:

- Start the Electron-based desktop app in dev mode:
  - `npm run electron:dev`
  - This will:
    - Start the Express backend on port `3000`.
    - Start the Vite dev server for the React client on port `5173`.
    - Launch the Electron window pointed at `http://localhost:5173`.

## 3. Production Desktop Build

To create a packaged desktop build:

1. Ensure the client build exists and dependencies are installed:
   - `cd server && npm install`
   - `cd client && npm install`
   - `cd client && npm run build` (or run `npm run build:client` from the root)
2. From the project root, run:
   - `npm run electron:build`
3. The packaged desktop app output will be written to:
   - `dist_electron/`

The Express server is started inside the Electron main process in production. It serves:

- API routes on `http://localhost:3000`.
- The built React app from `client/dist` when present.

## 4. Notes

- You can still run the web version without Electron using:
  - `./mysnapdrop.sh start-server`
  - `./mysnapdrop.sh start-client`
- The Electron setup is intended to be minimal and can be extended later (e.g., custom menus, tray icon, deeper integration).

