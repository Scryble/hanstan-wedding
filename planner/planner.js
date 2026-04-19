/* ══════════════════════════════════════════════════════════════════
   HW-PLANNER-001 v6.0 | 2026-04-15
   Server-backed coordinator planner for hanstan.wedding/planner.
   Folds in HW-PLANNER-AUDIT-FIX-001 patches 01,02,04,05,07,09–17.
   Patches 03,06,08 superseded by server-backed architecture.
   ══════════════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ════════════════ CONSTANTS ════════════════ */
const TOKEN_KEY = 'hanstan_planner_token';
const OFFLINE_QUEUE_KEY = 'hanstan_planner_offline_queue';
const LAST_STATE_CACHE_KEY = 'hanstan_planner_state_cache';
const POLL_INTERVAL_MS = 30000;
const RETRY_INTERVAL_MS = 15000;
const SAVE_DEBOUNCE_MS = 600;
const SCHEMA_VERSION = 7;
const WD = new Date('2026-06-07T16:00:00');
const STATUSES = ['not-started','in-progress','blocked','delegated','mostly-done','done'];
const STATUS_LABELS = {'not-started':'Not Started','in-progress':'In Progress','blocked':'Blocked','delegated':'Delegated','mostly-done':'Mostly Done','done':'Done'};
const PRI_ORDER = {critical:0,high:1,medium:2,low:3};
const DEFAULT_GROUPS = ['All','Guests','Website','Venue','Wedding Day','Organizers',"Stan's Rolodex",'Procurement','Wedding Week','Guest List','HanStan Logistics','Catering'];

const ENDPOINTS = {
  auth: '/.netlify/functions/planner-auth',
  state: '/.netlify/functions/planner-state',
  snapshots: '/.netlify/functions/planner-snapshots',
  coordinators: '/.netlify/functions/planner-coordinators',
  audit: '/.netlify/functions/planner-audit',
};

/* ════════════════ STATE ════════════════ */
let identity = null;        // { name, isMaster }
let token = null;
let T = [], C = [], G = [], TAGS = [], SV = [];
// HW-SCHED: schedule globals
let SE = [], SP = [], SQ = [];
let schedEditActive = false;
let schedCollapseState = {}; // phaseId → bool override (runtime, not persisted separately from SP[].collapsed)
let schedActivePhase = null; // currently-visible phase id for sticky nav highlight
let schedDragState = null;   // {id, sourcePhaseId, startY}
let schedLongPressTimer = null;
let schedSwipeStartX = 0, schedSwipeStartY = 0;
let PREFS = {advExpanded:false, onboardSeen:false, schedOnboardSeen:false, scheduleSeeded:false, sortBy:'priority', groupByField:'group'};
let lastSeenModified = null;
let view = 'focus';
let activeGroup = 'All';
let search = '';
let sortBy = 'priority';
let groupByField = 'none';
let filters = {status:[], tags:[], assignees:[], groups:[]};
let editTags = [], editSubtasks = [], editComments = [];
let batchMode = false, batchSelected = new Set();
let undoStack = [], scrollY = 0, tmDirty = false;
let ctxTaskId = null, longPressTimer = null, swipeStartX = 0, swipeStartY = 0;
let statusPickerTaskId = null;
let saveInFlight = false;
let pendingSaveAfterFlight = false;
let lastUserActionAt = Date.now();
let syncStatus = 'idle';
let _saveDebounceTimer = null;
let _pendingRemoteState = null;

/* ════════════════ HELPERS (patches 04, 05) ════════════════ */
function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
// PATCH 04: escAttr also escapes quotes for HTML attribute values
function escAttr(s){return esc(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
// PATCH 04: escJs escapes a string for safe interpolation inside a JS single-quoted literal embedded in an HTML attribute
function escJs(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/</g,'\\x3c')}
function $(id){return document.getElementById(id)}
function now(){return new Date().toISOString()}

// PATCH 05: derive workstream + default group from taskId
function workstreamFromTaskId(taskId){
  const c=(taskId||'').charAt(0).toLowerCase();
  return (c==='a'||c==='b'||c==='c')?c:'b';
}
function deriveGroupFromTaskId(taskId){
  const c=(taskId||'').charAt(0).toLowerCase();
  if(c==='a') return 'Website';
  if(c==='c') return 'Organizers';
  return null;
}

function daysDiff(dateStr){
  if(!dateStr)return Infinity;
  return Math.ceil((new Date(dateStr+'T00:00:00')-new Date())/864e5);
}
function relDate(dateStr){
  const d=daysDiff(dateStr);
  if(d<0)return 'Overdue';if(d===0)return 'Today';if(d<=7)return d+'d';
  return new Date(dateStr+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function linkify(text){
  if(!text)return '';
  return esc(text).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g,'<br>');
}
function announce(msg){$('liveRegion').textContent=msg}

function formatAgo(s){
  if(s<60)return s+'s';
  if(s<3600)return Math.round(s/60)+'m';
  return Math.round(s/3600)+'h';
}

/* ════════════════ AUTH GATE ════════════════ */
async function gateInit(){
  token = localStorage.getItem(TOKEN_KEY);
  if(token){
    const id = await tryAuth(token);
    if(id){identity=id; enterApp(); return}
    // Stored token is invalid: clear and show gate
    localStorage.removeItem(TOKEN_KEY);
    token = null;
  }
  showGate();
}
async function tryAuth(t){
  try{
    const r = await fetch(ENDPOINTS.auth, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token: t})
    });
    if(!r.ok) return null;
    return await r.json();
  } catch(e){
    return null;
  }
}
function showGate(){
  $('gateScreen').style.display = 'flex';
  $('appShell').style.display = 'none';
  setTimeout(() => $('gateToken').focus(), 50);
}
async function handleGateSubmit(){
  const t = $('gateToken').value.trim();
  if(!t){$('gateErr').textContent='Token required'; return}
  $('gateErr').textContent = 'Checking…';
  const id = await tryAuth(t);
  if(!id){$('gateErr').textContent='Token not recognized'; return}
  token = t;
  identity = id;
  localStorage.setItem(TOKEN_KEY, t);
  $('gateErr').textContent = '';
  enterApp();
}
function enterApp(){
  $('gateScreen').style.display = 'none';
  $('appShell').style.display = '';
  $('hdrWho').textContent = identity.name + (identity.isMaster ? ' ⚜' : '');
  initApp();
}
function signoutDueToInvalidToken(){
  toast('Token invalidated — please sign in again', false);
  localStorage.removeItem(TOKEN_KEY);
  setTimeout(() => location.reload(), 2000);
}

// Wire gate handlers (these run immediately on script load; gate elements always exist in HTML)
$('gateBtn').onclick = handleGateSubmit;
$('gateToken').onkeydown = e => { if(e.key === 'Enter') handleGateSubmit() };
$('hdrSignout').onclick = () => {
  localStorage.removeItem(TOKEN_KEY);
  token = null; identity = null;
  location.reload();
};

/* ════════════════ INITIAL LOAD ════════════════ */
async function initApp(){
  setSyncStatus('loading');
  // Try cache first for instant render
  try{
    const cached = JSON.parse(localStorage.getItem(LAST_STATE_CACHE_KEY) || 'null');
    if(cached){applyServerState(cached, false); render()}
  } catch(e){}
  // Then fetch live
  const live = await fetchState();
  if(live){applyServerState(live, true); render()}
  setSyncStatus('idle');
  // Drain offline queue if present
  drainOfflineQueue();
  // Start polling
  startPolling();
  // Start retry timer
  setInterval(drainOfflineQueue, RETRY_INTERVAL_MS);
}

async function fetchState(){
  try{
    const r = await fetch(ENDPOINTS.state, {
      headers: {'Authorization': 'Bearer ' + token}
    });
    if(!r.ok){
      if(r.status === 401){signoutDueToInvalidToken(); return null}
      throw new Error('HTTP ' + r.status);
    }
    return await r.json();
  } catch(e){
    setSyncStatus('offline', 'Connection lost — using cached data');
    return null;
  }
}

function applyServerState(s, isLive){
  T = (s.tasks || []).map(t => ({...t}));
  C = (s.contacts || []).map(c => ({...c}));
  G = s.groups ? [...s.groups] : [...DEFAULT_GROUPS];
  TAGS = s.tags ? [...s.tags] : [...new Set(T.flatMap(t => t.tags || []))].sort();
  SV = s.savedViews ? [...s.savedViews] : [];
  if(s.prefs) PREFS = {...PREFS, ...s.prefs};
  lastSeenModified = s.lastModified || null;
  // PATCH 01: ensure all tasks have new fields
  T.forEach(t => {
    if(!t.group) t.group = deriveGroupFromTaskId(t.taskId) || 'All';
    if(!Array.isArray(t.tags)) t.tags = [];
    if(!t.subtasks) t.subtasks = [];
    if(!t.comments) t.comments = [];
    if(!t.history) t.history = [];
    if(!t.recurring) t.recurring = '';
    if(!t.reminder) t.reminder = '';
    if(!t.modified) t.modified = now();
    if(!t.created) t.created = now();
  });

  // HW-SCHED: schedule seeding — authoritative-key-only rule.
  // Rule: if s.scheduleEvents exists, it's the truth. If it's absent, we NEVER
  // overwrite in-memory SE/SP/SQ — the absence means "this state was serialized
  // before the schedule feature existed" (pre-feature state, or a state written
  // by a client that doesn't send the key). Treating absent-as-empty caused the
  // flash-and-vanish bug: seeded state → second applyServerState call without
  // the key → wiped → next poll brings key back → re-populated.
  //
  // Seeding only fires on live load when SE is currently empty AND the flag is
  // clean AND the defaults are available. setTimeout(save) persists the seed so
  // subsequent loads see scheduleEvents present on the server.
  if(s.scheduleEvents !== undefined){
    SE = (s.scheduleEvents || []).map(e => ({...e}));
    SP = (s.schedulePhases || []).map(p => ({...p, eventIds: [...(p.eventIds || [])]}));
    SQ = (s.scheduleQuestions || []).map(q => ({...q}));
  } else if(isLive && SE.length === 0 && !PREFS.scheduleSeeded){
    if(window.DEFAULT_SCHEDULE_EVENTS && window.DEFAULT_SCHEDULE_PHASES && window.DEFAULT_SCHEDULE_QUESTIONS){
      SE = window.DEFAULT_SCHEDULE_EVENTS.map(e => ({...e, people: [...(e.people || [])], itemsToBring: [...(e.itemsToBring || [])], notes: [...(e.notes || [])]}));
      SP = window.DEFAULT_SCHEDULE_PHASES.map(p => ({...p, eventIds: [...(p.eventIds || [])]}));
      SQ = window.DEFAULT_SCHEDULE_QUESTIONS.map(q => ({...q}));
      PREFS.scheduleSeeded = true;
      setTimeout(() => save(), 100);
    }
  }
  // Any other case: leave SE/SP/SQ as-is. Never overwrite with empty from an
  // absent-key state.

  sortBy = PREFS.sortBy || 'priority';
  groupByField = PREFS.groupByField || 'none';
  // Cache for offline first-load
  try{ localStorage.setItem(LAST_STATE_CACHE_KEY, JSON.stringify(s)); } catch(e){}
}

/* ════════════════ SAVE PIPELINE ════════════════ */
function buildPayload(){
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: T,
    contacts: C,
    groups: G,
    tags: TAGS,
    savedViews: SV,
    prefs: PREFS,
    // HW-SCHED: schedule data persisted alongside task data
    scheduleEvents: SE,
    schedulePhases: SP,
    scheduleQuestions: SQ,
  };
}

async function pushSave(){
  if(saveInFlight){
    pendingSaveAfterFlight = true;
    return;
  }
  saveInFlight = true;
  setSyncStatus('saving');
  const payload = buildPayload();
  try{
    const r = await fetch(ENDPOINTS.state, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({state: payload})
    });
    if(!r.ok){
      if(r.status === 401){signoutDueToInvalidToken(); return}
      throw new Error('HTTP ' + r.status);
    }
    const result = await r.json();
    lastSeenModified = result.lastModified;
    // Update cache
    try{
      localStorage.setItem(LAST_STATE_CACHE_KEY, JSON.stringify({
        ...payload,
        lastModified: result.lastModified,
        lastModifiedBy: identity.name
      }));
    } catch(e){}
    setSyncStatus('idle');
  } catch(e){
    queueOffline(payload);
    setSyncStatus('offline', 'Saving offline — will retry');
  } finally {
    saveInFlight = false;
    if(pendingSaveAfterFlight){
      pendingSaveAfterFlight = false;
      setTimeout(pushSave, 50);
    }
  }
}

function queueOffline(payload){
  try{
    // Replace queue with just the latest payload (full-state semantics: latest wins)
    const q = [{ts: now(), payload}];
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
  } catch(e){
    showStorageBanner('Cannot queue offline edit: ' + e.message);
  }
}

async function drainOfflineQueue(){
  if(!navigator.onLine) return;
  let q;
  try{
    q = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch(e){ return; }
  if(!q.length) return;
  if(saveInFlight) return;
  const latest = q[q.length - 1];
  saveInFlight = true;
  setSyncStatus('saving');
  try{
    const r = await fetch(ENDPOINTS.state, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({state: latest.payload, offlineFlush: true})
    });
    if(r.ok){
      const result = await r.json();
      lastSeenModified = result.lastModified;
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setSyncStatus('idle');
    } else {
      setSyncStatus('offline', 'Sync rejected — will retry');
    }
  } catch(e){
    setSyncStatus('offline', 'Still offline — will retry');
  } finally {
    saveInFlight = false;
  }
}

/* save() is the public API the rest of the code uses (mirrors v5 signature).
   Debounce: a flurry of edits coalesce into one POST after SAVE_DEBOUNCE_MS idle. */
function save(){
  clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(pushSave, SAVE_DEBOUNCE_MS);
}

/* ════════════════ POLLING ════════════════ */
function startPolling(){
  setInterval(async () => {
    if(document.hidden) return;
    if(saveInFlight) return;
    if(Date.now() - lastUserActionAt < 5000) return;
    const s = await fetchState();
    if(!s) return;
    if(s.lastModified && s.lastModified !== lastSeenModified){
      const editorIsMidEdit = tmDirty
        || schedEditActive
        || $('taskModalBg').classList.contains('open')
        || $('personModalBg').classList.contains('open');
      if(editorIsMidEdit){
        showStaleBanner(s.lastModifiedBy, s);
      } else {
        applyServerState(s, true);
        render();
        flashUpdateToast(s.lastModifiedBy);
      }
    }
  }, POLL_INTERVAL_MS);
}

function showStaleBanner(who, state){
  _pendingRemoteState = state;
  $('staleBannerMsg').textContent = (who || 'Someone') + ' edited this';
  $('staleBanner').classList.add('show');
}
function acceptRemoteState(){
  if(_pendingRemoteState){
    applyServerState(_pendingRemoteState, true);
    _pendingRemoteState = null;
    $('staleBanner').classList.remove('show');
    render();
  }
}

