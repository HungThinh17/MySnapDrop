import React, { useRef, useState } from "react";

export function DropZone({ selectedFiles, onFilesSelected }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleInputChange = (event) => {
    const files = Array.from(event.target.files || []);
    onFilesSelected(files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div className="drop-zone-container">
      <div
        className={`drop-zone ${isDragging ? "drop-zone--dragging" : ""}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFiles.length === 0 && (
          <p>Drag and drop files here or click to select</p>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="drop-zone-input"
          onChange={handleInputChange}
        />
        <div className="selected-files">
          {selectedFiles.length === 0 ? (
            <span className="selected-files-empty">No files selected</span>
          ) : (
            selectedFiles.map((file) => {
              const fullName = file.name || "";
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

              const key = `${fullName}-${file.size}-${file.lastModified}`;

              return (
                <div key={key} className="selected-file-item">
                  <span className="file-name" title={fullName}>
                    <span className="file-name-main">{truncatedBase}</span>
                    {ext && <span className="file-name-ext">.{ext}</span>}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
