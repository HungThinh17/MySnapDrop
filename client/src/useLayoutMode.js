import { useEffect, useState } from "react";

const PHONE = "phone";
const EXPLORER = "explorer";

function getLayoutMode() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return PHONE;
  }

  const isExplorer = window.matchMedia("(min-width: 768px)").matches;
  return isExplorer ? EXPLORER : PHONE;
}

export function useLayoutMode() {
  const [mode, setMode] = useState(() => getLayoutMode());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleChange = () => {
      setMode(getLayoutMode());
    };

    window.addEventListener("resize", handleChange);

    return () => {
      window.removeEventListener("resize", handleChange);
    };
  }, []);

  return mode;
}

