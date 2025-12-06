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
        <span className="btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="icon-upload">
            <path
              d="M12 3a1 1 0 0 1 .993.883L13 4v8.586l2.293-2.293a1 1 0 0 1 1.32-.083l.094.083a1 1 0 0 1 .083 1.32l-.083.094-4 4a1 1 0 0 1-1.32.083l-.094-.083-4-4a1 1 0 0 1 1.32-1.497l.094.083L11 12.586V4a1 1 0 0 1 1-1Z"
              fill="currentColor"
            />
            <path
              d="M5 17a1 1 0 0 1 .883.993L5.882 18A2.118 2.118 0 0 0 8 20.118h8A2.118 2.118 0 0 0 18.118 18a1 1 0 1 1 2 0A4.118 4.118 0 0 1 16 22.118H8A4.118 4.118 0 0 1 3.882 18 1 1 0 0 1 5 17Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="btn-label">Upload</span>
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onClear}
      >
        <span className="btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="icon-clear">
            <path
              d="M6.343 6.343a1 1 0 0 1 1.32-.083l.094.083L12 10.585l4.243-4.242a1 1 0 0 1 1.497 1.32l-.083.094L13.415 12l4.242 4.243a1 1 0 0 1-1.32 1.497l-.094-.083L12 13.415l-4.243 4.242a1 1 0 0 1-1.497-1.32l.083-.094L10.585 12 6.343 7.757a1 1 0 0 1 0-1.414Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="btn-label">Clear Selected Files</span>
      </button>
    </div>
  );
}