function flashUpdateToast(who){
  const t = $('updateToast');
  t.textContent = 'Updated by ' + (who || 'someone');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/* ════════════════ SYNC STATUS ════════════════ */
function setSyncStatus(s, msg){
  syncStatus = s;
  const el = $('hdrSync');
  if(!el) return;
  el.classList.remove('saving','offline','error');
  if(s === 'loading'){el.textContent = 'Loading…'}
  else if(s === 'saving'){el.textContent = 'Saving…'; el.classList.add('saving')}
  else if(s === 'offline'){el.textContent = '⚠ ' + (msg || 'Offline'); el.classList.add('offline')}
  else if(s === 'error'){el.textContent = '⚠ ' + (msg || 'Error'); el.classList.add('error')}
  else if(s === 'idle'){
    if(lastSeenModified){
      const ago = Math.round((Date.now() - new Date(lastSeenModified).getTime()) / 1000);
      el.textContent = ago < 5 ? 'Saved' : 'Saved ' + formatAgo(ago) + ' ago';
    } else {
      el.textContent = 'Saved';
    }
  }
}
function showStorageBanner(msg){
  $('storageBannerMsg').textContent = msg + ' — your changes are not being saved. Export your data now.';
  $('storageBanner').style.display = '';
}
function hideStorageBanner(){$('storageBanner').style.display = 'none'}

/* ════════════════ TOAST + UNDO ════════════════ */
function toast(msg, canUndo){
  const t = $('toast'), m = $('toastMsg'), u = $('toastUndo');
  m.textContent = msg;
  u.style.display = canUndo ? '' : 'none';
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove('show'), canUndo ? 6000 : 3000);
  announce(msg);
}
$('toastUndo').onclick = function(){
  if(undoStack.length){undoStack.pop().fn(); save(); render()}
  $('toast').classList.remove('show');
};
function pushUndo(msg, fn){
  undoStack.push({msg, fn});
  if(undoStack.length > 20) undoStack.shift();
  toast(msg, true);
}

/* ════════════════ CUSTOM CONFIRM + INPUT (patch 14) ════════════════ */
function customConfirm(title, msg){
  return new Promise(resolve => {
    $('confirmTitle').textContent = title;
    $('confirmMsg').textContent = msg;
    $('confirmBg').classList.add('open');
    $('confirmOk').onclick = () => {$('confirmBg').classList.remove('open'); resolve(true)};
    $('confirmCancel').onclick = () => {$('confirmBg').classList.remove('open'); resolve(false)};
  });
}

function customInput(title, defaultValue){
  return new Promise(resolve => {
    $('inputSheetTitle').textContent = title;
    $('inputSheetField').value = defaultValue || '';
    $('inputSheetBg').classList.add('open');
    setTimeout(() => {$('inputSheetField').focus(); $('inputSheetField').select()}, 80);
    const close = (val) => {
      $('inputSheetBg').classList.remove('open');
      $('inputSheetOk').onclick = null;
      $('inputSheetCancel').onclick = null;
      $('inputSheetField').onkeydown = null;
      $('inputSheetBg').onclick = null;
      resolve(val);
    };
    $('inputSheetOk').onclick = () => {const v = $('inputSheetField').value.trim(); close(v || null)};
    $('inputSheetCancel').onclick = () => close(null);
    $('inputSheetField').onkeydown = e => {
      if(e.key === 'Enter'){e.preventDefault(); close($('inputSheetField').value.trim() || null)}
      if(e.key === 'Escape'){close(null)}
    };
    $('inputSheetBg').onclick = function(e){if(e.target === this) close(null)};
  });
}

/* ════════════════ SCROLL PRESERVATION ════════════════ */
function saveScr(){scrollY = window.scrollY}
function restoreScr(){requestAnimationFrame(() => window.scrollTo(0, scrollY))}

/* ════════════════ TASK HISTORY ════════════════ */
function logHistory(task, action){
  task.history = task.history || [];
  task.history.push({action, time: now(), by: identity ? identity.name : 'unknown'});
  task.modified = now();
}

/* ════════════════ HEADER + STATS ════════════════ */
function updateHeader(){
  const days = Math.floor((WD - new Date()) / 864e5);
  $('hdrDays').textContent = days > 0 ? days + ' days remaining' : days === 0 ? 'Today!' : 'Married!';
  const tot = T.length, done = T.filter(t => t.status === 'done').length;
  const act = T.filter(t => t.status === 'in-progress' || t.status === 'mostly-done').length;
  const od = T.filter(t => t.deadline && daysDiff(t.deadline) < 0 && t.status !== 'done').length;
  const pct = tot ? Math.round(done / tot * 100) : 0;
  $('hdrStats').innerHTML = `<span><strong>${pct}%</strong> complete</span>` +
    `<span><strong>${done}</strong>/${tot} done</span>` +
    `<span><strong>${act}</strong> active</span>` +
    (od ? `<span class="stat-overdue"><strong>${od}</strong> overdue</span>` : '');
  const focusBtn = document.querySelector('.main-nav [data-v="focus"]');
  focusBtn.querySelector('.nav-badge')?.remove();
  if(od){
    const b = document.createElement('span');
    b.className = 'nav-badge';
    b.textContent = od;
    focusBtn.appendChild(b);
  }
}

/* ════════════════ NAVIGATION ════════════════ */
document.querySelector('.main-nav').onclick = function(e){
  const btn = e.target.closest('[role="tab"]');
  if(!btn) return;
  this.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', 'false'));
  btn.setAttribute('aria-selected', 'true');
  view = btn.dataset.v;
  lastUserActionAt = Date.now();
  saveScr();
  render();
};

/* ════════════════ GROUP TABS (patch 04: escAttr) ════════════════ */
function renderGroupTabs(){
  const el = $('groupTabs');
  el.style.display = (view === 'tasks') ? 'flex' : 'none';
  if(view !== 'tasks') return;
  let h = '';
  G.forEach(g => {
    const cnt = g === 'All' ? T.length : T.filter(t => t.group === g).length;
    const sel = activeGroup === g;
    h += `<button class="group-tab" role="tab" aria-selected="${sel}" data-g="${escAttr(g)}">${esc(g)} <span class="tab-count">${cnt}</span></button>`;
  });
  h += `<button class="group-tab-add" title="Add group" aria-label="Add group">+</button>`;
  el.innerHTML = h;
  el.querySelectorAll('.group-tab').forEach(b => b.onclick = function(){
    activeGroup = this.dataset.g;
    saveScr(); render(); restoreScr();
  });
  el.querySelector('.group-tab-add').onclick = async function(){
    // PATCH 14: customInput replaces prompt()
    const name = await customInput('New group name', '');
    if(name && !G.includes(name)){G.push(name); save(); render(); toast('Added group: ' + name, false)}
  };
}

/* ════════════════ FILTERING (patch 04: escJs) ════════════════ */
function addFilter(type, value){
  if(!filters[type]) filters[type] = [];
  if(!filters[type].includes(value)){filters[type].push(value); saveScr(); render(); restoreScr()}
}
function removeFilter(type, value){
  if(!filters[type]) return;
  filters[type] = filters[type].filter(v => v !== value);
  saveScr(); render(); restoreScr();
}
function clearFilters(){
  filters = {status:[], tags:[], assignees:[], groups:[]};
  saveScr(); render(); restoreScr();
}
function hasFilters(){return Object.values(filters).some(a => a.length > 0)}

function renderFilterTray(){
  const el = $('filterTray');
  let h = '';
  filters.status.forEach(s => h += `<span class="filter-pill filter-pill-status">${STATUS_LABELS[s] || s} <span class="pill-x" onclick="removeFilter('status','${escJs(s)}')">×</span></span>`);
  filters.tags.forEach(t => h += `<span class="filter-pill filter-pill-tag">${esc(t)} <span class="pill-x" onclick="removeFilter('tags','${escJs(t)}')">×</span></span>`);
  filters.assignees.forEach(a => h += `<span class="filter-pill filter-pill-assignee">${esc(a)} <span class="pill-x" onclick="removeFilter('assignees','${escJs(a)}')">×</span></span>`);
  if(h) h += `<button class="filter-pill-clear" onclick="clearFilters()">Clear all</button>`;
  el.innerHTML = h;
}

function applyFilters(tasks){
  let r = tasks;
  if(filters.status.length) r = r.filter(t => filters.status.includes(t.status));
  if(filters.tags.length) r = r.filter(t => filters.tags.some(ft => (t.tags || []).includes(ft)));
  if(filters.assignees.length) r = r.filter(t => filters.assignees.some(a => (t.assignee || '').toLowerCase().includes(a.toLowerCase())));
  if(search){
    const q = search.toLowerCase();
    r = r.filter(t => [t.title, t.taskId, t.desc, t.assignee, t.blockedBy, t.location, t.contacts, ...(t.tags || []), ...(t.comments || []).map(c => c.text)].join(' ').toLowerCase().includes(q));
  }
  return r;
}

function sortTasks(tasks){
  const s = sortBy;
  return [...tasks].sort((a, b) => {
    if(s === 'priority') return (PRI_ORDER[a.priority] || 2) - (PRI_ORDER[b.priority] || 2);
    if(s === 'due'){const da = a.deadline || '9', db = b.deadline || '9'; return da.localeCompare(db)}
    if(s === 'status') return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
    if(s === 'title') return (a.title || '').localeCompare(b.title || '');
    if(s === 'modified') return (b.modified || '').localeCompare(a.modified || '');
    return 0;
  });
}

$('searchInput').oninput = function(){search = this.value; saveScr(); render(); restoreScr()};

function highlight(text, q){
  if(!q || !text) return esc(text);
  const safe = esc(text);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return safe.replace(re, '<mark>$1</mark>');
}

/* ════════════════ SORT + GROUP-BY PICKERS ════════════════ */
$('btnSort').onclick = function(){
  const opts = [
    {v:'priority', l:'Priority'},
    {v:'due', l:'Due Date'},
    {v:'status', l:'Status'},
    {v:'title', l:'Title A-Z'},
    {v:'modified', l:'Recently Modified'}
  ];
  let h = '';
  opts.forEach(o => h += `<button class="sheet-action${sortBy === o.v ? ' active' : ''}" data-v="${o.v}">${o.l}</button>`);
  $('sortActions').innerHTML = h;
  $('sortPickerBg').classList.add('open');
  $('sortActions').onclick = function(e){
    const v = e.target.dataset.v;
    if(v){sortBy = v; PREFS.sortBy = v; save(); $('sortPickerBg').classList.remove('open'); saveScr(); render(); restoreScr()}
  };
};
$('sortPickerBg').onclick = function(e){if(e.target === this) this.classList.remove('open')};

$('btnGroupBy').onclick = function(){
  const opts = [
    {v:'none', l:'No Grouping'},
    {v:'group', l:'Primary Group'},
    {v:'assignee', l:'Assignee'},
    {v:'status', l:'Status'},
    {v:'blocker', l:'Blocked/Unblocked'},
    {v:'due', l:'Due Bucket'}
  ];
  let h = '';
  opts.forEach(o => h += `<button class="sheet-action${groupByField === o.v ? ' active' : ''}" data-v="${o.v}">${o.l}</button>`);
  $('groupByActions').innerHTML = h;
  $('groupByBg').classList.add('open');
  $('groupByActions').onclick = function(e){
    const v = e.target.dataset.v;
    if(v){groupByField = v; PREFS.groupByField = v; save(); $('groupByBg').classList.remove('open'); saveScr(); render(); restoreScr()}
  };
};
$('groupByBg').onclick = function(e){if(e.target === this) this.classList.remove('open')};

// PATCH 13: dedicated move-group sheet backdrop close
$('moveGroupBg').onclick = function(e){if(e.target === this) this.classList.remove('open')};

/* ════════════════ MAIN RENDER ════════════════ */
function render(){
  updateHeader();
  // HW-SCHED AC #24: batch mode is task-specific — exit when leaving Tasks
  if(view === 'schedule' && batchMode){ exitBatch(); return; }
  renderGroupTabs();
  // HW-SCHED AC #23: task filter pills are meaningless on Schedule tab
  if(view === 'schedule'){
    $('filterTray').style.display = 'none';
  } else {
    $('filterTray').style.display = '';
    renderFilterTray();
  }
  const qa = $('quickAdd'), qb = $('queryBar');
  // HW-SCHED AC #25: Quick Add creates tasks — keep hidden on Schedule (already was)
  qa.style.display = (view === 'tasks' || view === 'focus') ? 'flex' : 'none';
  // Query bar (search input): shown on Tasks, Focus, AND Schedule
  qb.style.display = (view === 'tasks' || view === 'focus' || view === 'schedule') ? 'flex' : 'none';
  // HW-SCHED AC #26: Sort/GroupBy don't apply to Schedule's fixed ordering (bidirectional — runs every render)
  $('btnSort').style.display = (view === 'schedule') ? 'none' : '';
  $('btnGroupBy').style.display = (view === 'schedule') ? 'none' : '';
  // HW-SCHED AC #24: hide batch bar on Schedule even if somehow still set
  $('batchBar').style.display = (view === 'schedule') ? 'none' : '';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $('view' + view.charAt(0).toUpperCase() + view.slice(1)).classList.add('active');
  if(view === 'focus') renderFocus();
  else if(view === 'tasks') renderTasks();
  else if(view === 'people') renderPeople();
  else if(view === 'history') renderHistory();
  else if(view === 'settings') renderSettings();
  else if(view === 'schedule') renderSchedule();
  if(!PREFS.onboardSeen && (view === 'focus' || view === 'tasks')){$('onboard').style.display = 'flex'}
  // HW-SCHED AC #20: schedule-specific first-run guidance
  if(view === 'schedule' && !PREFS.schedOnboardSeen){$('schedOnboard').style.display = 'flex'}
  else { $('schedOnboard').style.display = 'none'; }
  $('batchBar').classList.toggle('show', batchMode);
  $('batchCount').textContent = batchSelected.size + ' selected';
  setSyncStatus(syncStatus);
}

