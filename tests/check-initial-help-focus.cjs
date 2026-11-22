const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT);
const fs=require('node:fs/promises'),assert=require('node:assert/strict');

(async()=>{
  const html=await fs.readFile('app/Plantory_3D_Integrated_original_models.html');
  const browser=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});
  try {
    for(const closeWith of ['Escape','Enter']) {
      const context=await browser.newContext({reducedMotion:'reduce'});
      try {
        await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}));
        const page=await context.newPage();
        await page.goto('https://plantory.test/');
        await page.waitForFunction(()=>document.activeElement.id==='helpHeading');
        if(closeWith==='Enter') {
          await page.keyboard.press('Shift+Tab');
          assert.equal(await page.evaluate(()=>document.activeElement.id),'helpDone');
        }
        await page.keyboard.press(closeWith);
        await page.locator('#helpOverlay').waitFor({state:'hidden'});
        assert.equal(await page.evaluate(()=>document.activeElement.id),'fab',closeWith+' should return to the existing add action');
        await page.keyboard.press('Enter');
        await page.waitForFunction(()=>document.activeElement.id==='itemTitle');
        await page.keyboard.type('Synthetic first keyboard task');
        await page.keyboard.press('Enter');
        await page.locator('#editorOverlay').waitFor({state:'hidden'});
        assert.equal(await page.locator('#homeTasks .check').count(),1);
      } finally { await context.close(); }
    }
    console.log('PASS automatic Help Escape/Enter dismissal -> existing add button -> keyboard task creation');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
