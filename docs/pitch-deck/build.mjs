// Renders deck.html to ordo-pitch-deck.pdf (1920×1080 pages).
// Usage: npm i -D playwright && node docs/pitch-deck/build.mjs [--previews]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', '..', 'ordo-ui', 'public', 'ordo-pitch-deck.pdf');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + join(here, 'deck.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
if (process.argv.includes('--previews')) {
  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: join(here, `preview-${String(i + 1).padStart(2, '0')}.png`) });
}
await page.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('wrote', out);
