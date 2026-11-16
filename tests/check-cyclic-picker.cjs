const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});try{
 const c=await b.newContext({hasTouch:true,viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve(__dirname,'../app/Plantory_3D_Integrated_original_models.html')).href);await p.locator('#helpDone').click();await p.locator('#fab').click();
 const raw=()=>p.evaluate(()=>localStorage.getItem('plantory_full_mvp_v2')),before=await raw();
 await p.evaluate(()=>document.querySelector('#itemDate').value='2026-01-31');
 for(const width of [320,375,390,430]){
  await p.setViewportSize({width,height:844});await p.locator('#chooseDate').click();assert.equal(await p.locator('#dateMonths button').count(),12);
  assert(await p.locator('#dateMonths').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length===3));
  assert(await p.locator('#datePicker').evaluate(el=>el.scrollWidth<=el.clientWidth));await p.waitForTimeout(200);await p.screenshot({path:`outputs/plantory-editor-review/months-${width}.png`});
  await p.keyboard.press('Escape');await p.locator('#datePicker').waitFor({state:'hidden'});
 }
 await p.locator('#chooseDate').click();assert.equal(await p.locator('#dateYear').textContent(),'2026년');
 for(let m=1;m<=12;m++){await p.locator(`[data-month="${m}"]`).click();assert.equal(await p.locator('#dateDays button').count(),new Date(2026,m,0).getDate());await p.locator('#backToMonths').click()}
 await p.locator('#yearNext').click();await p.locator('[data-month="2"]').click();assert.equal(await p.locator('#dateDays button').count(),28);await p.locator('[data-date="2027-02-14"]').click();await p.locator('#confirmDate').click();await p.locator('#datePicker').waitFor({state:'hidden'});assert.equal(await p.locator('#itemDate').inputValue(),'2027-02-14');
 await p.locator('#chooseDate').click();assert.equal(await p.locator('#dateYear').textContent(),'2027년');await p.locator('#yearNext').click();await p.locator('[data-month="2"]').click();assert.equal(await p.locator('#dateDays button').count(),29);await p.locator('[data-date="2028-02-29"]').click();await p.locator('#confirmDate').click();await p.locator('#datePicker').waitFor({state:'hidden'});
 await p.locator('#chooseTime').click();const minute=p.locator('#wheelMinute');await minute.focus();await p.keyboard.press('Home');await p.keyboard.press('ArrowUp');assert.equal(await minute.getAttribute('aria-valuenow'),'59');await p.keyboard.press('ArrowDown');assert.equal(await minute.getAttribute('aria-valuenow'),'0');
 const others=await p.locator('#wheelPeriod,#wheelHour').evaluateAll(es=>es.map(e=>e.getAttribute('aria-valuenow')));
 const box=await minute.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+110);
 for(const delta of [-44,44,-44,44]){await p.mouse.wheel(0,delta);await p.waitForTimeout(400);assert.equal(await minute.getAttribute('aria-valuenow'),delta<0?'59':'0')}
 const cdp=await c.newCDPSession(p),x=box.x+box.width/2,y=box.y+110;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+i*10}]});await p.waitForTimeout(40)}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(600);
 assert(Number(await minute.getAttribute('aria-valuenow'))>40);assert.deepEqual(await p.locator('#wheelPeriod,#wheelHour').evaluateAll(es=>es.map(e=>e.getAttribute('aria-valuenow'))),others);assert.equal(await p.locator('#editorOverlay .sheet').evaluate(e=>e.style.transform),'');assert.equal(await raw(),before);
 await minute.press('Home');await minute.press('ArrowUp');await p.locator('#confirmTime').click();await p.locator('#timePicker').waitFor({state:'hidden'});assert.equal(await p.locator('#itemTime').inputValue(),'09:59');
 await p.locator('#itemTitle').fill('Synthetic cyclic picker');await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});await p.reload();const item=JSON.parse(await raw()).items[0];assert.equal(item.date,'2028-02-29');assert.equal(item.time,'09:59');
 assert.deepEqual(errors,[]);console.log('PASS 12 months/years/leap day, 4 mobile widths, cyclic keyboard/mouse/touch, independent hour/period, no premature writes, save/reload');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
