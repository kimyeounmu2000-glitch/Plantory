const { chromium } = require(process.env.PLANTORY_PLAYWRIGHT || 'playwright');
const path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});try{
const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true});
await p.goto('file:///'+path.resolve(__dirname, '../app/Plantory_3D_Integrated_original_models.html').replaceAll('\\','/'));await p.locator('#helpDone').click();
const box=await p.locator('#plantGraphic').boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+100,y,{steps:12});await p.mouse.up();assert(await p.locator('#homeHeading').isVisible());
const c=await p.context().newCDPSession(p);
async function swipe(x,y,dx){await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/10,y}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
await swipe(x,y,-90);assert(await p.locator('#homeHeading').isVisible());
const h=await p.locator('#homeHeading').boundingBox();await swipe(250,h.y+10,-130);assert(await p.locator('#monthTitle').isVisible());
console.log('PASS mouse and emulated touch inside plant stay HOME; outside touch switches MONTH');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

