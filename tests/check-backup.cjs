const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLANTORY_PLAYWRIGHT || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLANTORY_CHROME });
  try {
    const url = pathToFileURL(path.resolve(__dirname, '../app/Plantory_3D_Integrated_original_models.html')).href;
    const key = 'plantory_full_mvp_v2';
    const sample = { version: 2, items: [{ id: 'test-1', type: 'task', date: '2025-01-04', title: 'Synthetic task', note: 'Synthetic memo', done: true }], awards: { '2025-01-04': 'tulip' }, growth: { '2025-01-04': 3 }, settings: { hasOnboarded: true } };
    const source = await browser.newPage({ acceptDownloads: true });
    await source.goto(url);
    await source.evaluate(([key, sample]) => localStorage.setItem(key, JSON.stringify(sample)), [key, sample]);
    await source.reload();
    const downloadPromise = source.waitForEvent('download');
    await source.locator('#exportData').evaluate(button => button.click());
    const download = await downloadPromise;
    const jsonPath = await download.path();
    const exported = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    assert.equal(exported.items[0].title, sample.items[0].title);
    assert.equal(exported.items[0].note, sample.items[0].note);
    assert.deepEqual(exported.awards, sample.awards);
    assert.deepEqual(exported.growth, sample.growth);
    const target = await browser.newPage();
    await target.goto(url);
    assert.equal(await target.evaluate(key => localStorage.getItem(key), key), null);
    target.on('dialog', dialog => dialog.accept());
    await target.locator('#importData').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
    await target.waitForFunction(key => !!localStorage.getItem(key), key);
    await target.reload();
    const restored = await target.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    for (const field of ['items', 'awards', 'growth', 'settings']) assert.deepEqual(restored[field], exported[field]);
    console.log('PASS isolated download, import, reload and exact record comparison');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

