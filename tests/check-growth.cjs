const { chromium } = require(process.env.PLANTORY_PLAYWRIGHT || 'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const b=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});try{
const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file:///'+path.resolve(__dirname, '../app/Plantory_3D_Integrated_original_models.html').replaceAll('\\','/'));
const key='plantory_full_mvp_v2';
const date=await p.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
async function seed(n,done=0,growth={},awards={}){await p.evaluate(({key,date,n,done,growth,awards})=>localStorage.setItem(key,JSON.stringify({version:2,items:Array.from({length:n},(_,i)=>({id:String(i),type:'task',date,title:'Task '+i,done:i<done})),awards,growth,settings:{hasOnboarded:true}})),{key,date,n,done,growth,awards});await p.reload();await p.locator('#homeHeading').waitFor();}
const state=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
for(const n of [1,2,3,5,10]){
 await seed(n);
 for(let done=1;done<=n;done++){
  await p.locator('#homeTasks .check').nth(done-1).check();
  const s=await state();const expected=done===n?3:done>=2&&done>=Math.ceil(n/2)?2:1;
  assert.equal(s.growth[date],expected);assert.equal(Boolean(s.awards[date]),done===n);
 }
 await p.locator('#homeTasks .check').first().uncheck();const s=await state();assert.equal(s.growth[date],3);assert(s.awards[date]);
 await p.reload();assert.equal(await p.locator('#plantStage').textContent(),'오늘의 꽃 획득 완료');
}
await seed(6,2,{[date]:2});await p.locator('#homeTasks .check').first().uncheck();assert.equal((await state()).growth[date],2);
await seed(0);assert.deepEqual((await state()).awards,{});
assert.equal(await p.locator('#plantStage').textContent(),'작은 씨앗부터 시작해요');
await seed(1);assert.equal(await p.locator('#plantStage').textContent(),'새싹이 자라고 있어요');
assert.deepEqual((await state()).awards,{});
p.on('dialog',d=>d.accept());
await seed(2,1);await p.locator('#homeTasks .edit-item').nth(1).click();await p.locator('#deleteItem').click();assert((await state()).awards[date]);
const award=(await state()).awards[date];await p.locator('#homeTasks .edit-item').click();await p.locator('#deleteItem').click();assert.equal((await state()).awards[date],award);assert.equal((await state()).growth[date],3);
await seed(1);await p.locator('#homeTasks .edit-item').click();await p.locator('#deleteItem').click();assert.deepEqual((await state()).awards,{});
assert.equal(await p.locator('#plantStage').textContent(),'작은 씨앗부터 시작해요');
await seed(1);const before=await state();await p.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('TEST storage failure')}});
await p.locator('#homeTasks .check').click();assert.deepEqual(await state(),before);assert.equal(await p.locator('#homeTasks .check').isChecked(),false);assert.match(await p.locator('#toast').textContent(),/저장하지 못/);
await p.reload();await p.locator('#homeTasks .check').check();assert((await state()).awards[date]);
await p.locator('#open3DPreview').click();const prior=await state();await p.locator('[data-plant="cactus"]').click();await p.locator('[data-stage="1"]').click();assert.deepEqual(await state(),prior);
assert.deepEqual(errors,[]);console.log('PASS growth 1/2/3/5/10, zero, uncheck, persistent maxima, reload, atomic storage failure, preview isolation');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});