/* ════════════════ TASK CARD (patches 02, 04, 09, 15) ════════════════ */
function taskCard(t){
  const pCls = 'p-' + t.priority;
  const sCls = t.status === 'done' ? 's-done' : t.status === 'blocked' ? 's-blocked' : t.status === 'delegated' ? 's-delegated' : '';
  const selCls = batchSelected.has(t.id) ? 'selected' : '';
  const stCls = 'tc-status-' + t.status;
  const q = search.toLowerCase();

  // Build meta chips with data attributes (PATCH 09 — no closure-toString)
  let chips = [];
  if(t.deadline){
    const d = daysDiff(t.deadline);
    chips.push({cls: d < 0 ? 'mc-overdue' : 'mc-date', text: relDate(t.deadline)});
  }
  if(t.blockedBy){
    // PATCH 15: distinct class for unlinked dependency refs
    const refs = t.blockedBy.replace(/[()]/g, '').split(/[,&]/).map(s => s.trim()).filter(Boolean);
    const links = refs.map(ref => {
      const m = T.find(x => (x.taskId || '').toLowerCase() === ref.toLowerCase());
      return m
        ? `<span class="mc mc-dep" onclick="event.stopPropagation();jumpTo('${m.id}')" title="${escAttr(m.title)}">⚑ ${esc(ref)}</span>`
        : `<span class="mc mc-dep mc-dep-unlinked" title="No matching task ID — free-text dependency">⚑ ${esc(ref)}</span>`;
    }).join('');
    chips.push({html: links});
  }
  if(t.assignee){
    (t.assignee || '').split(',').map(a => a.trim()).filter(Boolean).forEach(a => {
      chips.push({cls: 'mc-assignee', text: '→ ' + a, clickType: 'assignees', clickArg: a});
    });
  }
  (t.tags || []).slice(0, 2).forEach(tag => {
    chips.push({cls: 'mc-tag', text: tag, clickType: 'tags', clickArg: tag});
  });
  // PATCH 09 side fix: extraCount can't go negative
  const extraCount = Math.max(0, (t.tags || []).length - 2) + (t.persona ? 1 : 0) + (t.location ? 1 : 0);

  let metaHtml = chips.map(c => {
    if(c.html) return c.html;
    const txt = q ? highlight(c.text, q) : esc(c.text);
    const click = c.clickType
      ? ` onclick="event.stopPropagation();addFilter('${c.clickType}','${escJs(c.clickArg)}')"`
      : ' onclick="event.stopPropagation()"';
    return `<span class="mc ${c.cls}"${click}>${txt}</span>`;
  }).join('');
  if(extraCount > 0) metaHtml += `<span class="mc mc-more">+${extraCount}</span>`;

  const title = q ? highlight(t.title, q) : esc(t.title);
  const notePreview = t.desc ? (esc(t.desc).substring(0, 60) + (t.desc.length > 60 ? '…' : '')) : '';
  const stDone = t.subtasks?.length ? t.subtasks.filter(s => s.done).length : 0;
  const stTotal = t.subtasks?.length || 0;

  return `<div class="task-card ${pCls} ${sCls} ${selCls}" data-id="${t.id}"
    onclick="onCardTap('${t.id}')"
    oncontextmenu="event.preventDefault();showCtx(event,'${t.id}')"
    ontouchstart="touchStart(event,'${t.id}')" ontouchend="touchEnd(event,'${t.id}')" ontouchmove="touchMove(event)">
    <div class="tc-inner">
      <div class="tc-row1">
        <button type="button" class="tc-check" onclick="event.stopPropagation();toggleDone('${t.id}')" aria-label="Mark ${t.status === 'done' ? 'not done' : 'done'}">${t.status === 'done' ? '✓' : ''}</button>
        <div class="tc-main">
          <div class="tc-id">${esc(t.taskId || '')}</div>
          <div class="tc-title">${title}</div>
        </div>
        <span class="tc-status ${stCls}" onclick="event.stopPropagation();openStatusPicker('${t.id}')">${STATUS_LABELS[t.status] || t.status}</span>
      </div>
      ${metaHtml ? `<div class="tc-meta">${metaHtml}</div>` : ''}
      ${notePreview ? `<div class="tc-note">${notePreview}</div>` : ''}
      ${stTotal ? `<div class="tc-subtasks"><span>${stDone}/${stTotal}</span><div class="bar"><div class="bar-fill" style="width:${Math.round(stDone/stTotal*100)}%"></div></div></div>` : ''}
    </div>
  </div>`;
}

/* ════════════════ TAP / DONE / STATUS PICKER ════════════════ */
function onCardTap(id){
  lastUserActionAt = Date.now();
  if(batchMode){
    batchSelected.has(id) ? batchSelected.delete(id) : batchSelected.add(id);
    saveScr(); render(); restoreScr();
    return;
  }
  openTaskEditor(id);
}

function toggleDone(id){
  lastUserActionAt = Date.now();
  const t = T.find(x => x.id === id);
  if(!t) return;
  const old = t.status;
  t.status = t.status === 'done' ? 'not-started' : 'done';
  logHistory(t, 'Status → ' + STATUS_LABELS[t.status]);
  save(); saveScr(); render(); restoreScr();
  pushUndo(t.taskId + ' → ' + STATUS_LABELS[t.status], () => {t.status = old; logHistory(t, 'Undo status')});
  // §10.2 dependency enforcement
  if(t.status === 'done'){
    const unblocked = T.filter(x => x.blockedBy && x.blockedBy.toLowerCase().includes((t.taskId || '').toLowerCase()) && x.status !== 'done');
    if(unblocked.length) toast(unblocked.length + ' task(s) may now be unblocked!', false);
  }
}

function openStatusPicker(id){
  lastUserActionAt = Date.now();
  statusPickerTaskId = id;
  const t = T.find(x => x.id === id);
  if(!t) return;
  let h = '';
  STATUSES.forEach(s => {
    h += `<button class="sheet-action${t.status === s ? ' active' : ''}" data-s="${s}">${STATUS_LABELS[s]}</button>`;
  });
  $('statusPickerActions').innerHTML = h;
  $('statusPickerBg').classList.add('open');
  $('statusPickerActions').onclick = function(e){
    const s = e.target.dataset.s;
    if(!s) return;
    const old = t.status;
    t.status = s;
    logHistory(t, 'Status → ' + STATUS_LABELS[s]);
    save();
    $('statusPickerBg').classList.remove('open');
    saveScr(); render(); restoreScr();
    pushUndo(t.taskId + ' → ' + STATUS_LABELS[s], () => {t.status = old; logHistory(t, 'Undo status')});
  };
}
$('statusPickerBg').onclick = function(e){if(e.target === this) this.classList.remove('open')};

/* ════════════════ TOUCH GESTURES (patch 10) ════════════════ */
function touchStart(e, id){
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
  longPressTimer = setTimeout(() => {showCtx(e, id)}, 500);
}
function touchMove(e){
  clearTimeout(longPressTimer);
  const dx = e.touches[0].clientX - swipeStartX;
  const dy = Math.abs((e.touches[0].clientY || 0) - (swipeStartY || 0));
  const card = e.target.closest('.task-card');
  if(card && Math.abs(dx) > 10 && Math.abs(dx) > dy){
    if(e.cancelable) e.preventDefault();
    card.style.transform = `translateX(${dx * 0.4}px)`;
    card.style.transition = 'none';
  }
}
function touchEnd(e, id){
  clearTimeout(longPressTimer);
  const card = e.target.closest('.task-card');
  if(card){
    const dx = parseFloat(card.style.transform?.replace(/[^-\d.]/g, '')) || 0;
    card.style.transition = 'transform 0.2s';
    card.style.transform = '';
    if(dx > 60) toggleDone(id);
  }
}

/* ════════════════ CONTEXT MENU (patches 12, 13) ════════════════ */
function showCtx(e, id){
  e.preventDefault?.();
  ctxTaskId = id;
  const t = T.find(x => x.id === id);
  if(!t) return;
  const el = $('ctxMenu');
  el.innerHTML = `
    <button class="ctx-item" onclick="ctxAction('edit')">Edit</button>
    <button class="ctx-item" onclick="ctxAction('duplicate')">Duplicate</button>
    <button class="ctx-item" onclick="ctxAction('moveGroup')">Move Group</button>
    <div class="ctx-divider"></div>
    <button class="ctx-item" onclick="ctxAction('batch')">Select Multiple</button>
    <div class="ctx-divider"></div>
    <button class="ctx-item danger" onclick="ctxAction('delete')">Delete</button>`;
  const x = e.touches ? (e.touches[0]?.clientX || e.clientX) : e.clientX;
  const y = e.touches ? (e.touches[0]?.clientY || e.clientY) : e.clientY;
  el.style.left = Math.min(x, window.innerWidth - 220) + 'px';
  el.style.top = Math.min(y, window.innerHeight - 200) + 'px';
  el.classList.add('open');
  setTimeout(() => document.addEventListener('click', closeCtx, {once: true}), 10);
}
function closeCtx(){$('ctxMenu').classList.remove('open')}

async function ctxAction(action){
  closeCtx();
  const t = T.find(x => x.id === ctxTaskId);
  if(!t) return;
  if(action === 'edit') openTaskEditor(t.id);
  if(action === 'duplicate'){
    // PATCH 12: unique copy suffix prevents taskId collisions
    const baseId = t.taskId || 'task';
    let suffix = 1, newTaskId = baseId + '_copy';
    while(T.some(x => (x.taskId || '').toLowerCase() === newTaskId.toLowerCase())){
      suffix++;
      newTaskId = baseId + '_copy' + suffix;
    }
    const dup = {
      ...JSON.parse(JSON.stringify(t)),
      id: 't' + Date.now(),
      taskId: newTaskId,
      created: now(),
      modified: now(),
      history: [{action: 'Duplicated from ' + baseId, time: now(), by: identity.name}]
    };
    T.push(dup);
    save(); saveScr(); render(); restoreScr();
    toast('Duplicated ' + baseId + ' → ' + newTaskId, false);
  }
  if(action === 'delete'){
    const ok = await customConfirm('Delete Task', 'Delete "' + t.title + '"?');
    if(ok){
      const idx = T.indexOf(t);
      T.splice(idx, 1);
      save(); saveScr(); render(); restoreScr();
      pushUndo('Deleted ' + t.taskId, () => {T.splice(idx, 0, t)});
    }
  }
  if(action === 'moveGroup'){
    // PATCH 13: dedicated moveGroupBg + escAttr for quote safety
    let h = '';
    G.filter(g => g !== 'All').forEach(g => {
      h += `<button class="sheet-action${t.group === g ? ' active' : ''}" data-g="${escAttr(g)}">${esc(g)}</button>`;
    });
    $('moveGroupActions').innerHTML = h;
    $('moveGroupBg').classList.add('open');
    $('moveGroupActions').onclick = function(ev){
      const g = ev.target.dataset.g;
      if(g){
        t.group = g;
        logHistory(t, 'Moved to ' + g);
        save();
        $('moveGroupBg').classList.remove('open');
        saveScr(); render(); restoreScr();
      }
    };
  }
  if(action === 'batch'){
    batchMode = true;
    batchSelected.clear();
    batchSelected.add(t.id);
    render();
  }
}

/* ════════════════ BATCH ACTIONS ════════════════ */
async function batchAction(action){
  const ids = [...batchSelected];
  const tasks = ids.map(id => T.find(t => t.id === id)).filter(Boolean);
  if(action === 'done'){
    tasks.forEach(t => {t.status = 'done'; logHistory(t, 'Batch marked done')});
  }
  if(action === 'delete'){
    const ok = await customConfirm('Delete', 'Delete ' + ids.length + ' tasks?');
    if(!ok) return;
    tasks.forEach(t => {const idx = T.indexOf(t); if(idx >= 0) T.splice(idx, 1)});
  }
  save();
  exitBatch();
  render();
  toast(action + ' applied to ' + ids.length + ' tasks', false);
}
function exitBatch(){batchMode = false; batchSelected.clear(); render()}

/* ════════════════ DEPENDENCY NAV §10.1 ════════════════ */
function jumpTo(id){
  if(view !== 'tasks'){
    view = 'tasks';
    activeGroup = 'All';
    document.querySelectorAll('.main-nav [role="tab"]').forEach(b => b.setAttribute('aria-selected', 'false'));
    document.querySelector('.main-nav [data-v="tasks"]').setAttribute('aria-selected', 'true');
    render();
  }
  setTimeout(() => {
    const el = document.querySelector(`.task-card[data-id="${id}"]`);
    if(el){
      el.scrollIntoView({behavior: 'smooth', block: 'center'});
      el.classList.add('dep-flash');
      setTimeout(() => el.classList.remove('dep-flash'), 1500);
    }
  }, 100);
}

/* ════════════════ QUICK ADD §7.6 ════════════════ */
$('qaBtn').onclick = quickAdd;
$('qaInput').onkeydown = function(e){if(e.key === 'Enter') quickAdd()};
function quickAdd(){
  const title = $('qaInput').value.trim();
  if(!title) return;
  const group = (view === 'tasks' && activeGroup !== 'All') ? activeGroup : 'All';
  const t = {
    id: 't' + Date.now(),
    taskId: '',
    workstream: 'b',
    title,
    desc: '',
    priority: 'medium',
    status: 'not-started',
    quadrant: 'q2',
    deadline: '',
    persona: '',
    assignee: '',
    location: '',
    contacts: '',
    tags: [],
    blockedBy: '',
    group,
    subtasks: [],
    comments: [],
    history: [{action: 'Created', time: now(), by: identity.name}],
    recurring: '',
    reminder: '',
    modified: now(),
    created: now()
  };
  T.push(t);
  save();
  $('qaInput').value = '';
  saveScr(); render(); restoreScr();
  toast('Added: ' + title, false);
}

/* ════════════════ RENDER: FOCUS §11 ════════════════ */
function renderFocus(){
  const el = $('viewFocus');
  const todayStr = new Date().toISOString().split('T')[0];
  const wk = new Date(); wk.setDate(wk.getDate() + 7);
  const wkStr = wk.toISOString().split('T')[0];

  let active = applyFilters(T.filter(t => t.status !== 'done'));
  const overdue = sortTasks(active.filter(t => t.deadline && t.deadline < todayStr));
  const today = sortTasks(active.filter(t => t.deadline === todayStr));
  const week = sortTasks(active.filter(t => t.deadline && t.deadline > todayStr && t.deadline <= wkStr));
  const crit = sortTasks(active.filter(t => t.priority === 'critical' && (!t.deadline || t.deadline > wkStr)));
  const needsDL = sortTasks(active.filter(t => !t.deadline && t.quadrant === 'q1' && t.priority !== 'critical'));
  const delegated = sortTasks(active.filter(t => t.status === 'delegated'));
  const blocked = sortTasks(active.filter(t => t.status === 'blocked'));

  let h = '';
  // §11.3 progress summaries
  h += '<div style="margin-bottom:12px">';
  G.filter(g => g !== 'All').forEach(g => {
    const gTasks = T.filter(t => t.group === g);
    const gDone = gTasks.filter(t => t.status === 'done').length;
    const pct = gTasks.length ? Math.round(gDone / gTasks.length * 100) : 0;
    h += `<div class="progress-mini"><span class="p-label">${esc(g)}</span><div class="p-bar"><div class="p-fill" style="width:${pct}%"></div></div><span class="p-pct">${pct}%</span></div>`;
  });
  h += '</div>';

  if(overdue.length){
    h += `<div class="section-hdr" style="color:var(--s-overdue)">Overdue <span class="cnt">${overdue.length}</span></div>`;
    overdue.forEach(t => h += taskCard(t));
  }
  if(today.length) h += sec('Today', today);
  if(week.length) h += sec('This Week', week);
  if(crit.length) h += sec('Critical', crit);
  if(needsDL.length) h += sec('Needs a Deadline', needsDL);
  if(delegated.length) h += sec('Delegated / Waiting', delegated);
  if(blocked.length) h += sec('Blocked', blocked);

  if(!h.includes('task-card')) h += '<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-msg">Nothing urgent right now.</div></div>';
  el.innerHTML = h;
}
function sec(label, items){
  let h = `<div class="section-hdr">${label} <span class="cnt">${items.length}</span></div>`;
  items.forEach(t => h += taskCard(t));
  return h;
}

