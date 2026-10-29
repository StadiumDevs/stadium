import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Plugin } from "vite";
import { llmsFiles } from "./src/lib/llms/renderLlms";

// The llms.txt files (for AI assistants) are generated from the same content,
// profiles and developer resources the site uses: served in dev, emitted into
// dist at build. Links use the deployment's own origin (a preview links to itself).
const siteOrigin = () =>
  process.env.VITE_SITE_URL ||
  (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://stadium.joinwebzero.com");

function llmsTxt(): Plugin {
  return {
    name: "stadium-llms-txt",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? "").split("?")[0];
        const origin = `http://${req.headers.host ?? "localhost:8080"}`;
        const body = llmsFiles(origin)[pathname.slice(1)];
        if (!body) return next();
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(body);
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(llmsFiles(siteOrigin()))) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
  };
}

// Create an empty module to silence Node-only Polkadot imports
const emptyModule = path.resolve(__dirname, "empty-module.js");

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  plugins: [react(), llmsTxt()],

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
