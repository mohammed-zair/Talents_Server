import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/companies/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["framer-motion", "lucide-react"],
          "data-vendor": ["@tanstack/react-query", "axios"],
          "form-vendor": ["zod", "react-dropzone", "react-hot-toast"],
        },
      },
    },
  },
});
