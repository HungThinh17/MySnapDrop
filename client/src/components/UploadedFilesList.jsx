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
      {files.map((file) => (
        <div key={file} className="uploaded-file-row">
          <a
            href={`/download/${encodeURIComponent(file)}`}
            className="uploaded-file-link"
          >
            {file}
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
              className="btn btn-danger"
              onClick={() => onDelete(file)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
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
