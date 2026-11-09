from pathlib import Path
import re, base64
import runpy, sys

root = Path(__file__).resolve().parents[1]
source = root / 'input/Plantory_3D_Integrated_v3.html'
original = root / 'models'
out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / 'app'
out.mkdir(parents=True, exist_ok=True)
html = source.read_text(encoding='utf-8')
plant = (original/'plant.js').read_text(encoding='utf-8')
plant = re.sub(r'^import .*\n', '', plant, flags=re.M).replace('export function plant', 'function plant')
plant = plant.replace('return ()=>{disposed=true;', 'const dispose=()=>{disposed=true;')
plant = plant.replace('renderer.forceContextLoss()};', '''renderer.forceContextLoss()};
 dispose.draw=render;
 dispose.rotate=delta=>{yaw+=delta;render()};
 dispose.finish=()=>{cancelAnimationFrame(frame);sprout.scale.setScalar(1);petals.forEach(p=>p.scale.setScalar(1));render()};
 return dispose;''')
fallback = (original/'plant-fallback.js').read_text(encoding='utf-8').replace('export function plant', 'function fallbackPlant')
three = base64.b64encode((original/'vendor/three.module.js').read_bytes()).decode()
adapter = '''
// Adapter: preserve the supplied app's species IDs, growth stages and public API.
// Add species here; preview buttons, collection and rewards share this registry.
const PLANT_SPECIES=[
 {id:'daisy',name:'데이지',color:'#f4d477',emoji:'🌼',description:'맑은 하루의 꽃'},
 {id:'tulip',name:'튤립',color:'#eea38c',emoji:'🌷',description:'반짝이는 하루의 꽃'},
 {id:'sunflower',name:'해바라기',color:'#e7a93c',emoji:'🌻',description:'빛을 닮은 하루의 꽃'},
 {id:'bell',name:'보랏빛 도라지',color:'#b7a6da',emoji:'🪻',description:'보랏빛으로 피어난 하루'},
 {id:'cactus',name:'동글 선인장',color:'#73aa71',emoji:'🌵',description:'단단하게 자라는 하루'},
 {id:'dandelion',name:'노란 민들레',color:'#f3c84d',emoji:'🌼',description:'노랗게 물드는 하루'}
];
const COLORS=Object.fromEntries(PLANT_SPECIES.map(s=>[s.id,s.color]));
const plantChoices=document.querySelector('[data-plant]').parentElement;
plantChoices.replaceChildren(...PLANT_SPECIES.map(s=>{
 const button=document.createElement('button');button.type='button';button.dataset.plant=s.id;button.textContent=s.name;return button;
}));
const STAGES=[0,.2,.7,1];
window.Plantory3D={create(){
 let canvas,dispose,parent,species='daisy',stage=0;
 function build(){
  dispose?.();canvas=document.createElement('canvas');canvas.className='plant3d-canvas';
  parent?.replaceChildren(canvas);dispose=plant(canvas,STAGES[stage],COLORS[species]);
 }
 function set(spec,step){
  const next=Object.hasOwn(COLORS,spec)?spec:'daisy',value=Math.max(0,Math.min(3,Math.trunc(Number(step)||0)));
  if(canvas&&next===species&&value===stage)return;
  species=next;stage=value;build();
 }
 function mount(host){parent=host;if(!canvas)build();else host.replaceChildren(canvas)}
 function snapshot(spec,step){
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:175px;height:180px';
  const image=document.createElement('canvas');image.style.cssText='width:175px;height:180px';host.append(image);document.body.append(host);
  let cleanup;
  try{cleanup=plant(image,STAGES[step]??1,COLORS[spec]??COLORS.daisy);cleanup.finish?.();return image.toDataURL('image/png')}
  finally{cleanup?.();host.remove()}
 }
 return {get canvas(){return canvas},mount,set,snapshot,rotate:d=>dispose?.rotate?.(d),draw:()=>dispose?.draw?.(),
 get species(){return species},get stage(){return stage},dispose:()=>dispose?.()};
}};
'''
scripts = list(re.finditer(r'<script>([\s\S]*?)</script>', html))
assert len(scripts)==2
app=scripts[1].group(1)
app=re.sub(r'const SPECIES=\[.*?\];', 'const SPECIES=PLANT_SPECIES;', app)
app=re.sub(r'const previewNames=\{.*?\};', 'const previewNames=Object.fromEntries(SPECIES.map(s=>[s.id,s.name]));', app)
# A gesture belongs to its starting region, including the touch fallback.
app=app.replace("e.target.closest('input,textarea,select,button')", "e.target.closest('input,textarea,select,button,#plantGraphic,.preview-art')")
app=runpy.run_path(str(root / 'scripts/growth-v2.py'))['apply_growth'](app)
module='import * as THREE from "data:text/javascript;base64,'+three+'";\n'+fallback+'\n'+plant+'\n'+adapter+'\n'+app
result=html[:scripts[0].start()]+'<script type="module">\n'+module+'\n</script>'+html[scripts[1].end():]
assert html[:scripts[0].start()]==result[:scripts[0].start()]
(out/'Plantory_3D_Integrated_original_models.html').write_text(result,encoding='utf-8')
print(out.resolve())