/* ════════════════ RENDER: TASKS §5.2 ════════════════ */
function renderTasks(){
  const el = $('viewTasks');
  let tasks = T;
  if(activeGroup !== 'All') tasks = tasks.filter(t => t.group === activeGroup);
  tasks = applyFilters(tasks);
  tasks = sortTasks(tasks);

  let h = '';
  if(groupByField !== 'none'){
    const groups = groupTasksBy(tasks, groupByField);
    for(const [label, items] of groups){
      h += `<div class="section-hdr">${esc(label)} <span class="cnt">${items.length}</span></div>`;
      items.forEach(t => h += taskCard(t));
    }
  } else {
    tasks.forEach(t => h += taskCard(t));
  }

  if(!tasks.length){
    h = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-msg">No tasks match your filters.</div>';
    if(hasFilters()) h += '<button class="btn btn-sm" onclick="clearFilters()" style="margin-top:8px">Clear filters</button>';
    h += '</div>';
  }
  el.innerHTML = h;
}

function groupTasksBy(tasks, field){
  const map = new Map();
  tasks.forEach(t => {
    let key;
    if(field === 'group') key = t.group || 'Ungrouped';
    else if(field === 'assignee') key = t.assignee || 'Unassigned';
    else if(field === 'status') key = STATUS_LABELS[t.status] || t.status;
    else if(field === 'blocker') key = t.blockedBy ? 'Blocked' : 'Unblocked';
    else if(field === 'due'){
      if(!t.deadline) key = 'No Due Date';
      else if(daysDiff(t.deadline) < 0) key = 'Overdue';
      else if(daysDiff(t.deadline) === 0) key = 'Today';
      else if(daysDiff(t.deadline) <= 7) key = 'This Week';
      else key = 'Later';
    }
    else key = 'All';
    if(!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  });
  return map;
}

/* ════════════════ RENDER: PEOPLE §12 (patch 04: escJs) ════════════════ */
function renderPeople(){
  const el = $('viewPeople');
  const roleLabels = {bridal: 'Bridal Party', groom: 'Groom Party', organizer: 'Organizers', service: 'Vendors', family: 'Family', guest: 'Guests'};
  const groups = {};
  C.forEach(c => {if(!groups[c.role]) groups[c.role] = []; groups[c.role].push(c)});

  let h = `<div style="margin-bottom:12px"><input type="search" class="query-search" placeholder="Search people..." style="width:100%" oninput="filterPeople(this.value)"></div>`;
  h += '<div id="peopleList">';
  for(const [role, people] of Object.entries(groups)){
    h += `<div class="section-hdr">${roleLabels[role] || role} <span class="cnt">${people.length}</span></div>`;
    people.forEach(c => {
      const initials = (c.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const taskCount = T.filter(t => (t.assignee || '').toLowerCase().includes(c.name.toLowerCase()) || (t.contacts || '').toLowerCase().includes(c.name.toLowerCase())).length;
      h += `<div class="person-card" onclick="openPersonEditor('${c.id}')">
        <div class="person-avatar">${initials}</div>
        <div class="person-info">
          <div class="person-name">${esc(c.name)}</div>
          <div class="person-role">${esc(c.specificRole || c.role)}</div>
          ${c.phone ? `<div class="person-contact"><a href="tel:${escAttr(c.phone)}" onclick="event.stopPropagation()">☎ ${esc(c.phone)}</a></div>` : ''}
          ${c.email ? `<div class="person-contact"><a href="mailto:${escAttr(c.email)}" onclick="event.stopPropagation()">✉ ${esc(c.email)}</a></div>` : ''}
          ${taskCount ? `<div class="person-tasks"><span onclick="event.stopPropagation();addFilter('assignees','${escJs(c.name)}');view='tasks';render()" style="cursor:pointer;color:var(--gold-dark)">${taskCount} linked tasks →</span></div>` : ''}
        </div>
      </div>`;
    });
  }
  h += '</div>';
  h += `<div style="text-align:center;margin-top:16px"><button class="btn btn-primary btn-sm" onclick="openPersonEditor()">+ Add Person</button></div>`;
  el.innerHTML = h;
}
function filterPeople(q){
  document.querySelectorAll('.person-card').forEach(c => {
    const name = c.querySelector('.person-name')?.textContent || '';
    c.style.display = name.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

/* ════════════════ RENDER: HISTORY (NEW in v6.0) ════════════════ */
async function renderHistory(){
  const el = $('viewHistory');
  el.innerHTML = '<div class="history-list"><div style="color:var(--text-muted);text-align:center;padding:32px">Loading audit log…</div></div>';
  try{
    const r = await fetch(ENDPOINTS.audit, {headers: {'Authorization': 'Bearer ' + token}});
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    el.innerHTML = renderHistoryEntries(data.entries || []);
  } catch(e){
    el.innerHTML = '<div class="history-list"><div style="color:var(--s-blocked);text-align:center;padding:32px">Failed to load: ' + esc(e.message) + '</div></div>';
  }
}
function renderHistoryEntries(entries){
  if(!entries.length) return '<div class="history-list"><div style="color:var(--text-muted);text-align:center;padding:32px">No history yet.</div></div>';
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  const groups = {};
  entries.forEach(e => {
    const d = new Date(e.ts);
    let label;
    if(d.toDateString() === today) label = 'Today';
    else if(d.toDateString() === yesterday) label = 'Yesterday';
    else label = d.toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'});
    (groups[label] = groups[label] || []).push(e);
  });
  let h = '<div class="history-list">';
  for(const [label, items] of Object.entries(groups)){
    h += `<div class="history-day-hdr">${esc(label)}</div>`;
    for(const e of items){
      const time = new Date(e.ts).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
      const summary = esc(e.summary || '');
      const target = e.target ? ` <span class="target">${esc(e.target)}</span>` : '';
      h += `<div class="history-entry">
        <div class="history-time">${time}</div>
        <div class="history-text"><span class="who">${esc(e.by || 'unknown')}</span>${target}<br>${summary}</div>
      </div>`;
    }
  }
  h += '</div>';
  return h;
}

/* ════════════════ RENDER: SETTINGS (no Reset to Defaults — patch 08 superseded) ════════════════ */
async function renderSettings(){
  const el = $('viewSettings');
  const pct = T.length ? Math.round(T.filter(t => t.status === 'done').length / T.length * 100) : 0;
  const done = T.filter(t => t.status === 'done').length;

  let h = `
  <div class="settings-section">
    <h3>Progress</h3>
    <div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">${pct}% complete · ${done} of ${T.length}</div>
    <div class="progress-mini"><div class="p-bar" style="height:6px"><div class="p-fill" style="width:${pct}%"></div></div></div>
  </div>

  <div class="settings-section">
    <h3>Task Groups</h3>
    ${G.filter(g => g !== 'All').map((g, i) => {
      const cnt = T.filter(t => t.group === g).length;
      return `<div class="settings-item"><span class="s-name">${esc(g)}</span><span class="s-count">${cnt} tasks</span>
        <span class="s-actions">
          <button onclick="renameGroup(${i + 1})" title="Rename">✎</button>
          <button class="danger" onclick="deleteGroup(${i + 1})" title="Delete">✕</button>
        </span></div>`;
    }).join('')}
    <button class="btn btn-sm" onclick="addGroup()" style="margin-top:8px">+ Add Group</button>
  </div>

  <div class="settings-section">
    <h3>Tags</h3>
    ${TAGS.map(t => {
      const cnt = T.filter(tk => (tk.tags || []).includes(t)).length;
      return `<div class="settings-item"><span class="s-name">${esc(t)}</span><span class="s-count">${cnt}</span>
        <span class="s-actions">
          <button onclick="renameTag('${escJs(t)}')" title="Rename">✎</button>
          <button class="danger" onclick="deleteTag('${escJs(t)}')" title="Delete">✕</button>
        </span></div>`;
    }).join('')}
    <button class="btn btn-sm" onclick="addTag()" style="margin-top:8px">+ Add Tag</button>
  </div>

  <div class="settings-section">
    <h3>Data</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="exportData()">Export JSON</button>
      ${identity.isMaster ? `<button class="btn btn-sm" onclick="document.getElementById('impFile').click()">Import JSON (master)</button>
      <input type="file" id="impFile" accept=".json" style="display:none" onchange="importData(event)">` : ''}
    </div>
  </div>`;

  if(identity.isMaster){
    h += '<div id="masterPanels"></div>';
  }

  el.innerHTML = h;

  if(identity.isMaster){
    await renderMasterPanels();
  }
}

/* ════════════════ MASTER PANELS (NEW in v6.0) ════════════════ */
async function renderMasterPanels(){
  const el = $('masterPanels');
  if(!el) return;
  el.innerHTML = '<div style="color:var(--text-muted);padding:16px">Loading master panels…</div>';
  let coordsHtml = '<div class="master-panel"><h3>Coordinators</h3><div style="color:var(--s-blocked)">Failed to load.</div></div>';
  let snapsHtml = '<div class="master-panel"><h3>Snapshots</h3><div style="color:var(--s-blocked)">Failed to load.</div></div>';

  try{
    const r = await fetch(ENDPOINTS.coordinators, {headers: {'Authorization': 'Bearer ' + token}});
    if(r.ok){
      const data = await r.json();
      coordsHtml = `<div class="master-panel"><h3>Coordinators</h3>
        ${data.coordinators.map(c => `
          <div class="coord-row">
            <span class="coord-name">${esc(c.name)}</span>
            <span class="coord-token">${esc(c.token)}</span>
            ${c.isMaster ? '<span class="coord-master-tag">MASTER</span>' : '<span></span>'}
            <span>
              <button onclick="editCoordinator('${escJs(c.token)}')">Rename</button>
              ${!c.isMaster ? `<button class="danger" onclick="removeCoordinator('${escJs(c.token)}')">Remove</button>` : ''}
            </span>
          </div>`).join('')}
        <div class="coord-add">
          <input type="text" id="newCoordName" placeholder="Name (e.g., Carol)" autocapitalize="words">
          <input type="text" id="newCoordToken" placeholder="Token (e.g., carol-cake)" autocapitalize="none">
          <button onclick="addCoordinator()">Add</button>
        </div>
      </div>`;
    }
  } catch(e){}

  try{
    const r = await fetch(ENDPOINTS.snapshots, {headers: {'Authorization': 'Bearer ' + token}});
    if(r.ok){
      const data = await r.json();
      snapsHtml = `<div class="master-panel"><h3>Snapshots</h3>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">${data.snapshots.length} snapshots stored</div>
        ${data.snapshots.slice(0, 30).map(s => {
          const d = new Date(s.ts);
          const when = d.toLocaleString('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
          return `<div class="snapshot-row">
            <span class="snap-meta">${esc(when)} · by <span class="who">${esc(s.by || 'unknown')}</span> (${s.taskCount} tasks)</span>
            <button onclick="restoreSnapshot('${escJs(s.id)}')">Restore</button>
          </div>`;
        }).join('')}
        ${data.snapshots.length > 30 ? '<div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:8px">Showing latest 30 of ' + data.snapshots.length + '</div>' : ''}
      </div>`;
    }
  } catch(e){}

  el.innerHTML = coordsHtml + snapsHtml;
}

async function addCoordinator(){
  const name = $('newCoordName').value.trim();
  const tok = $('newCoordToken').value.trim();
  if(!name || !tok){toast('Name and token required', false); return}
  try{
    const r = await fetch(ENDPOINTS.coordinators, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
      body: JSON.stringify({token: tok, name})
    });
    if(!r.ok){const e = await r.json(); throw new Error(e.error || 'failed')}
    toast('Added ' + name, false);
    renderMasterPanels();
  } catch(e){toast('Failed: ' + e.message, false)}
}
async function editCoordinator(tok){
  const newName = await customInput('Rename coordinator', '');
  if(!newName) return;
  try{
    const r = await fetch(ENDPOINTS.coordinators, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
      body: JSON.stringify({token: tok, name: newName})
    });
    if(!r.ok){const e = await r.json(); throw new Error(e.error || 'failed')}
    toast('Renamed', false);
    renderMasterPanels();
  } catch(e){toast('Failed: ' + e.message, false)}
}
async function removeCoordinator(tok){
  const ok = await customConfirm('Remove coordinator', 'They will lose access immediately. Confirm?');
  if(!ok) return;
  try{
    const r = await fetch(ENDPOINTS.coordinators, {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
      body: JSON.stringify({token: tok})
    });
    if(!r.ok){const e = await r.json(); throw new Error(e.error || 'failed')}
    toast('Removed', false);
    renderMasterPanels();
  } catch(e){toast('Failed: ' + e.message, false)}
}
async function restoreSnapshot(id){
  const ok = await customConfirm('Restore snapshot', 'This replaces ALL current data. Current state will be saved as a snapshot first. Confirm?');
  if(!ok) return;
  try{
    const r = await fetch(ENDPOINTS.snapshots, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
      body: JSON.stringify({id, action: 'restore'})
    });
    if(!r.ok){const e = await r.json(); throw new Error(e.error || 'failed')}
    toast('Snapshot restored', false);
    const live = await fetchState();
    if(live){
      applyServerState(live, true);
      // Audit fix B-8a: reset runtime UI state so stale filters/search don't reference removed data
      filters = {status:[], tags:[], assignees:[], groups:[]};
      search = ''; $('searchInput').value = '';
      activeGroup = 'All';
      render();
    }
  } catch(e){toast('Failed: ' + e.message, false)}
}

/* ════════════════ GROUP/TAG CRUD (patches 14, 16) ════════════════ */
async function addGroup(){const n = await customInput('Group name', ''); if(n && !G.includes(n)){G.push(n); save(); render(); toast('Added group: ' + n, false)}}
async function renameGroup(i){const n = await customInput('Rename group', G[i]); if(n && n !== G[i]){const old = G[i]; T.forEach(t => {if(t.group === old) t.group = n}); G[i] = n; save(); render(); toast('Renamed to: ' + n, false)}}
async function deleteGroup(i){
  const g = G[i];
  const cnt = T.filter(t => t.group === g).length;
  if(cnt > 0){const ok = await customConfirm('Delete Group', cnt + ' tasks will move to "All"'); if(!ok) return; T.forEach(t => {if(t.group === g) t.group = 'All'})}
  G.splice(i, 1);
  save(); render(); toast('Deleted group: ' + g, false);
}
async function addTag(){const n = await customInput('Tag name', ''); if(n && !TAGS.includes(n)){TAGS.push(n); TAGS.sort(); save(); render(); toast('Added tag: ' + n, false)}}
async function renameTag(old){
  const n = await customInput('Rename tag', old);
  if(n && n !== old){
    T.forEach(t => {if(!Array.isArray(t.tags)) t.tags = []; const i = t.tags.indexOf(old); if(i >= 0) t.tags[i] = n});
    TAGS = TAGS.map(t => t === old ? n : t);
    TAGS.sort();
    save(); render(); toast('Renamed tag → ' + n, false);
  }
}
async function deleteTag(tag){
  const ok = await customConfirm('Delete Tag', 'Remove "' + tag + '" from all tasks?');
  if(!ok) return;
  T.forEach(t => {if(!Array.isArray(t.tags)) t.tags = []; t.tags = t.tags.filter(x => x !== tag)});
  TAGS = TAGS.filter(x => x !== tag);
  save(); render(); toast('Deleted tag: ' + tag, false);
}

/* ════════════════ EXPORT/IMPORT ════════════════ */
function exportData(){
  const b = new Blob([JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    tasks: T,
    contacts: C,
    groups: G,
    tags: TAGS,
    savedViews: SV,
    prefs: PREFS,
    exported: now()
  }, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'hanstan_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
}
async function importData(ev){
  // Audit fix G-6a: This is a UI-only gate. The server POST (planner-state) does not check
  // isMaster because L8 allows all coordinators to write state. Import is hidden from non-master
  // UI for UX clarity, not as a security boundary.
  if(!identity.isMaster){toast('Master only', false); ev.target.value = ''; return}
  const ok = await customConfirm('Import Data', 'This replaces ALL current data on the server. Export first.');
  if(!ok){ev.target.value = ''; return}
  const f = ev.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = function(e){
    try{
      const d = JSON.parse(e.target.result);
      if(d.tasks){
        T = d.tasks;
        C = d.contacts || C;
        G = d.groups || G;
        TAGS = d.tags || TAGS;
        SV = d.savedViews || SV;
        T.forEach(t => {if(!Array.isArray(t.tags)) t.tags = []});
        // HW-SCHED AC #22: replace-or-clear — do NOT re-seed, do NOT retain old
        SE = d.scheduleEvents || [];
        SP = d.schedulePhases || [];
        SQ = d.scheduleQuestions || [];
        save(); render();
        toast('Imported ' + T.length + ' tasks', false);
      }
    } catch(err){toast('Import error: ' + err.message, false)}
  };
  r.readAsText(f);
  ev.target.value = '';
}

/* ════════════════ TASK EDITOR (patches 05, 11, 17) ════════════════ */
function openTaskEditor(id){
  tmDirty = false;
  const isNew = !id;
  const t = id ? T.find(x => x.id === id) : null;
  $('tmLabel').textContent = isNew ? 'New Task' : 'Edit Task';
  $('tmDel').style.display = isNew ? 'none' : '';
  $('f_id').value = id || '';
  $('f_title').value = t?.title || '';
  // populate group select
  const gSel = $('f_group');
  gSel.innerHTML = '';
  G.filter(g => g !== 'All').forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    gSel.appendChild(o);
  });
  // PATCH 11: defensive group fallback — pick first valid group, not first option of filtered list
  const candidate = t?.group;
  const validGroups = G.filter(g => g !== 'All');
  gSel.value = (candidate && validGroups.includes(candidate)) ? candidate : (validGroups[0] || '');
  $('f_status').value = t?.status || 'not-started';
  $('f_pri').value = t?.priority || 'medium';
  $('f_dl').value = t?.deadline || '';
  $('f_assign').value = t?.assignee || '';
  $('f_block').value = t?.blockedBy || '';
  $('f_desc').value = t?.desc || '';
  $('f_taskId').value = t?.taskId || '';
  $('f_quad').value = t?.quadrant || 'q2';
  $('f_persona').value = t?.persona || '';
  $('f_loc').value = t?.location || '';
  $('f_contacts').value = t?.contacts || '';
  $('f_recur').value = t?.recurring || '';
  $('f_remind').value = t?.reminder || '';

  editTags = t ? [...t.tags] : [];
  renderTagPills();
  editSubtasks = t ? JSON.parse(JSON.stringify(t.subtasks || [])) : [];
  renderSubtasks();
  editComments = t ? [...(t.comments || [])] : [];
  renderComments();

  // PATCH 17: history with date + time + author
  const hist = (t?.history || []).slice().reverse();
  $('historyLog').innerHTML = hist.length ? hist.map(h => {
    const d = new Date(h.time);
    const stamp = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ' ' + d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    const who = h.by ? ` <span style="opacity:0.7">by ${esc(h.by)}</span>` : '';
    return `<div style="padding:4px 0;border-bottom:1px solid var(--divider)">${esc(h.action)}${who} <span style="float:right;opacity:0.5;font-size:12px">${stamp}</span></div>`;
  }).join('') : '<div style="color:var(--text-muted)">No history yet.</div>';

  if(PREFS.advExpanded){$('advFields').classList.add('open'); $('advToggle').textContent = '▾ Fewer fields'}
  else{$('advFields').classList.remove('open'); $('advToggle').textContent = '▸ More fields'}

  $('taskModalBg').classList.add('open');
  $('f_title').focus();
  setTimeout(() => {tmDirty = false}, 100);
}

function closeTaskEditor(force){
  if(!force && tmDirty){
    customConfirm('Unsaved Changes', 'Discard changes?').then(ok => {if(ok){tmDirty = false; $('taskModalBg').classList.remove('open')}});
    return;
  }
  $('taskModalBg').classList.remove('open');
}
$('tmClose').onclick = () => closeTaskEditor();
$('taskModalBg').onclick = function(e){if(e.target === this) closeTaskEditor()};
$('taskForm').addEventListener('input', () => {tmDirty = true});
$('taskForm').addEventListener('change', () => {tmDirty = true});

$('advToggle').onclick = function(){
  const open = $('advFields').classList.toggle('open');
  this.textContent = open ? '▾ Fewer fields' : '▸ More fields';
  PREFS.advExpanded = open;
  save();
};
$('histToggle').onclick = function(){
  const open = $('histSection').classList.toggle('open');
  this.textContent = open ? '▾ Hide History' : '▸ Activity History';
};

// Save (PATCH 05: workstream from taskId)
$('tmSave').onclick = function(){
  const id = $('f_id').value;
  const isNew = !id;
  const tid = $('f_taskId').value;
  const data = {
    id: id || 't' + Date.now(),
    taskId: tid,
    workstream: workstreamFromTaskId(tid),
    title: $('f_title').value,
    desc: $('f_desc').value,
    priority: $('f_pri').value,
    status: $('f_status').value,
    quadrant: $('f_quad').value,
    deadline: $('f_dl').value,
    persona: $('f_persona').value,
    assignee: $('f_assign').value,
    location: $('f_loc').value,
    contacts: $('f_contacts').value,
    tags: editTags,
    blockedBy: $('f_block').value,
    group: $('f_group').value,
    subtasks: editSubtasks,
    comments: editComments,
    recurring: $('f_recur').value,
    reminder: $('f_remind').value,
    modified: now(),
    history: isNew ? [{action: 'Created', time: now(), by: identity.name}] : (T.find(x => x.id === id)?.history || []),
    created: isNew ? now() : (T.find(x => x.id === id)?.created || now())
  };
  if(!isNew) logHistory(data, 'Edited');
  if(id){const i = T.findIndex(t => t.id === id); if(i >= 0) T[i] = data}
  else T.push(data);
  // ensure new tags exist globally
  editTags.forEach(tag => {if(!TAGS.includes(tag)){TAGS.push(tag); TAGS.sort()}});
  save();
  tmDirty = false;
  $('taskModalBg').classList.remove('open');
  saveScr(); render(); restoreScr();
  toast(isNew ? 'Created' : 'Saved', false);
};

// Delete from modal
$('tmDel').onclick = async function(){
  const id = $('f_id').value;
  const t = T.find(x => x.id === id);
  if(!t) return;
  const ok = await customConfirm('Delete', 'Delete "' + t.title + '"?');
  if(!ok) return;
  const idx = T.indexOf(t);
  T.splice(idx, 1);
  save();
  tmDirty = false;
  $('taskModalBg').classList.remove('open');
  saveScr(); render(); restoreScr();
  pushUndo('Deleted ' + t.taskId, () => {T.splice(idx, 0, t)});
};

/* ════════════════ TAG PILLS / SUBTASKS / COMMENTS ════════════════ */
function renderTagPills(){
  const area = $('tagArea');
  area.querySelectorAll('.ff-tag-pill').forEach(p => p.remove());
  editTags.forEach((tag, i) => {
    const p = document.createElement('span');
    p.className = 'ff-tag-pill';
    p.innerHTML = `${esc(tag)} <span class="rx" data-i="${i}">×</span>`;
    area.insertBefore(p, $('tagInput'));
  });
}
$('tagInput').onkeydown = function(e){
  if(e.key === 'Enter'){
    e.preventDefault();
    const v = this.value.trim();
    if(v && !editTags.includes(v)){editTags.push(v); tmDirty = true; renderTagPills()}
    this.value = '';
  }
};
$('tagArea').onclick = function(e){
  if(e.target.classList.contains('rx')){editTags.splice(+e.target.dataset.i, 1); tmDirty = true; renderTagPills()}
  else $('tagInput').focus();
};

// PATCH 02: type="button" prevents form submit
function renderSubtasks(){
  const el = $('subtaskList');
  el.innerHTML = editSubtasks.map((s, i) => `
    <div class="subtask-item${s.done ? ' done' : ''}">
      <button type="button" class="subtask-check" onclick="toggleSubtask(${i})">${s.done ? '✓' : ''}</button>
      <span class="subtask-text">${esc(s.text)}</span>
      <button type="button" class="subtask-rm" onclick="rmSubtask(${i})">×</button>
    </div>`).join('');
}
function toggleSubtask(i){editSubtasks[i].done = !editSubtasks[i].done; tmDirty = true; renderSubtasks()}
function rmSubtask(i){editSubtasks.splice(i, 1); tmDirty = true; renderSubtasks()}
$('subtaskBtn').onclick = function(){
  const v = $('subtaskInput').value.trim();
  if(!v) return;
  editSubtasks.push({text: v, done: false});
  $('subtaskInput').value = '';
  tmDirty = true;
  renderSubtasks();
};
$('subtaskInput').onkeydown = function(e){if(e.key === 'Enter'){e.preventDefault(); $('subtaskBtn').click()}};

function renderComments(){
  const el = $('commentThread');
  el.innerHTML = editComments.map(c => `
    <div class="comment-item">${linkify(c.text)}<div class="c-time">${new Date(c.time).toLocaleString()}</div></div>`).join('') || '<div style="font-size:13px;color:var(--text-muted)">No comments yet.</div>';
}
$('commentBtn').onclick = function(){
  const v = $('commentInput').value.trim();
  if(!v) return;
  editComments.push({text: v, time: now()});
  $('commentInput').value = '';
  tmDirty = true;
  renderComments();
};
$('commentInput').onkeydown = function(e){if(e.key === 'Enter'){e.preventDefault(); $('commentBtn').click()}};

/* ════════════════ PERSON EDITOR (patch 16) ════════════════ */
function openPersonEditor(id){
  const isNew = !id;
  const c = id ? C.find(x => x.id === id) : null;
  $('pmLabel').textContent = isNew ? 'Add Person' : 'Edit Person';
  $('pmDel').style.display = isNew ? 'none' : '';
  $('cf_id').value = id || '';
  $('cf_name').value = c?.name || '';
  $('cf_role').value = c?.role || 'guest';
  $('cf_spec').value = c?.specificRole || '';
  $('cf_phone').value = c?.phone || '';
  $('cf_email').value = c?.email || '';
  $('cf_notes').value = c?.notes || '';
  $('personModalBg').classList.add('open');
  $('cf_name').focus();
}
$('pmClose').onclick = () => $('personModalBg').classList.remove('open');
$('personModalBg').onclick = function(e){if(e.target === this) this.classList.remove('open')};
$('pmSave').onclick = function(){
  const id = $('cf_id').value;
  // PATCH 16: validate name + announce
  const name = $('cf_name').value.trim();
  if(!name){toast('Name is required', false); $('cf_name').focus(); return}
  const isNew = !id;
  const d = {
    id: id || 'p' + Date.now(),
    name,
    role: $('cf_role').value,
    specificRole: $('cf_spec').value,
    phone: $('cf_phone').value,
    email: $('cf_email').value,
    notes: $('cf_notes').value
  };
  if(id){const i = C.findIndex(c => c.id === id); if(i >= 0) C[i] = d}
  else C.push(d);
  save();
  $('personModalBg').classList.remove('open');
  saveScr(); render(); restoreScr();
  toast(isNew ? 'Person added' : 'Person saved', false);
};
$('pmDel').onclick = async function(){
  const id = $('cf_id').value;
  const c = C.find(x => x.id === id);
  if(!c) return;
  const ok = await customConfirm('Remove Person', 'Remove "' + c.name + '"?');
  if(!ok) return;
  const idx = C.indexOf(c);
  C.splice(idx, 1);
  save();
  $('personModalBg').classList.remove('open');
  saveScr(); render(); restoreScr();
  pushUndo('Removed ' + c.name, () => {C.splice(idx, 0, c)});
};

/* ════════════════ SCROLL TO TOP ════════════════ */
window.addEventListener('scroll', () => {$('scrollTop').classList.toggle('show', window.scrollY > 400)});
$('scrollTop').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

/* ════════════════ ONBOARD ════════════════ */
$('onboardDismiss').onclick = function(){$('onboard').style.display = 'none'; PREFS.onboardSeen = true; save()};
$('schedOnboardDismiss').onclick = function(){$('schedOnboard').style.display = 'none'; PREFS.schedOnboardSeen = true; save()};

/* ══════════════════════════════════════════════════════════════════
   HW-SCHED: SCHEDULE MODULE
   Day-of timeline editor. All functions prefixed `sched*`.
   ══════════════════════════════════════════════════════════════════ */

const SCHED_STATUSES = ['confirmed', 'tentative', 'tbd'];
const SCHED_STATUS_LABELS = {confirmed: 'Confirmed', tentative: 'Tentative', tbd: 'TBD'};
const SCHED_ZONES = ['ceremony', 'shelter', 'reception', 'dance', 'parking', 'off-site'];
const SCHED_PIC_ROLES = ['pic', 'helper', 'present'];

/* ── Helpers ── */

// Find which phase contains an event (authority = phase.eventIds)
function schedFindPhaseOfEvent(eventId){
  return SP.find(p => (p.eventIds || []).includes(eventId)) || null;
}
// List orphaned events (in SE but no phase's eventIds contains them)
function schedOrphanedEvents(){
  const claimed = new Set(SP.flatMap(p => p.eventIds || []));
  return SE.filter(e => !claimed.has(e.id));
}
// Format HH:MM → "9:45 AM"
function schedFmtTime(hhmm){
  if(!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return hhmm || '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return h12 + ':' + String(m).padStart(2, '0') + ' ' + ap;
}
// Add minutes to HH:MM → HH:MM (no cross-day handling needed — wedding is 7am-9pm)
function schedAddMinutes(hhmm, mins){
  if(!/^\d{2}:\d{2}$/.test(hhmm)) return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + (mins || 0);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return String(Math.max(0, Math.min(23, nh))).padStart(2, '0') + ':' + String(Math.max(0, Math.min(59, nm))).padStart(2, '0');
}
function schedTimeToMin(hhmm){
  if(!/^\d{2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
// New ID generators (timestamp-based, collision-safe within session)
function schedNewEventId(){
  let n = 1000;
  const existing = new Set(SE.map(e => e.id));
  while(existing.has('se-' + n)) n++;
  return 'se-' + n;
}
function schedNewPhaseId(){
  let n = 100;
  const existing = new Set(SP.map(p => p.id));
  while(existing.has('sp-' + String(n).padStart(2, '0'))) n++;
  return 'sp-' + String(n).padStart(2, '0');
}
function schedNewQuestionId(){
  let n = 100;
  const existing = new Set(SQ.map(q => q.id));
  while(existing.has('sq-' + n)) n++;
  return 'sq-' + n;
}

/* ── Time Engine (spec §5.1) ── */

// Recalc start times for a phase. First event is the anchor.
// Parallel groups: all events in a group share the anchor's time; cascade skips to AFTER the group
// using the group's longest duration.
function schedRecalcTimes(phaseId){
  const phase = SP.find(p => p.id === phaseId);
  if(!phase || !phase.eventIds || phase.eventIds.length < 2) return;
  const events = phase.eventIds.map(id => SE.find(e => e.id === id)).filter(Boolean);
  if(events.length < 2) return;

  // Walk events in order. Track groups we've already processed.
  const handledGroups = new Set();
  let cursor = events[0].startTime; // anchor
  let prevDuration = events[0].duration || 0;

  for(let i = 1; i < events.length; i++){
    const ev = events[i];
    const prev = events[i - 1];

    // If prev is in a parallel group, cursor advances past the WHOLE group's longest duration
    if(prev.parallelGroup && !handledGroups.has(prev.parallelGroup)){
      const groupEvents = events.filter(e => e.parallelGroup === prev.parallelGroup);
      const groupAnchor = groupEvents[0].startTime;
      const maxDur = Math.max(...groupEvents.map(e => e.duration || 0));
      cursor = schedAddMinutes(groupAnchor, maxDur);
      handledGroups.add(prev.parallelGroup);
    } else if(!prev.parallelGroup){
      cursor = schedAddMinutes(prev.startTime, prev.duration || 0);
    }

    // If current event shares group with previous, it shares the anchor — don't cascade
    if(ev.parallelGroup && ev.parallelGroup === prev.parallelGroup){
      ev.startTime = prev.startTime;
    } else if(ev.parallelGroup){
      // First of new group — takes cursor time, group anchor is set
      ev.startTime = cursor;
    } else {
      ev.startTime = cursor;
    }
  }
}

// Boundary + conflict detection
function schedValidateBoundaries(ev){
  if(!ev.startTime || !/^\d{2}:\d{2}$/.test(ev.startTime)) return [];
  const warnings = [];
  const start = schedTimeToMin(ev.startTime);
  const end = start + (ev.duration || 0);
  if(start < schedTimeToMin('07:00')) warnings.push('Starts before 7 AM park open');
  if(end > schedTimeToMin('21:00')) warnings.push('Ends after 9 PM park close');
  return warnings;
}
function schedDetectPersonConflicts(ev){
  // Same person in overlapping events in DIFFERENT zones
  if(!ev.people || !ev.people.length) return [];
  const evStart = schedTimeToMin(ev.startTime);
  const evEnd = evStart + (ev.duration || 0);
  const conflicts = [];
  ev.people.forEach(p => {
    if(!p.name) return;
    SE.forEach(other => {
      if(other.id === ev.id) return;
      if(!other.people || !other.people.find(op => op.name && op.name.toLowerCase() === p.name.toLowerCase())) return;
      if(other.zone === ev.zone) return; // same zone = fine
      const oStart = schedTimeToMin(other.startTime);
      const oEnd = oStart + (other.duration || 0);
      if(oStart < evEnd && oEnd > evStart){
        conflicts.push(p.name + ' also in "' + (other.title || '') + '" (' + other.zone + ')');
      }
    });
  });
  return conflicts;
}

/* ── Renderer ── */

function renderSchedule(){
  const el = $('viewSchedule');
  let h = '';

  // Completeness dashboard (spec §6.1: sticky/above-fold)
  const total = SE.length;
  const confirmed = SE.filter(e => e.status === 'confirmed').length;
  const tentative = SE.filter(e => e.status === 'tentative').length;
  const tbd = SE.filter(e => e.status === 'tbd').length;
  const unassignedPIC = SE.filter(e => !(e.people || []).some(p => p.role === 'pic')).length;
  const openQ = SQ.filter(q => q.status === 'open').length;
  const missingDur = SE.filter(e => !e.duration && !e.isMilestone).length;
  const orphaned = schedOrphanedEvents();

  h += `<div class="sched-dashboard">
    <div class="sched-dash-row">
      <span class="sched-dash-stat"><strong>${confirmed}</strong>/${total} confirmed</span>
      <span class="sched-dash-stat sched-dash-stat-tentative"><strong>${tentative}</strong> tentative</span>
      <span class="sched-dash-stat sched-dash-stat-tbd"><strong>${tbd}</strong> TBD</span>
      ${unassignedPIC ? `<span class="sched-dash-stat sched-dash-stat-warn"><strong>${unassignedPIC}</strong> no PIC</span>` : ''}
      ${openQ ? `<span class="sched-dash-stat sched-dash-stat-q"><strong>${openQ}</strong> open ?</span>` : ''}
      ${missingDur ? `<span class="sched-dash-stat sched-dash-stat-warn"><strong>${missingDur}</strong> no duration</span>` : ''}
      ${orphaned.length ? `<span class="sched-dash-stat sched-dash-stat-warn"><strong>${orphaned.length}</strong> orphaned</span>` : ''}
    </div>
  </div>`;

  // Sticky phase nav
  const sortedPhases = [...SP].sort((a, b) => a.number - b.number);
  h += `<nav class="sched-phase-nav" id="schedPhaseNav">`;
  sortedPhases.forEach(p => {
    const cnt = (p.eventIds || []).length;
    h += `<button class="sched-phase-nav-item" data-sched-jump="${p.id}">${esc(p.number)}. ${esc(p.title)} <span class="sched-phase-nav-cnt">${cnt}</span></button>`;
  });
  h += `</nav>`;

  // Timeline
  h += `<div class="sched-timeline" id="schedTimeline">`;
  sortedPhases.forEach(p => {
    h += schedRenderPhase(p);
  });
  // Orphaned section
  if(orphaned.length){
    h += `<div class="sched-phase sched-phase-orphan" data-phase-id="__orphan">
      <div class="sched-phase-hdr">
        <div class="sched-phase-title-row">
          <span class="sched-phase-number">⚠</span>
          <span class="sched-phase-title">Orphaned Events</span>
          <span class="sched-phase-count">${orphaned.length}</span>
        </div>
        <div class="sched-phase-note">These events belong to no phase. Reassign or delete.</div>
      </div>
      <div class="sched-events">`;
    orphaned.forEach(ev => { h += schedRenderEvent(ev, '__orphan'); });
    h += `</div></div>`;
  }
  h += `</div>`;

  // Add-phase button
  h += `<div class="sched-add-phase-wrap"><button class="sched-btn sched-btn-add" onclick="schedAddPhase()">+ Add Phase</button></div>`;

  // Floating print buttons (P2)
  h += `<div class="sched-fab">
    <button class="sched-fab-btn" onclick="schedPrintCoordinator()" title="Print coordinator schedule">🖨 Coordinator</button>
    <button class="sched-fab-btn" onclick="schedPrintPerPerson()" title="Print per-person sheets">👤 Per-Person</button>
    <button class="sched-fab-btn" onclick="schedPrintGuest()" title="Print guest program">🎉 Guest</button>
  </div>`;

  el.innerHTML = h;
  schedWireHandlers();
  schedWireStickyNav();
}

function schedRenderPhase(phase){
  const cnt = (phase.eventIds || []).length;
  const events = (phase.eventIds || []).map(id => SE.find(e => e.id === id)).filter(Boolean);
  // Filter by search
  const visible = search ? events.filter(e => schedEventMatchesSearch(e)) : events;
  // Computed time range
  let timeRange = 'No events';
  if(events.length){
    const firstTime = events[0].startTime;
    const last = events[events.length - 1];
    const endTime = schedAddMinutes(last.startTime, last.duration || 0);
    timeRange = schedFmtTime(firstTime) + ' – ' + schedFmtTime(endTime);
  }
  const collapsed = phase.collapsed;
  const color = phase.color || '#6B8E6B';

  let h = `<div class="sched-phase ${collapsed ? 'sched-phase-collapsed' : ''}" data-phase-id="${phase.id}" style="--phase-color:${esc(color)}">`;
  h += `<div class="sched-phase-hdr" onclick="schedTogglePhase('${phase.id}')">
    <div class="sched-phase-title-row">
      <span class="sched-phase-number">${esc(phase.number)}</span>
      <span class="sched-phase-title sched-edit" data-sched-edit="phase-title" data-phase-id="${phase.id}">${esc(phase.title)}</span>
      <span class="sched-phase-count">${cnt}</span>
      <span class="sched-phase-time">${timeRange}</span>
      <span class="sched-phase-chev">${collapsed ? '▸' : '▾'}</span>
    </div>
    ${phase.note ? `<div class="sched-phase-note">${esc(phase.note)}</div>` : ''}
  </div>`;

  if(!collapsed){
    h += `<div class="sched-events">`;
    // Group events by parallelGroup within this phase for rendering
    const rendered = new Set();
    visible.forEach(ev => {
      if(rendered.has(ev.id)) return;
      if(ev.parallelGroup){
        const groupMembers = visible.filter(x => x.parallelGroup === ev.parallelGroup);
        if(groupMembers.length >= 2){
          h += `<div class="sched-parallel-group"><div class="sched-parallel-label">▸ Parallel</div>`;
          groupMembers.forEach(m => { h += schedRenderEvent(m, phase.id); rendered.add(m.id); });
          h += `</div>`;
          return;
        }
      }
      h += schedRenderEvent(ev, phase.id);
      rendered.add(ev.id);
    });
    // Add event + delete/rename phase controls
    h += `<div class="sched-phase-actions">
      <button class="sched-btn sched-btn-sm" onclick="schedAddEvent('${phase.id}')">+ Add event</button>
      <button class="sched-btn sched-btn-sm sched-btn-ghost" onclick="schedDeletePhase('${phase.id}')">Delete phase</button>
    </div>`;
    h += `</div>`;
  }

  h += `</div>`;
  return h;
}

function schedEventMatchesSearch(ev){
  if(!search) return true;
  const q = search.toLowerCase();
  return (ev.title + ' ' + (ev.details || '') + ' ' + (ev.people || []).map(p => p.name).join(' ') + ' ' + (ev.notes || []).join(' ') + ' ' + (ev.itemsToBring || []).join(' ')).toLowerCase().includes(q);
}

function schedRenderEvent(ev, phaseId){
  const warnings = schedValidateBoundaries(ev);
  const conflicts = schedDetectPersonConflicts(ev);
  const allWarnings = [...warnings, ...conflicts];
  const questions = SQ.filter(q => q.eventId === ev.id);
  const openQuestions = questions.filter(q => q.status === 'open');
  const resolvedQuestions = questions.filter(q => q.status === 'resolved');

  const milestoneCls = ev.isMilestone ? 'sched-event-milestone' : '';
  const guestCls = ev.isGuestVisible ? 'sched-event-guest' : '';
  const statusCls = 'sched-status-' + (ev.status || 'tbd');
  const warnCls = allWarnings.length ? 'sched-event-warn' : '';

  let h = `<div class="sched-event ${milestoneCls} ${guestCls} ${warnCls}" data-event-id="${ev.id}" data-phase-id="${phaseId}" draggable="true"
    ontouchstart="schedTouchStart(event,'${ev.id}','${phaseId}')"
    ontouchmove="schedTouchMove(event)"
    ontouchend="schedTouchEnd(event,'${ev.id}','${phaseId}')">`;
  h += `<div class="sched-event-grip" title="Drag to reorder">⋮⋮</div>`;
  h += `<div class="sched-event-body">`;
  h += `<div class="sched-event-row1">`;
  h += `<span class="sched-event-time sched-edit" data-sched-edit="event-time" data-event-id="${ev.id}">${schedFmtTime(ev.startTime)}</span>`;
  h += `<span class="sched-event-duration sched-edit" data-sched-edit="event-duration" data-event-id="${ev.id}">${ev.duration || 0}m</span>`;
  h += `<span class="sched-event-status ${statusCls} sched-edit" data-sched-edit="event-status" data-event-id="${ev.id}">${SCHED_STATUS_LABELS[ev.status] || ev.status}</span>`;
  h += `<span class="sched-event-zone sched-edit" data-sched-edit="event-zone" data-event-id="${ev.id}">${esc(ev.zone || 'tbd')}</span>`;
  h += `<button class="sched-event-toggle ${ev.isMilestone ? 'on' : ''}" onclick="schedToggleBool('${ev.id}','isMilestone')" title="Milestone">★</button>`;
  h += `<button class="sched-event-toggle ${ev.isGuestVisible ? 'on' : ''}" onclick="schedToggleBool('${ev.id}','isGuestVisible')" title="Guest-visible">👁</button>`;
  h += `<button class="sched-event-delete" onclick="schedDeleteEvent('${ev.id}')" title="Delete event">×</button>`;
  h += `</div>`;
  h += `<div class="sched-event-title sched-edit" data-sched-edit="event-title" data-event-id="${ev.id}">${esc(ev.title)}</div>`;
  if(ev.details){
    h += `<div class="sched-event-details sched-edit" data-sched-edit="event-details" data-event-id="${ev.id}">${esc(ev.details)}</div>`;
  } else {
    h += `<div class="sched-event-details sched-edit sched-empty" data-sched-edit="event-details" data-event-id="${ev.id}">+ add details</div>`;
  }

  // People chips
  h += `<div class="sched-chips sched-chips-people">`;
  (ev.people || []).forEach((p, i) => {
    h += `<span class="sched-chip sched-chip-person sched-chip-role-${esc(p.role || 'present')}">${esc(p.name)} <small>${esc(p.role || 'present')}</small> <button class="sched-chip-rm" onclick="schedRemovePerson('${ev.id}',${i})">×</button></span>`;
  });
  h += `<button class="sched-chip-add" onclick="schedAddPerson('${ev.id}')">+ person</button>`;
  h += `</div>`;

  // Items to bring
  if((ev.itemsToBring || []).length || true){
    h += `<div class="sched-chips sched-chips-items">`;
    (ev.itemsToBring || []).forEach((item, i) => {
      h += `<span class="sched-chip sched-chip-item">${esc(item)} <button class="sched-chip-rm" onclick="schedRemoveItem('${ev.id}',${i})">×</button></span>`;
    });
    h += `<button class="sched-chip-add" onclick="schedAddItem('${ev.id}')">+ item</button>`;
    h += `</div>`;
  }

  // Notes
  if((ev.notes || []).length){
    h += `<div class="sched-notes">`;
    (ev.notes || []).forEach((n, i) => {
      h += `<div class="sched-note">📝 ${esc(n)} <button class="sched-chip-rm" onclick="schedRemoveNote('${ev.id}',${i})">×</button></div>`;
    });
    h += `</div>`;
  }
  h += `<div><button class="sched-chip-add sched-chip-add-note" onclick="schedAddNote('${ev.id}')">+ note</button></div>`;

  // Questions
  if(questions.length){
    h += `<div class="sched-questions">`;
    openQuestions.forEach(q => {
      h += `<div class="sched-question sched-question-open" data-q-id="${q.id}">
        <span class="sched-q-badge">?</span>
        <span class="sched-q-text">${esc(q.question)}</span>
        <button class="sched-q-resolve" onclick="schedResolveQuestion('${q.id}')">Resolve</button>
      </div>`;
    });
    resolvedQuestions.forEach(q => {
      h += `<div class="sched-question sched-question-resolved">
        <span class="sched-q-badge">✓</span>
        <span class="sched-q-text"><s>${esc(q.question)}</s></span>
        <span class="sched-q-resolution">→ ${esc(q.resolution)}</span>
      </div>`;
    });
    h += `</div>`;
  }

  // Warnings
  if(allWarnings.length){
    h += `<div class="sched-warnings">${allWarnings.map(w => `<span class="sched-warning">⚠ ${esc(w)}</span>`).join('')}</div>`;
  }

  h += `</div></div>`;
  return h;
}

/* ── Wiring handlers after render ── */

function schedWireHandlers(){
  // Inline edits
  document.querySelectorAll('#viewSchedule .sched-edit').forEach(el => {
    el.addEventListener('click', function(ev){
      ev.stopPropagation();
      schedStartInlineEdit(el);
    });
  });
  // Phase nav jump
  document.querySelectorAll('[data-sched-jump]').forEach(btn => {
    btn.onclick = function(){
      const id = this.dataset.schedJump;
      const target = document.querySelector(`.sched-phase[data-phase-id="${id}"]`);
      if(target) target.scrollIntoView({behavior: 'smooth', block: 'start'});
    };
  });
  // Drag-and-drop
  document.querySelectorAll('#viewSchedule .sched-event').forEach(el => {
    el.addEventListener('dragstart', schedDragStart);
    el.addEventListener('dragover', schedDragOver);
    el.addEventListener('drop', schedDrop);
    el.addEventListener('dragend', schedDragEnd);
  });
}

function schedWireStickyNav(){
  // Highlight current phase in sticky nav on scroll
  const timeline = $('schedTimeline');
  if(!timeline) return;
  const onScroll = () => {
    const phases = document.querySelectorAll('#viewSchedule .sched-phase[data-phase-id]');
    const scrollTop = window.scrollY + 120;
    let activeId = null;
    phases.forEach(p => {
      const top = p.getBoundingClientRect().top + window.scrollY;
      if(top <= scrollTop) activeId = p.dataset.phaseId;
    });
    if(activeId !== schedActivePhase){
      schedActivePhase = activeId;
      document.querySelectorAll('[data-sched-jump]').forEach(b => {
        b.classList.toggle('sched-phase-nav-active', b.dataset.schedJump === activeId);
      });
    }
  };
  window.removeEventListener('scroll', window._schedScroll);
  window._schedScroll = onScroll;
  window.addEventListener('scroll', onScroll, {passive: true});
  onScroll();
}

/* ── Inline editing ── */

function schedStartInlineEdit(el){
  const type = el.dataset.schedEdit;
  const evId = el.dataset.eventId;
  const phId = el.dataset.phaseId;
  schedEditActive = true;
  lastUserActionAt = Date.now();

  if(type === 'event-title' || type === 'event-details'){
    schedEditText(el, type, evId);
  } else if(type === 'event-time'){
    schedEditTime(el, evId);
  } else if(type === 'event-duration'){
    schedEditNumber(el, evId);
  } else if(type === 'event-status'){
    schedEditSelect(el, 'status', evId, SCHED_STATUSES, SCHED_STATUS_LABELS);
  } else if(type === 'event-zone'){
    const zoneLabels = {}; SCHED_ZONES.forEach(z => zoneLabels[z] = z);
    schedEditSelect(el, 'zone', evId, SCHED_ZONES, zoneLabels);
  } else if(type === 'phase-title'){
    schedEditPhaseTitle(el, phId);
  }
}

function schedEditText(el, type, evId){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  const key = type === 'event-title' ? 'title' : 'details';
  const oldVal = ev[key] || '';
  const input = document.createElement(type === 'event-details' ? 'textarea' : 'input');
  if(input.tagName === 'INPUT') input.type = 'text';
  input.value = oldVal;
  input.className = 'sched-edit-input';
  const commit = () => {
    if(!schedEditActive) return;
    const newVal = input.value.trim();
    schedEditActive = false;
    if(newVal !== oldVal){
      ev[key] = newVal;
      save();
      // Targeted update — replace the cell's text, don't re-render the whole view
      el.textContent = newVal || (type === 'event-details' ? '+ add details' : '');
      el.classList.toggle('sched-empty', !newVal && type === 'event-details');
    }
    input.replaceWith(el);
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && input.tagName === 'INPUT'){ e.preventDefault(); input.blur(); }
    if(e.key === 'Escape'){ schedEditActive = false; input.replaceWith(el); }
  });
  el.replaceWith(input);
  input.focus();
  input.select && input.select();
}

function schedEditTime(el, evId){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  const input = document.createElement('input');
  input.type = 'time';
  input.value = ev.startTime || '';
  input.className = 'sched-edit-input';
  const commit = () => {
    if(!schedEditActive) return;
    schedEditActive = false;
    const newVal = input.value;
    if(newVal && newVal !== ev.startTime){
      const phase = schedFindPhaseOfEvent(evId);
      const isAnchor = phase && phase.eventIds[0] === evId;
      ev.startTime = newVal;
      if(phase) schedRecalcTimes(phase.id);
      save();
      renderSchedule(); // full re-render because cascade may have changed many rows
      return;
    }
    input.replaceWith(el);
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); input.blur(); }
    if(e.key === 'Escape'){ schedEditActive = false; input.replaceWith(el); }
  });
  el.replaceWith(input);
  input.focus();
}

