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

      // Only prevent api-contract from being bundled (not used)
      "@polkadot/api-contract": emptyModule,
    },
  },

  optimizeDeps: {
    include: [
      "@polkadot/api",
      "@polkadot/extension-dapp",
      "@polkadot/util",
      "@polkadot/util-crypto"
    ],
    exclude: [
      "@polkadot/api-contract"
    ],
  },

  build: {
    rollupOptions: {
      external: [
        "@polkadot/api-contract"
      ],
    },
  },
}));
