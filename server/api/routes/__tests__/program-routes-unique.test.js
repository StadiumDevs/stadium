// Express uses the first matching route, so a second registration of the same
// method + path is silently unreachable (this happened to the judge header
// counts when the public stats page took GET /:slug/stats).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../program.routes.js');
const routes = [...fs.readFileSync(file, 'utf8').matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map((m) => `${m[1].toUpperCase()} ${m[2]}`);

describe('program routes', () => {
  it('registers every method + path once', () => {
    const dupes = routes.filter((r, i) => routes.indexOf(r) !== i);
    expect(dupes).toEqual([]);
  });

  it('keeps the public stats page, its llms.txt and the judge counts on separate paths', () => {
    expect(routes).toEqual(expect.arrayContaining(['GET /:slug/stats', 'GET /:slug/stats/llms.txt', 'GET /:slug/stats/summary']));
  });
});
