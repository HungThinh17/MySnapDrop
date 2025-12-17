import React, { useEffect, useMemo, useState } from "react";

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const formatted =
    size < 10 && unitIndex > 0 ? size.toFixed(1) : Math.round(size);
  return `${formatted} ${units[unitIndex]}`;
}

function formatModified(mtimeMs) {
  if (typeof mtimeMs !== "number" || mtimeMs <= 0) {
    return "";
  }
  const date = new Date(mtimeMs);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function toViewFiles(files) {
  if (!Array.isArray(files)) return [];
  const MAX_BASE_LEN = 24;

  return files.map((file) => {
    const fullName = file?.name || "";
    const lastDotIndex = fullName.lastIndexOf(".");
    const base =
      lastDotIndex > 0 ? fullName.slice(0, lastDotIndex) : fullName;
    const ext = lastDotIndex > 0 ? fullName.slice(lastDotIndex + 1) : "";

    const truncatedBase =
      base.length > MAX_BASE_LEN
        ? base.slice(0, MAX_BASE_LEN - 1) + "..."
        : base;

    const extLower = ext.toLowerCase();
    let kind = "file";
    if (
      [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "svg",
        "bmp",
        "avif"
      ].includes(extLower)
    ) {
      kind = "image";
    } else if (["mp4", "mov", "avi", "mkv", "webm"].includes(extLower)) {
      kind = "video";
    } else if (["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extLower)) {
      kind = "audio";
    } else if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extLower)) {
      kind = "archive";
    } else if (
      [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "md"
      ].includes(extLower)
    ) {
      kind = "doc";
    }

    const size = typeof file.size === "number" ? file.size : 0;
    const mtimeMs = typeof file.mtimeMs === "number" ? file.mtimeMs : 0;

    return {
      fullName,
      truncatedBase,
      ext,
      kind,
      size,
      mtimeMs
    };
  });
}

