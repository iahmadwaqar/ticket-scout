// electron.vite.config.js
import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
var shouldAnalyze = process.env.ANALYZE === "true";
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      watch: {
        include: ["src/main/index.js"]
      },
      rollupOptions: {
        external: [
          "gologin",
          "buffer",
          "util",
          "bufferutil"
        ],
        output: {
          format: "es",
          globals: {
            gologin: "gologin"
          }
        }
      },
      commonjsOptions: {
        ignoreDynamicRequires: true,
        transformMixedEsModules: true
      }
    }
  },
  preload: {
    build: {
      watch: {
        include: ["src/preload/index.js"]
      },
      rollupOptions: {
        output: {
          entryFileNames: "index.mjs"
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@/components": resolve("src/renderer/src/components"),
        "@/lib": resolve("src/renderer/src/lib"),
        "@/hooks": resolve("src/renderer/src/hooks"),
        "@/types": resolve("src/renderer/src/types"),
        "@/assets": resolve("src/renderer/src/assets"),
        "@/shared": resolve("src/shared")
      }
    },
    plugins: [
      react({
        include: "**/*.{jsx,js}"
      }),
      tailwind(),
      ...shouldAnalyze ? [
        visualizer({
          filename: "bundle-analysis.html",
          open: true,
          gzipSize: true,
          brotliSize: true
        })
      ] : []
    ]
  }
});
export {
  electron_vite_config_default as default
};
