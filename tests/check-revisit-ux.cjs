const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT);
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const STORE='plantory_full_mvp_v2';
const url='https://kimyeounmu2000-glitch.github.io/Plantory/app/Plantory_3D_Integrated_original_models.html';
(async()=>{
 const html=await fs.readFile(path.resolve(__dirname,'../app/Plantory_3D_Integrated_original_models.html'));
 const browser=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});
 try {
  for(const width of [320,375,390,430]){
   const context=await browser.newContext({viewport:{width,height:820},timezoneId:'Asia/Seoul'});
   await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}));
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);
   const dates=await page.evaluate(()=>{
    const key=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    const now=new Date(),yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
    return {today:key(now),yesterday:key(yesterday)};
   });
   const item={id:'past-task',type:'task',date:dates.yesterday,title:'지난 날의 할 일',time:'',note:'',done:true,color:'#359E64'};
   await page.evaluate(([k,value])=>localStorage.setItem(k,JSON.stringify(value)),[STORE,{version:2,items:[item],awards:{[dates.yesterday]:'tulip',[dates.today]:'daisy'},settings:{hasOnboarded:true}}]);
   await page.reload();
   assert.match(await page.locator('#homeNextFlower').textContent(),/다음 꽃/);
   assert.match(await page.locator('#gardenPreviewCount').textContent(),/최근 7일 2송이/);
   await page.locator('[data-nav="garden"]').first().click();
   assert.match(await page.locator('#gardenWeekSummary').textContent(),/꽃 2송이/);
   assert.equal(await page.locator('#gardenMemory').isVisible(),true);
   assert.match(await page.locator('#gardenMemoryText').textContent(),/튤립/);
   await page.locator('#gardenMemoryOpen').click();
   assert.equal(await page.locator('[data-screen="day"]').isVisible(),true);
   assert.match(await page.locator('#dayEntries').textContent(),/지난 날의 할 일/);
   const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),STORE);
   assert.equal(Object.keys(stored.awards).length,2);
   assert.equal(stored.items.length,1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
   assert.deepEqual(errors,[]);
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:375,height:820},timezoneId:'Asia/Seoul'});
  await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}));
  const page=await context.newPage();
  await page.goto(url);
  await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({version:2,items:[],awards:{},settings:{hasOnboarded:true}})),STORE);
  await page.reload();
  await page.locator('[data-nav="garden"]').click();
  assert.equal(await page.locator('#gardenMemory').isVisible(),false);
  assert.match(await page.locator('#gardenWeekSummary').textContent(),/아직/);
  await context.close();
  console.log('PASS revisit garden: 7-day awards; previous-day navigation; hidden empty memory; responsive; data untouched');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});