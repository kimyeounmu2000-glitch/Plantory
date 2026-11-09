// Growth rules are independent of the 3D models and completion percentage UI.
function calculatedStage(total, completed) {
 if (!total || !completed) return 0;
 if (completed === total) return 3;
 return completed >= 2 && completed >= Math.ceil(total / 2) ? 2 : 1;
}
function normalizeGrowth(items, awards, saved = {}) {
 const growth = {};
 for (const [date, value] of Object.entries(saved || {})) {
  if (validDate(date) && Number.isInteger(value) && value >= 0 && value <= 3) growth[date] = value;
 }
 const totals = new Map();
 for (const item of items) {
  if (item.type !== 'task') continue;
  const count = totals.get(item.date) || {total:0, completed:0};
  count.total++; count.completed += Number(item.done); totals.set(item.date, count);
 }
 for (const [date, count] of totals) growth[date] = Math.max(growth[date] || 0, calculatedStage(count.total, count.completed));
 for (const date of Object.keys(awards)) growth[date] = 3;
 return growth;
}
function stage() {
 const k = today(), p = progress(k);
 return Math.max(data.growth[k] || 0, data.awards[k] ? 3 : 0, calculatedStage(p.count, p.done));
}
let growthTimer = null, growthPlaying = false;
function cancelGrowth() { clearTimeout(growthTimer); growthPlaying = false; }
function animateGrowth(from, to) {
 cancelGrowth();
 if (!plant3d || view !== 'home' || !$('plantPreviewOverlay').hidden || from >= to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
 const date = today(), species = data.awards[date] || 'daisy';
 growthPlaying = true;
 function step(value) {
  if (today() !== date || view !== 'home') { cancelGrowth(); render(); return; }
  plant3d.set(species, value);
  if (value === to) { growthPlaying = false; return; }
  growthTimer = setTimeout(() => step(value + 1), 450);
 }
 step(from);
}
// Commit one snapshot: a failed write rolls back tasks, settings, growth and rewards.
function commitTasks(change, message) {
 const before = structuredClone(data), previousStage = stage();
 change();
 const awarded = rewardToday(), k = today();
 data.growth[k] = stage();
 if (!persist()) { data = before; render(); return false; }
 render(); animateGrowth(previousStage, stage());
 if (awarded) notify(`오늘 꽃이 피었어요! ${SPECIES.find(s => s.id === data.awards[k]).name}을(를) 획득했어요.`);
 else if (message) notify(message);
 return true;
}
