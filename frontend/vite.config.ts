import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// البورتات قابلة للتغيير من الـ shell لما البورت الافتراضي يبقى مشغول،
// من غير ما نلمس الإعداد الافتراضي.
const DEV_PORT = Number(process.env.VITE_DEV_PORT) || 5173;
const API_TARGET = process.env.VITE_API_TARGET || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],

  server: {
    port: DEV_PORT,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        // The session cookie must survive the proxy hop.
        cookieDomainRewrite: "localhost",
      },
    },
  },

  build: {
    target: "es2022",
    cssTarget: "chrome110",
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // فصل مكتبات الطرف الثالث في chunk ثابت — بيفضل مخزّن في الكاش
        // بين النسخ، فالمستخدم بينزّل كود التطبيق بس عند كل تحديث.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "router";
          if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
});
