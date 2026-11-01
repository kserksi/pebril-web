import { chromium } from 'playwright';
import fs from 'node:fs';
const tokens = fs.readFileSync('/tmp/spec-tokens.css', 'utf8');
const base = fs.readFileSync('/tmp/spec-base.css', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<style>${tokens}${base}</style><body><h1>标题</h1><p>正文段落 text 2024.06.08</p><button>按钮</button></body>`);
const out = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const names = ['--canvas','--ink','--accent','--measure','--ease-quiet','--dur-view','--radius-lg','--display-zh','--space-6'];
  const vals = Object.fromEntries(names.map(n => [n, cs.getPropertyValue(n).trim()]));
  const p = getComputedStyle(document.querySelector('p'));
  const h1 = getComputedStyle(document.querySelector('h1'));
  return { vals, bodySize: p.fontSize, h1Font: h1.fontFamily, h1Size: h1.fontSize, bodyLh: p.lineHeight };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
