// Renders og-image.html to public/og-image.png (1200x630). Run from client/: node scripts/og-image/render.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`file://${path.join(here, "og-image.html")}`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: path.resolve(here, "../../public/og-image.png") });
await browser.close();
