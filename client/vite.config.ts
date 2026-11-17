import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";
import type { Plugin } from "vite";
import { llmsFiles, llmsTrackSources } from "./src/lib/llms/renderLlms";

// The llms.txt files (for AI assistants) are generated from the same content,
// profiles and developer resources the site uses: served in dev, emitted into
// dist at build. Built files always link to the public site, never to a
// per-commit Vercel host (those change on every push and get copied into
// assistants' context); VITE_SITE_URL overrides it. The dev server links to
// itself (the request host).
const siteOrigin = () => process.env.VITE_SITE_URL || "https://stadium.joinwebzero.com";

// The hand-written per-track briefs, read fresh on every request in dev.
const readTrackSources = () =>
  Object.fromEntries(
    llmsTrackSources().map((rel) => [rel, fs.readFileSync(path.resolve(__dirname, "src/lib/llms", rel), "utf8")]),
  );

function llmsTxt(): Plugin {
  return {
    name: "stadium-llms-txt",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? "").split("?")[0];
        const origin = `http://${req.headers.host ?? "localhost:8080"}`;
        const body = llmsFiles(origin, readTrackSources())[pathname.slice(1)];
        if (!body) return next();
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(body);
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(llmsFiles(siteOrigin(), readTrackSources()))) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
  };
}

// robots.txt + sitemap.xml. Without them the SPA rewrite in vercel.json serves
// index.html at both paths. The sitemap lists the public routes plus every
// non-draft program from the production API; if the API can't be reached at
// build time it falls back to the static routes so the build never fails.
const SITEMAP_STATIC_ROUTES = ["/", "/programs", "/m2-program"];
const sitemapApiBase = () =>
  process.env.VITE_API_BASE_URL || "https://stadium-production-996a.up.railway.app/api";

const robotsTxt = (origin: string) =>
  `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`;

async function programPaths(): Promise<string[]> {
  try {
    const res = await fetch(`${sitemapApiBase()}/programs`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: { slug?: string; status?: string }[] };
    return (body.data ?? [])
      .filter((p) => p.slug && p.status !== "draft")
      .map((p) => `/programs/${encodeURIComponent(p.slug as string)}`);
  } catch {
    return [];
  }
}

const sitemapXml = (origin: string, paths: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  paths.map((p) => `  <url><loc>${origin}${p}</loc></url>\n`).join("") +
  `</urlset>\n`;

function seoFiles(): Plugin {
  return {
    name: "stadium-seo-files",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? "").split("?")[0];
        const origin = `http://${req.headers.host ?? "localhost:8080"}`;
        if (pathname === "/robots.txt") {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          return res.end(robotsTxt(origin));
        }
        if (pathname === "/sitemap.xml") {
          res.setHeader("Content-Type", "application/xml; charset=utf-8");
          return res.end(sitemapXml(origin, [...SITEMAP_STATIC_ROUTES, ...(await programPaths())]));
        }
        next();
      });
    },
    async generateBundle() {
      const origin = siteOrigin();
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt(origin) });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: sitemapXml(origin, [...SITEMAP_STATIC_ROUTES, ...(await programPaths())]),
      });
    },
  };
}

// Create an empty module to silence Node-only Polkadot imports
const emptyModule = path.resolve(__dirname, "empty-module.js");

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // The playground reads the privacy track review fixtures from ../server/fixtures.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), path.resolve(__dirname, "../server/fixtures")] },
  },

  plugins: [react(), llmsTxt(), seoFiles()],

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
