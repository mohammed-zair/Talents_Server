import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (!id.includes("node_modules"))
                        return;
                    if (id.includes("/recharts/") || id.includes("/chart.js/")) {
                        return "charts";
                    }
                    if (id.includes("/framer-motion/")) {
                        return "motion";
                    }
                    if (id.includes("/quill/") ||
                        id.includes("/@tiptap/core/") ||
                        id.includes("/@tiptap/react/")) {
                        return "editors";
                    }
                    if (id.includes("/dayjs/") || id.includes("/date-fns/")) {
                        return "date-libs";
                    }
                    if (id.includes("/axios/")) {
                        return "http";
                    }
                    return "vendor";
                },
            },
        },
    },
});
