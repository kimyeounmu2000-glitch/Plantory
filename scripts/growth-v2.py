import re
from pathlib import Path

def apply_growth(app):
    def replace_function(name, replacement):
        nonlocal app
        pattern = r'function '+name+r'\([^\n]*?(?=\n(?:function |async function |//|let |const ))'
        # Existing handlers occupy one or two lines; use the next named declaration as boundary.
        pattern = r'function '+name+r'\([\s\S]*?(?=\n(?:function |async function |//|let |const ))'
        app, count = re.subn(pattern, lambda _:replacement, app, count=1)
        assert count == 1, name
    app=app.replace('version:2,items:[],awards:{},settings:', 'version:2,items:[],awards:{},growth:{},settings:')
    app=app.replace('return {version:2,items,awards,settings}', 'return {version:2,items,awards,settings,growth:normalizeGrowth(items,awards,input.growth)}')
    replace_function('stage', Path(__file__).with_name('growth-v2.js').read_text(encoding='utf-8').strip())
    app=app.replace('function restoreHome3D(){if(!plant3d)return;', 'function restoreHome3D(){if(!plant3d||growthPlaying)return;')
    app=app.replace("function openPreview(kind='tulip',step=3){", "function openPreview(kind='tulip',step=3){cancelGrowth();")
    app=re.sub(r'(function go\([^)]*\)\{)', r'\1cancelGrowth();', app)
    app=app.replace("notify(`오늘 꽃이 피었어요! ${SPECIES[idx].name}을(를) 획득했어요.`);return true", 'return true')
    replace_function('toggleDone', """function toggleDone(id,done){
 const item=data.items.find(i=>i.id===id);
 if(item?.type==='task') commitTasks(()=>{item.done=done});
}""")
    replace_function('saveEditor', """function saveEditor(event){
 event.preventDefault();
 const title=$('itemTitle').value.trim(),date=$('itemDate').value;
 if(!title||!validDate(date)){notify('제목과 날짜를 확인해 주세요.');return}
 const old=data.items.find(x=>x.id===editId);
 const next={id:editId||makeId(),type:editorType,title,date,time:$('itemTime').value,note:$('itemNote').value.trim(),color:editingColor,done:old?.type==='task'&&editorType==='task'?old.done:false};
 if(!commitTasks(()=>{
  if(old)Object.assign(old,next);else data.items.push(next);
  if($('saveDefault').checked)data.settings[editorType==='task'?'defaultTaskColor':'defaultEventColor']=editingColor;
 },editId?'기록을 수정했어요.':'기록을 저장했어요.'))return;
 selected=date;month=new Date(fromKey(date).getFullYear(),fromKey(date).getMonth(),1);
 overlayClose('editorOverlay');render();
}""")
    replace_function('deleteEditor', """function deleteEditor(){
 if(!editId||!confirm('이 기록을 삭제할까요?'))return;
 if(commitTasks(()=>{data.items=data.items.filter(x=>x.id!==editId)},'기록을 삭제했어요.'))overlayClose('editorOverlay');
}""")
    app=app.replace("'오늘도 꽃을 피웠어요!'", "'오늘의 꽃 획득 완료'")
    app=app.replace("render();if(!data.settings.hasOnboarded)", """let renderedDate=today();
function refreshDate(){if(today()!==renderedDate){renderedDate=today();cancelGrowth();render()}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDate()});
setInterval(refreshDate,30000);
render();if(!data.settings.hasOnboarded)""")
    return app

