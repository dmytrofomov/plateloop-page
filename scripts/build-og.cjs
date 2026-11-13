/* Renders docs/img/og-recipe.jpg (1200x630). Run: node scripts/build-og.cjs
 * Requires playwright + sharp; set CHROME_PATH if Chrome is elsewhere. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const logo = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'docs/brand/plateloop-logo-dark.svg')).toString('base64');
const out = path.join(root, 'docs/img/og-recipe.jpg');

const html = `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,600&family=Manrope:wght@500;600;700;800&display=swap&subset=cyrillic" rel="stylesheet">
<style>
:root{--bg:#fff8ed;--ink:#183d32;--muted:#58675c;--mint:#dce9a2;--tg-bg:#e9eff3;--tg-out:#dcf2c8;--tg-in:#fff;--hairline:#e3ddce;--accent:#255a43}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:var(--bg);font-family:Manrope,system-ui,sans-serif;color:var(--ink);position:relative}
.left{position:absolute;left:64px;top:56px;width:556px;height:518px;display:flex;flex-direction:column}
.logo{height:64px;width:272px;margin-left:-4px}
h1{font-weight:800;font-size:49px;line-height:1.1;letter-spacing:-.02em;margin-top:44px}
h1 em{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600;color:var(--accent);letter-spacing:-.01em}
.sub{margin-top:auto;display:inline-flex;align-self:flex-start;align-items:center;gap:12px;background:var(--mint);border-radius:999px;padding:12px 24px;font-weight:700;font-size:25px}
.panel{position:absolute;left:660px;top:48px;width:492px;height:534px;background:var(--tg-bg);border-radius:32px;padding:28px 26px;display:flex;flex-direction:column;gap:18px;box-shadow:0 24px 50px -28px #183d3299}
.msg{border-radius:20px;padding:14px 18px;font-size:26px;line-height:1.3}
.out{align-self:flex-end;background:var(--tg-out);border-bottom-right-radius:6px;font-weight:700;color:#1f5a2e}
.in{background:var(--tg-in);border-bottom-left-radius:6px;padding:18px 20px 16px;box-shadow:0 1px 2px #14201a14}
.title{font-weight:800;font-size:27px;line-height:1.25}
.meta{color:var(--muted);font-weight:600;font-size:23px;margin-top:2px}
ul{list-style:none;padding:0;margin:12px 0 0;font-size:25px;line-height:1.5;font-weight:600}
ul b{font-weight:800}
.kb{display:flex;gap:10px;margin-top:6px}
.btn{flex:1;background:#fff;border:2px solid var(--tg-bg);border-radius:16px;padding:12px 0;text-align:center;font-weight:700;font-size:24px;color:var(--ink);box-shadow:0 1px 2px #14201a1f}
</style></head><body>
<div class="left">
  <img class="logo" src="${logo}" alt="">
  <h1>Рецепт із Reels чи TikTok — <em>текстом і зі&nbsp;списком покупок</em></h1>
  <div class="sub">Бот у Telegram · без реєстрації</div>
</div>
<div class="panel">
  <div class="msg out">instagram.com/reel/… ↗</div>
  <div class="msg in">
    <div class="title">📖 Сирники</div>
    <div class="meta">⏱ 25 хв · 2 порц.</div>
    <ul>
      <li>• Кисломолочний сир — <b>400 г</b></li>
      <li>• Яйце — <b>1 шт</b></li>
      <li>• Борошно — <b>3 ст. л.</b></li>
      <li>• Цукор — <b>1 ст. л.</b></li>
    </ul>
  </div>
  <div class="kb"><div class="btn">🍽 Записати</div><div class="btn">🛒 У покупки</div></div>
</div>
</body></html>`;

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('800 49px Manrope', 'Рецепт'), document.fonts.load('700 24px Manrope', 'Записати'),
      document.fonts.load('italic 600 49px Fraunces', 'текстом'),
    ]);
    await document.fonts.ready;
  });
  const fonts = await page.evaluate(() => [document.fonts.check('800 49px Manrope', 'Рецепт'), document.fonts.check('italic 600 49px Fraunces', 'текстом')]);
  if (!fonts.every(Boolean)) console.warn('WARNING: web fonts did not load, fallback used', fonts);
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.msg,.btn,.sub,h1,.panel')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className || e.tagName));
  if (overflow.length) console.warn('WARNING: overflow in', overflow);
  const png = await page.screenshot({ type: 'png' });
  await browser.close();
  await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${out} ${m.width}x${m.height} ${fs.statSync(out).size} bytes`);
})().catch(e => { console.error(e); process.exitCode = 1; });
