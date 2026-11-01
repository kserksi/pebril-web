import { chromium } from 'playwright';

const urls = ['/journal/', '/journal/why-pebril/', '/journal/en/', '/journal/en/why-pebril/'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });

for (const u of urls) {
  errors.length = 0;
  await page.goto('http://127.0.0.1:4173' + u, { waitUntil: 'networkidle' });
  const info = await page.evaluate(async () => {
    await document.fonts.ready;
    const h1 = document.querySelector('h1');
    const h2 = document.querySelector('h2');
    const p = document.querySelector('.prose p');
    const cs = (el) => el ? getComputedStyle(el).fontFamily : null;
    const loaded = [...document.fonts].filter((f) => f.family.includes('Pebril')).map((f) => f.status);
    return {
      lang: document.documentElement.lang,
      title: document.title,
      hreflangs: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => `${l.hreflang}=${l.getAttribute('href')}`),
      canonical: document.querySelector('link[rel=canonical]')?.href,
      h1: h1?.textContent.trim(),
      h2: h2?.textContent.trim(),
      h1font: cs(h1), bodyfont: cs(p),
      kaiLoaded: loaded,
      langswitch: [...document.querySelectorAll('.lang')].map((a) => `${a.textContent}=${a.getAttribute('href')}`),
      widths: { doc: document.documentElement.scrollWidth, win: window.innerWidth },
    };
  });
  console.log(u, JSON.stringify(info, null, 1));
  console.log('errors:', errors.length ? errors : 'none');
}
await browser.close();