function schedEditNumber(el, evId){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.value = ev.duration || 0;
  input.className = 'sched-edit-input sched-edit-input-num';
  const commit = () => {
    if(!schedEditActive) return;
    schedEditActive = false;
    const newVal = Math.max(0, parseInt(input.value) || 0);
    if(newVal !== ev.duration){
      ev.duration = newVal;
      const phase = schedFindPhaseOfEvent(evId);
      if(phase) schedRecalcTimes(phase.id);
      save();
      renderSchedule();
      return;
    }
    input.replaceWith(el);
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); input.blur(); }
    if(e.key === 'Escape'){ schedEditActive = false; input.replaceWith(el); }
  });
  el.replaceWith(input);
  input.focus();
  input.select();
}

function schedEditSelect(el, key, evId, options, labels){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  const select = document.createElement('select');
  select.className = 'sched-edit-input';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = labels[opt] || opt;
    if(ev[key] === opt) o.selected = true;
    select.appendChild(o);
  });
  const commit = () => {
    if(!schedEditActive) return;
    schedEditActive = false;
    if(select.value !== ev[key]){
      ev[key] = select.value;
      save();
      renderSchedule();
      return;
    }
    select.replaceWith(el);
  };
  select.addEventListener('blur', commit);
  select.addEventListener('change', commit);
  select.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ schedEditActive = false; select.replaceWith(el); }
  });
  el.replaceWith(select);
  select.focus();
}

