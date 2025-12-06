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

  const canUpload = selectedFiles.length > 0;

  const uploadingFiles = useMemo(
    () => Object.keys(uploadProgress),
    [uploadProgress]
  );

  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch("/files");
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      const files = await response.json();
      setUploadedFiles(files || []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFilesSelected = (files) => {
    setSelectedFiles(files);
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
      alert("File uploaded!");
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
        alert("Upload failed: " + xhr.status + reason);
        clearProgress();
      }
    };

    xhr.onerror = () => {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        setTimeout(() => uploadFileWithRetry(file, attempt + 1), delay);
      } else {
        alert("Upload failed: network error");
        clearProgress();
      }
    };

    xhr.onabort = xhr.onerror;
    xhr.send(formData);
  };

  const handleUpload = () => {
    selectedFiles.forEach((file) => {
      uploadFileWithRetry(file);
    });
  };

  const handleDeleteFile = async (filename) => {
    try {
      const response = await fetch(`/files/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      const message = await response.text();
      alert(message);
      fetchFiles();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>MySnapDrop</h1>
        <p>Local file sharing over your network.</p>
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
        </section>
        <section className="files-area">
          <UploadedFilesList
            files={uploadedFiles}
            uploadProgress={uploadProgress}
            uploadingFiles={uploadingFiles}
            onDelete={handleDeleteFile}
          />
          <QrSection />
        </section>
      </main>
    </div>
  );
}

