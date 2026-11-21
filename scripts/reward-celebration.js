// Versioned optional metadata shares the existing atomic storage snapshot.
function normalizeCelebration(value, awards) {
 if(value===undefined)return {remaining:[],last:null,days:{}};
 const valid=id=>Number.isInteger(id)&&id>=0&&id<40;
 if(!value||!Array.isArray(value.remaining)||value.remaining.length>40||new Set(value.remaining).size!==value.remaining.length||!value.remaining.every(valid)||(value.last!==null&&!valid(value.last))||!value.days||typeof value.days!=='object'||Array.isArray(value.days))throw Error('격려 기록을 읽지 못했어요. 원본을 보존합니다.');
 const days=structuredClone(value.days);for(const [date,id] of Object.entries(value.days)){if(!validDate(date)||!valid(id)||!awards[date])throw Error('격려 기록과 꽃 기록이 일치하지 않아요.');days[date]=id}
 return {...value,remaining:[...value.remaining],last:value.last,days};
}
function takeRewardMessage(state,date){
 if(Object.hasOwn(state.days,date))return state.days[date];
 if(!state.remaining.length){
  state.remaining=Array.from({length:40},(_,i)=>i);
  for(let i=39;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=Math.floor(n[0]/4294967296*(i+1));[state.remaining[i],state.remaining[j]]=[state.remaining[j],state.remaining[i]]}
  if(state.remaining[39]===state.last)[state.remaining[0],state.remaining[39]]=[state.remaining[39],state.remaining[0]];
 }
 const id=state.remaining.pop();state.last=id;state.days[date]=id;return id;
}
function focusTaskCheck(id){const entry=[...document.querySelectorAll('.screen:not([hidden]) .entry')].find(e=>e.dataset.id===id);focusSafely(entry?.querySelector('.check'))}
let rewardReturn=null;
function closeReward(restore=true){
 $('rewardCelebration').hidden=true;
 if(restore)focusTaskCheck(rewardReturn);
}
function showRewardCelebration(date,source){
 const id=data.celebration?.days[date],species=SPECIES.find(s=>s.id===data.awards[date]);if(id===undefined||!species)return;
 const box=$('rewardCelebration');$('rewardMain').textContent=REWARD_MESSAGES[id][0];$('rewardSub').textContent=REWARD_MESSAGES[id][1];$('rewardFlowerName').textContent=species.name+' 획득';
 const image=$('rewardFlower');const url=thumb(species.id);image.hidden=!url;if(url){image.src=url;image.alt=species.name}
 clearTimeout(toaster);$('toast').hidden=true;box.hidden=false;rewardReturn=source;setTimeout(()=>{if(!box.hidden&&!modalStack.length)$('rewardClose').focus({preventScroll:true})},0);
}