function schedEditPhaseTitle(el, phId){
  const p = SP.find(x => x.id === phId);
  if(!p) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = p.title || '';
  input.className = 'sched-edit-input';
  input.onclick = (e) => e.stopPropagation(); // don't trigger collapse toggle
  const commit = () => {
    if(!schedEditActive) return;
    schedEditActive = false;
    const newVal = input.value.trim();
    if(newVal && newVal !== p.title){
      p.title = newVal;
      save();
      el.textContent = newVal;
    }
    input.replaceWith(el);
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if(e.key === 'Enter'){ e.preventDefault(); input.blur(); }
    if(e.key === 'Escape'){ schedEditActive = false; input.replaceWith(el); }
  });
  el.replaceWith(input);
  input.focus();
  input.select();
}

/* ── Add/delete operations ── */

async function schedAddEvent(phaseId){
  const phase = SP.find(p => p.id === phaseId);
  if(!phase) return;
  const ev = {
    id: schedNewEventId(),
    title: 'New event',
    details: '',
    startTime: '12:00',
    duration: 15,
    status: 'tbd',
    zone: 'shelter',
    people: [],
    itemsToBring: [],
    notes: [],
    isMilestone: false,
    isGuestVisible: false,
    parallelGroup: null
  };
  SE.push(ev);
  phase.eventIds = phase.eventIds || [];
  phase.eventIds.push(ev.id);
  save();
  renderSchedule();
}

