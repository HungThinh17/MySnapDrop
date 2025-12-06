import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// Best-effort: try to prevent pinch-zoom / double-tap zoom on browsers that
// still honor these handlers. Some modern mobile browsers may ignore this for
// accessibility reasons, so zoom might not be fully disabled everywhere.
if (typeof window !== "undefined") {
  const doc = window.document;

  // Prevent pinch-zoom gestures where supported.
  doc.addEventListener(
    "gesturestart",
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );

  // Mitigate double-tap zoom by cancelling rapid successive touchend events.
  let lastTouchEnd = 0;
  doc.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
