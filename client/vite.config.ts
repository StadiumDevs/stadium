import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Create an empty module to silence Node-only Polkadot imports
const emptyModule = path.resolve(__dirname, "empty-module.js");

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),

      // Prevent Vite/Rollup from trying to bundle Node-only Polkadot modules
      "@polkadot/api": emptyModule,
      "@polkadot/api-contract": emptyModule,
    },
  },

  optimizeDeps: {
    exclude: [
      "@polkadot/api",
      "@polkadot/api-contract"
    ],
  },

  build: {
    rollupOptions: {
      external: [
        "@polkadot/api",
        "@polkadot/api-contract"
      ],
    },
  },
}));
