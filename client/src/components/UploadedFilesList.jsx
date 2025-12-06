import React from "react";

export function UploadedFilesList({
  files,
  onDelete,
  onClearAll,
  uploadProgress,
  uploadingFiles
}) {
  return (
    <div className="uploaded-files">
      <h2>Uploaded Files</h2>
      {files.length === 0 && (
        <p className="uploaded-files-empty">No files have been uploaded yet.</p>
      )}
      {files.map((file) => {
        const fullName = file || "";
        const lastDotIndex = fullName.lastIndexOf(".");
        const base =
          lastDotIndex > 0 ? fullName.slice(0, lastDotIndex) : fullName;
        const ext =
          lastDotIndex > 0 ? fullName.slice(lastDotIndex + 1) : "";

        const MAX_BASE_LEN = 24;
        const truncatedBase =
          base.length > MAX_BASE_LEN
            ? base.slice(0, MAX_BASE_LEN - 1) + "…"
            : base;

        return (
          <div key={file} className="uploaded-file-row">
            <a
              href={`/download/${encodeURIComponent(file)}`}
              className="uploaded-file-link"
              title={file}
            >
              <span className="file-name">
                <span className="file-name-main">{truncatedBase}</span>
                {ext && <span className="file-name-ext">.{ext}</span>}
              </span>
            </a>
            <div className="uploaded-file-actions">
              {uploadingFiles.includes(file) && (
                <div className="progressBar">
                  <div
                    style={{ width: `${uploadProgress[file] || 0}%` }}
                  ></div>
                </div>
              )}
              <button
                type="button"
                className="btn btn-danger icon-button"
                aria-label={`Remove ${file}`}
                onClick={() => onDelete(file)}
              >
                <svg
                  className="icon-trash"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M9 3h6a1 1 0 0 1 .993.883L16 4v1h3a1 1 0 0 1 .117 1.993L19 7h-1v11a3 3 0 0 1-2.824 2.995L15 21H9a3 3 0 0 1-2.995-2.824L6 18V7H5a1 1 0 0 1-.117-1.993L5 5h3V4a1 1 0 0 1 .883-.993L9 3h6-6zm6 4H9v11a1 1 0 0 0 .883.993L10 19h4a1 1 0 0 0 .993-.883L15 18V7z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
      <div className="uploaded-files-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClearAll}
          disabled={files.length === 0}
        >
          Clear all uploaded files
        </button>
      </div>
    </div>
  );
}
