// Diff consecutive snapshots to reconstruct Elsie's edits.
// Snapshot semantics: `snap-<ts>-<by>` captures the state *before* a POST by <by>.
// So the snap at T1 by Elsie = state before Elsie's POST at T1. To see what she changed at T1,
// diff snap(T1-by-Elsie) vs snap(T_next-by-Whoever).

const fs = require('fs');

const snapIds = [
  '2026-04-22T03-47-29-093Z-Elsie',
  '2026-04-22T03-50-50-463Z-Elsie',
  '2026-04-22T03-55-09-308Z-Elsie',
  '2026-04-22T03-56-05-359Z-Elsie',
  '2026-04-22T03-56-25-029Z-Elsie',
  '2026-04-22T03-56-42-565Z-Elsie',
  '2026-04-22T03-56-53-842Z-Elsie',
  '2026-04-22T03-57-36-735Z-Elsie',
  '2026-04-22T03-59-32-258Z-Elsie',
  '2026-04-22T04-00-16-927Z-Elsie',
  '2026-04-22T04-01-21-651Z-Elsie',
  '2026-04-22T04-01-41-047Z-Elsie',
  '2026-04-22T04-01-46-245Z-Elsie',
  '2026-04-22T04-01-50-484Z-Elsie',
  '2026-04-22T04-01-51-660Z-Elsie',
  '2026-04-22T04-05-01-437Z-Elsie',
  '2026-04-22T04-06-09-824Z-Elsie',
  '2026-04-22T04-08-07-524Z-Elsie',
  '2026-04-22T05-46-48-145Z-Hannah_&_Stan'   // bookend (state AFTER Elsie's last edit, before H&S next edit)
];

function load(id) {
  return JSON.parse(fs.readFileSync(`elsie_snaps/${id}.json`, 'utf8'));
}

function diffTasks(prev, next) {
  const pMap = new Map((prev.tasks||[]).map(t=>[t.id,t]));
  const nMap = new Map((next.tasks||[]).map(t=>[t.id,t]));
  const changes = [];
  for (const [id,t] of nMap) {
    const p = pMap.get(id);
    if (!p) { changes.push({kind:'ADD', id, taskId:t.taskId, title:t.title}); continue; }
    const fields = ['title','desc','status','priority','deadline','assignee','quadrant','group','blockedBy','location','contacts','tags'];
    for (const f of fields) {
      const pv = JSON.stringify(p[f]||'');
      const nv = JSON.stringify(t[f]||'');
      if (pv !== nv) changes.push({kind:'UPD', id, taskId:t.taskId||'?', title:(t.title||'').slice(0,60), field:f, from: (p[f]||'').toString().slice(0,80), to:(t[f]||'').toString().slice(0,80)});
    }
    // subtask changes (most common for Elsie probably)
    const pSubs = JSON.stringify((p.subtasks||[]).map(s=>({id:s.id,title:s.title,done:s.done})));
    const nSubs = JSON.stringify((t.subtasks||[]).map(s=>({id:s.id,title:s.title,done:s.done})));
    if (pSubs !== nSubs) {
      const pSub = (p.subtasks||[]);
      const nSub = (t.subtasks||[]);
      const pSubMap = new Map(pSub.map(s=>[s.id,s]));
      for (const s of nSub) {
        const ps = pSubMap.get(s.id);
        if (!ps) { changes.push({kind:'SUBTASK_ADD', id, taskId:t.taskId||'?', taskTitle:(t.title||'').slice(0,50), sub:s.title}); continue; }
        if (ps.done !== s.done) changes.push({kind:'SUBTASK_TOGGLE', id, taskId:t.taskId||'?', taskTitle:(t.title||'').slice(0,50), sub:s.title, from:ps.done, to:s.done});
        if (ps.title !== s.title) changes.push({kind:'SUBTASK_RENAME', id, taskId:t.taskId||'?', taskTitle:(t.title||'').slice(0,50), from:ps.title, to:s.title});
      }
      const nSubMap = new Map(nSub.map(s=>[s.id,s]));
      for (const s of pSub) {
        if (!nSubMap.has(s.id)) changes.push({kind:'SUBTASK_DEL', id, taskId:t.taskId||'?', taskTitle:(t.title||'').slice(0,50), sub:s.title});
      }
    }
    // comment additions
    const pC = (p.comments||[]).length;
    const nC = (t.comments||[]).length;
    if (nC > pC) {
      for (let i=0; i<nC-pC; i++) {
        const c = t.comments[i];
        changes.push({kind:'COMMENT_ADD', id, taskId:t.taskId||'?', taskTitle:(t.title||'').slice(0,50), text:(c.text||'').slice(0,100)});
      }
    }
  }
  for (const [id,t] of pMap) {
    if (!nMap.has(id)) changes.push({kind:'DEL', id, taskId:t.taskId||'?', title:(t.title||'').slice(0,60)});
  }
  return changes;
}

