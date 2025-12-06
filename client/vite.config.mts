import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the MySnapDrop React client.
// During development, we can proxy API calls to the existing Express server.

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/upload": "http://localhost:3000",
      "/files": "http://localhost:3000",
      "/download": "http://localhost:3000"
    }
  },
  build: {
    outDir: "dist"
  }
});
