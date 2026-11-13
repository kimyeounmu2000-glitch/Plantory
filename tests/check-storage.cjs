const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLANTORY_PLAYWRIGHT || 'playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLANTORY_CHROME });
  const key = 'plantory_full_mvp_v2';
  const url = pathToFileURL(path.resolve(__dirname, '../app/Plantory_3D_Integrated_original_models.html')).href;
  try {
    const context = await browser.newContext();
    context.setDefaultTimeout(10000);
    const first = await context.newPage();
    await first.goto(url);
    await first.locator('#helpDone').click();
    await first.locator('#helpOverlay').waitFor({ state: 'hidden' });
    const second = await context.newPage();
    await second.goto(url);
    const raw = page => page.evaluate(k => localStorage.getItem(k), key);
    async function prepare(page, title) {
      await page.locator('#fab').click();
      await page.locator('#itemTitle').fill(title);
    }
    await prepare(first, 'Synthetic first');
    await first.locator('#submitItem').click();
    await first.locator('#editorOverlay').waitFor({ state: 'hidden' });
    const preserved = await raw(first);
    await prepare(second, 'Synthetic stale');
    await second.locator('#submitItem').click();
    await second.waitForFunction(() => document.querySelector('#toast').textContent.includes('다른 탭'));
    assert.equal(await raw(second), preserved);
    assert.equal(await second.locator('#editorOverlay').isVisible(), true);
    console.log('PASS stale-tab save blocked');
    await second.reload();
    await prepare(second, 'Synthetic refreshed');
    await second.locator('#submitItem').click();
    await second.locator('#editorOverlay').waitFor({ state: 'hidden' });
    assert.equal(JSON.parse(await raw(second)).items.length, 2);
    console.log('PASS refreshed save');

    // Both tabs start from the same revision; only one concurrent save may succeed.
    await Promise.all([first.reload(), second.reload()]);
    await prepare(first, 'Synthetic concurrent A');
    await prepare(second, 'Synthetic concurrent B');
    await Promise.all([first.locator('#submitItem').click(), second.locator('#submitItem').click()]);
    await Promise.all([first, second].map(p => p.waitForFunction(() =>
      document.querySelector('#editorOverlay').hidden || document.querySelector('#toast').textContent.includes('다른 탭'))));
    assert.equal(JSON.parse(await raw(first)).items.length, 3);
    console.log('PASS simultaneous save');

    // A stale completion must not discard the newer task or award a premature flower.
    const stale = first;
    await stale.reload();
    await second.reload();
    await prepare(second, 'Synthetic newer');
    await second.locator('#submitItem').click();
    await second.locator('#editorOverlay').waitFor({ state: 'hidden' });
    const latest = await raw(second);
    await stale.locator('#homeTasks .check').first().check();
    await stale.waitForFunction(() => document.querySelector('#toast').textContent.includes('다른 탭'));
    assert.equal(await raw(stale), latest);
    assert.equal(await stale.locator('#homeTasks .check').first().isChecked(), false);
    stale.on('dialog', dialog => dialog.accept());
    await stale.locator('#homeTasks .edit-item').first().click();
    await stale.locator('#deleteItem').click();
    await stale.evaluate(k => navigator.locks.request(k+'-write',()=>{}), key);
    assert.equal(await raw(stale), latest);
    await stale.locator('[data-close="editorOverlay"]').click();
    await stale.locator('#settingsOpen').click();
    await stale.locator('#defaultTaskColor').evaluate(input => {
      input.value='#112233';input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await stale.evaluate(k => navigator.locks.request(k+'-write',()=>{}), key);
    assert.equal(await raw(stale), latest);
    await stale.locator('#importData').setInputFiles({ name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(preserved) });
    await stale.waitForFunction(() => document.querySelector('#importData').value==='');
    await stale.evaluate(k => navigator.locks.request(k+'-write',()=>{}), key);
    assert.equal(await raw(stale), latest);

    // Corrupt and empty values are existing records, not permission to initialize.
    for (const damaged of ['{broken synthetic', '', '{"items":null}']) {
      const isolated = await browser.newContext();
      const page = await isolated.newPage();
      await page.goto(url);
      await page.evaluate(([k, value]) => localStorage.setItem(k, value), [key, damaged]);
      await page.reload();
      await page.waitForTimeout(1000); // Let the initial storage warning finish before testing the click.
      await page.locator('#helpDone').click();
      await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('원본은 보존'));
      assert.equal(await raw(page), damaged);
      await page.locator('[data-close="helpOverlay"]').click();
      await page.locator('#settingsOpen').click();
      const downloaded=page.waitForEvent('download');
      await page.locator('#exportData').click();
      const original=await downloaded;
      assert.match(original.suggestedFilename(),/recovery-original.*\.txt$/);
      assert.equal(await fs.readFile(await original.path(),'utf8'),damaged);
      assert.equal(await raw(page),damaged);
      await page.locator('[data-close="settingsOverlay"]').click();
      await prepare(page, 'Must not overwrite');
      await page.locator('#submitItem').click();
      assert.equal(await raw(page), damaged);
      await isolated.close();
    }
    // Unsupported locking must fail closed and restore a toggled checkbox.
    const unsupported=await browser.newContext();
    await unsupported.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));
    const blocked=await unsupported.newPage();await blocked.goto(url);
    await blocked.evaluate(([k,v])=>localStorage.setItem(k,v),[key,preserved]);await blocked.reload();
    await blocked.locator('#homeTasks .check').first().click();
    await blocked.waitForFunction(()=>document.querySelector('#toast').textContent.includes('안전한 저장'));
    assert.equal(await raw(blocked),preserved);
    assert.equal(await blocked.locator('#homeTasks .check').first().isChecked(),false);
    await unsupported.close();
    const migrated = await browser.newContext();
    const page = await migrated.newPage();
    await page.goto(url);
    await page.evaluate(() => localStorage.setItem('plantory_calendar_prototype_v1',JSON.stringify({items:[{id:'legacy',type:'task',date:'2026-11-12',title:'Synthetic legacy',done:false}]})));
    await page.reload();
    await page.waitForFunction(k => !!localStorage.getItem(k), key);
    assert.equal(JSON.parse(await raw(page)).items[0].id, 'legacy');
    await migrated.close();
    console.log('PASS stale/concurrent tabs, refresh retry, stale completion rollback, corrupt/empty storage preservation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