function diffContacts(prev, next) {
  const pMap = new Map((prev.contacts||[]).map(c=>[c.id,c]));
  const nMap = new Map((next.contacts||[]).map(c=>[c.id,c]));
  const changes = [];
  for (const [id,c] of nMap) {
    const p = pMap.get(id);
    if (!p) { changes.push({kind:'CONTACT_ADD', id, name:c.name}); continue; }
    const fields = ['name','role','email','phone','notes'];
    for (const f of fields) {
      if ((p[f]||'') !== (c[f]||'')) changes.push({kind:'CONTACT_UPD', id, name:c.name, field:f, from:(p[f]||'').toString().slice(0,80), to:(c[f]||'').toString().slice(0,80)});
    }
  }
  for (const [id,c] of pMap) {
    if (!nMap.has(id)) changes.push({kind:'CONTACT_DEL', id, name:c.name});
  }
  return changes;
}

// Run pairwise diffs
console.log('=== Diffing consecutive snapshots (Elsie session window 2026-04-22 03:47 - 04:08 UTC, ~20min) ===\n');
let allChanges = [];
for (let i = 0; i < snapIds.length - 1; i++) {
  const prev = load(snapIds[i]);
  const next = load(snapIds[i+1]);
  const t = diffTasks(prev, next);
  const c = diffContacts(prev, next);
  const chg = [...t, ...c];
  if (chg.length) {
    console.log(`\n--- Edit at ~${snapIds[i].slice(11,19).replace(/-/g,':')} (snap "${snapIds[i].slice(0,24)}") → "${snapIds[i+1].slice(0,24)}" ---`);
    chg.forEach(x => console.log('  ', JSON.stringify(x)));
    allChanges.push({edit_idx:i, from:snapIds[i], to:snapIds[i+1], changes:chg});
  } else {
    console.log(`\n--- No change detected between snap "${snapIds[i].slice(0,30)}" and "${snapIds[i+1].slice(0,30)}" ---`);
  }
}

console.log('\n\n=== CONSOLIDATED SUMMARY of Elsie edits ===');
const tasksTouched = new Set();
const subtasksToggled = [];
const subtasksAdded = [];
const subtasksRenamed = [];
const subtasksDeleted = [];
const taskFieldUpdates = [];
const commentsAdded = [];
const contactChanges = [];
const tasksAdded = [];

allChanges.forEach(e => e.changes.forEach(c => {
  if (c.taskId) tasksTouched.add(c.taskId);
  if (c.kind === 'SUBTASK_TOGGLE') subtasksToggled.push(c);
  if (c.kind === 'SUBTASK_ADD') subtasksAdded.push(c);
  if (c.kind === 'SUBTASK_RENAME') subtasksRenamed.push(c);
  if (c.kind === 'SUBTASK_DEL') subtasksDeleted.push(c);
  if (c.kind === 'UPD') taskFieldUpdates.push(c);
  if (c.kind === 'COMMENT_ADD') commentsAdded.push(c);
  if (c.kind === 'CONTACT_ADD' || c.kind === 'CONTACT_UPD' || c.kind === 'CONTACT_DEL') contactChanges.push(c);
  if (c.kind === 'ADD') tasksAdded.push(c);
}));

console.log('unique tasks touched:', [...tasksTouched]);
console.log('\nsubtasks toggled (done/undone):', subtasksToggled.length);
subtasksToggled.forEach(s => console.log(` [${s.taskId}] "${s.taskTitle}" | sub: "${s.sub}" | ${s.from} → ${s.to}`));
console.log('\nsubtasks added:', subtasksAdded.length);
subtasksAdded.forEach(s => console.log(` [${s.taskId}] "${s.taskTitle}" | new sub: "${s.sub}"`));
console.log('\nsubtasks renamed:', subtasksRenamed.length);
subtasksRenamed.forEach(s => console.log(` [${s.taskId}] "${s.taskTitle}" | "${s.from}" → "${s.to}"`));
console.log('\nsubtasks deleted:', subtasksDeleted.length);
subtasksDeleted.forEach(s => console.log(` [${s.taskId}] "${s.taskTitle}" | removed sub: "${s.sub}"`));
console.log('\ntask field updates:', taskFieldUpdates.length);
taskFieldUpdates.forEach(s => console.log(` [${s.taskId}] "${s.title}" | ${s.field}: "${s.from}" → "${s.to}"`));
console.log('\ncomments added:', commentsAdded.length);
commentsAdded.forEach(s => console.log(` [${s.taskId}] "${s.taskTitle}" | "${s.text}"`));
console.log('\ncontact changes:', contactChanges.length);
contactChanges.forEach(s => console.log(` ${s.kind}: ${s.name} ${s.field?`| ${s.field}: "${s.from}" → "${s.to}"`:''}`));
console.log('\ntasks added:', tasksAdded.length);
tasksAdded.forEach(s => console.log(` [${s.taskId}] "${s.title}"`));
