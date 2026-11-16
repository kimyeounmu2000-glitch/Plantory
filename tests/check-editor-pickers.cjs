const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const key='plantory_full_mvp_v2',url=pathToFileURL(path.resolve(__dirname,'../app/Plantory_3D_Integrated_original_models.html')).href;
  await p.goto(url);await p.locator('#helpDone').click();await p.locator('#helpOverlay').waitFor({state:'hidden'});
  const raw=()=>p.evaluate(k=>localStorage.getItem(k),key);
  const baseline=await raw();await p.locator('#fab').click();
  const originalDate=await p.locator('#itemDate').inputValue();
  for(const width of [320,375,390,430,1024]){
   await p.setViewportSize({width,height:844});
   assert(await p.evaluate(()=>{const sheet=document.querySelector('#editorOverlay .sheet');return sheet.scrollWidth<=sheet.clientWidth&&[...document.querySelectorAll('.editor-datetime button')].every(el=>el.scrollWidth<=el.clientWidth)}));
   const date=await p.locator('#chooseDate').boundingBox(),time=await p.locator('#chooseTime').boundingBox();
   assert(width<=430?time.y>=date.y+date.height:Math.abs(time.y-date.y)<2);
   await p.locator('#chooseDate').click();
   assert(await p.evaluate(()=>{const d=document.querySelector('#datePicker');return d.scrollWidth<=d.clientWidth&&d.getBoundingClientRect().left>=0}));
   await p.waitForTimeout(220);await p.screenshot({path:`outputs/plantory-editor-review/calendar-${width}.png`});
   await p.keyboard.press('Escape');await p.locator('#datePicker').waitFor({state:'hidden'});
   assert(await p.locator('#editorOverlay').isVisible());assert.equal(await p.locator('#chooseDate').evaluate(e=>e===document.activeElement),true);
   await p.locator('#chooseTime').click();await p.waitForTimeout(220);await p.screenshot({path:`outputs/plantory-editor-review/time-${width}.png`});
   await p.keyboard.press('Escape');await p.locator('#timePicker').waitFor({state:'hidden'});
  }
  console.log('PASS 320/375/390/430 mobile stacking, desktop columns, no overflow, separate dialogs and ESC focus restoration');
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>document.querySelector('#itemDate').value='2028-02-28');await p.locator('#chooseDate').click();
  await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#dateDays [aria-pressed=true]').getAttribute('data-date'),'2028-02-29');
  await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#dateMonth').textContent(),'2028년 3월');
  await p.keyboard.press('PageUp');assert.equal(await p.locator('#dateDays [aria-pressed=true]').getAttribute('data-date'),'2028-02-01');
  await p.locator('#dateNext').click();await p.locator('[data-date="2028-03-15"]').click();await p.locator('#confirmDate').click();await p.locator('#datePicker').waitFor({state:'hidden'});
  assert.equal(await p.locator('#itemDate').inputValue(),'2028-03-15');
  await p.locator('#chooseDate').click();await p.locator('#datePrevious').click();await p.locator('[data-picker-cancel="datePicker"]').click();await p.locator('#datePicker').waitFor({state:'hidden'});assert.equal(await p.locator('#itemDate').inputValue(),'2028-03-15');
  await p.evaluate(date=>document.querySelector('#itemDate').value=date,originalDate);
  async function chooseTime(period,hour,minute){
   await p.locator('#chooseTime').click();
   await p.locator('#wheelPeriod').focus();await p.keyboard.press(period?'End':'Home');
   await p.locator('#wheelHour').focus();await p.keyboard.press('Home');for(let i=1;i<hour;i++)await p.keyboard.press('ArrowDown');
   await p.locator('#wheelMinute').focus();await p.keyboard.press('Home');for(let i=0;i<minute;i++)await p.keyboard.press('ArrowDown');
   await p.locator('#confirmTime').click();await p.locator('#timePicker').waitFor({state:'hidden'});
  }
  for(const [period,hour,minute,stored] of [[0,12,0,'00:00'],[1,12,0,'12:00'],[0,1,7,'01:07'],[1,11,59,'23:59']]){await chooseTime(period,hour,minute);assert.equal(await p.locator('#itemTime').inputValue(),stored)}
  await p.locator('#chooseTime').click();await p.locator('#wheelMinute').press('Home');await p.locator('[data-picker-cancel="timePicker"]').click();await p.locator('#timePicker').waitFor({state:'hidden'});assert.equal(await p.locator('#itemTime').inputValue(),'23:59');
  assert.equal(await raw(),baseline,'picker drafts must not persist');
  console.log('PASS leap day, month navigation, calendar keyboard/cancel; midnight/noon/AM/PM and minutes; no premature storage writes');
  await p.locator('#itemTitle').fill('Synthetic picker goal');await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});
  await p.reload();let record=JSON.parse(await raw()).items[0];assert.equal(record.time,'23:59');assert.equal(record.date,originalDate);
  await p.locator('#homeTasks .edit-item').click();assert.match(await p.locator('#chooseTime').textContent(),/오후 11:59/);
  await chooseTime(1,2,30);await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});await p.reload();assert.equal(JSON.parse(await raw()).items[0].time,'14:30');
  await p.locator('#homeTasks .edit-item').click();await p.locator('#chooseTime').click();await p.locator('#clearTime').click();await p.locator('#timePicker').waitFor({state:'hidden'});await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});await p.reload();assert.equal(JSON.parse(await raw()).items[0].time,'');
  console.log('PASS create/edit/reload preserves YYYY-MM-DD and HH:mm; optional time clear');
  await p.locator('#fab').click();await p.locator('#itemTitle').fill('Unsaved synthetic draft');
  const handle=p.locator('#editorDragHandle');
  async function drag(distance){await handle.scrollIntoViewIfNeeded();const r=await handle.boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width/2,r.y+r.height/2+distance,{steps:10});assert(await p.locator('#editorOverlay .sheet').evaluate(el=>getComputedStyle(el).transform!=='none'));await p.mouse.up()}
  await drag(35);await p.waitForTimeout(220);assert(await p.locator('#editorOverlay').isVisible());assert.equal(await p.locator('#editorOverlay .sheet').evaluate(el=>el.style.transform),'');
  p.once('dialog',d=>d.dismiss());await drag(180);await p.waitForTimeout(220);assert(await p.locator('#editorOverlay').isVisible());assert.equal(await p.locator('#itemTitle').inputValue(),'Unsaved synthetic draft');
  p.once('dialog',d=>d.dismiss());await p.locator('[data-close="editorOverlay"]').click();assert(await p.locator('#editorOverlay').isVisible());
  p.once('dialog',d=>d.dismiss());await p.keyboard.press('Escape');assert(await p.locator('#editorOverlay').isVisible());
  p.once('dialog',d=>d.accept());await drag(180);await p.locator('#editorOverlay').waitFor({state:'hidden'});
  assert.equal(JSON.parse(await raw()).items.length,1);
  console.log('PASS sheet follows mouse, short drag restores, long drag confirms, X/ESC preserve dismissed draft');
  await p.locator('#fab').click();await p.setViewportSize({width:320,height:568});
  await p.locator('#submitItem').scrollIntoViewIfNeeded();assert(await p.locator('#editorOverlay .sheet').evaluate(el=>el.scrollTop>0));assert(await p.locator('#submitItem').isVisible());
  await p.locator('#chooseTime').click();await p.locator('#wheelMinute').focus();await p.keyboard.press('Home');
  const wheel=await p.locator('#wheelMinute').boundingBox();await p.mouse.move(wheel.x+wheel.width/2,wheel.y+110);await p.mouse.wheel(0,132);await p.waitForTimeout(350);assert(Number(await p.locator('#wheelMinute').getAttribute('aria-valuenow'))>0);
  await p.locator('#wheelMinute').press('Home');await p.mouse.move(wheel.x+wheel.width/2,wheel.y+160);await p.mouse.down();await p.mouse.move(wheel.x+wheel.width/2,wheel.y+72,{steps:8});await p.mouse.up();await p.waitForTimeout(100);assert(Number(await p.locator('#wheelMinute').getAttribute('aria-valuenow'))>0);
  // Native touch scrolling in a fresh emulated touch context, not a real phone.
  const cdp=await context.newCDPSession(p);const x=wheel.x+wheel.width/2,y=wheel.y+155;
  const beforeTouch=Number(await p.locator('#wheelMinute').getAttribute('aria-valuenow'));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*18}]});await p.waitForTimeout(25)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500);
  assert(Number(await p.locator('#wheelMinute').getAttribute('aria-valuenow'))>beforeTouch);assert.equal(await p.locator('#editorOverlay .sheet').evaluate(el=>el.style.transform),'');
  await p.keyboard.press('Escape');await p.locator('#timePicker').waitFor({state:'hidden'});
  await p.locator('[data-close="editorOverlay"]').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});
  await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#fab').click();await p.locator('#chooseDate').click();assert.equal(await p.locator('#datePicker').evaluate(el=>getComputedStyle(el).animationName),'none');
  await p.keyboard.press('Escape');await p.locator('#datePicker').waitFor({state:'hidden'});await p.locator('#editorDragHandle').focus();await p.keyboard.press('Shift+Tab');assert.equal(await p.locator('#submitItem').evaluate(el=>el===document.activeElement),true);
  console.log('PASS long sheet scrolling, wheel mouse/touch scroll isolated, reduced motion, editor focus trap');
  await p.locator('[data-close="editorOverlay"]').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});
  await p.setViewportSize({width:390,height:844});await p.locator('#fab').click();
  const header=p.locator('#editorOverlay .sheethead'),headerBox=await header.boundingBox();
  const hx=headerBox.x+50,hy=headerBox.y+15;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hx,y:hy}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:hx,y:hy+160}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.locator('#editorOverlay').waitFor({state:'hidden'});
  await p.locator('#fab').click();await p.locator('#typeEvent').click();await p.locator('#itemTitle').fill('Synthetic appointment');
  await p.locator('#chooseDate').click();await p.locator('#dateNext').click();const appointmentDate=await p.locator('#dateDays [aria-pressed=true]').getAttribute('data-date');
  await p.locator('#confirmDate').click();await p.locator('#datePicker').waitFor({state:'hidden'});await chooseTime(0,12,0);
  await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});await p.reload();
  record=JSON.parse(await raw()).items.find(x=>x.type==='event');assert.equal(record.date,appointmentDate);assert.equal(record.time,'00:00');
  await p.locator('#fab').click();await p.locator('#chooseTime').click();
  for(let i=0;i<12;i++){await p.keyboard.press('Tab');assert(await p.evaluate(()=>document.querySelector('#timePicker').contains(document.activeElement)))}
  await p.keyboard.press('Escape');await p.locator('#timePicker').waitFor({state:'hidden'});await p.locator('[data-close="editorOverlay"]').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});
  await p.locator('#homeTasks .edit-item').click();p.once('dialog',d=>d.accept());await p.locator('#deleteItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});
  assert.equal(JSON.parse(await raw()).items.filter(x=>x.type==='task').length,0);
  console.log('PASS emulated touch header dismiss, future appointment date/time persistence, picker focus containment, existing delete');
  await p.locator('#fab').click();await p.locator('#itemTitle').fill('Synthetic write retry');await chooseTime(1,3,25);
  const retryDate=await p.locator('#itemDate').inputValue();
  await p.evaluate(()=>{window.testOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('Synthetic quota failure')}});
  await p.locator('#submitItem').click();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('저장하지 못'));
  assert(await p.locator('#editorOverlay').isVisible());assert.equal(await p.locator('#itemDate').inputValue(),retryDate);assert.equal(await p.locator('#itemTime').inputValue(),'15:25');
  await p.evaluate(()=>{Storage.prototype.setItem=window.testOriginalSetItem;delete window.testOriginalSetItem});await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});
  await p.reload();record=JSON.parse(await raw()).items.find(x=>x.title==='Synthetic write retry');assert.equal(record.date,retryDate);assert.equal(record.time,'15:25');
  assert.deepEqual(errors,[]);console.log('PASS failed write retains picker values and retry/reload preserves date/time; no page errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
