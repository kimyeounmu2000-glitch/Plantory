// Uses only Node built-ins and an already installed Chromium browser (no npm install).
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
(async()=>{
 const browserPath=process.env.PLANTORY_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
 const html=fs.readFileSync(process.env.PLANTORY_TEST_HTML||path.resolve(__dirname,'../app/Plantory_3D_Integrated_original_models.html'));
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'plantory-revisit-'));const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(html)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,ws;
 try{
 browser=spawn(browserPath,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;!fs.existsSync(portFile)&&i<100;i++)await new Promise(r=>setTimeout(r,100));
 assert(fs.existsSync(portFile),'Installed browser failed to start');const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
 const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let id=0;const pending=new Map(),events=new Map();const errors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}else{if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);events.get(m.method)?.splice(0).forEach(f=>f(m.params))}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject,timer:setTimeout(()=>{pending.delete(n);reject(Error(method+' timeout'))},20000)});ws.send(JSON.stringify({id:n,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value};
 const load=async(method,params)=>{const loaded=new Promise(r=>{events.set('Page.loadEventFired',[r])});await send(method,params);await loaded};
 await send('Page.enable');await send('Runtime.enable');await load('Page.navigate',{url:`http://127.0.0.1:${server.address().port}`});
 // Pin only the synthetic test page's date, including year/month boundaries.
 const seed=async sample=>{await evaluate(`localStorage.setItem('plantory_full_mvp_v2',${JSON.stringify(JSON.stringify(sample))})`);await load('Page.reload',{})};
 const sample=(awards,items=[])=>({version:2,items,awards,settings:{hasOnboarded:true}});
 const now=await evaluate("(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})()");
 const yesterday=await evaluate("(()=>{const d=new Date();d.setDate(d.getDate()-1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})()");
 const click=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).click()`),text=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
 const garden=()=>evaluate("document.querySelector('[data-nav=garden]').click()");
 const item={id:'past',type:'task',date:yesterday,title:'Synthetic completed task',done:true};
 for(const width of [320,375,390,430]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await seed(sample({[yesterday]:'tulip',[now]:'daisy'},[item]));const before=await evaluate("localStorage.getItem('plantory_full_mvp_v2')");await garden();await click('gardenMemoryOpen');
 if(process.env.PLANTORY_REPRO_ONLY){console.log(JSON.stringify({dayVisible:await evaluate("!document.querySelector('[data-screen=day]').hidden"),memoryCanvas:await evaluate("!!document.querySelector('#memoryPlant canvas')")}));await seed(sample({[yesterday]:'tulip'}));await garden();console.log('reward-with-rest-label',await evaluate("[...document.querySelectorAll('#gardenDays .garden-day')].some(e=>e.querySelector('img')&&e.textContent.includes('쉬는 날'))"));break}
 assert.equal(await text('memoryFlower'),'튤립');assert.match(await text('memoryDate'),new RegExp(yesterday));assert.match(await text('memoryTasks'),/완료 · Synthetic/);assert(await evaluate("!!document.querySelector('#memoryPlant canvas')"));assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await click('memoryDayOpen');assert.match(await text('dayEntries'),/Synthetic/);assert.equal(await evaluate("document.querySelectorAll('#memoryPlant canvas').length"),0);assert.equal(await evaluate("localStorage.getItem('plantory_full_mvp_v2')"),before);
 }
 if(!process.env.PLANTORY_REPRO_ONLY){
 await seed(sample({[yesterday]:'tulip'}));await garden();assert.equal(await evaluate("[...document.querySelectorAll('#gardenDays .garden-day')].filter(e=>e.querySelector('img')&&e.textContent.includes('쉬는 날')).length"),0);await click('gardenMemoryOpen');assert.match(await text('memorySummary'),/남아 있는 할 일 기록은 없어요/);
 for(const date of ['2025-12-31','2024-02-29','2026-01-01']){await seed(sample({[date]:'cactus'}));await garden();await click('gardenMemoryOpen');assert.match(await text('memoryDate'),new RegExp(date));assert.equal(await text('memoryFlower'),'동글 선인장')}
 await seed(sample({}));await garden();assert(await evaluate("document.getElementById('gardenMemory').hidden"));assert.equal(await evaluate("document.querySelectorAll('#memoryPlant canvas').length"),0);await evaluate("document.querySelector('[data-nav=collection]').click()");assert.equal(await evaluate("document.querySelectorAll('#speciesGrid img').length"),0);
 assert.deepEqual(errors,[]);if(process.env.PLANTORY_TEST_FORCE_FAILURE)assert.fail('Intentional CI propagation check');console.log('PASS actual acquired 3D flower/date/records, removed tasks, empty/locked state, date boundaries, 4 widths, renderer disposal, unchanged storage');
 }
 }finally{ws?.close();browser?.kill();server.close();/* Isolated profile contains synthetic data only; never touch user profiles. */}
})().catch(e=>{console.error(e);process.exitCode=1});
