// Optional browser regression check. Requires Playwright and Chromium in the environment.
// Run against an existing npm start server: node scripts/browser-smoke.cjs
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4317');
    await page.waitForFunction(() => document.getElementById('cursorInfo').textContent === '68 × 52');
    await page.waitForTimeout(500);
    assert.deepEqual(errors, []);
    const asset = await page.request.get('http://127.0.0.1:4317/assets/building-atlas.png');
    assert.equal(asset.status(), 200);
    assert.equal(asset.headers()['content-type'], 'image/png');
    await page.evaluate(() => {
      const ctx = document.querySelector('canvas').getContext('2d');
      const fill = ctx.fillRect.bind(ctx); let once = true;
      ctx.fillRect = (...args) => { if (once) { once = false; throw Error('falha simulada'); } return fill(...args); };
    });
    await page.waitForFunction(() => document.getElementById('toast').textContent.includes('falha simulada'));
    await page.waitForTimeout(100);
    assert(await page.evaluate(() => {
      const data = document.querySelector('canvas').getContext('2d').getImageData(0,0,960,648).data;
      const colors = new Set();
      for (let i=0;i<data.length;i+=64) colors.add([data[i],data[i+1],data[i+2]].join());
      return colors.size > 100;
    }));
    const broken = await browser.newPage();
    await broken.route('**/app.js', route => route.abort());
    await broken.goto('http://127.0.0.1:4317');
    await broken.waitForFunction(() => document.getElementById('toast').textContent.includes('Não foi possível iniciar'));
    console.log('Browser smoke OK: startup, atlas, render recovery and module error.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