export function UploadedFilesList({
  files,
  layoutMode,
  onDelete,
  onDeleteMany,
  onClearAll,
  uploadProgress,
  uploadingFiles
}) {
  const [sortField, setSortField] = useState("mtimeMs");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedNames, setSelectedNames] = useState([]);

  const viewFiles = useMemo(() => toViewFiles(files), [files]);

  const sortedFiles = useMemo(() => {
    const list = [...viewFiles];
    const direction = sortDirection === "asc" ? 1 : -1;

    const typeOrder = (kind) => {
      switch (kind) {
        case "image":
          return 2;
        case "video":
          return 3;
        case "audio":
          return 4;
        case "doc":
          return 5;
        case "archive":
          return 6;
        case "file":
        default:
          return 7;
      }
    };

    list.sort((a, b) => {
      const nameA = a.fullName || "";
      const nameB = b.fullName || "";

      if (sortField === "name") {
        const result = nameA.localeCompare(nameB, undefined, {
          sensitivity: "base"
        });
        return direction * result;
      }

      if (sortField === "size") {
        const diffSize = (a.size || 0) - (b.size || 0);
        if (diffSize !== 0) {
          return direction * diffSize;
        }
        const fallback = nameA.localeCompare(nameB, undefined, {
          sensitivity: "base"
        });
        return direction * fallback;
      }

      if (sortField === "type") {
        const diffType = typeOrder(a.kind) - typeOrder(b.kind);
        if (diffType !== 0) {
          return direction * diffType;
        }
        const fallback = nameA.localeCompare(nameB, undefined, {
          sensitivity: "base"
        });
        return direction * fallback;
      }

      const diff = (a.mtimeMs || 0) - (b.mtimeMs || 0);
      if (diff !== 0) {
        return direction * diff;
      }
      const fallback = nameA.localeCompare(nameB, undefined, {
        sensitivity: "base"
      });
      return direction * fallback;
    });

    return list;
  }, [viewFiles, sortField, sortDirection]);

  const allFileNames = useMemo(
    () =>
      sortedFiles
        .map((item) => item.fullName)
        .filter((name) => typeof name === "string" && name.length > 0),
    [sortedFiles]
  );

  useEffect(() => {
    setSelectedNames((prev) =>
      prev.filter((name) => allFileNames.includes(name))
    );
  }, [allFileNames]);

  const selectedSet = useMemo(
    () => new Set(selectedNames),
    [selectedNames]
  );
  const selectedCount = selectedNames.length;
  const allSelected =
    allFileNames.length > 0 &&
    allFileNames.every((name) => selectedSet.has(name));

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedNames([]);
    } else {
      setSelectedNames(allFileNames);
    }
  };

  const handleToggleSelectOne = (fullName) => {
    if (!fullName) return;
    setSelectedNames((prev) =>
      prev.includes(fullName)
        ? prev.filter((name) => name !== fullName)
        : [...prev, fullName]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedNames.length === 0) return;
    if (onDeleteMany) {
      onDeleteMany(selectedNames);
    } else if (onDelete) {
      selectedNames.forEach((name) => {
        onDelete(name);
      });
    }
    setSelectedNames([]);
  };

  const handleSortFieldChange = (event) => {
    const nextField = event.target.value;
    setSortField(nextField);
  };

  const handleSortDirectionToggle = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const isExplorer = layoutMode === "explorer";

  if (!isExplorer) {
    return (
      <div className="uploaded-files">
        <div className="uploaded-files-header">
          <h2>Uploaded Files</h2>
        </div>
        {sortedFiles.length === 0 && (
          <p className="uploaded-files-empty">
            No files have been uploaded yet.
          </p>
        )}
        {sortedFiles.map((item) => {
          const { fullName, truncatedBase, ext, kind, size } = item;

          return (
            <div key={fullName} className="uploaded-file-row">
              <a
                href={`/download/${encodeURIComponent(fullName)}`}
                className="uploaded-file-link"
                title={fullName}
              >
                <span className="file-type-icon-wrapper" aria-hidden="true">
                  <svg
                    className={`file-type-icon file-type-icon--${kind}`}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M7 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.828a2 2 0 0 0-.586-1.414l-4.828-4.828A2 2 0 0 0 12.172 3H7Z"
                      fill="var(--color-surface)"
                      stroke="var(--color-border-subtle)"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M14 3.5V7a1 1 0 0 0 1 1h3.5"
                      stroke="var(--color-border-subtle)"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 14h6"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="file-name">
                  <span className="file-name-main">{truncatedBase}</span>
                  {ext && <span className="file-name-ext">.{ext}</span>}
                </span>
              </a>
              <div className="uploaded-file-actions">
                {uploadingFiles.includes(fullName) && (
                  <div className="progressBar">
                    <div
                      style={{ width: `${uploadProgress[fullName] || 0}%` }}
                    ></div>
                  </div>
                )}
                {size > 0 && (
                  <span className="uploaded-file-size">
                    {formatFileSize(size)}
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-danger icon-button"
                  aria-label={`Remove ${fullName}`}
                  onClick={() => onDelete(fullName)}
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
            disabled={sortedFiles.length === 0}
          >
            Clear all uploaded files
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="uploaded-files uploaded-files--explorer">
      <div className="uploaded-files-header">
        <h2>Uploaded Files</h2>
        <div className="files-explorer-toolbar">
          <div className="files-explorer-sort">
            <label className="files-explorer-sort-label">
              Sort by
              <select
                className="files-explorer-sort-select"
                value={sortField}
                onChange={handleSortFieldChange}
              >
                <option value="mtimeMs">Modified</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="type">Type</option>
              </select>
            </label>
            <button
              type="button"
              className="files-explorer-sort-direction"
              onClick={handleSortDirectionToggle}
            >
              {sortDirection === "asc" ? "▲" : "▼"}
            </button>
          </div>
          <div className="files-explorer-actions">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={handleDeleteSelected}
              disabled={selectedCount === 0}
            >
              Delete selected
            </button>
          </div>
        </div>
      </div>
      {sortedFiles.length === 0 && (
        <p className="uploaded-files-empty">
          No files have been uploaded yet.
        </p>
      )}
      {sortedFiles.length > 0 && (
        <div className="files-explorer-table">
          <div className="files-explorer-row files-explorer-row--header">
            <div className="files-explorer-cell files-explorer-cell--name">
              <input
                type="checkbox"
                className="files-explorer-select-all"
                checked={allSelected}
                onChange={handleToggleSelectAll}
                aria-label="Select all files"
              />
              <span>Name</span>
            </div>
            <div className="files-explorer-cell files-explorer-cell--size">
              Size
            </div>
            <div className="files-explorer-cell files-explorer-cell--modified">
              Modified
            </div>
            <div className="files-explorer-cell files-explorer-cell--actions">
              Actions
            </div>
          </div>
          <div className="files-explorer-body">
            {sortedFiles.map((item) => {
              const {
                fullName,
                truncatedBase,
                ext,
                kind,
                size,
                mtimeMs
              } = item;
              const isSelected = selectedSet.has(fullName);

              return (
                <div
                  key={fullName}
                  className={`files-explorer-row${
                    isSelected ? " files-explorer-row--selected" : ""
                  }`}
                >
                  <div className="files-explorer-cell files-explorer-cell--name">
                    <input
                      type="checkbox"
                      className="files-explorer-select"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(fullName)}
                      aria-label={`Select ${fullName}`}
                    />
                    <a
                      href={`/download/${encodeURIComponent(fullName)}`}
                      className="uploaded-file-link"
                      title={fullName}
                    >
                      <span
                        className="file-type-icon-wrapper"
                        aria-hidden="true"
                      >
                        <svg
                          className={`file-type-icon file-type-icon--${kind}`}
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M7 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.828a2 2 0 0 0-.586-1.414l-4.828-4.828A2 2 0 0 0 12.172 3H7Z"
                            fill="var(--color-surface)"
                            stroke="var(--color-border-subtle)"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M14 3.5V7a1 1 0 0 0 1 1h3.5"
                            stroke="var(--color-border-subtle)"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M9 14h6"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      <span className="file-name">
                        <span className="file-name-main">{truncatedBase}</span>
                        {ext && <span className="file-name-ext">.{ext}</span>}
                      </span>
                    </a>
                  </div>
                  <div className="files-explorer-cell files-explorer-cell--size">
                    {size > 0 ? formatFileSize(size) : "—"}
                  </div>
                  <div className="files-explorer-cell files-explorer-cell--modified">
                    {formatModified(mtimeMs) || "—"}
                  </div>
                  <div className="files-explorer-cell files-explorer-cell--actions">
                    {uploadingFiles.includes(fullName) && (
                      <div className="progressBar">
                        <div
                          style={{ width: `${uploadProgress[fullName] || 0}%` }}
                        ></div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger icon-button"
                      aria-label={`Remove ${fullName}`}
                      onClick={() => onDelete(fullName)}
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
          </div>
        </div>
      )}
      <div className="uploaded-files-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClearAll}
          disabled={sortedFiles.length === 0}
        >
          Clear all uploaded files
        </button>
      </div>
    </div>
  );
}
