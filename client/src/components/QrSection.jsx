import React, { useEffect, useRef, useState } from "react";

export function QrSection() {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      return;
    }

    const host = window.location.hostname;
    const port = window.location.port;
    const url = `http://${host}${port ? `:${port}` : ""}`;

    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    // @ts-ignore - QRCode is provided by external script
    const QRCodeCtor = window.QRCode;
    if (!QRCodeCtor) {
      return;
    }

    // @ts-ignore
    new QRCodeCtor(containerRef.current, {
      text: url,
      width: 180,
      height: 180,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCodeCtor.CorrectLevel?.H ?? 0
    });
  }, [open]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <section className="qr-section">
      <p className="qr-description">
        Open on another device —{" "}
        <button
          type="button"
          className="link-button"
          onClick={handleOpen}
        >
          Click here
        </button>
      </p>
      {open && (
        <div
          className="qr-modal-overlay"
          onClick={handleOverlayClick}
        >
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="qr-modal-title">Scan to open</h3>
            <div ref={containerRef} className="qr-code qr-code--modal"></div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
