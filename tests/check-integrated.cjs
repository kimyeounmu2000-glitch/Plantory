const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT||'playwright');
const path=require('node:path'),assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.resolve(__dirname,'../app/Plantory_3D_Integrated_original_models.html')).href;
 const key='plantory_full_mvp_v3';await page.goto(url);await page.locator('#helpDone').click();await page.locator('#helpOverlay').waitFor({state:'hidden'});
 assert.equal(await page.locator('#open3DPreview,#plantPreviewOverlay,[data-plant],[data-stage]').count(),0);
 await page.locator('[data-nav="collection"]').click();assert.equal(await page.locator('#speciesGrid .species-card.locked').count(),6);assert.equal(await page.locator('#speciesGrid img,#speciesGrid button').count(),0);
 // Developer-only rendering exercise: no app preview UI or production test hook.
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 for(const species of ['tulip','daisy','sunflower','bell','cactus','dandelion']){
  const result=await page.evaluate(species=>{const host=document.createElement('div');host.style.cssText='width:250px;height:280px';document.body.append(host);const renderer=window.Plantory3D.create();try{renderer.mount(host);const stages=[];for(let s=0;s<4;s++){renderer.set(species,s);renderer.draw();stages.push({species:renderer.species,stage:renderer.stage,canvas:host.querySelectorAll('canvas').length})}renderer.rotate(Math.PI/2);return stages}finally{renderer.dispose();host.remove()}},species);
  assert.deepEqual(result,Array.from({length:4},(_,stage)=>({species,stage,canvas:1})));
 }
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),before);
 await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.awards={'2026-01-01':'tulip','2026-01-02':'tulip'};localStorage.setItem(k,JSON.stringify(d))},key);await page.reload();
 await page.locator('[data-nav="collection"]').click();const known=page.locator('#speciesGrid .species-card:not(.locked)');assert.equal(await known.count(),1);assert.equal(await known.locator('img').count(),1);assert.match(await known.textContent(),/튤립/);assert.match(await known.textContent(),/획득 2회 · 첫 발견 2026-01-01/);assert.equal(await page.locator('#speciesGrid .locked img,#speciesGrid button').count(),0);
 for(const width of [375,390,768,1440]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`outputs/plantory-ui-review/collection-${width}.png`})}
 await page.setViewportSize({width:390,height:844});await page.locator('#backHome').click();assert(await page.locator('#homeHeading').isVisible());assert.equal(await page.locator('#plantGraphic canvas').count(),1);await page.screenshot({path:'outputs/plantory-ui-review/home-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS no preview UI; 6 locked cards hide flowers; earned name/image/count/date; developer 6 species x 4 stages; storage unchanged; responsive collection/HOME');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
