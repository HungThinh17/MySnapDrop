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
        <p>Drag and drop files here or click to select</p>
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
            selectedFiles.map((file) => (
              <div key={file.name} className="selected-file-item">
                {file.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

