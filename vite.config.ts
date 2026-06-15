// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "node:stream/web": path.resolve(__dirname, "src/lib/empty-polyfill.ts"),
        "node:stream": path.resolve(__dirname, "src/lib/empty-polyfill.ts"),
        "node:async_hooks": path.resolve(__dirname, "src/lib/empty-polyfill.ts"),
        "node:events": path.resolve(__dirname, "src/lib/empty-polyfill.ts"),
        "node:util": path.resolve(__dirname, "src/lib/empty-polyfill.ts"),
        "node:buffer": path.resolve(__dirname, "src/lib/empty-polyfill.ts"),
        "node:path": path.resolve(__dirname, "src/lib/empty-polyfill.ts"),
      },
    },
    define: {
      "process.env": "{}",
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        manifest: false, // already provided in public/
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
          // Ignore the server-only files in the service worker crawl
          navigateFallbackDenylist: [/^\/api/],
        },
      }),
    ],
  },
});
