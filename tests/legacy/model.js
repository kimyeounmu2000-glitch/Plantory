export const species=[{id:'tulip',name:'살구 튤립',color:'#eea38c'},{id:'daisy',name:'햇살 데이지',color:'#f4d477'},{id:'bell',name:'보랏빛 도라지',color:'#b7a6da'},{id:'cactus',name:'동글 선인장',color:'#73aa71'},{id:'dandelion',name:'노란 민들레',color:'#f3c84d'},{id:'sunflower',name:'작은 해바라기',color:'#e7a93c'}];
export function key(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
export function offset(k,n){const d=new Date(k+'T12:00:00');d.setDate(d.getDate()+n);return key(d)}
export function randomSpecies(){const a=new Uint32Array(1),limit=Math.floor(4294967296/species.length)*species.length;do{crypto.getRandomValues(a)}while(a[0]>=limit);return species[a[0]%species.length].id}
export function ensure(state,date){return state.days[date]??= {tasks:[],speciesId:randomSpecies(),awarded:false,completionDate:null}}
export function progress(day){return day.tasks.length?day.tasks.filter(t=>t.done).length/day.tasks.length:0}
export function award(day,date,today){if(date!==today||day.awarded||!day.tasks.length||progress(day)!==1)return false;day.awarded=true;day.completionDate=new Date().toISOString();return true}
export function counts(state){return Object.fromEntries(species.map(s=>[s.id,Object.values(state.days).filter(d=>d.awarded&&d.speciesId===s.id).length]))}
export function streak(state,today){let n=0,k=state.days[today]?.awarded?today:offset(today,-1);while(state.days[k]?.awarded){n++;k=offset(k,-1)}return n}
