import React, { useEffect, useRef } from "react";

export function QrSection() {
  const containerRef = useRef(null);

  useEffect(() => {
    const host = window.location.hostname;
    const port = window.location.port;
    const url = `http://${host}${port ? `:${port}` : ""}`;

    if (!containerRef.current) return;

    // Clear previous QR code if any
    containerRef.current.innerHTML = "";

    // @ts-ignore - QRCode is provided by external script
    const QRCodeCtor = window.QRCode;
    if (!QRCodeCtor) {
      return;
    }

    // @ts-ignore
    new QRCodeCtor(containerRef.current, {
      text: url,
      width: 128,
      height: 128,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCodeCtor.CorrectLevel?.H ?? 0
    });
  }, []);

  return (
    <section className="qr-section">
      <h2>Open on another device</h2>
      <p className="qr-description">
        Scan this QR code with another device on the same network to open the
        app.
      </p>
      <div ref={containerRef} className="qr-code"></div>
    </section>
  );
}

