import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DropZone } from "./components/DropZone";
import { FileControls } from "./components/FileControls";
import { UploadedFilesList } from "./components/UploadedFilesList";
import { QrSection } from "./components/QrSection";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [serverOnline, setServerOnline] = useState(true);

  const canUpload = selectedFiles.length > 0 && serverOnline;

  const uploadingFiles = useMemo(
    () => Object.keys(uploadProgress),
    [uploadProgress]
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("theme-dark", theme === "dark");
    }
  }, [theme]);

  const selectionSummary = useMemo(() => {
    if (!selectedFiles.length) return "";
    const totalBytes = selectedFiles.reduce(
      (sum, file) => sum + (file.size || 0),
      0
    );
    const units = ["B", "KB", "MB", "GB"];
    let size = totalBytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    const formattedSize =
      size < 10 && unitIndex > 0 ? size.toFixed(1) : Math.round(size);
    const unit = units[unitIndex];
    const count = selectedFiles.length;
    return `${count} file${count > 1 ? "s" : ""} · ${formattedSize} ${unit}`;
  }, [selectedFiles]);

  const showNotification = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    // Always keep only the latest notification visible
    setNotifications([{ id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      // Prefer richer metadata endpoint; fall back to the original /files if
      // meta is not available (e.g., older server).
      let meta;
      let metaOk = false;

      try {
        const metaResponse = await fetch("/files/meta");
        if (metaResponse.ok) {
          const payload = await metaResponse.json();
          if (Array.isArray(payload)) {
            meta = payload
              .filter((item) => item && typeof item.name === "string")
              .map((item) => ({
                name: item.name,
                size: typeof item.size === "number" ? item.size : 0,
                mtimeMs: typeof item.mtimeMs === "number" ? item.mtimeMs : 0
              }));
            metaOk = true;
          }
        }
      } catch {
        // Ignore and fall back below.
      }

      if (!metaOk) {
        const response = await fetch("/files");
        if (!response.ok) {
          throw new Error("Failed to fetch files");
        }
        const names = await response.json();
        meta = Array.isArray(names)
          ? names
              .filter((name) => typeof name === "string")
              .map((name) => ({ name, size: 0, mtimeMs: 0 }))
          : [];
      }

      setUploadedFiles(meta || []);
      setServerOnline(true);
    } catch (error) {
      console.error(error);
      setServerOnline(false);
      showNotification("error", "Failed to fetch files.");
    }
  }, [showNotification]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFilesSelected = (files) => {
    if (!files || files.length === 0) {
      return;
    }

    setSelectedFiles((prev) => {
      const next = [...prev];
      let skipped = 0;

      files.forEach((file) => {
        const exists = next.some(
          (f) => f.name === file.name && f.size === file.size
        );
        if (exists) {
          skipped += 1;
        } else {
          next.push(file);
        }
      });

      if (skipped > 0) {
        showNotification(
          "info",
          `${skipped} duplicate file(s) were skipped.`
        );
      }

      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
  };

  const shouldRetry = (status) =>
    status === 0 || (status >= 500 && status < 600);

  const uploadFileWithRetry = (file, attempt = 1) => {
    const formData = new FormData();
    formData.append("file", file);

    setUploadProgress((prev) => ({
      ...prev,
      [file.name]: prev[file.name] || 0
    }));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload", true);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: progress
        }));
      }
    });

    const clearProgress = () =>
      setUploadProgress((prev) => {
        const copy = { ...prev };
        delete copy[file.name];
        return copy;
      });

    const finalizeSuccess = () => {
      showNotification("success", `Uploaded "${file.name}" successfully.`);
      clearProgress();
      fetchFiles();
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        finalizeSuccess();
      } else if (shouldRetry(xhr.status) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        setTimeout(() => uploadFileWithRetry(file, attempt + 1), delay);
      } else {
        const reason = xhr.responseText ? " - " + xhr.responseText : "";
        showNotification(
          "error",
          `Upload failed (${xhr.status}${reason}).`
        );
        clearProgress();
      }
    };

    xhr.onerror = () => {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        setTimeout(() => uploadFileWithRetry(file, attempt + 1), delay);
      } else {
        showNotification("error", "Upload failed: network error.");
        clearProgress();
      }
    };

    xhr.onabort = xhr.onerror;
    xhr.send(formData);
  };

  const handleUpload = () => {
    if (!serverOnline) {
      showNotification(
        "error",
        "Server appears to be offline. Please start the backend and try again."
      );
      return;
    }

    if (selectedFiles.length === 0) {
      showNotification("info", "No files selected to upload.");
      return;
    }

    let toUpload = selectedFiles;
    let skipped = [];

    if (uploadedFiles && uploadedFiles.length > 0) {
      const existingNames = new Set(uploadedFiles.map((f) => f.name));
      toUpload = [];

      selectedFiles.forEach((file) => {
        if (existingNames.has(file.name)) {
          skipped.push(file);
        } else {
          toUpload.push(file);
        }
      });

      if (skipped.length > 0) {
        const preview = skipped
          .slice(0, 3)
          .map((f) => `"${f.name}"`)
          .join(", ");
        const baseMessage =
          skipped.length === 1
            ? `Selected file ${preview} already exists on the server and will be skipped.`
            : `${skipped.length} selected files already exist on the server (e.g. ${preview}) and will be skipped.`;
        showNotification("warning", baseMessage);
      }
    }

    if (toUpload.length === 0) {
      showNotification(
        "info",
        "No new files to upload; all selected files already exist on the server."
      );
      return;
    }

    toUpload.forEach((file) => {
      uploadFileWithRetry(file);
    });

    // Clear selection after starting uploads
    setSelectedFiles([]);
  };

  const handleDeleteFile = async (filename) => {
    if (!serverOnline) {
      showNotification(
        "error",
        "Cannot delete files while the server is offline."
      );
      return;
    }

    try {
      const response = await fetch(`/files/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      const message = await response.text();
      if (response.ok) {
        showNotification("success", message || "File deleted.");
      } else {
        showNotification("error", message || "Failed to delete file.");
      }
      fetchFiles();
    } catch (error) {
      console.error(error);
      showNotification("error", "Failed to delete file.");
    }
  };

  const handleClearAllUploaded = () => {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      showNotification("info", "No uploaded files to clear.");
      return;
    }
    if (!serverOnline) {
      showNotification(
        "error",
        "Cannot clear uploaded files while the server is offline."
      );
      return;
    }
    setConfirmClearAllOpen(true);
  };

  const performClearAllUploaded = async () => {
    try {
      // Try bulk clear endpoint first (DELETE /files). If that fails or is not
      // available, fall back to deleting files one by one.
      const bulkResponse = await fetch("/files", {
        method: "DELETE"
      });
      const bulkMessage = await bulkResponse.text();

      if (bulkResponse.ok) {
        showNotification(
          "success",
          bulkMessage || "All uploaded files cleared."
        );
        setUploadedFiles([]);
        fetchFiles();
        setConfirmClearAllOpen(false);
        return;
      }

      // If the bulk endpoint exists but returns a non-404 error, surface it.
      if (bulkResponse.status !== 404) {
        showNotification(
          "error",
          bulkMessage || "Failed to clear uploaded files."
        );
        setConfirmClearAllOpen(false);
        return;
      }
    } catch (error) {
      console.error(error);
      // Fall through to per-file deletion on network or other failures.
    }

    // Fallback: delete each file individually using DELETE /files/:filename.
    try {
      let successCount = 0;
      let failureCount = 0;
      const filesToDelete = uploadedFiles.map((f) => f.name);

      for (const filename of filesToDelete) {
        try {
          const response = await fetch(`/files/${encodeURIComponent(filename)}`, {
            method: "DELETE"
          });
          if (response.ok) {
            successCount += 1;
          } else {
            failureCount += 1;
          }
        } catch {
          failureCount += 1;
        }
      }

      if (successCount > 0 && failureCount === 0) {
        showNotification("success", `Deleted ${successCount} uploaded file(s).`);
      } else if (successCount > 0 && failureCount > 0) {
        showNotification(
          "warning",
          `Deleted ${successCount} file(s), but ${failureCount} failed.`
        );
      } else {
        showNotification("error", "Failed to clear uploaded files.");
      }

      fetchFiles();
    } catch (error) {
      console.error(error);
      showNotification("error", "Failed to clear uploaded files.");
    } finally {
      setConfirmClearAllOpen(false);
    }
  };

  return (
    <div className="app-root">
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`toast toast--${n.type}`}
            onClick={() =>
              setNotifications((prev) => prev.filter((t) => t.id !== n.id))
            }
          >
            {n.message}
          </div>
        ))}
      </div>
      {confirmClearAllOpen && (
        <div
          className="confirm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmClearAllOpen(false);
            }
          }}
        >
          <div
            className="confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="confirm-modal-title">
              Clear all uploaded files?
            </h3>
            <p className="confirm-modal-text">
              This will permanently remove all files currently stored on the
              server. This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmClearAllOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={performClearAllUploaded}
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
      {aboutOpen && (
        <div
          className="confirm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAboutOpen(false);
            }
          }}
        >
          <div
            className="confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="confirm-modal-title">About MySnapDrop</h3>
            <p className="confirm-modal-text">
              MySnapDrop lets you share files over your local network through a
              simple web interface. Open this app on any device on the same
              Wi‑Fi, then use the upload area to drop files and the QR button
              to open the app on another device.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAboutOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="app-header">
        <div className="app-header-row">
          <div className="app-title">
            <h1>MySnapDrop</h1>
            <p>Local file sharing over your network.</p>
          </div>
          <div className="app-status">
            <span
              className={`status-dot${
                serverOnline ? "" : " status-dot--offline"
              }`}
              aria-label={serverOnline ? "Server online" : "Server offline"}
            ></span>
            <span className="status-separator">·</span>
            <button
              type="button"
              className="link-button"
              onClick={() =>
                setTheme((prev) => (prev === "light" ? "dark" : "light"))
              }
            >
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <section className="transfer-area">
          <DropZone
            selectedFiles={selectedFiles}
            onFilesSelected={handleFilesSelected}
          />
          <FileControls
            canUpload={canUpload}
            onUpload={handleUpload}
            onClear={handleClearSelection}
          />
          {selectionSummary && (
            <p className="selection-summary">{selectionSummary}</p>
          )}
          {!serverOnline && (
            <p className="server-offline-hint">
              Server is offline. Start the backend and reload this page before
              uploading or managing files.
            </p>
          )}
        </section>
        <section className="files-area">
          <UploadedFilesList
            files={uploadedFiles}
            uploadProgress={uploadProgress}
            uploadingFiles={uploadingFiles}
            onDelete={handleDeleteFile}
            onClearAll={handleClearAllUploaded}
          />
        </section>
      </main>
      <footer className="app-footer">
        <QrSection />
        <p className="app-author">
          Author: <span>hungti17</span> -{" "}
          <a href="mailto:nphung75@gmail.com">nphung75@gmail.com</a> ·{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => setAboutOpen(true)}
          >
            About
          </button>
        </p>
      </footer>
    </div>
  );
}
