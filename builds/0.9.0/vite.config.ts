import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        render: path.resolve(__dirname, "render.html"),
      },
    },
    target: ["es2022", "chrome110", "safari16"],
    minify: "esbuild"
  }
});
