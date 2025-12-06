import React from "react";

export function FileControls({ canUpload, onUpload, onClear }) {
  return (
    <div className="file-controls">
      <button
        type="button"
        className="btn btn-primary"
        onClick={onUpload}
        disabled={!canUpload}
      >
        Upload
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onClear}
      >
        Clear Selected Files
      </button>
    </div>
  );
}

