import * as THREE from './vendor/three.module.js';
import {plant as fallbackPlant} from './plant-fallback.js';

// 승인한 시안을 참고해 만든 실제 입체 도형입니다. 이미지를 회전시키는 방식이 아닙니다.
export function plant(canvas,stage,color='#eea38c'){
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch{return fallbackPlant(canvas,stage,color)}
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),model=new THREE.Group(),sprout=new THREE.Group();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),disposeList=[],petals=[];let disposed=false,frame=0,yaw=.10,drag=null,start=performance.now();
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
 scene.add(model);model.add(sprout);scene.add(new THREE.HemisphereLight(0xffffff,0xb0b8a3,2.8));
 const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(-3,6,5);scene.add(light);const fill=new THREE.DirectionalLight(0xe6f0ff,.65);fill.position.set(4,3,-3);scene.add(fill);
 camera.position.set(0,3.2,8);camera.lookAt(0,1.72,0);
 function material(c,flat=false){const m=new THREE.MeshStandardMaterial({color:c,roughness:.88,metalness:0,flatShading:flat,side:THREE.DoubleSide});disposeList.push(m);return m}
 function mesh(g,m,parent=model){disposeList.push(g);const o=new THREE.Mesh(g,m);parent.add(o);return o}
 // 回転体の丸みを持つ素焼き鉢。縁から内壁まで一続きの形にします。
 const profile=[[0,0],[.45,0],[.50,.025],[.54,.075],[.56,.14],[.73,1.10],[.76,1.22],[.765,1.28],[.75,1.32],[.715,1.33],[.685,1.30],[.68,1.23],[.66,1.13],[.48,.17],[0,.17]];
 mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),48),material('#c8784d'));
 const soil=mesh(new THREE.CylinderGeometry(.68,.68,.035,48),material('#60402b'));soil.position.y=1.26;
 // Transparent, soft contact shadow; stays independent from the selected app background.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const c=shadowCanvas.getContext('2d'),gradient=c.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(63,43,32,.23)');gradient.addColorStop(.55,'rgba(63,43,32,.12)');gradient.addColorStop(1,'rgba(63,43,32,0)');c.fillStyle=gradient;c.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(shadowCanvas);disposeList.push(texture);const shadowMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});disposeList.push(shadowMaterial);const shadow=mesh(new THREE.PlaneGeometry(2.4,1.9),shadowMaterial,scene);shadow.rotation.x=-Math.PI/2;shadow.position.y=-.015;
 const green=material('#83b95d'),leafGreen=material('#91bd68',true);
 function surface(point,rows,columns){const positions=[],indices=[];for(let i=0;i<=rows;i++)for(let j=0;j<=columns;j++)positions.push(...point(i/rows,j/columns));for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){let a=i*(columns+1)+j,b=a+columns+1;indices.push(a,b,a+1,b,b+1,a+1)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g}
 function leaf(side,y,length,angle){const g=surface((t,v)=>{let a=v*Math.PI*2,w=Math.pow(Math.sin(Math.PI*t),.82)*.19;return [side*(t*length),y+t*.38+Math.sin(a)*w,Math.cos(a)*.045*Math.sin(Math.PI*t)+Math.sin(Math.PI*t)*.035]},9,8);const o=mesh(g,leafGreen,sprout);o.rotation.y=angle;return o}
 // Fully grown cactus is revealed only after completion, like all other species.
 if(stage===1&&color==='#73aa71'){
  sprout.position.y=1.26;const cactusGreen=material('#72aa75'),ribGreen=material('#8ebe83');
  const body=mesh(new THREE.CapsuleGeometry(.28,.90,6,14),cactusGreen,sprout);body.position.y=.70;
  for(const side of [-1,1]){const y=side<0?.42:.67;const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.15,y,0),new THREE.Vector3(side*.48,y+.04,0),new THREE.Vector3(side*.55,y+.34,0),new THREE.Vector3(side*.55,y+.54,0)]);mesh(new THREE.TubeGeometry(curve,12,.125,8,false),cactusGreen,sprout);const tip=mesh(new THREE.SphereGeometry(.125,10,6),cactusGreen,sprout);tip.position.set(side*.55,y+.54,0)}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const points=[.12,.25,.50,.85,1.10,1.28].map(y=>{const r=y<.25?.19:y>1.10?.19:.283;return new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r)});mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.009,4,false),ribGreen,sprout)}
  const spineMat=material('#f4e8c4');for(let row=0;row<4;row++)for(let i=0;i<8;i++){let a=i/8*Math.PI*2+row*.15;let spine=mesh(new THREE.ConeGeometry(.011,.065,4),spineMat,sprout);spine.position.set(Math.sin(a)*.30,.30+row*.23,Math.cos(a)*.30);spine.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.sin(a),.2,Math.cos(a)).normalize())}
  const flowerMat=material('#ee9caa');for(let i=0;i<6;i++){let a=i/6*Math.PI*2;let petal=mesh(new THREE.SphereGeometry(1,8,6),flowerMat,sprout);petal.scale.set(.07,.045,.14);petal.position.set(Math.sin(a)*.10,1.45,Math.cos(a)*.10);petal.rotation.y=a}const center=mesh(new THREE.SphereGeometry(.075,10,6),material('#f4ce70'),sprout);center.position.y=1.49;
 }else if(stage>0){sprout.position.y=1.26;const tall=stage>.34,stemHeight=tall?1.25:.48;const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.02,0),new THREE.Vector3(.015,stemHeight*.5,0),new THREE.Vector3(0,stemHeight,0)]);mesh(new THREE.TubeGeometry(curve,10,.042,8,false),green,sprout);leaf(-1,tall?.28:.12,tall?.62:.34,.08);leaf(1,tall?.72:.21,tall?.58:.30,-.12);
 if(stage===1){const bloom=new THREE.Group();bloom.position.y=stemHeight-.04;sprout.add(bloom);const isDaisy=color==='#f4d477',isBell=color==='#b7a6da',coral=isBell?'#b29bdb':'#ee725d';
 // 모든 줄기형 꽃의 기본 연결: 줄기 끝과 꽃받침, 꽃 아랫부분을 겹쳐 연결합니다.
 const baseColor=isBell?coral:isDaisy?'#fff0bc':color==='#f3c84d'?'#f4cc47':color==='#e7a93c'?'#edb843':coral;
 const calyx=mesh(new THREE.SphereGeometry(.145,12,8),green,bloom);calyx.position.y=.035;
 const throat=mesh(new THREE.SphereGeometry(.18,12,8),material(baseColor),bloom);throat.scale.y=.65;throat.position.y=.13;

 if(color==='#f3c84d'||color==='#e7a93c'){
 bloom.rotation.x=.85;const sunflower=color==='#e7a93c',count=sunflower?13:32,flowerMat=material(sunflower?'#edb843':'#f4cc47',true);for(let i=0;i<count;i++){const a=i/count*Math.PI*2,g=new THREE.SphereGeometry(1,10,6);g.scale(sunflower?.125:.055,sunflower?.09:.07,sunflower?.34:.28);const petal=mesh(g,flowerMat,bloom),r=sunflower?.34:(i%2?.24:.12);petal.position.set(Math.sin(a)*r,i%2?.07:.13,Math.cos(a)*r);petal.rotation.y=a;petals.push(petal)}const center=mesh(new THREE.SphereGeometry(sunflower?.26:.14,16,8),material(sunflower?'#76502c':'#e8ad29',true),bloom);center.scale.y=.52;center.position.y=.18;
 }else if(isDaisy){bloom.rotation.x=.85;for(let i=0;i<10;i++){const a=i/10*Math.PI*2,g=new THREE.SphereGeometry(1,10,6);g.scale(.17,.10,.39);const petal=mesh(g,material('#fff0bc',true),bloom);petal.position.set(Math.sin(a)*.32,.08,Math.cos(a)*.32);petal.rotation.y=a;petal.rotation.x=-.15;petals.push(petal)}const center=mesh(new THREE.SphereGeometry(.22,14,8),material('#e7b83c',true),bloom);center.scale.y=.5;center.position.y=.15;
 }else if(isBell){bloom.rotation.x=.9;for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const g=surface((t,v)=>{const q=v*Math.PI*2,r=.04+t*.58,w=Math.pow(Math.sin(t*Math.PI),.75)*.25;return [Math.sin(q)*w,.10+t*.18+Math.sin(t*Math.PI)*.09+Math.cos(q)*.10*Math.sin(Math.PI*t),r]},8,7);const p=mesh(g,material(coral,true),bloom);p.rotation.y=a;petals.push(p)}const center=mesh(new THREE.SphereGeometry(.10,10,6),material('#f4d887'),bloom);center.position.y=.20;
 }else{for(let layer=0;layer<2;layer++)for(let i=0;i<3;i++){const a=i/3*Math.PI*2+(layer?Math.PI/3:0),h=layer?.70:(i===0?.95:.86);const g=surface((t,v)=>{let u=v*Math.PI*2,w=Math.pow(Math.sin(Math.PI*t),.72)*(layer?.26:.34),r=.03+(layer?.22:.37)*Math.sin(Math.PI*t*.60);return [Math.sin(u)*w,t*h,r+Math.cos(u)*.12*Math.sin(Math.PI*t)]},12,10);const p=mesh(g,material(layer?'#f28a73':coral,false),bloom);p.rotation.y=a;p.position.y=layer?.025:0;petals.push(p)}}
 }}
 function resize(){if(disposed)return;const width=Math.max(canvas.clientWidth,1),height=Math.max(canvas.clientHeight,1),aspect=width/height,view=3.95;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.near=.1;camera.far=30;camera.updateProjectionMatrix();renderer.setSize(width,height,false);render()}
 function render(){if(disposed)return;model.rotation.y=yaw;renderer.render(scene,camera)}
 function animate(now){if(disposed)return;const t=Math.min((now-start)/850,1),ease=1-Math.pow(1-t,3);sprout.scale.setScalar(.82+.18*ease);petals.forEach(p=>p.scale.setScalar(.65+.35*ease));render();if(t<1&&!reduced.matches&&document.visibilityState==='visible')frame=requestAnimationFrame(animate)}
 function down(e){drag={x:e.clientX,y:e.clientY,last:e.clientX};}
 function move(e){if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>5){canvas.setPointerCapture?.(e.pointerId);yaw+=(e.clientX-drag.last)*.014;render()}drag.last=e.clientX}
 function up(){drag=null}
 function key(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();yaw+=e.key==='ArrowLeft'?-.22:.22;render()}}
 canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','입체 화분과 식물. 좌우로 드래그하거나 방향키로 회전할 수 있어요.');canvas.style.touchAction='pan-y';canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('keydown',key);
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();if(!reduced.matches)frame=requestAnimationFrame(animate);
 return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('keydown',key);disposeList.forEach(o=>o.dispose());renderer.dispose();renderer.forceContextLoss()};
}
