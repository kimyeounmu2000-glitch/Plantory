const { chromium } = require(process.env.PLANTORY_PLAYWRIGHT || 'playwright');
const path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.PLANTORY_CHROME,headless:true});
try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file:///'+path.resolve(__dirname, '../app/Plantory_3D_Integrated_original_models.html').replaceAll('\\','/'));
await page.waitForTimeout(1200);
await page.locator('#helpDone').click();
await page.locator('#open3DPreview').click();
assert.equal(await page.locator('[data-plant]').count(),6);
assert.equal(await page.locator('#speciesGrid .species-card').count(),6);
for(const species of ['tulip','daisy','sunflower','bell','cactus','dandelion']){
 await page.locator(`[data-plant="${species}"]`).click();
 for(let s=0;s<4;s++){await page.locator(`[data-stage="${s}"]`).click();assert.equal(await page.locator('#plant3DPreviewCanvas canvas').count(),1)}
 await page.waitForTimeout(900);
 await page.locator('#rotate3DPreview').click();
 await page.screenshot({path:`outputs/plantory-integrated-original-3d/${species}.png`});
}
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/plantory-integrated-original-3d/mobile.png'});
assert.deepEqual(errors,[]);console.log('PASS: standalone HTML, 6 species x 4 stages, collection, rotate, mobile render, no page errors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