async function schedDeleteEvent(evId){
  const ev = SE.find(e => e.id === evId);
  if(!ev) return;
  const ok = await customConfirm('Delete event', 'Delete "' + (ev.title || 'event') + '"? Any open questions for this event will also be removed.');
  if(!ok) return;
  SE = SE.filter(e => e.id !== evId);
  SP.forEach(p => { if(p.eventIds) p.eventIds = p.eventIds.filter(id => id !== evId); });
  SQ = SQ.filter(q => q.eventId !== evId);
  save();
  renderSchedule();
}

async function schedAddPhase(){
  const title = await customInput('New phase name', '');
  if(!title) return;
  const maxNum = SP.reduce((m, p) => Math.max(m, p.number || 0), 0);
  SP.push({
    id: schedNewPhaseId(),
    number: maxNum + 1,
    title,
    color: '#6B8E6B',
    note: '',
    collapsed: false,
    eventIds: []
  });
  save();
  renderSchedule();
}

async function schedDeletePhase(phId){
  const p = SP.find(x => x.id === phId);
  if(!p) return;
  const cnt = (p.eventIds || []).length;
  const msg = cnt > 0
    ? `Delete "${p.title}"? Its ${cnt} event(s) will move to the Orphaned Events section and must be reassigned or deleted.`
    : `Delete empty phase "${p.title}"?`;
  const ok = await customConfirm('Delete phase', msg);
  if(!ok) return;
  SP = SP.filter(x => x.id !== phId);
  save();
  renderSchedule();
}

function schedTogglePhase(phId){
  const p = SP.find(x => x.id === phId);
  if(!p) return;
  p.collapsed = !p.collapsed;
  save();
  renderSchedule();
}

function schedToggleBool(evId, key){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  ev[key] = !ev[key];
  save();
  // Targeted update — find the button and toggle its class
  const btn = document.querySelector(`[data-event-id="${evId}"] .sched-event-toggle[onclick*="${key}"]`);
  if(btn) btn.classList.toggle('on', ev[key]);
}

/* ── Chip list operations ── */

async function schedAddPerson(evId){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  const name = await customInput('Person name', '');
  if(!name) return;
  const role = await customInput('Role (pic / helper / present)', 'present');
  if(!role) return;
  const normalizedRole = SCHED_PIC_ROLES.includes(role.toLowerCase()) ? role.toLowerCase() : 'present';
  ev.people = ev.people || [];
  ev.people.push({name, role: normalizedRole});
  save();
  renderSchedule();
}
function schedRemovePerson(evId, idx){
  const ev = SE.find(x => x.id === evId);
  if(!ev || !ev.people) return;
  ev.people.splice(idx, 1);
  save();
  renderSchedule();
}
async function schedAddItem(evId){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  const item = await customInput('Item to bring', '');
  if(!item) return;
  ev.itemsToBring = ev.itemsToBring || [];
  ev.itemsToBring.push(item);
  save();
  renderSchedule();
}
function schedRemoveItem(evId, idx){
  const ev = SE.find(x => x.id === evId);
  if(!ev || !ev.itemsToBring) return;
  ev.itemsToBring.splice(idx, 1);
  save();
  renderSchedule();
}
async function schedAddNote(evId){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  const note = await customInput('Planning note', '');
  if(!note) return;
  ev.notes = ev.notes || [];
  ev.notes.push(note);
  save();
  renderSchedule();
}
function schedRemoveNote(evId, idx){
  const ev = SE.find(x => x.id === evId);
  if(!ev || !ev.notes) return;
  ev.notes.splice(idx, 1);
  save();
  renderSchedule();
}

/* ── Question resolution ── */

async function schedResolveQuestion(qId){
  const q = SQ.find(x => x.id === qId);
  if(!q) return;
  const resolution = await customInput('Resolution for: ' + q.question, '');
  if(!resolution) return;
  q.status = 'resolved';
  q.resolution = resolution;
  q.resolvedDate = now();
  save();
  renderSchedule();
}

/* ── Drag-and-drop (desktop + touch) ── */

function schedDragStart(e){
  const evEl = e.target.closest('.sched-event');
  if(!evEl) return;
  schedDragState = {
    id: evEl.dataset.eventId,
    sourcePhaseId: evEl.dataset.phaseId
  };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', evEl.dataset.eventId);
  evEl.classList.add('sched-event-dragging');
}
function schedDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const evEl = e.target.closest('.sched-event');
  if(evEl) evEl.classList.add('sched-drop-target');
}
function schedDrop(e){
  e.preventDefault();
  if(!schedDragState) return;
  const targetEl = e.target.closest('.sched-event');
  if(!targetEl) return;
  const sourceId = schedDragState.id;
  const sourcePhaseId = schedDragState.sourcePhaseId;
  const targetId = targetEl.dataset.eventId;
  const targetPhaseId = targetEl.dataset.phaseId;
  if(sourceId === targetId) return;

  const sourcePhase = sourcePhaseId === '__orphan' ? null : SP.find(p => p.id === sourcePhaseId);
  const targetPhase = targetPhaseId === '__orphan' ? null : SP.find(p => p.id === targetPhaseId);

  // Remove from source
  if(sourcePhase){
    sourcePhase.eventIds = sourcePhase.eventIds.filter(id => id !== sourceId);
  }
  // Insert at target position
  if(targetPhase){
    const targetIdx = targetPhase.eventIds.indexOf(targetId);
    if(targetIdx >= 0){
      targetPhase.eventIds.splice(targetIdx + 1, 0, sourceId);
    } else {
      targetPhase.eventIds.push(sourceId);
    }
    schedRecalcTimes(targetPhase.id);
  }
  if(sourcePhase && sourcePhase !== targetPhase) schedRecalcTimes(sourcePhase.id);

  save();
  schedDragState = null;
  renderSchedule();
}
function schedDragEnd(){
  document.querySelectorAll('.sched-event-dragging, .sched-drop-target').forEach(el => {
    el.classList.remove('sched-event-dragging', 'sched-drop-target');
  });
  schedDragState = null;
}

// Touch: long-press to grab, drag via touchmove
function schedTouchStart(e, evId, phaseId){
  if(e.target.closest('.sched-edit, button')) return;
  schedSwipeStartX = e.touches[0].clientX;
  schedSwipeStartY = e.touches[0].clientY;
  schedLongPressTimer = setTimeout(() => {
    schedDragState = {id: evId, sourcePhaseId: phaseId, touch: true};
    const el = e.target.closest('.sched-event');
    if(el) el.classList.add('sched-event-dragging');
    if(navigator.vibrate) navigator.vibrate(50);
  }, 500);
}
function schedTouchMove(e){
  const dx = Math.abs(e.touches[0].clientX - schedSwipeStartX);
  const dy = Math.abs(e.touches[0].clientY - schedSwipeStartY);
  if(dx + dy > 10) clearTimeout(schedLongPressTimer);
  if(schedDragState && schedDragState.touch){
    e.preventDefault();
    // Visual follow via fixed overlay would be nice; for MVP, highlight drop target
    const touch = e.touches[0];
    const over = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetEvent = over ? over.closest('.sched-event') : null;
    document.querySelectorAll('.sched-drop-target').forEach(el => el.classList.remove('sched-drop-target'));
    if(targetEvent && targetEvent.dataset.eventId !== schedDragState.id){
      targetEvent.classList.add('sched-drop-target');
    }
  }
}
function schedTouchEnd(e, evId, phaseId){
  clearTimeout(schedLongPressTimer);
  if(schedDragState && schedDragState.touch){
    const touch = e.changedTouches[0];
    const over = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetEvent = over ? over.closest('.sched-event') : null;
    if(targetEvent && targetEvent.dataset.eventId !== schedDragState.id){
      const targetId = targetEvent.dataset.eventId;
      const targetPhaseId = targetEvent.dataset.phaseId;
      const sourcePhase = schedDragState.sourcePhaseId === '__orphan' ? null : SP.find(p => p.id === schedDragState.sourcePhaseId);
      const targetPhase = targetPhaseId === '__orphan' ? null : SP.find(p => p.id === targetPhaseId);
      if(sourcePhase) sourcePhase.eventIds = sourcePhase.eventIds.filter(id => id !== schedDragState.id);
      if(targetPhase){
        const idx = targetPhase.eventIds.indexOf(targetId);
        if(idx >= 0) targetPhase.eventIds.splice(idx + 1, 0, schedDragState.id);
        else targetPhase.eventIds.push(schedDragState.id);
        schedRecalcTimes(targetPhase.id);
      }
      if(sourcePhase && sourcePhase !== targetPhase) schedRecalcTimes(sourcePhase.id);
      save();
    }
    schedDragEnd();
    renderSchedule();
  }
}

