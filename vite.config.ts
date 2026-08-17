import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const orgName = env.VITE_ORG_NAME || "Pegasus Manager";
  const orgShortName = env.VITE_ORG_SHORT_NAME || "Pegasus";
  const themeColor = env.VITE_THEME_PRIMARY_COLOR || "#0B2E59";

  return {
  plugins: [
    react(),
    {
      name: "org-html-placeholders",
      transformIndexHtml(html: string) {
        return html
          .replaceAll("{{ORG_NAME}}", orgName)
          .replaceAll("{{ORG_SHORT_NAME}}", orgShortName)
          .replaceAll("{{THEME_PRIMARY_COLOR}}", themeColor);
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      manifest: {
        name: orgName,
        short_name: orgShortName,
        description: `Sistema de gestão esportiva do Projeto ${orgShortName}`,
        theme_color: themeColor,
        background_color: themeColor,
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  };
});
