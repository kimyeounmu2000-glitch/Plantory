const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const url=require('node:url').pathToFileURL(path.resolve(__dirname,'../app/Plantory_3D_Integrated_original_models.html')).href,key='plantory_full_mvp_v3';
(async()=>{const b=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});try{
const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await p.clock.install({time:new Date(2026,0,15,12)});await p.goto(url);
const audit=()=>p.evaluate(()=>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v)};
 const mix=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])).concat(1);
 const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 function bg(e){if(!e)return [255,255,255,1];const s=getComputedStyle(e);if(e.matches('.home-plant'))return [255,255,255,1];return mix(rgb(s.backgroundColor),bg(e.parentElement))}
 const failures=[],rows=[];
 for(const e of document.querySelectorAll('body *')){
 if(!e.getClientRects().length||e.closest('[hidden]')||e.matches('script,style,svg *,option')||getComputedStyle(e).visibility==='hidden'||e.closest('button:disabled'))continue;
 const text=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();if(!text||!/[가-힣a-zA-Z0-9?]/.test(text))continue;
 const s=getComputedStyle(e),fg=rgb(s.color),background=bg(e),backgrounds=[background];
 // The only text-bearing gradient is HOME's white-to-soft plant card.
 if(e.closest('.home-plant'))backgrounds.push(rgb(getComputedStyle(document.documentElement).getPropertyValue('--soft').trim()),[255,255,255,1]);
 // Selected wheel row has a soft highlight behind its text.
 if(e.matches('.time-wheel>div.selected')){backgrounds.length=0;backgrounds.push(rgb(getComputedStyle(document.documentElement).getPropertyValue('--soft').trim()));}
 if(!e.closest('.card,.sheet,.picker-dialog,.reward-card,.home-link,.species-card,.compact-nav,.entry,.empty,.icon-btn,.arrow-btn,.detail-nav')){const glow=getComputedStyle(document.documentElement).getPropertyValue('--page-glow').trim();if(glow)backgrounds.push(rgb(glow));}
 const r=Math.min(...backgrounds.map(x=>ratio(fg,x))),size=parseFloat(s.fontSize),large=size>=24||(size>=18.6666667&&parseInt(s.fontWeight)>=700),required=large?3:4.5;
 const row={el:e.id||e.className,text:text.slice(0,24),r:+r.toFixed(3),required,fg:s.color,bg:background};rows.push(row);if(r<required)failures.push(row);
 }
 return {failures,minimum:Math.min(...rows.map(x=>x.r)),rows};
});
const reports=[];p.setDefaultTimeout(10000);
for(const month of [0,3,6,9]){
 await p.clock.setSystemTime(new Date(2026,month,15,12));const day=`2026-${String(month+1).padStart(2,'0')}-15`;
 for(const [background,accent] of [[null,null],['#000000','#ffffff'],['#ffffff','#ffff00'],['#777777','#00ff00'],['#777777','#000000'],['#ff0000','#0000ff'],['#0000ff','#ff00ff']]){
 const sample={version:2,settings:{hasOnboarded:true,background,accent},items:['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00'].map((color,i)=>({id:String(i),type:i===5?'event':'task',date:day,title:'Contrast task '+i,note:'메모 및 설명',done:i===0,color})),awards:{'2026-01-01':'tulip'},growth:{'2026-01-01':3}};
 await p.evaluate(([k,d])=>localStorage.setItem(k,JSON.stringify(d)),[key,sample]);await p.reload();const before=await p.evaluate(k=>localStorage.getItem(k),key);
 for(const view of ['home','day','month','garden','collection']){
 await p.locator('#backHome').evaluate(e=>e.click());if(view!=='home')await p.locator(`[data-nav="${view}"]`).first().evaluate(e=>e.click());await p.waitForTimeout(230);const result=await audit();if(result.failures.length)throw Error(JSON.stringify({month,background,accent,view,failures:result.failures.slice(0,8)}));reports.push({month,background,accent,view,minimum:result.minimum});
 }
 // Reward card uses the same surface variables and existing message text.
 await p.locator('#rewardCelebration').evaluate(e=>{e.hidden=false;document.querySelector('#rewardMain').textContent='오늘의 할 일을 모두 완료했어요!';document.querySelector('#rewardSub').textContent='따뜻한 격려의 한마디';});assert.deepEqual((await audit()).failures,[]);await p.locator('#rewardClose').click();
 await p.locator('#backHome').evaluate(e=>e.click());await p.locator('#fab').click();assert.deepEqual((await audit()).failures,[]);assert(await p.locator('#itemTitle').evaluate(e=>{const s=getComputedStyle(e,'::placeholder'),c=document.createElement('canvas').getContext('2d');c.fillStyle=s.color;c.fillRect(0,0,1,1);const rgb=[...c.getImageData(0,0,1,1).data].slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return 1.05/(rgb.reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0)+.05)>=4.5}));await p.locator('#chooseDate').click();assert.deepEqual((await audit()).failures,[]);await p.keyboard.press('Escape');await p.locator('#chooseTime').click();assert.deepEqual((await audit()).failures,[]);await p.keyboard.press('Escape');await p.keyboard.press('Escape');
 assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),before);
 await p.evaluate(([k])=>{const d=JSON.parse(localStorage.getItem(k));d.items=[];d.awards={};localStorage.setItem(k,JSON.stringify(d))},[key]);await p.reload();
 for(const view of ['home','day','garden','collection']){await p.locator('#backHome').evaluate(e=>e.click());if(view!=='home')await p.locator(`[data-nav="${view}"]`).first().evaluate(e=>e.click());const result=await audit();if(result.failures.length)throw Error(JSON.stringify({empty:true,background,accent,view,failures:result.failures}));}

 }
}
await p.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.settings.background=null;d.settings.accent=null;localStorage.setItem(k,JSON.stringify(d))},key);await p.reload();
for(const width of [320,375,390,430]){await p.setViewportSize({width,height:844});for(const view of ['home','day','month','garden','collection']){await p.locator('#backHome').evaluate(e=>e.click());if(view!=='home')await p.locator(`[data-nav="${view}"]`).first().evaluate(e=>e.click());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual((await audit()).failures,[]);if(view==='home')await p.screenshot({path:`outputs/contrast/${width}.png`});}}

await fs.mkdir('outputs/contrast',{recursive:true});await fs.writeFile('outputs/contrast/report.json',JSON.stringify(reports,null,2));console.log('PASS computed text contrast: 4 seasons x 7 theme/custom pairs x 5 screens, editor/time/reward, card colors, 4 widths; storage unchanged; min',Math.min(...reports.map(r=>r.minimum)));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