/* ── Output generators (P2) ── */

function schedBuildPrintHead(title){
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Cinzel:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
      @page { size: letter; margin: 0.5in; }
      body { font-family: 'DM Sans', sans-serif; color: #1d2d26; max-width: 7.5in; margin: 0 auto; padding: 0.25in 0; }
      h1 { font-family: 'Cinzel', serif; font-size: 24pt; font-weight: 600; letter-spacing: 0.08em; text-align: center; margin-bottom: 4pt; }
      h1 em { color: #c19a3c; font-style: normal; }
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 16pt; font-weight: 600; color: #8a6d22; margin-top: 18pt; margin-bottom: 8pt; border-bottom: 1pt solid #d4bf82; padding-bottom: 3pt; page-break-after: avoid; }
      h3 { font-family: 'Cormorant Garamond', serif; font-size: 13pt; font-weight: 600; margin-top: 12pt; margin-bottom: 4pt; page-break-after: avoid; }
      .subtitle { text-align: center; font-size: 11pt; color: #445a4f; font-style: italic; margin-bottom: 20pt; }
      .venue { text-align: center; font-size: 9pt; letter-spacing: 0.2em; text-transform: uppercase; color: #78867c; margin-bottom: 24pt; }
      .event { padding: 6pt 0; border-bottom: 0.5pt solid #e6ebe1; page-break-inside: avoid; }
      .event-time { font-family: 'Cinzel', serif; font-weight: 600; color: #8a6d22; display: inline-block; min-width: 70pt; }
      .event-title { font-family: 'Cormorant Garamond', serif; font-size: 12pt; font-weight: 600; display: inline-block; }
      .event-details { font-size: 10pt; color: #445a4f; margin-left: 70pt; margin-top: 2pt; line-height: 1.4; }
      .event-meta { font-size: 9pt; color: #78867c; margin-left: 70pt; margin-top: 2pt; }
      .pic { display: inline-block; font-weight: 600; color: #2e5a45; margin-right: 8pt; }
      .milestone { background: #fdf6e3; padding: 8pt; border-left: 2pt solid #c19a3c; }
      .items { font-size: 9pt; color: #445a4f; margin-left: 70pt; font-style: italic; }
      .note { font-size: 9pt; color: #78867c; margin-left: 70pt; font-style: italic; }
      .open-q { font-size: 9pt; color: #a1424f; margin-left: 70pt; }
      .phase-note { font-style: italic; font-size: 10pt; color: #78867c; margin-bottom: 8pt; }
      .contact-list { font-size: 10pt; margin: 12pt 0; }
      .contact-list li { margin-bottom: 4pt; }
      hr.divider { border: none; border-top: 1pt solid #d4bf82; margin: 18pt 0; }
      .hard-stop { text-align: center; padding: 8pt; background: #9A454D; color: white; font-family: 'Cinzel', serif; letter-spacing: 0.3em; text-transform: uppercase; font-size: 10pt; margin-top: 24pt; }
      @media screen { body { background: #f5f2ed; } .page { background: white; padding: 0.5in; margin: 1rem auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); } }
    </style></head><body>`;
}

function schedPrintCoordinator(){
  const sortedPhases = [...SP].sort((a, b) => a.number - b.number);
  let body = schedBuildPrintHead('Coordinator Schedule');
  body += `<h1>Hannah <em>&</em> Stan</h1>`;
  body += `<div class="subtitle">Sunday, June 7, 2026 · Day-of Schedule — Coordinator</div>`;
  body += `<div class="venue">Willamette Mission State Park · Shelter A · Keizer, Oregon</div>`;

  sortedPhases.forEach(phase => {
    const events = (phase.eventIds || []).map(id => SE.find(e => e.id === id)).filter(Boolean);
    body += `<h2>Phase ${phase.number} — ${esc(phase.title)}</h2>`;
    if(phase.note) body += `<div class="phase-note">${esc(phase.note)}</div>`;
    events.forEach(ev => {
      const pics = (ev.people || []).filter(p => p.role === 'pic').map(p => p.name).join(', ');
      const helpers = (ev.people || []).filter(p => p.role === 'helper').map(p => p.name).join(', ');
      const mCls = ev.isMilestone ? ' milestone' : '';
      body += `<div class="event${mCls}">
        <span class="event-time">${schedFmtTime(ev.startTime)}</span>
        <span class="event-title">${esc(ev.title)}</span>`;
      if(ev.duration) body += ` <span style="font-size:9pt;color:#78867c">(${ev.duration}m)</span>`;
      if(ev.details) body += `<div class="event-details">${esc(ev.details)}</div>`;
      body += `<div class="event-meta">`;
      if(pics) body += `<span class="pic">PIC: ${esc(pics)}</span>`;
      if(helpers) body += `<span>Helpers: ${esc(helpers)}</span>`;
      body += `<span style="margin-left:8pt">Zone: ${esc(ev.zone || 'tbd')}</span>`;
      body += `<span style="margin-left:8pt">Status: ${esc(SCHED_STATUS_LABELS[ev.status] || ev.status)}</span>`;
      body += `</div>`;
      if((ev.itemsToBring || []).length) body += `<div class="items">Items: ${esc(ev.itemsToBring.join(', '))}</div>`;
      (ev.notes || []).forEach(n => body += `<div class="note">📝 ${esc(n)}</div>`);
      SQ.filter(q => q.eventId === ev.id && q.status === 'open').forEach(q => {
        body += `<div class="open-q">? ${esc(q.question)}</div>`;
      });
      SQ.filter(q => q.eventId === ev.id && q.status === 'resolved').forEach(q => {
        body += `<div class="open-q" style="color:#2e5a45">✓ ${esc(q.question)} → ${esc(q.resolution)}</div>`;
      });
      body += `</div>`;
    });
  });

  // Orphaned
  const orphaned = schedOrphanedEvents();
  if(orphaned.length){
    body += `<h2 style="color:#a1424f">⚠ Orphaned Events</h2>`;
    orphaned.forEach(ev => {
      body += `<div class="event"><span class="event-time">${schedFmtTime(ev.startTime)}</span><span class="event-title">${esc(ev.title)}</span></div>`;
    });
  }

  body += `<div class="hard-stop">9:00 PM — Park Closes — Hard Stop</div>`;
  body += `</body></html>`;

  const w = window.open('', '_blank');
  if(!w){ toast('Popup blocked — allow popups to print', false); return; }
  w.document.write(body);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

async function schedPrintPerPerson(){
  // Collect all unique person names
  const names = new Set();
  SE.forEach(e => (e.people || []).forEach(p => { if(p.name) names.add(p.name); }));
  if(!names.size){ toast('No people assigned yet', false); return; }
  const nameList = [...names].sort();
  const choice = await customInput('Person name (or "all" for everyone)', nameList[0]);
  if(!choice) return;
  const targets = choice.toLowerCase() === 'all' ? nameList : [choice];

  let body = schedBuildPrintHead('Per-Person Schedule');
  targets.forEach((name, i) => {
    if(i > 0) body += `<div style="page-break-before: always;"></div>`;
    const personEvents = SE.filter(e => (e.people || []).some(p => p.name && p.name.toLowerCase() === name.toLowerCase()))
      .sort((a, b) => schedTimeToMin(a.startTime) - schedTimeToMin(b.startTime));
    const arrival = personEvents.length ? schedFmtTime(personEvents[0].startTime) : 'TBD';
    const contact = C.find(c => c.name && c.name.toLowerCase() === name.toLowerCase());
    body += `<h1>${esc(name)}</h1>`;
    body += `<div class="subtitle">Personal schedule — June 7, 2026</div>`;
    body += `<div class="venue">Willamette Mission State Park · Shelter A · Keizer, OR</div>`;
    body += `<p><strong>Arrival:</strong> ${esc(arrival)}`;
    if(contact && contact.phone) body += ` · <strong>Phone:</strong> ${esc(contact.phone)}`;
    if(contact && contact.email) body += ` · <strong>Email:</strong> ${esc(contact.email)}`;
    body += `</p>`;
    // All items the person is responsible for (any event where they appear, listing that event's items)
    const itemsByEvent = personEvents.filter(e => (e.itemsToBring || []).length);
    if(itemsByEvent.length){
      body += `<h3>What to bring</h3><ul class="contact-list">`;
      itemsByEvent.forEach(e => {
        body += `<li><strong>For ${esc(e.title)}:</strong> ${esc((e.itemsToBring || []).join(', '))}</li>`;
      });
      body += `</ul>`;
    }
    body += `<h3>Your events</h3>`;
    personEvents.forEach(ev => {
      const myRole = ev.people.find(p => p.name && p.name.toLowerCase() === name.toLowerCase())?.role || 'present';
      const others = (ev.people || []).filter(p => p.name && p.name.toLowerCase() !== name.toLowerCase()).map(p => p.name);
      body += `<div class="event">
        <span class="event-time">${schedFmtTime(ev.startTime)}</span>
        <span class="event-title">${esc(ev.title)}</span>
        <span style="font-size:9pt;color:#78867c;margin-left:6pt">(${esc(myRole)})</span>`;
      if(ev.details) body += `<div class="event-details">${esc(ev.details)}</div>`;
      if(others.length) body += `<div class="event-meta">With: ${esc(others.join(', '))}</div>`;
      if(ev.zone) body += `<div class="event-meta">Zone: ${esc(ev.zone)}</div>`;
      body += `</div>`;
    });
  });
  body += `</body></html>`;

  const w = window.open('', '_blank');
  if(!w){ toast('Popup blocked', false); return; }
  w.document.write(body);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

function schedPrintGuest(){
  const sortedPhases = [...SP].sort((a, b) => a.number - b.number);
  let body = schedBuildPrintHead('Guest Program');
  body += `<h1>Hannah <em>&</em> Stan</h1>`;
  body += `<div class="subtitle">Sunday, June 7, 2026</div>`;
  body += `<div class="venue">Willamette Mission State Park · Keizer, Oregon</div>`;
  body += `<hr class="divider" />`;
  body += `<h2 style="text-align:center;border:none;">Order of the Day</h2>`;

  const guestEvents = [];
  sortedPhases.forEach(phase => {
    (phase.eventIds || []).forEach(id => {
      const ev = SE.find(e => e.id === id);
      if(ev && ev.isGuestVisible) guestEvents.push(ev);
    });
  });

  guestEvents.forEach(ev => {
    body += `<div class="event" style="text-align:center;border:none;padding:8pt 0">
      <div style="font-family:'Cinzel',serif;font-size:12pt;font-weight:600;color:#8a6d22;letter-spacing:0.08em">${schedFmtTime(ev.startTime)}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:16pt;font-weight:600;margin-top:4pt">${esc(ev.title)}</div>
    </div>`;
  });

  body += `<hr class="divider" />`;
  body += `<div style="text-align:center;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:12pt;color:#445a4f">Thank you for celebrating with us.</div>`;
  body += `</body></html>`;

  const w = window.open('', '_blank');
  if(!w){ toast('Popup blocked', false); return; }
  w.document.write(body);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

/* ── Expose for inline onclick handlers ── */
window.schedAddEvent = schedAddEvent;
window.schedDeleteEvent = schedDeleteEvent;
window.schedAddPhase = schedAddPhase;
window.schedDeletePhase = schedDeletePhase;
window.schedTogglePhase = schedTogglePhase;
window.schedToggleBool = schedToggleBool;
window.schedAddPerson = schedAddPerson;
window.schedRemovePerson = schedRemovePerson;
window.schedAddItem = schedAddItem;
window.schedRemoveItem = schedRemoveItem;
window.schedAddNote = schedAddNote;
window.schedRemoveNote = schedRemoveNote;
window.schedResolveQuestion = schedResolveQuestion;
window.schedTouchStart = schedTouchStart;
window.schedTouchMove = schedTouchMove;
window.schedTouchEnd = schedTouchEnd;
window.schedPrintCoordinator = schedPrintCoordinator;
window.schedPrintPerPerson = schedPrintPerPerson;
window.schedPrintGuest = schedPrintGuest;

/* ════════════════ KEYBOARD NAV §16.13 ════════════════ */
document.onkeydown = function(e){
  if(e.key === 'Escape'){
    if($('taskModalBg').classList.contains('open')){closeTaskEditor(); return}
    if($('personModalBg').classList.contains('open')){$('personModalBg').classList.remove('open'); return}
    if($('statusPickerBg').classList.contains('open')){$('statusPickerBg').classList.remove('open'); return}
    if($('confirmBg').classList.contains('open')){$('confirmBg').classList.remove('open'); return}
    if($('inputSheetBg').classList.contains('open')){$('inputSheetBg').classList.remove('open'); return}
    if($('moveGroupBg').classList.contains('open')){$('moveGroupBg').classList.remove('open'); return}
    if(batchMode){exitBatch(); return}
  }
};

/* ════════════════ EXPOSE GLOBALS for inline onclick handlers ════════════════ */
window.onCardTap = onCardTap;
window.toggleDone = toggleDone;
window.openStatusPicker = openStatusPicker;
window.touchStart = touchStart;
window.touchEnd = touchEnd;
window.touchMove = touchMove;
window.showCtx = showCtx;
window.ctxAction = ctxAction;
window.batchAction = batchAction;
window.exitBatch = exitBatch;
window.jumpTo = jumpTo;
window.addFilter = addFilter;
window.removeFilter = removeFilter;
window.clearFilters = clearFilters;
window.openTaskEditor = openTaskEditor;
window.openPersonEditor = openPersonEditor;
window.toggleSubtask = toggleSubtask;
window.rmSubtask = rmSubtask;
window.addGroup = addGroup;
window.renameGroup = renameGroup;
window.deleteGroup = deleteGroup;
window.addTag = addTag;
window.renameTag = renameTag;
window.deleteTag = deleteTag;
window.exportData = exportData;
window.importData = importData;
window.addCoordinator = addCoordinator;
window.editCoordinator = editCoordinator;
window.removeCoordinator = removeCoordinator;
window.restoreSnapshot = restoreSnapshot;
window.acceptRemoteState = acceptRemoteState;
window.filterPeople = filterPeople;

/* ════════════════ ENTRY ════════════════ */
gateInit();

})();  // IIFE end
