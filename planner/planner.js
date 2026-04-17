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
const SCHEMA_VERSION = 6;
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
let PREFS = {advExpanded:false, onboardSeen:false, sortBy:'priority', groupByField:'group'};
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
    if(cached){applyServerState(cached); render()}
  } catch(e){}
  // Then fetch live
  const live = await fetchState();
  if(live){applyServerState(live); render()}
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

function applyServerState(s){
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
        || $('taskModalBg').classList.contains('open')
        || $('personModalBg').classList.contains('open');
      if(editorIsMidEdit){
        showStaleBanner(s.lastModifiedBy, s);
      } else {
        applyServerState(s);
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
    applyServerState(_pendingRemoteState);
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
  renderGroupTabs();
  renderFilterTray();
  const qa = $('quickAdd'), qb = $('queryBar');
  qa.style.display = (view === 'tasks' || view === 'focus') ? 'flex' : 'none';
  qb.style.display = (view === 'tasks' || view === 'focus') ? 'flex' : 'none';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $('view' + view.charAt(0).toUpperCase() + view.slice(1)).classList.add('active');
  if(view === 'focus') renderFocus();
  else if(view === 'tasks') renderTasks();
  else if(view === 'people') renderPeople();
  else if(view === 'history') renderHistory();
  else if(view === 'settings') renderSettings();
  if(!PREFS.onboardSeen && (view === 'focus' || view === 'tasks')){$('onboard').style.display = 'flex'}
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
      applyServerState(live);
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
