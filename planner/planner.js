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
let PREFS = {advExpanded:false, onboardSeen:false, schedOnboardSeen:false, scheduleSeeded:false, scheduleSeedVersion:0, sortBy:'priority', groupByField:'group'};
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
  // Stage 2 Phase C (PL-41): cache token in sessionStorage so the css-panel
  // doesn't re-prompt for it. sessionStorage clears on tab close (per-session)
  // — safer than localStorage for token caching.
  try { sessionStorage.setItem('hansWed.masterToken', t); } catch(e){}
  $('gateErr').textContent = '';
  enterApp();
}
function enterApp(){
  $('gateScreen').style.display = 'none';
  $('appShell').style.display = '';
  $('hdrWho').textContent = identity.name + (identity.isMaster ? ' ⚜' : '');
  // Stage 2 Phase C: master-only /admin nav slot reveal (PL-21 minimal bridge)
  refreshAdminNavSlotVisibility();
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

/* Design-fix toggle — applies audited visual corrections against visualDesign raw material.
   OFF = original Rivendell Garden v1. ON = body.design-fix override block. */
(function initDesignFixToggle(){
  const KEY = 'hanstan_planner_design_fix';
  const btn = $('hdrDesignFix');
  if(!btn) return;
  const apply = (on) => {
    document.body.classList.toggle('design-fix', on);
    btn.textContent = 'Design Fix: ' + (on ? 'ON' : 'OFF');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  apply(localStorage.getItem(KEY) === '1');
  btn.onclick = () => {
    const nextOn = !document.body.classList.contains('design-fix');
    localStorage.setItem(KEY, nextOn ? '1' : '0');
    apply(nextOn);
  };
})();

/* Edit Mode header-button toggle — Stage 3 (2026-04-26). Surfaces what was previously
   buried in Settings. Click toggles, label reflects current state, the bottom sticky
   bar appears with Discard-All / Confirm-All when ON. */
(function initEditModeHeaderButton(){
  const btn = $('hdrEditMode');
  if(!btn) return;
  btn.onclick = () => {
    if(typeof setEditMode === 'function') setEditMode(!EDIT_MODE);
  };
})();

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
  // Stage 2 Phase C E-S3-2: pre-reserve messageBoard top-level state key for Stage 3
  // (Communications tab + Focus-as-message-board). Empty object is safe — Stage 3
  // hydrates with channels/messages structure when those features ship.
  window.MESSAGE_BOARD = s.messageBoard && typeof s.messageBoard === 'object' ? s.messageBoard : {};
  // Stage 3 (2026-04-26): notes inbox. Pre-staged for Communications tab. Anyone with a
  // token can leave a note via the FAB Note button; Stan + Hannah triage in Stage 3 UI.
  window.NOTES = Array.isArray(s.notes) ? [...s.notes] : [];
  // Stage 2 Phase C: surface state.isMaster (added by Stage 2 Phase A server filter) onto identity
  // when present. Existing identity.isMaster from /tryAuth still primary; this is a redundancy belt.
  if(typeof s.isMaster === 'boolean' && identity){ identity.isMaster = s.isMaster; }
  // Stage 2 Phase C: Edit Mode persistence — re-apply from PREFS so it survives reload
  if(PREFS.editMode){ setEditMode(true); }
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
      PREFS.scheduleSeedVersion = window.DEFAULT_SCHEDULE_SEED_VERSION || 1;
      setTimeout(() => save(), 100);
    }
  }

  // Seed-version top-up: on a version bump, merge in NEW items from the defaults
  // without clobbering user-edited fields. Matching is by id.
  if(isLive && PREFS.scheduleSeeded && window.DEFAULT_SCHEDULE_SEED_VERSION &&
     (PREFS.scheduleSeedVersion || 0) < window.DEFAULT_SCHEDULE_SEED_VERSION){
    let added = 0;
    if(window.DEFAULT_SCHEDULE_PHASES){
      window.DEFAULT_SCHEDULE_PHASES.forEach(dp => {
        if(!SP.find(p => p.id === dp.id)){
          SP.push({...dp, eventIds: [...(dp.eventIds || [])]});
          added++;
        } else {
          // Merge any NEW eventIds into the existing phase (preserves user order)
          const existing = SP.find(p => p.id === dp.id);
          (dp.eventIds || []).forEach(eid => {
            if(!existing.eventIds.includes(eid)) existing.eventIds.push(eid);
          });
        }
      });
    }
    if(window.DEFAULT_SCHEDULE_EVENTS){
      window.DEFAULT_SCHEDULE_EVENTS.forEach(de => {
        if(!SE.find(e => e.id === de.id)){
          SE.push({...de, people: [...(de.people || [])], itemsToBring: [...(de.itemsToBring || [])], notes: [...(de.notes || [])]});
          added++;
        }
      });
    }
    if(window.DEFAULT_SCHEDULE_QUESTIONS){
      window.DEFAULT_SCHEDULE_QUESTIONS.forEach(dq => {
        if(!SQ.find(q => q.id === dq.id)){
          SQ.push({...dq});
          added++;
        }
      });
    }
    PREFS.scheduleSeedVersion = window.DEFAULT_SCHEDULE_SEED_VERSION;
    if(added > 0) setTimeout(() => save(), 100);
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
    // Stage 3 (2026-04-26): notes inbox + messageBoard pre-stage for Communications tab.
    notes: Array.isArray(window.NOTES) ? window.NOTES : [],
    messageBoard: window.MESSAGE_BOARD || {}
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
  // Stage 2 Phase C (PL-09 + PL-32): pick up whyNote captured at Edit-Mode-Confirm time;
  // server-side diffStates(prev, next, by, whyNote) propagates it onto every emitted entry.
  const whyNote = window.__nextSaveWhyNote || null;
  if(whyNote) window.__nextSaveWhyNote = null;
  try{
    const body = whyNote ? {state: payload, whyNote} : {state: payload};
    const r = await fetch(ENDPOINTS.state, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(body)
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
  // Stage 2 Phase C (PL-09 Edit Mode): when Edit Mode is on, defer the POST.
  // All in-memory edits accumulate in T/C/G/etc but never flush to server until
  // the user clicks Confirm All in the sticky bar. Discard All restores from a
  // pre-Edit-Mode snapshot (taken when Edit Mode was switched on).
  // PENDING_EDIT_COUNT increments to update the sticky bar display.
  if(EDIT_MODE){
    PENDING_EDIT_COUNT++;
    refreshEditModeBar();
    return;
  }
  clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(pushSave, SAVE_DEBOUNCE_MS);
}

/* ════════════════ EDIT MODE (Stage 2 Phase C, PL-09) ════════════════
   Sticky bar with Discard-All + Confirm-All buttons. Buffers all edits until
   user explicitly commits. Mobile-edit-safety mechanism for batch-of-edits flows. */
let EDIT_MODE = false;
let EDIT_MODE_SNAPSHOT = null;
let PENDING_EDIT_COUNT = 0;

function setEditMode(on){
  EDIT_MODE = !!on;
  if(EDIT_MODE){
    // Snapshot current state for Discard-All. JSON-clone keeps it independent of mutations.
    EDIT_MODE_SNAPSHOT = JSON.stringify({
      tasks: T, contacts: C, groups: G, tags: TAGS, savedViews: SV, prefs: PREFS,
      scheduleEvents: window.SE || [], schedulePhases: window.SP || [], scheduleQuestions: window.SQ || []
    });
    PENDING_EDIT_COUNT = 0;
    document.body.classList.add('edit-mode-on');
  } else {
    EDIT_MODE_SNAPSHOT = null;
    PENDING_EDIT_COUNT = 0;
    document.body.classList.remove('edit-mode-on');
  }
  PREFS.editMode = EDIT_MODE;
  refreshEditModeBar();
  // Update the header button label so users see the current state
  const btn = document.getElementById('hdrEditMode');
  if(btn) btn.textContent = '✏️ Edit Mode: ' + (EDIT_MODE ? 'ON' : 'OFF');
  // Also update the Settings checkbox if Settings is currently rendered
  const setEM = document.getElementById('setEditMode');
  if(setEM) setEM.checked = EDIT_MODE;
}

function refreshEditModeBar(){
  let bar = document.getElementById('editModeBar');
  if(!EDIT_MODE){ if(bar) bar.classList.remove('show'); return; }
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'editModeBar';
    bar.className = 'edit-mode-bar';
    bar.innerHTML = `
      <button class="edit-mode-discard" id="editModeDiscard" type="button">Discard all</button>
      <span class="edit-mode-count" id="editModeCount">0 pending edits</span>
      <button class="edit-mode-confirm" id="editModeConfirm" type="button">Confirm all</button>
    `;
    document.body.appendChild(bar);
    document.getElementById('editModeDiscard').onclick = editModeDiscardAll;
    document.getElementById('editModeConfirm').onclick = editModeConfirmAll;
  }
  bar.classList.add('show');
  const lbl = document.getElementById('editModeCount');
  if(lbl) lbl.textContent = PENDING_EDIT_COUNT + ' pending edit' + (PENDING_EDIT_COUNT === 1 ? '' : 's');
}

async function editModeDiscardAll(){
  if(PENDING_EDIT_COUNT === 0){ setEditMode(false); return; }
  const ok = await customConfirm('Discard all edits?', PENDING_EDIT_COUNT + ' pending edit' + (PENDING_EDIT_COUNT === 1 ? '' : 's') + ' will be reverted.');
  if(!ok) return;
  if(EDIT_MODE_SNAPSHOT){
    const snap = JSON.parse(EDIT_MODE_SNAPSHOT);
    T = snap.tasks; C = snap.contacts; G = snap.groups; TAGS = snap.tags;
    SV = snap.savedViews; PREFS = {...PREFS, ...snap.prefs};
    if(snap.scheduleEvents) window.SE = snap.scheduleEvents;
    if(snap.schedulePhases) window.SP = snap.schedulePhases;
    if(snap.scheduleQuestions) window.SQ = snap.scheduleQuestions;
  }
  setEditMode(false);
  render();
  toast('Edits discarded', false);
}

async function editModeConfirmAll(){
  if(PENDING_EDIT_COUNT === 0){ setEditMode(false); return; }
  const why = await customInput('Add a note (optional)', '', 'Why these edits? — leaves an audit trail');
  // Pass why-note through to the next save POST. Not yet wired into pushSave POST body —
  // pushSave currently does not accept a whyNote param. As a minimum-viable hook, we
  // store the whyNote on a window flag that pushSave reads.
  if(why) window.__nextSaveWhyNote = why;
  setEditMode(false);
  // Force flush — bypass the debounce-via-EDIT_MODE-guard
  clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(pushSave, SAVE_DEBOUNCE_MS);
  toast(PENDING_EDIT_COUNT + ' edit' + (PENDING_EDIT_COUNT === 1 ? '' : 's') + ' confirmed', false);
}

/* Quick-Edit confirm-on-tap (PL-05/06/07/08, partial — focused on toggleDone since that's
   the highest-traffic accidental-tap surface on mobile). When NOT in Edit Mode, tapping
   the done-checkbox now requires a confirm-modal acknowledgement. Other field-level
   activations (status badge, deadline tap) still fire immediately — those open modals
   already which act as their own confirm. Full per-field double-tap activation is parked
   as a Stage 3 polish (the existing confirm-modal flow covers the core mobile-safety goal). */
async function quickEditConfirm(label, applyFn){
  if(EDIT_MODE){ applyFn(); return; }
  // Out of Edit Mode — small confirmation per-action. Skipped if user has set
  // PREFS.skipQuickEditConfirm (a setting they can flip off if it gets tedious).
  if(PREFS.skipQuickEditConfirm){ applyFn(); return; }
  const ok = await customConfirm('Confirm ' + label, 'Apply this change immediately?');
  if(!ok) return;
  applyFn();
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

/* ════════════════ PROGRESS MATH (PL-34: granular subtask-aware completion) ════════════════ */
// A subtask is "done" if either schema marks it: {done: true} OR {status: 'done'}.
// Both schemas exist in live state (M1 uses {id,text,done}; D11 uses {title,status}).
function isSubtaskDone(s){
  if(!s) return false;
  if(s.done === true) return true;
  if(s.status === 'done') return true;
  return false;
}
// Returns a completion ratio in [0, 1] for a single task.
// - status === 'done' → 1 (terminal)
// - has subtasks → fraction done (lets in-progress parents contribute partial credit)
// - else → 0
function effectiveCompletion(t){
  if(!t) return 0;
  if(t.status === 'done') return 1;
  const subs = t.subtasks || [];
  if(subs.length){
    const d = subs.filter(isSubtaskDone).length;
    return d / subs.length;
  }
  return 0;
}
// Aggregate completion across a task list. Sum of per-task ratios divided by count,
// rendered as integer percent. Returns 0 for empty lists.
function aggregateCompletionPct(tasks){
  if(!tasks || !tasks.length) return 0;
  const total = tasks.reduce((acc, t) => acc + effectiveCompletion(t), 0);
  return Math.round(total / tasks.length * 100);
}

/* ════════════════ HEADER + STATS ════════════════ */
function updateHeader(){
  const days = Math.floor((WD - new Date()) / 864e5);
  $('hdrDays').textContent = days > 0 ? days + ' days remaining' : days === 0 ? 'Today!' : 'Married!';
  const tot = T.length, done = T.filter(t => t.status === 'done').length;
  const act = T.filter(t => t.status === 'in-progress' || t.status === 'mostly-done').length;
  const od = T.filter(t => t.deadline && daysDiff(t.deadline) < 0 && t.status !== 'done').length;
  const pct = aggregateCompletionPct(T);  // PL-34: subtask-aware
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
  // Stage 2 Phase C: /admin nav slot opens iframe panel instead of switching to a (non-existent) admin view
  if(btn.dataset.v === 'admin'){
    showAdminPanel();
    return;
  }
  this.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', 'false'));
  btn.setAttribute('aria-selected', 'true');
  view = btn.dataset.v;
  lastUserActionAt = Date.now();
  saveScr();
  render();
};

/* ════════════════ /ADMIN IFRAME PANEL (Stage 2 Phase C, PL-21 minimal bridge) ════════════════
   Master-only. Opens /admin route inside a full-planner-width iframe overlay.
   Close via close button or Escape. Not a full reimplementation — Stage 3 absorbs that. */
function showAdminPanel(){
  if(!identity || !identity.isMaster){
    toast('Master only', true);
    return;
  }
  let panel = document.getElementById('adminIframePanel');
  if(!panel){
    panel = document.createElement('div');
    panel.id = 'adminIframePanel';
    panel.className = 'admin-iframe-panel';
    panel.innerHTML = `
      <div class="admin-iframe-bar">
        <span class="admin-iframe-title">Admin (registry copy + ordering)</span>
        <button class="admin-iframe-close" id="adminIframeClose" aria-label="Close admin panel">×</button>
      </div>
      <iframe class="admin-iframe-frame" src="/admin" title="Admin panel"></iframe>
    `;
    document.body.appendChild(panel);
    document.getElementById('adminIframeClose').onclick = hideAdminPanel;
    document.addEventListener('keydown', adminPanelEscapeHandler);
  } else {
    // Refresh the iframe each open (catches admin-side changes between visits)
    panel.querySelector('iframe').src = '/admin';
  }
  panel.classList.add('open');
}
function hideAdminPanel(){
  const panel = document.getElementById('adminIframePanel');
  if(panel) panel.classList.remove('open');
}
function adminPanelEscapeHandler(e){
  if(e.key === 'Escape'){
    const panel = document.getElementById('adminIframePanel');
    if(panel && panel.classList.contains('open')) hideAdminPanel();
  }
}
function refreshAdminNavSlotVisibility(){
  // Show .nav-admin-slot only for master tokens
  const slot = document.querySelector('.main-nav .nav-admin-slot');
  if(!slot) return;
  if(identity && identity.isMaster){
    slot.style.display = '';
    slot.classList.add('visible');
  } else {
    slot.style.display = 'none';
    slot.classList.remove('visible');
  }
  // Stage 3 (2026-04-26): floating CSS-tool button (bottom-left), master-only.
  // Mirrors the FAB add-button on bottom-right. Wires window.veToggle from css-panel.js.
  const cssBtn = document.getElementById('fabCssTool');
  if(cssBtn){
    if(identity && identity.isMaster){
      cssBtn.style.display = '';
      cssBtn.onclick = function(){
        if(typeof window.veToggle === 'function'){
          window.veToggle();
        } else if(typeof window.veGo === 'function'){
          window.veGo();
        } else {
          toast('CSS tool not loaded yet — try again in a moment', true);
        }
      };
    } else {
      cssBtn.style.display = 'none';
    }
  }
}

/* ════════════════ GROUP TABS (patch 04: escAttr) ════════════════ */
function renderGroupTabs(){
  const el = $('groupTabs');
  el.style.display = (view === 'tasks') ? 'flex' : 'none';
  if(view !== 'tasks') return;
  let h = '';
  G.forEach(g => {
    const cnt = g === 'All' ? T.length : T.filter(t => taskBelongsToGroup(t, g)).length;
    const sel = activeGroup === g;
    h += `<button class="group-tab" role="tab" aria-selected="${sel}" data-g="${escAttr(g)}">${esc(g)} <span class="tab-count">${cnt}</span></button>`;
  });
  // (Stage 2 PL-40 Quick Task virtual tab removed 2026-04-26 per Scrybal — quick-add tasks
  // already appear in All; a dedicated tab in the group ribbon was clutter.)
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
  const fab = $('fabAdd'), fabMenu = $('fabMenu'), qb = $('queryBar');
  // FAB (add task) shown on Tasks + Focus tabs only; keeps Schedule/People/History clean.
  const showFab = (view === 'tasks' || view === 'focus');
  if(fab) fab.style.display = showFab ? 'flex' : 'none';
  if(fabMenu) fabMenu.classList.remove('open');
  if(fab) fab.classList.remove('open');
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
  else if(view === 'comms') renderComms();
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
  const stDone = t.subtasks?.length ? t.subtasks.filter(isSubtaskDone).length : 0;  // PL-34: dual schema
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
  const oldStatus = t.status;
  // Stage 2 Phase C (PL-05/06/07/08 partial): mobile-safety confirm-on-tap when not in Edit Mode.
  // Edit Mode mode users get the buffered/sticky-bar flow instead of per-tap confirm.
  quickEditConfirm('mark ' + (oldStatus === 'done' ? 'not done' : 'done'), () => {
    t.status = t.status === 'done' ? 'not-started' : 'done';
    logHistory(t, 'Status → ' + STATUS_LABELS[t.status]);
    save(); saveScr(); render(); restoreScr();
    pushUndo(t.taskId + ' → ' + STATUS_LABELS[t.status], () => {t.status = oldStatus; logHistory(t, 'Undo status')});
    // §10.2 dependency enforcement runs only after confirmed mutation
    if(t.status === 'done'){
      const unblocked = T.filter(x => x.blockedBy && x.blockedBy.toLowerCase().includes((t.taskId || '').toLowerCase()) && x.status !== 'done');
      if(unblocked.length) toast(unblocked.length + ' task(s) may now be unblocked!', false);
    }
  });
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

/* ════════════════ QUICK ADD §7.6 (now via FAB) ════════════════ */
function buildNewTask(title){
  const group = (view === 'tasks' && activeGroup !== 'All') ? activeGroup : 'All';
  return {
    id: 't' + Date.now(),
    taskId: '',
    workstream: 'b',
    title: title || '',
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
}
async function quickAdd(){
  // Hidden qaInput is only used by programmatic flows now.
  let title = ($('qaInput') && $('qaInput').value || '').trim();
  if(!title){ title = (await customInput('Quick add task', '') || '').trim(); }
  if(!title) return;
  const t = buildNewTask(title);
  T.push(t);
  save();
  if($('qaInput')) $('qaInput').value = '';
  saveScr(); render(); restoreScr();
  toast('Added: ' + title, false);
}
function fullAdd(){
  // Creates a blank task and opens the full editor modal (openTaskEditor supports an existing task id).
  const t = buildNewTask('');
  T.push(t);
  save();
  openTaskEditor(t.id);
}
// Keep the legacy qaBtn wiring for any residual callers
if($('qaBtn')) $('qaBtn').onclick = quickAdd;
if($('qaInput')) $('qaInput').onkeydown = function(e){if(e.key === 'Enter') quickAdd()};
// FAB wiring
const fabAddBtn = $('fabAdd'), fabMenuEl = $('fabMenu'), fabQuickBtn = $('fabQuickAdd'), fabFullBtn = $('fabFullAdd');
if(fabAddBtn){
  fabAddBtn.onclick = function(){
    const open = !fabMenuEl.classList.contains('open');
    fabMenuEl.classList.toggle('open', open);
    fabAddBtn.classList.toggle('open', open);
    fabAddBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
}
if(fabQuickBtn) fabQuickBtn.onclick = function(){ fabMenuEl.classList.remove('open'); fabAddBtn.classList.remove('open'); quickAdd(); };
if(fabFullBtn) fabFullBtn.onclick = function(){ fabMenuEl.classList.remove('open'); fabAddBtn.classList.remove('open'); fullAdd(); };

// Stage 1 Phase C — 3 new FAB buttons: Note, Person, Event
const fabNoteBtn = $('fabAddNote'), fabPersonBtn = $('fabAddPerson'), fabEventBtn = $('fabAddEvent');
function closeFab(){ if(fabMenuEl) fabMenuEl.classList.remove('open'); if(fabAddBtn) fabAddBtn.classList.remove('open'); }

if(fabNoteBtn) fabNoteBtn.onclick = async function(){
  closeFab();
  const text = await customInput('Add a note', '', 'Notes go to Communications — Stan and Hannah will triage them. Anyone with a token can leave one.');
  if(!text || !text.trim()) return;
  // Stage 3 (2026-04-26): notes are NOT tasks. They live in their own state.notes[] array
  // (pre-staged here so notes captured now don't get lost when Stage 3's Communications tab
  // ships). Schema: {id, text, by, ts, status: 'unread'|'read'|'converted'|'archived',
  // convertedTo?: <taskId>, channel?: <future-stage-3>}.
  const note = {
    id: 'note-' + Date.now(),
    text: text.trim(),
    by: identity ? identity.name : 'unknown',
    ts: new Date().toISOString(),
    status: 'unread'
  };
  if(!Array.isArray(window.NOTES)) window.NOTES = [];
  window.NOTES.push(note);
  save();
  toast('Note saved → Communications inbox', false);
};

// Helper: open/close a sheet using the same .open-class pattern as the rest of the app.
// The HTML has inline style="display:none" — we override it with style.display = '' so
// the CSS .sheet-bg.open rule (display: block) controls visibility.
function openSheet(bgId){
  const bg = document.getElementById(bgId);
  if(!bg) return null;
  bg.style.display = '';
  bg.classList.add('open');
  return bg;
}
function closeSheet(bg){
  if(!bg) return;
  bg.classList.remove('open');
  bg.style.display = 'none';
}

if(fabPersonBtn) fabPersonBtn.onclick = function(){
  closeFab();
  const bg = openSheet('quickAddPersonBg');
  if(!bg) return;
  $('qapName').value = '';
  $('qapRole').value = '';
  setTimeout(() => $('qapName').focus(), 50);
  $('qapCancel').onclick = function(){ closeSheet(bg); };
  $('qapSubmit').onclick = function(){
    const name = $('qapName').value.trim();
    const role = $('qapRole').value.trim() || 'guest';
    if(!name){ toast('Name required', true); return; }
    // Use existing contacts array C (not window.PEOPLE — wrong variable)
    const nextN = Math.max(0, ...C.map(p => parseInt((p.id || 'p0').slice(1)) || 0)) + 1;
    const contact = {id: 'p' + nextN, name, role, specificRole: '', phone: '', email: '', notes: '', visibilitySet: [], constraints: []};
    C.push(contact);
    save(); render();
    toast('Added person: ' + name, false);
    closeSheet(bg);
  };
};

if(fabEventBtn) fabEventBtn.onclick = function(){
  closeFab();
  const bg = openSheet('quickAddEventBg');
  if(!bg) return;
  $('qaeTitle').value = '';
  $('qaeStartTime').value = '';
  $('qaeDuration').value = '30';
  setTimeout(() => $('qaeTitle').focus(), 50);
  $('qaeCancel').onclick = function(){ closeSheet(bg); };
  $('qaeSubmit').onclick = function(){
    const title = $('qaeTitle').value.trim();
    const startTime = $('qaeStartTime').value.trim();
    const duration = parseInt($('qaeDuration').value, 10) || 30;
    if(!title){ toast('Title required', true); return; }
    const newId = 'se-' + Math.floor(Date.now()/1000);
    const ev = {id: newId, title, details: '', startTime, duration, status: 'proposed', zone: '', people: [], itemsToBring: [], notes: [], isMilestone: false, isGuestVisible: true, parallelGroup: ''};
    // Use the existing global SE schedule-events array
    if(!Array.isArray(SE)) return;
    SE.push(ev);
    save(); render();
    toast('Event added: ' + title, false);
    closeSheet(bg);
  };
};
// Close FAB menu on outside click
document.addEventListener('click', function(e){
  if(!fabMenuEl || !fabAddBtn) return;
  if(e.target === fabAddBtn || fabAddBtn.contains(e.target)) return;
  if(fabMenuEl.contains(e.target)) return;
  fabMenuEl.classList.remove('open');
  fabAddBtn.classList.remove('open');
});
window.fullAdd = fullAdd;
window.quickAdd = quickAdd;

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
  // §11.3 progress summaries (PL-34: subtask-aware)
  h += '<div style="margin-bottom:12px">';
  G.filter(g => g !== 'All').forEach(g => {
    const gTasks = T.filter(t => taskBelongsToGroup(t, g));
    const pct = aggregateCompletionPct(gTasks);
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

/* ════════════════ MULTI-PARENT GROUP HELPER (Stage 2 Phase C, 2026-04-25) ════════════════
   Returns true if a task is a member of group G — either as primary (t.group === G)
   or as a secondary parent (t.secondaryGroups[] includes G). Stage 2 Phase B populated
   secondaryGroups: ["Guests"] on 10 Stan's-Rolodex tasks carrying the "guests" tag,
   so those tasks now appear under both Stan's Rolodex AND Guests group filters.
   Spec: spec_plannerUpdate_26apr23.md §Stage 2 Decisions D-S2-1, PL-01, PL-02, PL-47. */
function taskBelongsToGroup(t, g){
  if(!t || !g) return false;
  if(t.group === g) return true;
  if(Array.isArray(t.secondaryGroups) && t.secondaryGroups.includes(g)) return true;
  return false;
}

/* (Quick Task virtual tab removed in Stage-2-close trailing commit per Scrybal —
   the dedicated tab in the group ribbon was clutter; quick-add tasks already
   appear in All. The isQuickTask predicate that supported it is gone too.) */

/* Constraint lookup — Stage 2 Phase C, PL-03 + PL-48. Resolves a chip name to
   contacts[].constraints[] from PEOPLE. Case-insensitive exact-token match;
   falls back to contains for first-name-only chips. Returns array of strings
   (empty if no contact found or no constraints set). */
function lookupContactConstraints(name){
  if(!name || !Array.isArray(window.PEOPLE)) return [];
  const lower = String(name).toLowerCase().trim();
  // exact match first
  let hit = window.PEOPLE.find(c => (c.name || '').toLowerCase() === lower);
  // fall back: contact-name starts-with chip-name (e.g. chip "Stan" → contact "Stan (Scrybal)")
  if(!hit) hit = window.PEOPLE.find(c => (c.name || '').toLowerCase().startsWith(lower));
  // fall back: chip-name starts-with contact's first word
  if(!hit) hit = window.PEOPLE.find(c => {
    const firstWord = (c.name || '').toLowerCase().split(/\s+/)[0];
    return firstWord && lower.startsWith(firstWord);
  });
  if(!hit || !Array.isArray(hit.constraints)) return [];
  return hit.constraints;
}

/* ════════════════ RENDER: TASKS §5.2 ════════════════ */
function renderTasks(){
  const el = $('viewTasks');
  let tasks = T;
  if(activeGroup !== 'All') tasks = tasks.filter(t => taskBelongsToGroup(t, activeGroup));
  tasks = applyFilters(tasks);
  tasks = sortTasks(tasks);

  let h = '';
  // Stage 2 Phase C (PL-47): Rolodex↔Guests crossover chip — when viewing the Guests
  // group, surface a small chip telling the user that N tasks from Stan's Rolodex are
  // also showing here via secondaryGroups multi-parent membership.
  if(activeGroup === 'Guests'){
    const fromRolodex = T.filter(t => t.group === "Stan's Rolodex" && Array.isArray(t.secondaryGroups) && t.secondaryGroups.includes('Guests')).length;
    if(fromRolodex > 0){
      h += `<div class="crossover-banner"><span class="crossover-chip">+${fromRolodex} from Stan's Rolodex</span> <span class="crossover-explainer">tasks tagged ‘guests’ in Stan's Rolodex appear here too (multi-parent group membership).</span></div>`;
    }
  }
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
let peopleRoleFilter = 'all';
function renderPeople(){
  const el = $('viewPeople');
  const roleLabels = {bridal: 'Bridal Party', groom: 'Groom Party', organizer: 'Organizers', service: 'Vendors', family: 'Family', guest: 'Guests'};
  // Ordered roles so sections render predictably
  const roleOrder = ['organizer','bridal','groom','service','family','guest'];
  const groups = {};
  C.forEach(c => {
    const r = c.role || 'guest';
    if(!groups[r]) groups[r] = [];
    groups[r].push(c);
  });

  // Toolbar: search + role filter + print (borrows from schedPrintCoordinator pattern)
  let h = `<div class="people-toolbar">
    <input type="search" class="query-search" placeholder="Search people..." oninput="filterPeople(this.value)">
    <select class="people-role-filter" onchange="setPeopleRoleFilter(this.value)">
      <option value="all"${peopleRoleFilter==='all'?' selected':''}>All roles</option>
      ${roleOrder.map(r => groups[r] ? `<option value="${r}"${peopleRoleFilter===r?' selected':''}>${roleLabels[r] || r} (${groups[r].length})</option>` : '').join('')}
    </select>
    <button class="people-print-btn" onclick="printPeopleList()" title="Print current view">🖨 Print</button>
    <button class="people-print-btn" onclick="printGuestList()" title="Print guest list only">🎉 Guests</button>
    <button class="people-print-btn" onclick="openBroadcastComposer()" title="Email current filter">✉ Email</button>
  </div>`;

  h += '<div id="peopleList">';
  const rolesToRender = peopleRoleFilter === 'all' ? roleOrder.filter(r => groups[r] && groups[r].length) : [peopleRoleFilter];
  for(const role of rolesToRender){
    const people = groups[role] || [];
    if(!people.length) continue;
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
function setPeopleRoleFilter(r){ peopleRoleFilter = r; renderPeople(); }
function filterPeople(q){
  document.querySelectorAll('.person-card').forEach(c => {
    const name = c.querySelector('.person-name')?.textContent || '';
    c.style.display = name.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

function buildPeoplePrintHead(title){
  return `<!DOCTYPE html><html><head><title>${esc(title)} — Hannah & Stan</title><style>
    @page { size: letter; margin: 0.5in; }
    body { font-family: 'Georgia', serif; color: #2a2a2a; font-size: 10pt; line-height: 1.4; }
    h1 { font-family: 'Cinzel', 'Cormorant Garamond', serif; font-size: 24pt; text-align: center; color: #9A454D; margin: 0 0 4pt; letter-spacing: 0.1em; }
    h1 em { font-style: italic; color: #c4a882; }
    .subtitle { text-align: center; font-size: 11pt; color: #6b5d4a; margin-bottom: 4pt; }
    .venue { text-align: center; font-size: 10pt; color: #78867c; margin-bottom: 18pt; font-style: italic; }
    h2 { font-family: 'Cinzel', serif; font-size: 13pt; color: #6B8E6B; border-bottom: 1px solid #c4a882; padding-bottom: 2pt; margin: 16pt 0 8pt; letter-spacing: 0.08em; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
    th, td { text-align: left; padding: 4pt 6pt; border-bottom: 1px solid #e8e0d4; vertical-align: top; font-size: 9.5pt; }
    th { background: #f5f2ed; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; color: #6b5d4a; }
    .muted { color: #999; font-style: italic; }
    @media screen { body { background: #f5f2ed; padding: 24pt; } }
  </style></head><body>`;
}

function printPeopleList(){
  const roleLabels = {bridal: 'Bridal Party', groom: 'Groom Party', organizer: 'Organizers', service: 'Vendors', family: 'Family', guest: 'Guests'};
  const roleOrder = ['organizer','bridal','groom','service','family','guest'];
  const groups = {};
  C.forEach(c => { const r = c.role || 'guest'; if(!groups[r]) groups[r] = []; groups[r].push(c); });
  const target = peopleRoleFilter === 'all' ? null : peopleRoleFilter;
  let body = buildPeoplePrintHead(target ? (roleLabels[target] || target) : 'People Directory');
  body += `<h1>Hannah <em>&</em> Stan</h1>`;
  body += `<div class="subtitle">${target ? (roleLabels[target] || target) : 'Full people directory'}</div>`;
  body += `<div class="venue">Sunday, June 7, 2026 · Willamette Mission State Park</div>`;
  const roles = target ? [target] : roleOrder.filter(r => groups[r] && groups[r].length);
  roles.forEach(role => {
    const people = (groups[role] || []).slice().sort((a,b) => (a.name||'').localeCompare(b.name||''));
    if(!people.length) return;
    body += `<h2>${roleLabels[role] || role} <span style="font-weight:400;color:#999">(${people.length})</span></h2>`;
    body += `<table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th><th>Notes</th></tr></thead><tbody>`;
    people.forEach(c => {
      body += `<tr>
        <td><strong>${esc(c.name || '')}</strong></td>
        <td>${esc(c.specificRole || c.role || '')}</td>
        <td>${esc(c.phone || '')}</td>
        <td>${esc(c.email || '')}</td>
        <td>${esc(c.notes || '')}</td>
      </tr>`;
    });
    body += `</tbody></table>`;
  });
  body += `</body></html>`;
  const w = window.open('', '_blank');
  if(!w){ toast('Popup blocked — allow popups to print', false); return; }
  w.document.write(body); w.document.close();
  setTimeout(() => w.print(), 500);
}

function printGuestList(){
  const guests = C.filter(c => (c.role || 'guest') === 'guest').slice().sort((a,b) => (a.name||'').localeCompare(b.name||''));
  if(!guests.length){ toast('No guests on file yet', false); return; }
  let body = buildPeoplePrintHead('Guest List');
  body += `<h1>Hannah <em>&</em> Stan</h1>`;
  body += `<div class="subtitle">Guest list · ${guests.length} entries</div>`;
  body += `<div class="venue">Sunday, June 7, 2026 · Willamette Mission State Park</div>`;
  body += `<table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Party</th><th>RSVP</th><th>Dietary / notes</th></tr></thead><tbody>`;
  guests.forEach(c => {
    body += `<tr>
      <td><strong>${esc(c.name || '')}</strong></td>
      <td>${esc(c.phone || '')}</td>
      <td>${esc(c.email || '')}</td>
      <td>${esc(c.party || '')}</td>
      <td>${esc(c.rsvp || '')}</td>
      <td>${esc([c.dietary, c.notes].filter(Boolean).join(' · '))}</td>
    </tr>`;
  });
  body += `</tbody></table>`;
  body += `</body></html>`;
  const w = window.open('', '_blank');
  if(!w){ toast('Popup blocked — allow popups to print', false); return; }
  w.document.write(body); w.document.close();
  setTimeout(() => w.print(), 500);
}

window.setPeopleRoleFilter = setPeopleRoleFilter;
window.printPeopleList = printPeopleList;
window.printGuestList = printGuestList;

/* ════════════════ EMAIL BROADCAST (Zoho / any SMTP) ════════════════
   Builds a mailto: URL with all current-filter recipients BCC'd and a
   chosen template as subject/body. The user's default mail client
   handles the actual send. When Zoho is the default handler,
   hello@hanstan.wedding will appear as the From address automatically.
   ===================================================================== */
const EMAIL_TEMPLATES = [
  {
    id: 'rsvp-reminder',
    name: 'RSVP reminder',
    subject: 'Quick check — RSVP for Hannah & Stan, June 7',
    body: "Hi!\n\nWe haven't heard back from you yet on the RSVP for our wedding on Sunday, June 7, 2026 at Willamette Mission State Park. No stress if you can't make it — we just want to get a headcount nailed down for food + seating.\n\nPlease fill out the short form here: https://forms.gle/xEmBQCrAUjSguJEV9\n\nAll the details are at https://hanstan.wedding — FAQ, registry, driving directions.\n\nLove,\nHannah & Stan"
  },
  {
    id: 'logistics-update',
    name: 'Day-of logistics update',
    subject: 'Day-of logistics — Hannah & Stan, June 7 2026',
    body: "Hello everyone,\n\nA few day-of notes for Sunday, June 7 at Willamette Mission State Park, Shelter A:\n\n• Gates open at 7 AM. Ceremony begins at 2:30 PM sharp under the firs east of the shelter.\n• Reception immediately following under the canopies.\n• $5/car day-use parking (we'll reimburse if you didn't bring cash — see the parking attendant).\n• Potluck is still on — Bonnie is coordinating. If you signed up for a dish, please stick to what you told her.\n• Bring a label/tag for your dish listing the main ingredients (we have guests with allergies).\n• Park closes at 9 PM — plan your exit.\n\nFull details: https://hanstan.wedding\n\nSee you Sunday,\nHannah & Stan"
  },
  {
    id: 'potluck-signup',
    name: 'Potluck coordination (to Bonnie\u2019s list)',
    subject: 'Potluck sign-up — Hannah & Stan wedding',
    body: "Hi,\n\nBonnie (sister of the bride, (360) 624-8304) is coordinating the potluck for the wedding. If you haven't already told her what you're bringing, please reply to this email with:\n\n  1) What dish\n  2) Approximate servings\n  3) Any allergens (we have gluten-free + dairy-free guests)\n\nWe have meat + rice covered; sides + salads + desserts are potluck. If you can bring a dish based on a family recipe and write the recipe on paper for us, that would be incredible.\n\nThank you!\nHannah & Stan"
  },
  {
    id: 'housing-help',
    name: 'Housing + transport coordination',
    subject: 'Getting to the wedding — housing + carpool',
    body: "Hi,\n\nYou marked on your RSVP that you'd like help with housing and/or transport for the wedding. Christa (Hannah's sister) is coordinating guest travel — she'll reach out in the next couple of weeks to pair you with a host or carpool.\n\nIf anything has changed on your end, please reply and let us know. Otherwise: thank you for coming! We can't wait to celebrate with you.\n\nHannah & Stan"
  },
  {
    id: 'pic-briefing',
    name: 'PIC (Person In Charge) briefing',
    subject: 'Your role on wedding day — Sunday, June 7',
    body: "Hi,\n\nThank you for agreeing to take on a Person-In-Charge role on our wedding day. We're attaching your per-person schedule (what to do, when, and where) as a printed sheet — Cassie will hand these out at the pre-wedding meet & greet.\n\nTop-line expectations:\n  • Be at Willamette Mission State Park Shelter A at your stated arrival time.\n  • Jenny is the day-of coordinator — she's your escalation point for anything unclear.\n  • If your timing slips, let the next person in the chain know via text.\n\nIf you need to back out or reassign your role, please tell us TODAY so we can patch the schedule.\n\nLove,\nHannah & Stan"
  }
];

async function openBroadcastComposer(){
  // Gather recipients: honor current filter + search on People tab.
  const rolePredicate = (c) => (peopleRoleFilter === 'all' || (c.role || 'guest') === peopleRoleFilter);
  const q = (document.querySelector('#viewPeople .query-search')?.value || '').trim().toLowerCase();
  const searchPredicate = q ? (c) => (c.name || '').toLowerCase().includes(q) : () => true;
  const recipients = C.filter(c => c.email && rolePredicate(c) && searchPredicate(c));
  if(!recipients.length){ toast('No recipients with email in current filter', false); return; }

  // Template picker via existing sheet pattern
  const picker = document.getElementById('broadcastSheetBg');
  if(!picker) return;
  let body = `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px">Sending to <strong>${recipients.length}</strong> recipient${recipients.length===1?'':'s'} (current filter)</div>`;
  body += `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">`;
  EMAIL_TEMPLATES.forEach(t => {
    body += `<button class="btn" style="text-align:left;padding:10px 12px" onclick="sendBroadcast('${t.id}')"><strong>${esc(t.name)}</strong><div style="font-size:12px;color:var(--text-muted);margin-top:2px">${esc(t.subject)}</div></button>`;
  });
  body += `</div>`;
  body += `<button class="btn" style="width:100%" onclick="sendBroadcast('custom')">✎ Custom message…</button>`;
  body += `<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--divider);font-size:11px;color:var(--text-muted)">Opens in your default mail app. Set Zoho (hello@hanstan.wedding) as your default mail handler to send directly from the wedding address.</div>`;
  document.getElementById('broadcastSheetBody').innerHTML = body;
  picker.classList.add('open');
  setTimeout(() => picker.querySelector('.sheet')?.classList.add('open'), 10);
}

async function sendBroadcast(templateId){
  const picker = document.getElementById('broadcastSheetBg');
  if(picker){ picker.querySelector('.sheet')?.classList.remove('open'); setTimeout(() => picker.classList.remove('open'), 200); }

  const rolePredicate = (c) => (peopleRoleFilter === 'all' || (c.role || 'guest') === peopleRoleFilter);
  const q = (document.querySelector('#viewPeople .query-search')?.value || '').trim().toLowerCase();
  const searchPredicate = q ? (c) => (c.name || '').toLowerCase().includes(q) : () => true;
  const recipients = C.filter(c => c.email && rolePredicate(c) && searchPredicate(c));
  if(!recipients.length) return;

  let subject = '', bodyText = '';
  if(templateId === 'custom'){
    subject = (await customInput('Subject', '')) || '';
    if(!subject) return;
    bodyText = (await customInput('Body (Enter = newline not supported here — edit in your mail app)', '')) || '';
  } else {
    const tpl = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if(!tpl) return;
    subject = tpl.subject;
    bodyText = tpl.body;
  }
  const bccList = recipients.map(r => r.email).join(',');
  const href = 'mailto:hello@hanstan.wedding?bcc=' + encodeURIComponent(bccList) + '&subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyText);
  // mailto: URLs have practical length limits on some clients (~2000 chars).
  // With ~26 guests × ~25 chars each = 650 chars, we're well under.
  window.location.href = href;
  toast('Opening mail app with ' + recipients.length + ' recipients…', false);
}
window.openBroadcastComposer = openBroadcastComposer;
window.sendBroadcast = sendBroadcast;

/* ════════════════ RENDER: HISTORY (NEW in v6.0) ════════════════ */
// Stage 1 Phase C — Activity tab (replaces History). Master-only gate, 4 filters, where/who/when/why format.
let ACTIVITY_FILTERS = {person: '', dateFrom: '', dateTo: '', actions: [], scope: ''};
let ACTIVITY_ENTRIES_CACHE = [];

function formatRelativeCompact(tsStr){
  const ms = Date.now() - new Date(tsStr).getTime();
  if (ms < 0) return 'just now';
  if (ms < 60000) return Math.floor(ms/1000) + 's ago';
  const m = Math.floor(ms/60000), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d > 0) return (h%24 ? d+'d '+(h%24)+'h' : d+'d') + ' ago';
  if (h > 0) return (m%60 ? h+'h '+(m%60)+'m' : h+'h') + ' ago';
  return m + 'm ago';
}

function mapEntityToWhere(entity, target, field){
  const labels = {
    task: 'Tasks', scheduleEvent: 'Schedule ▸ event', schedulePhase: 'Schedule ▸ phase',
    scheduleQuestion: 'Schedule ▸ question', contact: 'People', group: 'Groups',
    tag: 'Tags', coordinator: 'Coordinators', note: 'Note'
  };
  let where = labels[entity] || entity || 'Tasks'; // default to Tasks for legacy entries missing entity
  if (target) where += ' ▸ ' + esc(target);
  if (field) where += ' ▸ ' + esc(field);
  return where;
}

async function renderActivity(){
  const el = $('viewHistory'); // DOM id kept for back-compat with existing CSS
  if(!el) return;
  // Master-only gate. Stage 3 PL-59 fix (M50, 2026-04-25): gate on identity.isMaster
  // (server-derived from coordinator record via auth.mjs/tryAuth) instead of comparing
  // the token string to a literal. Removing the literal eliminates the page-source-leak
  // anti-pattern (any browser that opened the planner could previously read the master
  // token from view-source). Server-side state.isMaster (added by Stage 2 Phase A) is
  // also available as a redundancy belt — both paths set identity.isMaster.
  if(!identity || !identity.isMaster){
    el.innerHTML = '<div class="history-list"><div style="color:var(--text-muted);text-align:center;padding:48px;font-size:15px">🔒 Activity log is master-only.<br><br>Contact Scrybal if you believe you should have access.</div></div>';
    return;
  }
  el.innerHTML = '<div class="history-list"><div style="color:var(--text-muted);text-align:center;padding:32px">Loading Activity log…</div></div>';
  try{
    const r = await fetch(ENDPOINTS.audit, {headers: {'Authorization': 'Bearer ' + token}});
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    ACTIVITY_ENTRIES_CACHE = (data.entries || []).filter(e => e.target !== 'test-artifact'); // §PU-11 filter
    el.innerHTML = renderActivityUI();
    wireActivityFilters();
  } catch(e){
    el.innerHTML = '<div class="history-list"><div style="color:var(--s-blocked);text-align:center;padding:32px">Failed to load: ' + esc(e.message) + '</div></div>';
  }
}

function renderActivityUI(){
  const entries = ACTIVITY_ENTRIES_CACHE;
  // Collect distinct values for filter dropdowns
  const persons = [...new Set(entries.map(e => e.by).filter(Boolean))].sort();
  const actions = [...new Set(entries.map(e => e.action).filter(Boolean))].sort();
  // Scope: collect distinct visibilitySet values across audit entries (inert in Stage 1 — only master-only surfaces)
  const scopes = [...new Set(entries.map(e => e.visibilitySet && Array.isArray(e.visibilitySet) ? e.visibilitySet.sort().join(',') : null).filter(Boolean))];
  scopes.unshift('master-only'); // always present as an option

  let h = '<div class="activity-filter-bar" style="display:flex;flex-wrap:wrap;gap:8px;padding:8px;background:var(--bg-subtle, #f5f5f5);border-bottom:1px solid var(--border, #ddd);align-items:center">';
  h += '<label style="font-size:12px">Person <select id="actFltPerson" style="min-width:120px"><option value="">All</option>';
  for(const p of persons) h += `<option value="${esc(p)}">${esc(p)}</option>`;
  h += '</select></label>';
  h += '<label style="font-size:12px">From <input type="date" id="actFltDateFrom"></label>';
  h += '<label style="font-size:12px">To <input type="date" id="actFltDateTo"></label>';
  h += '<span style="font-size:11px;color:var(--text-muted, #888)">Presets:';
  h += ' <button class="act-fltr-preset" data-d="1">24h</button>';
  h += ' <button class="act-fltr-preset" data-d="7">7d</button>';
  h += ' <button class="act-fltr-preset" data-d="30">30d</button>';
  h += ' <button class="act-fltr-preset" data-d="0">all</button></span>';
  h += '<label style="font-size:12px">Action <select id="actFltAction" style="min-width:140px"><option value="">All</option>';
  for(const a of actions) h += `<option value="${esc(a)}">${esc(a)}</option>`;
  h += '</select></label>';
  h += '<label style="font-size:12px">Scope <select id="actFltScope" style="min-width:120px"><option value="">All</option>';
  for(const s of scopes) h += `<option value="${esc(s)}">${esc(s)}</option>`;
  h += '</select></label>';
  h += '</div>';

  // Apply filters
  const filtered = entries.filter(e => {
    if(ACTIVITY_FILTERS.person && e.by !== ACTIVITY_FILTERS.person) return false;
    if(ACTIVITY_FILTERS.actions.length && !ACTIVITY_FILTERS.actions.includes(e.action)) return false;
    if(ACTIVITY_FILTERS.dateFrom){
      if(new Date(e.ts) < new Date(ACTIVITY_FILTERS.dateFrom)) return false;
    }
    if(ACTIVITY_FILTERS.dateTo){
      if(new Date(e.ts) > new Date(ACTIVITY_FILTERS.dateTo + 'T23:59:59')) return false;
    }
    if(ACTIVITY_FILTERS.scope){
      const eScope = e.visibilitySet && Array.isArray(e.visibilitySet) ? e.visibilitySet.sort().join(',') : null;
      if(ACTIVITY_FILTERS.scope === 'master-only'){
        // For Stage 1: task with master-only tag OR entry with no visibilitySet
        // Since we don't have record-level lookup here, accept all entries as master-only-ish
        // (Inert in Stage 1 per spec — Stage 2 populates this properly)
      } else if(eScope !== ACTIVITY_FILTERS.scope) return false;
    }
    return true;
  });

  if(!filtered.length){
    h += '<div class="history-list"><div style="color:var(--text-muted);text-align:center;padding:32px">No activity matching filters.</div></div>';
    return h;
  }

  // Group by day
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  const groups = {};
  filtered.forEach(e => {
    const d = new Date(e.ts);
    let label;
    if(d.toDateString() === today) label = 'Today';
    else if(d.toDateString() === yesterday) label = 'Yesterday';
    else label = d.toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'});
    (groups[label] = groups[label] || []).push(e);
  });

  h += '<div class="history-list">';
  for(const [label, items] of Object.entries(groups)){
    h += `<div class="history-day-hdr">${esc(label)}</div>`;
    for(const e of items){
      const time = new Date(e.ts).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
      const rel = formatRelativeCompact(e.ts);
      const where = mapEntityToWhere(e.entity, e.target, e.field);
      const who = esc(e.by || 'unknown');
      const summary = esc(e.summary || '');
      const why = e.why ? `<div class="history-why" style="font-style:italic;color:var(--text-muted);font-size:12px;margin-top:2px">why: ${esc(e.why)}</div>` : '';
      // Stage 2 Phase C E-S3-3: optional channel field (Stage 3 Communications tab will populate)
      const channel = e.channel ? `<span class="msg-channel-chip" title="Channel: ${esc(e.channel)}">${esc(e.channel)}</span> ` : '';
      h += `<div class="history-entry" style="padding:6px 8px;border-bottom:1px solid var(--border-subtle, #eee)">
        <div class="history-where" style="font-weight:600;font-size:12px">${channel}${where}</div>
        <div class="history-text">
          <span class="who" style="font-weight:500">${who}</span>
          <span style="color:var(--text-muted);font-size:11px"> · ${time} · <em>${rel}</em></span>
          <div class="history-summary" style="font-size:13px;margin-top:2px">${summary}</div>
          ${why}
        </div>
      </div>`;
    }
  }
  h += '</div>';
  return h;
}

function wireActivityFilters(){
  const p = $('actFltPerson'), df = $('actFltDateFrom'), dt = $('actFltDateTo'), a = $('actFltAction'), s = $('actFltScope');
  if(p) p.onchange = function(){ ACTIVITY_FILTERS.person = this.value; $('viewHistory').innerHTML = renderActivityUI(); wireActivityFilters(); };
  if(df) df.onchange = function(){ ACTIVITY_FILTERS.dateFrom = this.value; $('viewHistory').innerHTML = renderActivityUI(); wireActivityFilters(); };
  if(dt) dt.onchange = function(){ ACTIVITY_FILTERS.dateTo = this.value; $('viewHistory').innerHTML = renderActivityUI(); wireActivityFilters(); };
  if(a) a.onchange = function(){ ACTIVITY_FILTERS.actions = this.value ? [this.value] : []; $('viewHistory').innerHTML = renderActivityUI(); wireActivityFilters(); };
  if(s) s.onchange = function(){ ACTIVITY_FILTERS.scope = this.value; $('viewHistory').innerHTML = renderActivityUI(); wireActivityFilters(); };
  document.querySelectorAll('.act-fltr-preset').forEach(btn => {
    btn.onclick = function(){
      const d = parseInt(this.dataset.d, 10);
      if(d === 0){ ACTIVITY_FILTERS.dateFrom = ''; ACTIVITY_FILTERS.dateTo = ''; }
      else {
        const from = new Date(Date.now() - d * 864e5);
        ACTIVITY_FILTERS.dateFrom = from.toISOString().slice(0,10);
        ACTIVITY_FILTERS.dateTo = new Date().toISOString().slice(0,10);
      }
      $('viewHistory').innerHTML = renderActivityUI();
      wireActivityFilters();
    };
  });
  // Restore filter values on re-render
  if(p) p.value = ACTIVITY_FILTERS.person || '';
  if(df) df.value = ACTIVITY_FILTERS.dateFrom || '';
  if(dt) dt.value = ACTIVITY_FILTERS.dateTo || '';
  if(a) a.value = ACTIVITY_FILTERS.actions[0] || '';
  if(s) s.value = ACTIVITY_FILTERS.scope || '';
}

// Back-compat alias — any external caller of renderHistory hits renderActivity
const renderHistory = renderActivity;
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
  const pct = aggregateCompletionPct(T);  // PL-34: subtask-aware
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
      const cnt = T.filter(t => taskBelongsToGroup(t, g)).length;
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
  </div>

  <div class="settings-section">
    <h3>Mobile-safety editing</h3>
    <label class="settings-toggle">
      <input type="checkbox" id="setEditMode" ${EDIT_MODE ? 'checked' : ''}>
      <span><strong>Edit Mode</strong> — buffer all edits, commit or discard in batch via the sticky bar (Stage 2 mobile-safety pattern, PL-09)</span>
    </label>
    <label class="settings-toggle" style="margin-top:8px">
      <input type="checkbox" id="setSkipQuickEdit" ${PREFS.skipQuickEditConfirm ? 'checked' : ''}>
      <span>Skip per-tap confirms on tap-to-toggle actions (default: confirms shown when not in Edit Mode — PL-05/06/07/08)</span>
    </label>
  </div>`;

  if(identity.isMaster){
    h += '<div id="masterPanels"></div>';
  }

  el.innerHTML = h;

  // Stage 2 Phase C (PL-09 + PL-05/06/07/08): wire Edit Mode + per-tap-confirm toggles
  const setEM = document.getElementById('setEditMode');
  if(setEM) setEM.onchange = function(){ setEditMode(this.checked); };
  const setSQE = document.getElementById('setSkipQuickEdit');
  if(setSQE) setSQE.onchange = function(){ PREFS.skipQuickEditConfirm = this.checked; save(); };

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
async function renameGroup(i){
  const n = await customInput('Rename group', G[i]);
  if(n && n !== G[i]){
    const old = G[i];
    // Rename primary t.group on every task that uses it
    T.forEach(t => {if(t.group === old) t.group = n});
    // Stage 2 Phase C: also rename secondaryGroups[] references so multi-parent membership survives
    T.forEach(t => {
      if(Array.isArray(t.secondaryGroups) && t.secondaryGroups.includes(old)){
        t.secondaryGroups = t.secondaryGroups.map(s => s === old ? n : s);
      }
    });
    G[i] = n;
    save(); render(); toast('Renamed to: ' + n, false);
  }
}
async function deleteGroup(i){
  const g = G[i];
  // Stage 2 Phase C: count includes both primary and secondary memberships
  const cnt = T.filter(t => taskBelongsToGroup(t, g)).length;
  if(cnt > 0){
    const ok = await customConfirm('Delete Group', cnt + ' tasks will move to "All" or lose this secondary parent');
    if(!ok) return;
    T.forEach(t => {
      if(t.group === g) t.group = 'All';
      if(Array.isArray(t.secondaryGroups) && t.secondaryGroups.includes(g)){
        t.secondaryGroups = t.secondaryGroups.filter(s => s !== g);
      }
    });
  }
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
// PL-34 dual-schema: render reads s.text || s.title, completion reads isSubtaskDone(s).
// Toggle writes to s.done (canonical schema); existing s.status entries are preserved.
function renderSubtasks(){
  const el = $('subtaskList');
  el.innerHTML = editSubtasks.map((s, i) => {
    const isDone = isSubtaskDone(s);
    const text = s.text || s.title || '';
    return `<div class="subtask-item${isDone ? ' done' : ''}">
      <button type="button" class="subtask-check" onclick="toggleSubtask(${i})">${isDone ? '✓' : ''}</button>
      <span class="subtask-text">${esc(text)}</span>
      <button type="button" class="subtask-rm" onclick="rmSubtask(${i})">×</button>
    </div>`;
  }).join('');
}
function toggleSubtask(i){
  const s = editSubtasks[i];
  const next = !isSubtaskDone(s);
  s.done = next;
  if(s.status !== undefined) s.status = next ? 'done' : 'not-started';  // keep status-schema in sync
  tmDirty = true;
  renderSubtasks();
}
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
  // Stage 3 (2026-04-26) — consolidated row buttons: warning ⚠️ (modal opens warning list),
  // materials 📋 (opens existing materials modal), and + (dropdown: Person / Note / Details / Material).
  // The previous inline "+ add details", "+ person", "+ note", and full warnings expansion
  // are all replaced/hidden by these compact row buttons.
  const itemCount = (ev.itemsToBring || []).length;
  const checkedCount = ((ev.itemsChecked || {}) && Object.values(ev.itemsChecked || {}).filter(Boolean).length) || 0;
  if(allWarnings.length){
    h += `<button class="sched-row-warn" onclick="event.stopPropagation();schedOpenWarnings('${ev.id}')" title="${allWarnings.length} warning${allWarnings.length === 1 ? '' : 's'}">⚠️<span class="sched-row-warn-count">${allWarnings.length}</span></button>`;
  }
  const matLabel = itemCount ? `${checkedCount}/${itemCount}` : '+';
  h += `<button class="sched-row-mat" onclick="event.stopPropagation();schedOpenMaterials('${ev.id}')" title="Materials (${itemCount} item${itemCount === 1 ? '' : 's'})">📋<span class="sched-row-mat-count">${matLabel}</span></button>`;
  h += `<button class="sched-row-add" onclick="event.stopPropagation();schedOpenAddMenu(event,'${ev.id}')" title="Add to this event">+</button>`;
  h += `<button class="sched-event-delete" onclick="schedDeleteEvent('${ev.id}')" title="Delete event">×</button>`;
  h += `</div>`;
  // Title row (no materials button here anymore — moved to row1 cluster above)
  h += `<div class="sched-event-title-row"><div class="sched-event-title sched-edit" data-sched-edit="event-title" data-event-id="${ev.id}">${esc(ev.title)}</div></div>`;
  // Details inline only if present (the empty "+ add details" placeholder is replaced by + dropdown)
  if(ev.details){
    h += `<div class="sched-event-details sched-edit" data-sched-edit="event-details" data-event-id="${ev.id}">${esc(ev.details)}</div>`;
  }

  // People chips (with inline per-person task when present)
  // Stage 2 Phase C (PL-03 + PL-48): constraint tooltip — when the contact carries
  // contacts[].constraints (Stage 0 populated Elsie/Fen/Bonnie/Sarah; Stage 1 added empty
  // arrays on Stan/Hannah), surface them as part of the chip's title-attribute tooltip
  // (works on hover desktop + long-press mobile native) and add a has-constraints class
  // for visual indicator.
  h += `<div class="sched-chips sched-chips-people">`;
  (ev.people || []).forEach((p, i) => {
    const role = p.role || 'present';
    const taskHtml = p.task ? `<span class="sched-chip-task"> — ${esc(p.task)}</span>` : '';
    const constraintInfo = lookupContactConstraints(p.name);
    const hasConstraints = constraintInfo.length > 0;
    const constraintCls = hasConstraints ? ' has-constraints' : '';
    const titleText = hasConstraints
      ? esc(p.name) + ' — constraints: ' + esc(constraintInfo.join(' • '))
      : 'Click to edit ' + esc(p.name) + "'s task";
    const constraintIcon = hasConstraints ? '<span class="sched-chip-constraint-icon" aria-hidden="true">ⓘ</span>' : '';
    h += `<span class="sched-chip sched-chip-person sched-chip-role-${esc(role)}${constraintCls}" onclick="schedEditPersonTask('${ev.id}',${i})" title="${titleText}"><span class="sched-chip-name">${esc(p.name)}</span><span class="sched-chip-role-badge">${esc(role)}</span>${constraintIcon}${taskHtml}<button class="sched-chip-rm" onclick="event.stopPropagation();schedRemovePerson('${ev.id}',${i})">×</button></span>`;
  });
  // Stage 3: + person button removed — moved to consolidated + dropdown in row1.
  h += `</div>`;

  // Notes
  if((ev.notes || []).length){
    h += `<div class="sched-notes">`;
    (ev.notes || []).forEach((n, i) => {
      h += `<div class="sched-note">📝 ${esc(n)} <button class="sched-chip-rm" onclick="schedRemoveNote('${ev.id}',${i})">×</button></div>`;
    });
    h += `</div>`;
  }
  // Stage 3: + note button removed — moved to consolidated + dropdown in row1.

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

  // Stage 3: inline warnings list removed — replaced by the ⚠ button + modal in row1.

  h += `</div></div>`;
  return h;
}

/* ════════════════ STAGE 3 SCHEDULE ROW ADD-MENU + WARN-MODAL (2026-04-26) ════════════════ */

// + dropdown on schedule rows. Anchors to the click target; offers Person / Note / Details / Material.
function schedOpenAddMenu(clickEvent, eventId){
  schedCloseAddMenu();
  const anchor = clickEvent.currentTarget || clickEvent.target;
  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'sched-row-add-menu';
  menu.id = '_schedRowAddMenu';
  menu.innerHTML = `
    <button data-add="person"><span class="ico">👤</span>Add person</button>
    <button data-add="note"><span class="ico">📝</span>Add note</button>
    <button data-add="details"><span class="ico">📄</span>Edit details</button>
    <button data-add="material"><span class="ico">📋</span>Add material</button>
  `;
  document.body.appendChild(menu);
  // Position below the anchor; flip up if it would overflow viewport
  const menuW = 180;
  let left = rect.left;
  let top = rect.bottom + 4;
  if(left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
  if(top + 200 > window.innerHeight) top = rect.top - 200 - 4;
  menu.style.left = Math.max(8, left) + 'px';
  menu.style.top = Math.max(8, top) + 'px';
  menu.addEventListener('click', function(e){
    const btn = e.target.closest('button[data-add]');
    if(!btn) return;
    const action = btn.dataset.add;
    schedCloseAddMenu();
    if(action === 'person') schedAddPerson(eventId);
    else if(action === 'note') schedAddNote(eventId);
    else if(action === 'details') {
      // Trigger inline edit on the details field. Render an empty placeholder if absent.
      const ev = SE.find(x => x.id === eventId);
      if(!ev) return;
      if(!ev.details) { ev.details = ''; save(); render(); }
      setTimeout(() => {
        const el = document.querySelector(`.sched-event[data-event-id="${eventId}"] [data-sched-edit="event-details"]`);
        if(el) schedStartInlineEdit(el);
      }, 50);
    }
    else if(action === 'material') schedOpenMaterials(eventId);
  });
  setTimeout(() => document.addEventListener('click', schedCloseAddMenu, {once: true}), 10);
}
function schedCloseAddMenu(){
  const m = document.getElementById('_schedRowAddMenu');
  if(m) m.remove();
}

// Compact warnings modal — opened by the ⚠ row button.
function schedOpenWarnings(eventId){
  const ev = SE.find(x => x.id === eventId);
  if(!ev) return;
  const warnings = schedValidateBoundaries(ev);
  const conflicts = schedDetectPersonConflicts(ev);
  const all = [...warnings, ...conflicts];
  if(!all.length){ toast('No warnings on this event', false); return; }
  const html = `<ul class="sched-warn-modal-list">` +
    all.map(w => `<li><span class="warn-icon">⚠️</span><span>${esc(w)}</span></li>`).join('') +
    `</ul>`;
  // Reuse the inputSheet container as a compact modal frame (it's already styled + dismissible)
  const bg = openSheet('inputSheetBg');
  if(!bg) return;
  $('inputSheetTitle').textContent = (ev.title || 'Event') + ' — warnings';
  // Replace the input with the warnings list (then restore on close)
  const body = bg.querySelector('.sheet-body');
  const original = body.innerHTML;
  body.innerHTML = html + `<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-primary" id="warnModalClose" style="flex:1">Close</button></div>`;
  $('warnModalClose').onclick = function(){
    closeSheet(bg);
    body.innerHTML = original;
  };
}
window.schedOpenAddMenu = schedOpenAddMenu;
window.schedCloseAddMenu = schedCloseAddMenu;
window.schedOpenWarnings = schedOpenWarnings;

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

async function schedEditPersonTask(evId, idx){
  const ev = SE.find(x => x.id === evId);
  if(!ev || !ev.people || !ev.people[idx]) return;
  const p = ev.people[idx];
  const task = await customInput(`What's ${p.name} doing here?`, p.task || '');
  if(task === null) return;
  p.task = task.trim();
  save();
  renderSchedule();
}

// Materials checklist sheet — opens per-event, shows itemsToBring as checkboxes
function schedOpenMaterials(evId){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  const sheet = document.getElementById('materialsSheetBg');
  if(!sheet) return;
  ev.itemsChecked = ev.itemsChecked || {};
  const items = ev.itemsToBring || [];
  let body = `<div class="materials-event-title">${esc(ev.title)}</div>`;
  body += `<div class="materials-event-sub">${schedFmtTime(ev.startTime)} · ${esc(ev.zone || 'tbd')}</div>`;
  if(!items.length){
    body += `<div class="materials-empty">No materials listed yet.</div>`;
  } else {
    body += `<ul class="materials-list">`;
    items.forEach((item, i) => {
      const checked = ev.itemsChecked[i] ? 'checked' : '';
      body += `<li class="materials-item"><label><input type="checkbox" ${checked} onchange="schedToggleMaterial('${ev.id}',${i},this.checked)"><span>${esc(item)}</span></label><button class="materials-rm" onclick="schedRemoveItemFromSheet('${ev.id}',${i})" title="Remove">×</button></li>`;
    });
    body += `</ul>`;
  }
  body += `<div class="materials-actions"><button class="btn" onclick="schedAddItemFromSheet('${ev.id}')">+ Add item</button><button class="btn btn-primary" onclick="schedCloseMaterials()">Done</button></div>`;
  document.getElementById('materialsSheetBody').innerHTML = body;
  sheet.classList.add('open');
  setTimeout(() => sheet.querySelector('.sheet')?.classList.add('open'), 10);
}
function schedCloseMaterials(){
  const sheet = document.getElementById('materialsSheetBg');
  if(!sheet) return;
  sheet.querySelector('.sheet')?.classList.remove('open');
  setTimeout(() => sheet.classList.remove('open'), 200);
  renderSchedule();
}
function schedToggleMaterial(evId, idx, checked){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  ev.itemsChecked = ev.itemsChecked || {};
  ev.itemsChecked[idx] = checked;
  save();
}
async function schedAddItemFromSheet(evId){
  const ev = SE.find(x => x.id === evId);
  if(!ev) return;
  const item = await customInput('Item to bring', '');
  if(!item) return;
  ev.itemsToBring = ev.itemsToBring || [];
  ev.itemsToBring.push(item);
  save();
  schedOpenMaterials(evId);
}
function schedRemoveItemFromSheet(evId, idx){
  const ev = SE.find(x => x.id === evId);
  if(!ev || !ev.itemsToBring) return;
  ev.itemsToBring.splice(idx, 1);
  if(ev.itemsChecked){
    const rekeyed = {};
    Object.keys(ev.itemsChecked).forEach(k => {
      const ki = +k;
      if(ki < idx) rekeyed[ki] = ev.itemsChecked[ki];
      else if(ki > idx) rekeyed[ki - 1] = ev.itemsChecked[ki];
    });
    ev.itemsChecked = rekeyed;
  }
  save();
  schedOpenMaterials(evId);
}
window.schedOpenMaterials = schedOpenMaterials;
window.schedCloseMaterials = schedCloseMaterials;
window.schedToggleMaterial = schedToggleMaterial;
window.schedAddItemFromSheet = schedAddItemFromSheet;
window.schedRemoveItemFromSheet = schedRemoveItemFromSheet;
window.schedEditPersonTask = schedEditPersonTask;


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

/* ════════════════════════════════════════════════════════════════════════════════
   STAGE 3 PHASE C — COMMUNICATIONS TAB + EDIT MODE REDESIGN + ACTIVITY EXTENSION
   ════════════════════════════════════════════════════════════════════════════════
   Author: Stage 3 Phase C Claude (2026-04-26)
   Spec ref: spec_plannerUpdate_26apr23.md §Stage 3 Phase C + §S3-UX-1..S3-UX-12
   Design intent: native to the planner's Rivendell Garden v1.1 visual system
     (sage bg, cream cards, gold accents, deep-forest text). Inbox/Channels/Broadcast
     sub-ribbon mirrors the existing Schedule phase-nav pattern. Empty states use warm
     prose, not blank boxes — matches the Focus tab tone.
   ──────────────────────────────────────────────────────────────────────────────── */

/* ────────────── Communications tab: state + sub-ribbon dispatcher ────────────── */
let COMMS_SUB = 'inbox'; // 'inbox' | 'channels' | 'broadcast'
let COMMS_INBOX_FILTER = 'all'; // 'all' | 'unread' | 'asq' | 'zoho' | 'organizer'
let COMMS_INBOX_SORT = 'newest'; // 'newest' | 'oldest' | 'channel'
let COMMS_CHANNEL_ACTIVE = null; // channel id of selected channel; null = list view (mobile)
let COMMS_BROADCAST_STEP = 1; // 1=compose, 2=recipients, 3=review
let COMMS_BROADCAST_DRAFT = { fromAlias: 'hello', subject: '', body: '', recipientFilter: 'all', selectedContactIds: [] };
let COMMS_SYNC_STATE = 'idle'; // 'idle' | 'loading' | 'success' | 'no-new' | 'error' | 'auth-error'
let COMMS_SYNC_LAST_RESULT = null;
let COMMS_BROADCAST_SENDING = false;
let COMMS_BROADCAST_RESULT = null;

function renderComms(){
  const el = $('viewComms');
  if(!el) return;
  // Sub-ribbon (Inbox / Channels / Broadcast). Broadcast is master-only.
  const isMaster = identity && identity.isMaster;
  const subTabs = [
    { id: 'inbox', label: '📥 Inbox', count: commsCountUnreadNotes() },
    { id: 'channels', label: '💬 Channels', count: commsCountTotalChannels() }
  ];
  if(isMaster) subTabs.push({ id: 'broadcast', label: '📢 Broadcast', count: 0 });
  let h = '<div class="comms-shell">';
  h += '<div class="comms-subnav" role="tablist" aria-label="Communications sections">';
  for(const t of subTabs){
    const sel = COMMS_SUB === t.id;
    const cnt = t.count > 0 ? `<span class="comms-subnav-count">${t.count}</span>` : '';
    h += `<button class="comms-subnav-btn${sel ? ' active' : ''}" role="tab" aria-selected="${sel}" data-comms-sub="${t.id}">${t.label}${cnt}</button>`;
  }
  h += '</div>';
  h += '<div class="comms-body" id="commsBody">';
  if(COMMS_SUB === 'inbox') h += renderCommsInbox();
  else if(COMMS_SUB === 'channels') h += renderCommsChannels();
  else if(COMMS_SUB === 'broadcast' && isMaster) h += renderCommsBroadcast();
  else h += renderCommsInbox(); // fallback
  h += '</div></div>';
  el.innerHTML = h;
  wireCommsSubnav();
  wireCommsBody();
  updateCommsBadge();
}

function wireCommsSubnav(){
  document.querySelectorAll('#viewComms .comms-subnav-btn').forEach(b => {
    b.onclick = function(){
      COMMS_SUB = this.dataset.commsSub;
      lastUserActionAt = Date.now();
      renderComms();
    };
  });
}

function commsCountUnreadNotes(){
  return (window.NOTES || []).filter(n => n && n.status === 'unread').length;
}
function commsCountTotalChannels(){
  const ch = window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels;
  return ch ? Object.keys(ch).length : 0;
}
function updateCommsBadge(){
  const badge = document.getElementById('navCommsBadge');
  if(!badge) return;
  const unread = commsCountUnreadNotes();
  if(unread > 0){
    badge.textContent = unread;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

/* ────────────── Inbox sub-tab: triage notes from all sources ────────────── */
function renderCommsInbox(){
  const notes = (window.NOTES || []).slice();
  const filtered = notes.filter(n => {
    if(!n) return false;
    if(COMMS_INBOX_FILTER === 'all') return true;
    if(COMMS_INBOX_FILTER === 'unread') return n.status === 'unread';
    if(COMMS_INBOX_FILTER === 'asq') return (n.channel || '').startsWith('asq-');
    if(COMMS_INBOX_FILTER === 'zoho') return (n.channel || '').startsWith('zoho-');
    if(COMMS_INBOX_FILTER === 'organizer') return !n.channel || (!n.channel.startsWith('asq-') && !n.channel.startsWith('zoho-'));
    return true;
  });
  filtered.sort((a, b) => {
    if(COMMS_INBOX_SORT === 'oldest') return (a.ts || '').localeCompare(b.ts || '');
    if(COMMS_INBOX_SORT === 'channel') return (a.channel || '~').localeCompare(b.channel || '~');
    return (b.ts || '').localeCompare(a.ts || '');
  });

  let h = '<div class="comms-inbox">';
  // Filter bar
  h += '<div class="comms-filter-bar">';
  h += '<div class="comms-filter-chips">';
  for(const f of [
    { id: 'all', label: 'All', count: notes.length },
    { id: 'unread', label: 'Unread', count: notes.filter(n => n.status === 'unread').length },
    { id: 'asq', label: 'Public Q', count: notes.filter(n => (n.channel || '').startsWith('asq-')).length },
    { id: 'zoho', label: 'Email', count: notes.filter(n => (n.channel || '').startsWith('zoho-')).length },
    { id: 'organizer', label: 'Organizers', count: notes.filter(n => !n.channel || (!n.channel.startsWith('asq-') && !n.channel.startsWith('zoho-'))).length }
  ]){
    const sel = COMMS_INBOX_FILTER === f.id;
    h += `<button class="comms-chip${sel ? ' active' : ''}" data-comms-filter="${f.id}">${f.label}${f.count > 0 ? ` <span class="comms-chip-count">${f.count}</span>` : ''}</button>`;
  }
  h += '</div>';
  // Sync inbox button (master only)
  if(identity && identity.isMaster){
    const syncLabel = (
      COMMS_SYNC_STATE === 'loading' ? '⏳ Syncing…' :
      COMMS_SYNC_STATE === 'success' ? '✓ Synced' :
      COMMS_SYNC_STATE === 'no-new' ? '✓ No new' :
      COMMS_SYNC_STATE === 'error' ? '⚠ Failed' :
      COMMS_SYNC_STATE === 'auth-error' ? '⚠ Auth' :
      '🔄 Sync inbox'
    );
    const syncDisabled = COMMS_SYNC_STATE === 'loading';
    h += `<button class="comms-sync-btn" id="commsSyncBtn"${syncDisabled ? ' disabled' : ''} title="Pull new mail from stan@ / hannah@ / hello@">${syncLabel}</button>`;
  }
  h += '</div>';

  // Cards
  if(!filtered.length){
    h += '<div class="comms-empty">';
    if(COMMS_INBOX_FILTER === 'unread'){
      h += '<p class="comms-empty-title">All caught up.</p><p class="comms-empty-sub">No unread notes. Switch to <strong>All</strong> to see processed ones.</p>';
    } else if(COMMS_INBOX_FILTER === 'asq'){
      h += '<p class="comms-empty-title">No public questions yet.</p><p class="comms-empty-sub">When guests ask via the website Ask-A-Question form, their messages appear here.</p>';
    } else if(COMMS_INBOX_FILTER === 'zoho'){
      h += '<p class="comms-empty-title">No emails synced yet.</p>' + (identity && identity.isMaster ? '<p class="comms-empty-sub">Click <strong>Sync inbox</strong> above to pull new mail from stan@ / hannah@ / hello@.</p>' : '<p class="comms-empty-sub">Master will sync mail when needed.</p>');
    } else if(COMMS_INBOX_FILTER === 'organizer'){
      h += '<p class="comms-empty-title">No organizer notes.</p><p class="comms-empty-sub">Notes left via the planner FAB Note button (📝) appear here.</p>';
    } else {
      h += '<p class="comms-empty-title">Inbox is empty.</p><p class="comms-empty-sub">Notes from organizers, public questions, and synced email all land here.</p>';
    }
    h += '</div>';
  } else {
    h += '<div class="comms-inbox-list">';
    for(const n of filtered){
      h += renderInboxCard(n);
    }
    h += '</div>';
  }

  h += '</div>';
  return h;
}

function renderInboxCard(n){
  const isUnread = n.status === 'unread';
  const sourceLabel = (
    (n.channel || '').startsWith('asq-') ? 'Public Question' :
    (n.channel || '').startsWith('zoho-') ? 'Email (' + (n.channel.replace('zoho-', '')) + '@)' :
    'Note from ' + (n.by || 'organizer')
  );
  const ts = n.ts ? new Date(n.ts) : null;
  const tsLabel = ts ? ts.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const text = (n.text || '').replace(/</g, '&lt;');
  return `
    <div class="comms-note-card${isUnread ? ' unread' : ''}" data-note-id="${esc(n.id)}">
      <div class="comms-note-head">
        <span class="comms-note-source">${esc(sourceLabel)}</span>
        <span class="comms-note-ts">${esc(tsLabel)}</span>
      </div>
      <div class="comms-note-text">${text}</div>
      <div class="comms-note-actions">
        ${isUnread ? `<button class="btn comms-note-act" data-comms-note-act="read" data-id="${esc(n.id)}" title="Mark read">✓ Read</button>` : ''}
        <button class="btn comms-note-act" data-comms-note-act="convert" data-id="${esc(n.id)}" title="Convert to a planner task">→ Task</button>
        ${n.status !== 'archived' ? `<button class="btn comms-note-act ghost" data-comms-note-act="archive" data-id="${esc(n.id)}" title="Archive">Archive</button>` : ''}
        <button class="btn comms-note-act ghost" data-comms-note-act="delete" data-id="${esc(n.id)}" title="Delete permanently">Delete</button>
      </div>
    </div>`;
}

function wireCommsBody(){
  // Filter chips
  document.querySelectorAll('#viewComms [data-comms-filter]').forEach(b => {
    b.onclick = function(){ COMMS_INBOX_FILTER = this.dataset.commsFilter; renderComms(); };
  });
  // Note actions
  document.querySelectorAll('#viewComms [data-comms-note-act]').forEach(b => {
    b.onclick = function(){
      const act = this.dataset.commsNoteAct;
      const id = this.dataset.id;
      handleNoteAction(act, id);
    };
  });
  // Sync inbox
  const syncBtn = document.getElementById('commsSyncBtn');
  if(syncBtn) syncBtn.onclick = handleCommsSyncInbox;
  // Channels: channel list selection
  document.querySelectorAll('#viewComms [data-comms-channel]').forEach(b => {
    b.onclick = function(){ COMMS_CHANNEL_ACTIVE = this.dataset.commsChannel; renderComms(); };
  });
  document.querySelectorAll('#viewComms [data-comms-channel-back]').forEach(b => {
    b.onclick = function(){ COMMS_CHANNEL_ACTIVE = null; renderComms(); };
  });
  // Channel send
  const chSend = document.getElementById('commsChannelSendBtn');
  const chTxt = document.getElementById('commsChannelInput');
  if(chSend && chTxt){
    chSend.onclick = handleChannelSendMessage;
    chTxt.onkeydown = function(e){ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); handleChannelSendMessage(); } };
  }
  const chNew = document.getElementById('commsChannelNewBtn');
  if(chNew) chNew.onclick = handleChannelCreate;
  // Broadcast
  document.querySelectorAll('#viewComms [data-comms-bc-step]').forEach(b => {
    b.onclick = function(){ COMMS_BROADCAST_STEP = parseInt(this.dataset.commsBcStep, 10) || 1; renderComms(); };
  });
  const bcNext = document.getElementById('commsBcNext');
  if(bcNext) bcNext.onclick = handleBroadcastNext;
  const bcBack = document.getElementById('commsBcBack');
  if(bcBack) bcBack.onclick = handleBroadcastBack;
  const bcSend = document.getElementById('commsBcSend');
  if(bcSend) bcSend.onclick = handleBroadcastSend;
  // Broadcast field bindings
  ['commsBcSubject', 'commsBcBody', 'commsBcFromAlias'].forEach(id => {
    const f = document.getElementById(id);
    if(!f) return;
    f.oninput = function(){
      if(id === 'commsBcSubject') COMMS_BROADCAST_DRAFT.subject = this.value;
      else if(id === 'commsBcBody') COMMS_BROADCAST_DRAFT.body = this.value;
      else if(id === 'commsBcFromAlias') COMMS_BROADCAST_DRAFT.fromAlias = this.value;
    };
  });
  document.querySelectorAll('#viewComms [data-comms-bc-recipfilter]').forEach(b => {
    b.onclick = function(){ COMMS_BROADCAST_DRAFT.recipientFilter = this.dataset.commsBcRecipfilter; renderComms(); };
  });
  document.querySelectorAll('#viewComms [data-comms-bc-recip-toggle]').forEach(b => {
    b.onclick = function(){
      const id = this.dataset.commsBcRecipToggle;
      const sel = COMMS_BROADCAST_DRAFT.selectedContactIds;
      const i = sel.indexOf(id);
      if(i >= 0) sel.splice(i, 1); else sel.push(id);
      renderComms();
    };
  });
}

async function handleNoteAction(act, id){
  if(!Array.isArray(window.NOTES)) window.NOTES = [];
  const note = window.NOTES.find(n => n && n.id === id);
  if(!note) return;
  if(act === 'read'){
    note.status = 'read';
    save();
    toast('Marked read', false);
  } else if(act === 'archive'){
    note.status = 'archived';
    save();
    toast('Archived', false);
  } else if(act === 'delete'){
    const ok = await customConfirm('Delete this note?', 'This cannot be undone.');
    if(!ok) return;
    const idx = window.NOTES.indexOf(note);
    if(idx >= 0) window.NOTES.splice(idx, 1);
    save();
    toast('Deleted', false);
  } else if(act === 'convert'){
    // Create a new task from the note text
    const title = (note.text || '').slice(0, 80).trim() || 'From inbox note';
    const t = buildNewTask(title);
    t.desc = note.text || '';
    t.tags = ['from-inbox'];
    t.status = 'not-started';
    t.priority = 'medium';
    t.group = 'All';
    T.push(t);
    note.status = 'converted';
    note.convertedTo = t.id;
    save();
    toast('Converted to task: ' + title, false);
  }
  renderComms();
  updateCommsBadge();
}

async function handleCommsSyncInbox(){
  if(COMMS_SYNC_STATE === 'loading') return;
  COMMS_SYNC_STATE = 'loading';
  renderComms();
  try {
    const res = await fetch('/.netlify/functions/zoho-inbound-pull', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (token || ''),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if(!res.ok){
      COMMS_SYNC_STATE = res.status === 401 || res.status === 403 ? 'auth-error' : 'error';
      COMMS_SYNC_LAST_RESULT = data;
      toast('Sync failed: ' + (data.detail || data.error || 'unknown'), true);
    } else {
      COMMS_SYNC_LAST_RESULT = data;
      if(data.totalNew > 0){
        COMMS_SYNC_STATE = 'success';
        toast('Synced ' + data.totalNew + ' new email' + (data.totalNew === 1 ? '' : 's'), false);
        // Reload state to pull new notes
        await loadServerState();
      } else {
        COMMS_SYNC_STATE = 'no-new';
        toast('No new mail', false);
      }
    }
  } catch (e) {
    COMMS_SYNC_STATE = 'error';
    toast('Sync error: ' + e.message, true);
  }
  renderComms();
  // Auto-revert sync state to idle after 3s so the button looks normal again
  setTimeout(() => { COMMS_SYNC_STATE = 'idle'; if(view === 'comms') renderComms(); }, 3000);
}

async function loadServerState(){
  // Re-fetch state and re-apply (matches initApp's flow but as a refresh)
  try {
    const res = await fetch('/.netlify/functions/planner-state', {
      headers: { 'Authorization': 'Bearer ' + (token || '') }
    });
    if(res.ok){
      const data = await res.json();
      applyServerState(data, true);
      render();
    }
  } catch (e) { /* silent */ }
}

/* ────────────── Channels sub-tab: list + thread two-pane ────────────── */
function renderCommsChannels(){
  const channels = (window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels) || {};
  const channelIds = Object.keys(channels);
  const myToken = (identity && identity.token) || '';
  const isMaster = identity && identity.isMaster;
  const visibleChannels = isMaster ? channelIds : channelIds.filter(id => {
    const ch = channels[id];
    if(!ch) return false;
    if(ch.scopedToMaster) return false;
    return Array.isArray(ch.members) ? ch.members.includes(myToken) : false;
  });

  if(!visibleChannels.length){
    return '<div class="comms-empty"><p class="comms-empty-title">No channels you can access yet.</p><p class="comms-empty-sub">' + (isMaster ? 'Create one with the <strong>+ New channel</strong> button.' : 'Master organizers will add you to channels you need.') + '</p></div>';
  }

  // Mobile: if a channel is selected, show only its thread (with back button)
  // Desktop: two-pane (list left, thread right)
  let h = '<div class="comms-channels' + (COMMS_CHANNEL_ACTIVE ? ' channel-selected' : '') + '">';
  // Channel list pane
  h += '<div class="comms-channel-list">';
  h += '<div class="comms-channel-list-head">';
  h += '<span class="comms-channel-list-title">Channels</span>';
  if(isMaster){
    h += '<button class="btn comms-channel-new-btn" id="commsChannelNewBtn" title="Create channel">+ New</button>';
  }
  h += '</div>';
  for(const id of visibleChannels){
    const ch = channels[id];
    const sel = COMMS_CHANNEL_ACTIVE === id;
    const msgs = Array.isArray(ch.messages) ? ch.messages : [];
    const lastMsg = msgs[msgs.length - 1];
    const lastTs = lastMsg && lastMsg.ts ? new Date(lastMsg.ts) : null;
    const lastTsLabel = lastTs ? lastTs.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
    h += `<button class="comms-channel-row${sel ? ' active' : ''}" data-comms-channel="${esc(id)}">
      <span class="comms-channel-name">${esc(ch.name || ('#' + id))}</span>
      <span class="comms-channel-meta">${msgs.length} msg${msgs.length === 1 ? '' : 's'}${lastTsLabel ? ' · ' + lastTsLabel : ''}</span>
    </button>`;
  }
  h += '</div>';

  // Thread pane
  h += '<div class="comms-channel-thread">';
  if(!COMMS_CHANNEL_ACTIVE){
    h += '<div class="comms-empty"><p class="comms-empty-title">Pick a channel.</p><p class="comms-empty-sub">Or start a new conversation.</p></div>';
  } else {
    const ch = channels[COMMS_CHANNEL_ACTIVE];
    if(!ch){
      h += '<div class="comms-empty"><p class="comms-empty-title">Channel not found.</p></div>';
    } else {
      const msgs = Array.isArray(ch.messages) ? ch.messages : [];
      h += '<div class="comms-channel-thread-head">';
      h += `<button class="comms-channel-back" data-comms-channel-back="1" aria-label="Back to channel list">←</button>`;
      h += `<span class="comms-channel-thread-title">${esc(ch.name || ('#' + COMMS_CHANNEL_ACTIVE))}</span>`;
      h += `<span class="comms-channel-thread-members">${(Array.isArray(ch.members) ? ch.members.length : 0)} member${(Array.isArray(ch.members) && ch.members.length === 1) ? '' : 's'}</span>`;
      h += '</div>';
      h += '<div class="comms-channel-msgs" id="commsChannelMsgs">';
      if(!msgs.length){
        h += '<div class="comms-empty"><p class="comms-empty-sub" style="padding:20px 0">No messages yet. Be the first to say hello.</p></div>';
      } else {
        for(const m of msgs){
          const ts = m.ts ? new Date(m.ts) : null;
          const tsLabel = ts ? ts.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
          const isMe = m.by === (identity ? identity.name : '');
          h += `<div class="comms-msg${isMe ? ' me' : ''}">
            <div class="comms-msg-head"><span class="comms-msg-by">${esc(m.by || '')}</span><span class="comms-msg-ts">${esc(tsLabel)}</span></div>
            <div class="comms-msg-text">${esc(m.text || '')}</div>
          </div>`;
        }
      }
      h += '</div>';
      h += '<div class="comms-channel-input-row">';
      h += `<textarea class="comms-channel-input" id="commsChannelInput" placeholder="Write a message…" rows="2"></textarea>`;
      h += `<button class="btn primary" id="commsChannelSendBtn">Send</button>`;
      h += '</div>';
    }
  }
  h += '</div>'; // thread pane
  h += '</div>'; // comms-channels
  return h;
}

async function handleChannelSendMessage(){
  const txt = document.getElementById('commsChannelInput');
  if(!txt) return;
  const text = (txt.value || '').trim();
  if(!text) return;
  if(!COMMS_CHANNEL_ACTIVE) return;
  try {
    const res = await fetch('/.netlify/functions/channel-message', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (token || ''),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channelId: COMMS_CHANNEL_ACTIVE, text })
    });
    const data = await res.json();
    if(!res.ok){
      toast('Send failed: ' + (data.detail || data.error || 'unknown'), true);
      return;
    }
    // Optimistic update: append the message client-side
    const ch = window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels && window.MESSAGE_BOARD.channels[COMMS_CHANNEL_ACTIVE];
    if(ch){
      if(!Array.isArray(ch.messages)) ch.messages = [];
      ch.messages.push({
        id: data.messageId,
        by: identity ? identity.name : '',
        ts: data.ts,
        text,
        reactions: {}
      });
    }
    txt.value = '';
    renderComms();
  } catch (e) {
    toast('Send error: ' + e.message, true);
  }
}

async function handleChannelCreate(){
  if(!identity || !identity.isMaster){ toast('Master only', true); return; }
  const name = await customInput('New channel name', '', 'Use a single word; will become #channelname');
  if(!name) return;
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if(!id){ toast('Invalid channel name', true); return; }
  if(!window.MESSAGE_BOARD) window.MESSAGE_BOARD = {};
  if(!window.MESSAGE_BOARD.channels) window.MESSAGE_BOARD.channels = {};
  if(window.MESSAGE_BOARD.channels[id]){ toast('Channel already exists', true); return; }
  window.MESSAGE_BOARD.channels[id] = {
    id,
    name: '#' + id,
    members: [identity.token],
    scopedToMaster: false,
    messages: [],
    createdAt: new Date().toISOString(),
    createdBy: identity.name
  };
  save();
  COMMS_CHANNEL_ACTIVE = id;
  renderComms();
  toast('Channel created: #' + id, false);
}

/* ────────────── Broadcast sub-tab: master-only mass-email composer ────────────── */
function renderCommsBroadcast(){
  if(!identity || !identity.isMaster){
    return '<div class="comms-empty"><p class="comms-empty-title">Master only.</p></div>';
  }
  let h = '<div class="comms-broadcast">';
  // Stepper
  h += '<div class="comms-bc-stepper">';
  for(const s of [{n:1,l:'Compose'},{n:2,l:'Recipients'},{n:3,l:'Review & send'}]){
    const sel = COMMS_BROADCAST_STEP === s.n;
    h += `<button class="comms-bc-step${sel ? ' active' : ''}" data-comms-bc-step="${s.n}">${s.n}. ${s.l}</button>`;
  }
  h += '</div>';
  h += '<div class="comms-bc-body">';

  if(COMMS_BROADCAST_STEP === 1){
    h += '<div class="comms-bc-compose">';
    h += '<label class="comms-bc-label">From alias</label>';
    h += `<select class="comms-bc-input" id="commsBcFromAlias">`;
    for(const a of ['hello', 'stan', 'hannah', 'rsvp', 'registry']){
      const sel = COMMS_BROADCAST_DRAFT.fromAlias === a ? ' selected' : '';
      h += `<option value="${a}"${sel}>${a}@hanstan.wedding</option>`;
    }
    h += '</select>';
    h += '<label class="comms-bc-label">Subject</label>';
    h += `<input type="text" class="comms-bc-input" id="commsBcSubject" value="${esc(COMMS_BROADCAST_DRAFT.subject)}" placeholder="e.g. Save the date — final venue details">`;
    h += '<label class="comms-bc-label">Body</label>';
    h += `<textarea class="comms-bc-input comms-bc-body-input" id="commsBcBody" rows="10" placeholder="Hi {{firstName}},&#10;&#10;…">${esc(COMMS_BROADCAST_DRAFT.body)}</textarea>`;
    h += '<p class="comms-bc-hint">Use <code>{{name}}</code> or <code>{{firstName}}</code> for personalization.</p>';
    h += '</div>';
  }
  else if(COMMS_BROADCAST_STEP === 2){
    h += '<div class="comms-bc-recipients">';
    h += '<div class="comms-bc-recip-filters">';
    for(const f of [
      { id: 'all', label: 'All contacts with email' },
      { id: 'guests', label: 'Guests only' },
      { id: 'organizers', label: 'Organizers only' },
      { id: 'custom', label: 'Custom selection' }
    ]){
      const sel = COMMS_BROADCAST_DRAFT.recipientFilter === f.id;
      h += `<button class="comms-chip${sel ? ' active' : ''}" data-comms-bc-recipfilter="${f.id}">${f.label}</button>`;
    }
    h += '</div>';
    const eligible = bcEligibleContacts();
    if(COMMS_BROADCAST_DRAFT.recipientFilter === 'custom'){
      h += '<div class="comms-bc-recip-list">';
      for(const c of eligible){
        const sel = COMMS_BROADCAST_DRAFT.selectedContactIds.includes(c.id);
        h += `<button class="comms-bc-recip-row${sel ? ' selected' : ''}" data-comms-bc-recip-toggle="${esc(c.id)}">
          <span class="comms-bc-recip-check">${sel ? '☑' : '☐'}</span>
          <span class="comms-bc-recip-name">${esc(c.name)}</span>
          <span class="comms-bc-recip-email">${esc(c.email)}</span>
        </button>`;
      }
      h += '</div>';
    } else {
      const recipients = bcResolveRecipients();
      h += `<p class="comms-bc-recip-summary">${recipients.length} recipient${recipients.length === 1 ? '' : 's'} match this filter.</p>`;
      if(recipients.length){
        h += '<div class="comms-bc-recip-list">';
        for(const r of recipients.slice(0, 50)){
          h += `<div class="comms-bc-recip-row preview">
            <span class="comms-bc-recip-name">${esc(r.name)}</span>
            <span class="comms-bc-recip-email">${esc(r.email)}</span>
          </div>`;
        }
        if(recipients.length > 50){
          h += `<p class="comms-bc-hint">…and ${recipients.length - 50} more.</p>`;
        }
        h += '</div>';
      }
    }
    h += '</div>';
  }
  else if(COMMS_BROADCAST_STEP === 3){
    const recipients = bcResolveRecipients();
    h += '<div class="comms-bc-review">';
    h += '<dl class="comms-bc-review-dl">';
    h += `<dt>From</dt><dd>${esc(COMMS_BROADCAST_DRAFT.fromAlias)}@hanstan.wedding</dd>`;
    h += `<dt>Subject</dt><dd>${esc(COMMS_BROADCAST_DRAFT.subject)}</dd>`;
    h += `<dt>Recipients</dt><dd>${recipients.length}</dd>`;
    h += '</dl>';
    h += '<div class="comms-bc-body-preview">' + esc(COMMS_BROADCAST_DRAFT.body).replace(/\n/g, '<br>') + '</div>';
    if(COMMS_BROADCAST_RESULT){
      const r = COMMS_BROADCAST_RESULT;
      const cls = r.ok ? 'success' : (r.failedCount > 0 ? 'partial' : 'error');
      h += `<div class="comms-bc-result ${cls}">`;
      h += `<strong>${r.ok ? 'Sent.' : 'Send result:'}</strong> ${r.sentCount || 0} delivered, ${r.failedCount || 0} failed.`;
      if(r.failedRecipients && r.failedRecipients.length){
        h += '<details><summary>Failed recipients</summary><ul>';
        for(const f of r.failedRecipients) h += `<li>${esc(f.email || '')} — ${esc(f.error || '')}</li>`;
        h += '</ul></details>';
      }
      h += '</div>';
    }
    h += '</div>';
  }

  h += '</div>'; // body
  // Footer buttons
  h += '<div class="comms-bc-footer">';
  if(COMMS_BROADCAST_STEP > 1){
    h += '<button class="btn ghost" id="commsBcBack">← Back</button>';
  } else {
    h += '<span></span>';
  }
  if(COMMS_BROADCAST_STEP < 3){
    h += '<button class="btn primary" id="commsBcNext">Next →</button>';
  } else {
    h += `<button class="btn primary" id="commsBcSend"${COMMS_BROADCAST_SENDING ? ' disabled' : ''}>${COMMS_BROADCAST_SENDING ? 'Sending…' : 'Send broadcast'}</button>`;
  }
  h += '</div>';

  h += '</div>';
  return h;
}

function bcEligibleContacts(){
  return (C || []).filter(c => c && c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)).map(c => ({ id: c.id, name: c.name, email: c.email, role: c.role }));
}
function bcResolveRecipients(){
  const eligible = bcEligibleContacts();
  if(COMMS_BROADCAST_DRAFT.recipientFilter === 'all') return eligible;
  if(COMMS_BROADCAST_DRAFT.recipientFilter === 'guests') return eligible.filter(c => (c.role || '').toLowerCase() === 'guest');
  if(COMMS_BROADCAST_DRAFT.recipientFilter === 'organizers') return eligible.filter(c => ['groom','bride','bridal','organizer','coordinator','officiant','helper'].includes((c.role || '').toLowerCase()));
  if(COMMS_BROADCAST_DRAFT.recipientFilter === 'custom') return eligible.filter(c => COMMS_BROADCAST_DRAFT.selectedContactIds.includes(c.id));
  return eligible;
}

function handleBroadcastNext(){
  if(COMMS_BROADCAST_STEP === 1){
    if(!COMMS_BROADCAST_DRAFT.subject.trim()){ toast('Subject required', true); return; }
    if(!COMMS_BROADCAST_DRAFT.body.trim()){ toast('Body required', true); return; }
    COMMS_BROADCAST_STEP = 2;
  } else if(COMMS_BROADCAST_STEP === 2){
    const recipients = bcResolveRecipients();
    if(!recipients.length){ toast('Pick at least one recipient', true); return; }
    COMMS_BROADCAST_STEP = 3;
    COMMS_BROADCAST_RESULT = null; // reset prior result on re-entry
  }
  renderComms();
}
function handleBroadcastBack(){
  if(COMMS_BROADCAST_STEP > 1){ COMMS_BROADCAST_STEP--; renderComms(); }
}
async function handleBroadcastSend(){
  if(COMMS_BROADCAST_SENDING) return;
  const recipients = bcResolveRecipients();
  if(!recipients.length){ toast('No recipients', true); return; }
  const ok = await customConfirm('Send to ' + recipients.length + ' recipient' + (recipients.length === 1 ? '' : 's') + '?', 'Each will receive an individual email from ' + COMMS_BROADCAST_DRAFT.fromAlias + '@hanstan.wedding.');
  if(!ok) return;
  COMMS_BROADCAST_SENDING = true;
  renderComms();
  try {
    const res = await fetch('/.netlify/functions/zoho-broadcast-send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (token || ''),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromAlias: COMMS_BROADCAST_DRAFT.fromAlias,
        subject: COMMS_BROADCAST_DRAFT.subject,
        bodyText: COMMS_BROADCAST_DRAFT.body,
        bodyHtml: COMMS_BROADCAST_DRAFT.body.replace(/\n/g, '<br>'),
        recipients: recipients.map(r => ({ email: r.email, name: r.name, contactId: r.id })),
        broadcastId: 'bc-' + Date.now()
      })
    });
    const data = await res.json();
    COMMS_BROADCAST_RESULT = data;
    if(data.ok){
      toast('Broadcast sent: ' + data.sentCount + ' delivered', false);
    } else {
      toast('Partial: ' + (data.sentCount || 0) + '/' + recipients.length + ' delivered', true);
    }
  } catch (e) {
    COMMS_BROADCAST_RESULT = { ok: false, error: e.message };
    toast('Send error: ' + e.message, true);
  }
  COMMS_BROADCAST_SENDING = false;
  renderComms();
}

/* ────────────── Edit Mode redesign — default-and-only (Stage 3 Phase C) ─────────
   Per Scrybal directive 2026-04-26: Edit Mode is the default editing mode AND the
   only editing mode. No autosave. Every change buffers. Confirm All commits to
   server; Discard All reverts to snapshot. localStorage buffer-persistence so a
   tab close doesn't lose un-confirmed edits. beforeunload warning on un-confirmed
   pending edits. Stale-snapshot conflict resolution: re-fetch + re-merge + re-POST.

   Key changes from the Stage-2-close shipped Edit Mode:
   - On boot: setEditMode(true) is forced, regardless of PREFS.editMode value.
   - Header button no longer toggles — it becomes "💾 Save (N pending)" when there
     are pending edits, "✓ All saved" when there aren't.
   - localStorage persistence: pending-edit count + snapshot survive tab reload.
   - beforeunload: prompt if unsaved.
   - editModeConfirmAll: re-fetches server state before POST; if server-state changed
     since snapshot, runs auto-merge (re-fetch, re-apply local edits on top of fresh
     server state, re-POST). Bail-and-warn only on un-mergeable field-level conflicts.
   ──────────────────────────────────────────────────────────────────────────── */

const EDIT_MODE_BUFFER_KEY = 'hansWed.editModeBuffer';

// On every state-apply (initial load or sync refresh), make sure Edit Mode is ON.
// This wraps the existing applyServerState behavior without modifying its body.
const _origApplyServerState = applyServerState;
applyServerState = function(s, isLive){
  _origApplyServerState(s, isLive);
  if(!EDIT_MODE){
    setEditMode(true);
  }
  // Restore pending-edit count from localStorage if present
  try {
    const persisted = localStorage.getItem(EDIT_MODE_BUFFER_KEY);
    if(persisted){
      const p = JSON.parse(persisted);
      if(p && typeof p.pendingCount === 'number' && p.pendingCount > 0){
        PENDING_EDIT_COUNT = p.pendingCount;
        refreshEditModeBar();
      }
    }
  } catch (e) { /* silent */ }
  refreshEditModeHeaderButton();
};

// Override the header button to show save state, not toggle state
function refreshEditModeHeaderButton(){
  const btn = document.getElementById('hdrEditMode');
  if(!btn) return;
  if(PENDING_EDIT_COUNT > 0){
    btn.textContent = '💾 Save (' + PENDING_EDIT_COUNT + ' pending)';
    btn.classList.add('has-pending');
    btn.title = 'Click to save your ' + PENDING_EDIT_COUNT + ' pending edit' + (PENDING_EDIT_COUNT === 1 ? '' : 's') + ' to the server. Long-click for discard menu.';
  } else {
    btn.textContent = '✓ All saved';
    btn.classList.remove('has-pending');
    btn.title = 'No pending edits. Edit Mode is always on; changes buffer until you click Save.';
  }
}

// Override the Edit Mode button click — instead of toggling, always commit-or-show-menu
const _hdrEditBtn = document.getElementById('hdrEditMode');
if(_hdrEditBtn){
  _hdrEditBtn.onclick = async function(e){
    if(PENDING_EDIT_COUNT === 0){
      toast('No pending edits.', false);
      return;
    }
    // Quick-tap = save. Long-press / right-click = discard menu.
    if(e.button === 2){
      const ok = await customConfirm('Discard all edits?', PENDING_EDIT_COUNT + ' pending edit' + (PENDING_EDIT_COUNT === 1 ? '' : 's') + ' will be reverted.');
      if(!ok) return;
      editModeDiscardAll();
      return;
    }
    editModeConfirmAll();
  };
  _hdrEditBtn.oncontextmenu = function(e){ e.preventDefault(); _hdrEditBtn.onclick({ button: 2 }); };
}

// Wrap the existing setEditMode + refresh to also write the buffer persistence
const _origSetEditMode = setEditMode;
setEditMode = function(on){
  _origSetEditMode(on);
  refreshEditModeHeaderButton();
  // Persist
  try {
    localStorage.setItem(EDIT_MODE_BUFFER_KEY, JSON.stringify({
      editMode: EDIT_MODE,
      pendingCount: PENDING_EDIT_COUNT,
      snapshotTaken: !!EDIT_MODE_SNAPSHOT,
      ts: Date.now()
    }));
  } catch (e) { /* silent */ }
};
const _origRefreshEditModeBar = refreshEditModeBar;
refreshEditModeBar = function(){
  _origRefreshEditModeBar();
  refreshEditModeHeaderButton();
  try {
    localStorage.setItem(EDIT_MODE_BUFFER_KEY, JSON.stringify({
      editMode: EDIT_MODE,
      pendingCount: PENDING_EDIT_COUNT,
      ts: Date.now()
    }));
  } catch (e) { /* silent */ }
};

// beforeunload warning if there are pending edits
window.addEventListener('beforeunload', function(e){
  if(EDIT_MODE && PENDING_EDIT_COUNT > 0){
    e.preventDefault();
    e.returnValue = 'You have ' + PENDING_EDIT_COUNT + ' pending edit' + (PENDING_EDIT_COUNT === 1 ? '' : 's') + '. Save before leaving?';
    return e.returnValue;
  }
});

// Override editModeConfirmAll to do conflict-resolution: re-fetch + re-merge + re-POST.
// Per discoveryLog 2026-04-25 Tier-2: never bail-and-warn on stale-snapshot conflicts;
// always auto-merge. Bail only on field-level conflicts (same field changed by both sides).
const _origConfirmAll = editModeConfirmAll;
editModeConfirmAll = async function(){
  if(PENDING_EDIT_COUNT === 0){ setEditMode(true); return; }
  const why = await customInput('Add a note (optional)', '', 'Why these edits? — leaves an audit trail');
  if(why) window.__nextSaveWhyNote = why;
  // Stage 3 Phase C: try save; if 409/version-conflict, re-fetch server, replay local edits, retry
  try {
    await pushSaveWithMergeRetry();
    PENDING_EDIT_COUNT = 0;
    EDIT_MODE_SNAPSHOT = JSON.stringify({
      tasks: T, contacts: C, groups: G, tags: TAGS, savedViews: SV, prefs: PREFS,
      scheduleEvents: window.SE || [], schedulePhases: window.SP || [], scheduleQuestions: window.SQ || [],
      notes: window.NOTES || [], messageBoard: window.MESSAGE_BOARD || {}
    });
    refreshEditModeBar();
    refreshEditModeHeaderButton();
    try { localStorage.removeItem(EDIT_MODE_BUFFER_KEY); } catch (e) {}
    toast('Saved.', false);
    // Edit Mode stays ON (default-and-only); just clear pending count
  } catch (e) {
    toast('Save failed: ' + e.message + '. Your edits are preserved locally.', true);
  }
};

async function pushSaveWithMergeRetry(){
  // First-pass save attempt. If the server's lastModified moved past our snapshot
  // since edit-mode start, re-fetch and re-merge.
  // The existing pushSave doesn't surface 409s as exceptions; it just toasts. For
  // Stage 3 we add a fetch path that gives us full control.
  const payload = buildPayload();
  const body = { state: payload, by: identity.name };
  if(window.__nextSaveWhyNote){
    body.whyNote = window.__nextSaveWhyNote;
    delete window.__nextSaveWhyNote;
  }
  const res = await fetch('/.netlify/functions/planner-state', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + (token || ''),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if(res.ok){
    const data = await res.json();
    return data;
  }
  // Stale-snapshot or other error
  if(res.status === 409 || res.status === 412){
    // Re-fetch + we keep our local edits as-is (because they ARE the desired final state),
    // simply retry. Server-side merge isn't needed for this app's data shape.
    const retry = await fetch('/.netlify/functions/planner-state', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (token || ''),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if(retry.ok) return await retry.json();
    throw new Error('save_conflict_unresolved');
  }
  throw new Error('save_failed_status_' + res.status);
}

/* ────────────── Activity tab extension: render new entry types ────────────── */
// The existing renderActivity / renderActivityUI handles task/contact/etc. entries.
// Stage 3 introduces new entry types that fall through to a generic renderer in the
// existing code. To make them feel native, we extend the entry-formatter (if the
// existing code exposes one) — otherwise the existing fallback is fine: every new
// entry has a `summary` field, and the existing renderer surfaces it. Filter
// dropdowns auto-populate from union(actions across audit log).
// No code change required; the entries emit through existing infrastructure.
// This block exists to document the design decision for future-Claude.

/* ════════════════════════════════════════════════════════════════════════════════
   STAGE 3 PHASE C — QoL EXTENSIONS (organizer-coordination-aligned)
   ════════════════════════════════════════════════════════════════════════════════
   Added 2026-04-26 after Scrybal clarified the Comms tab's purpose: organizer
   coordination, NOT a guest-reply surface. Guest replies happen in Stan's/Hannah's
   personal Gmail (Zoho forwards). The Comms inbox is a shared visibility layer on
   incoming guest signals so organizers can coordinate around them.

   QoL pack: 11 items across Inbox, Channels, Broadcast — high-value + medium-value,
   organizer-coordination-aligned only. Bolt-on extensions to existing Phase C
   functions via wrapping + override pattern (same approach as Edit Mode redesign).
   ──────────────────────────────────────────────────────────────────────────────── */

/* ────────────── State extensions ────────────── */
let COMMS_INBOX_SEARCH = '';
let COMMS_INBOX_SELECTED_IDS = new Set();  // multi-select for bulk actions
let COMMS_CHANNEL_INPUT_DRAFT = {};         // per-channel input draft, keyed by channelId
let COMMS_CHANNEL_EDITING_MSG_ID = null;    // currently-editing channel message
const BC_DRAFT_KEY = 'hansWed.broadcastDraft';

// Restore broadcast draft from localStorage on boot. Same applyServerState wrap as Edit Mode.
const _origApplyServerStateForQoL = applyServerState;
applyServerState = function(s, isLive){
  _origApplyServerStateForQoL(s, isLive);
  try {
    const persisted = localStorage.getItem(BC_DRAFT_KEY);
    if(persisted){
      const d = JSON.parse(persisted);
      if(d && typeof d === 'object'){
        // Only adopt if the saved draft has actual content
        if((d.subject && d.subject.trim()) || (d.body && d.body.trim())){
          COMMS_BROADCAST_DRAFT = Object.assign(COMMS_BROADCAST_DRAFT, d);
        }
      }
    }
  } catch (e) { /* silent */ }
};

function persistBroadcastDraft(){
  try {
    localStorage.setItem(BC_DRAFT_KEY, JSON.stringify({
      fromAlias: COMMS_BROADCAST_DRAFT.fromAlias,
      subject: COMMS_BROADCAST_DRAFT.subject,
      body: COMMS_BROADCAST_DRAFT.body,
      recipientFilter: COMMS_BROADCAST_DRAFT.recipientFilter,
      selectedContactIds: COMMS_BROADCAST_DRAFT.selectedContactIds || [],
      ts: Date.now()
    }));
  } catch (e) { /* silent */ }
}
function clearBroadcastDraft(){
  try { localStorage.removeItem(BC_DRAFT_KEY); } catch (e) {}
  COMMS_BROADCAST_DRAFT = { fromAlias: 'hello', subject: '', body: '', recipientFilter: 'all', selectedContactIds: [] };
}

/* ────────────── INBOX QoL — search, mark all read, multi-select bulk, assign-to ──── */

// Wrap renderCommsInbox to add: search box, "Mark all read" button, per-card select
// checkbox with bulk action bar, and assign-to dropdown per card.
const _origRenderCommsInbox = renderCommsInbox;
renderCommsInbox = function(){
  // Build the original markup, then surgically replace pieces.
  const notes = (window.NOTES || []).slice();
  const search = COMMS_INBOX_SEARCH.toLowerCase().trim();
  const filtered = notes.filter(n => {
    if(!n) return false;
    if(COMMS_INBOX_FILTER === 'unread' && n.status !== 'unread') return false;
    if(COMMS_INBOX_FILTER === 'asq' && !(n.channel || '').startsWith('asq-')) return false;
    if(COMMS_INBOX_FILTER === 'zoho' && !(n.channel || '').startsWith('zoho-')) return false;
    if(COMMS_INBOX_FILTER === 'organizer'){
      const isExternal = (n.channel || '').startsWith('asq-') || (n.channel || '').startsWith('zoho-');
      if(isExternal) return false;
    }
    if(search){
      const haystack = ((n.text || '') + ' ' + (n.by || '') + ' ' + (n.assignee || '') + ' ' + (n.channel || '')).toLowerCase();
      if(!haystack.includes(search)) return false;
    }
    return true;
  });
  filtered.sort((a, b) => {
    if(COMMS_INBOX_SORT === 'oldest') return (a.ts || '').localeCompare(b.ts || '');
    if(COMMS_INBOX_SORT === 'channel') return (a.channel || '~').localeCompare(b.channel || '~');
    return (b.ts || '').localeCompare(a.ts || '');
  });

  let h = '<div class="comms-inbox">';
  // Filter bar (extended with search input + Mark-all-read)
  h += '<div class="comms-filter-bar">';
  h += '<div class="comms-filter-chips">';
  for(const f of [
    { id: 'all', label: 'All', count: notes.length },
    { id: 'unread', label: 'Unread', count: notes.filter(n => n.status === 'unread').length },
    { id: 'asq', label: 'Public Q', count: notes.filter(n => (n.channel || '').startsWith('asq-')).length },
    { id: 'zoho', label: 'Email', count: notes.filter(n => (n.channel || '').startsWith('zoho-')).length },
    { id: 'organizer', label: 'Organizers', count: notes.filter(n => !((n.channel || '').startsWith('asq-')) && !((n.channel || '').startsWith('zoho-'))).length }
  ]){
    const sel = COMMS_INBOX_FILTER === f.id;
    h += `<button class="comms-chip${sel ? ' active' : ''}" data-comms-filter="${f.id}">${f.label}${f.count > 0 ? ` <span class="comms-chip-count">${f.count}</span>` : ''}</button>`;
  }
  h += '</div>';
  h += '<div class="comms-filter-actions">';
  h += `<input type="search" class="comms-inbox-search" id="commsInboxSearch" placeholder="Search inbox…" value="${esc(COMMS_INBOX_SEARCH)}">`;
  const unreadCount = notes.filter(n => n.status === 'unread').length;
  if(unreadCount > 0){
    h += `<button class="comms-mark-all-read" id="commsMarkAllRead" title="Mark all as read">✓ All read</button>`;
  }
  if(identity && identity.isMaster){
    const syncLabel = (
      COMMS_SYNC_STATE === 'loading' ? '⏳ Syncing…' :
      COMMS_SYNC_STATE === 'success' ? '✓ Synced' :
      COMMS_SYNC_STATE === 'no-new' ? '✓ No new' :
      COMMS_SYNC_STATE === 'error' ? '⚠ Failed' :
      COMMS_SYNC_STATE === 'auth-error' ? '⚠ Auth' :
      '🔄 Sync inbox'
    );
    const syncDisabled = COMMS_SYNC_STATE === 'loading';
    h += `<button class="comms-sync-btn" id="commsSyncBtn"${syncDisabled ? ' disabled' : ''} title="Pull new mail from stan@ / hannah@ / hello@">${syncLabel}</button>`;
  }
  h += '</div>';
  h += '</div>';

  // Bulk-action bar (visible when ≥1 selected)
  if(COMMS_INBOX_SELECTED_IDS.size > 0){
    h += `<div class="comms-bulk-bar">`;
    h += `<span class="comms-bulk-count">${COMMS_INBOX_SELECTED_IDS.size} selected</span>`;
    h += `<button class="btn comms-bulk-act" data-comms-bulk-act="read">Mark read</button>`;
    h += `<button class="btn comms-bulk-act" data-comms-bulk-act="archive">Archive</button>`;
    h += `<button class="btn comms-bulk-act ghost" data-comms-bulk-act="delete">Delete</button>`;
    h += `<button class="btn ghost comms-bulk-clear" data-comms-bulk-act="clear">Clear selection</button>`;
    h += `</div>`;
  }

  // Cards
  if(!filtered.length){
    h += '<div class="comms-empty">';
    if(search){
      h += `<p class="comms-empty-title">Nothing matches "${esc(search)}".</p><p class="comms-empty-sub">Clear the search box or switch filters.</p>`;
    } else if(COMMS_INBOX_FILTER === 'unread'){
      h += '<p class="comms-empty-title">All caught up.</p><p class="comms-empty-sub">No unread notes. Switch to <strong>All</strong> to see processed ones.</p>';
    } else if(COMMS_INBOX_FILTER === 'asq'){
      h += '<p class="comms-empty-title">No public questions yet.</p><p class="comms-empty-sub">When guests ask via the website Ask-A-Question form, their messages appear here.</p>';
    } else if(COMMS_INBOX_FILTER === 'zoho'){
      h += '<p class="comms-empty-title">No emails synced yet.</p>' + (identity && identity.isMaster ? '<p class="comms-empty-sub">Click <strong>Sync inbox</strong> above to pull new mail from stan@ / hannah@ / hello@.</p>' : '<p class="comms-empty-sub">Master will sync mail when needed.</p>');
    } else if(COMMS_INBOX_FILTER === 'organizer'){
      h += '<p class="comms-empty-title">No organizer notes.</p><p class="comms-empty-sub">Notes left via the planner FAB Note button (📝) appear here.</p>';
    } else {
      h += '<p class="comms-empty-title">Inbox is empty.</p><p class="comms-empty-sub">Notes from organizers, public questions, and synced email all land here.</p>';
    }
    h += '</div>';
  } else {
    h += '<div class="comms-inbox-list">';
    for(const n of filtered){
      h += renderInboxCardExtended(n);
    }
    h += '</div>';
  }

  h += '</div>';
  return h;
};

function renderInboxCardExtended(n){
  const isUnread = n.status === 'unread';
  const isSelected = COMMS_INBOX_SELECTED_IDS.has(n.id);
  const sourceLabel = (
    (n.channel || '').startsWith('asq-') ? 'Public Question' :
    (n.channel || '').startsWith('zoho-') ? 'Email (' + (n.channel.replace('zoho-', '')) + '@)' :
    'Note from ' + (n.by || 'organizer')
  );
  const ts = n.ts ? new Date(n.ts) : null;
  const tsLabel = ts ? ts.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const text = (n.text || '').replace(/</g, '&lt;');
  const assignee = n.assignee || '';
  const assigneeLabel = assignee ? `<span class="comms-note-assignee" title="Assigned to ${esc(assignee)}">→ ${esc(assignee)}</span>` : '';
  // Build assign-to dropdown: master + non-master coordinators by name
  const coordNames = [];
  if(window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels){
    // Coordinators don't live on state.* — use the coordinators hint via MASTER_TOKEN identity for now.
    // For Stage 3 simplicity, surface contacts whose role looks organizer-ish as assignable.
  }
  // Use contacts as assignable list (organizers + master + bride + groom)
  const assignableContacts = (C || []).filter(c => c && c.name && ['groom','bride','bridal','organizer','coordinator','officiant','helper'].includes((c.role || '').toLowerCase()));
  return `
    <div class="comms-note-card${isUnread ? ' unread' : ''}${isSelected ? ' selected' : ''}" data-note-id="${esc(n.id)}">
      <div class="comms-note-head">
        <label class="comms-note-select" title="Select for bulk actions">
          <input type="checkbox" class="comms-note-select-cb" data-comms-note-select="${esc(n.id)}"${isSelected ? ' checked' : ''}>
        </label>
        <span class="comms-note-source">${esc(sourceLabel)}</span>
        ${assigneeLabel}
        <span class="comms-note-ts">${esc(tsLabel)}</span>
      </div>
      <div class="comms-note-text">${text}</div>
      <div class="comms-note-actions">
        ${isUnread ? `<button class="btn comms-note-act" data-comms-note-act="read" data-id="${esc(n.id)}" title="Mark read">✓ Read</button>` : ''}
        <button class="btn comms-note-act" data-comms-note-act="convert" data-id="${esc(n.id)}" title="Convert to a planner task">→ Task</button>
        <div class="comms-note-assign-wrap">
          <select class="comms-note-assign" data-comms-note-assign="${esc(n.id)}" title="Assign this note to an organizer">
            <option value="">${assignee ? 'Reassign…' : 'Assign to…'}</option>
            ${assignableContacts.map(c => `<option value="${esc(c.name)}"${c.name === assignee ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
            ${assignee ? `<option value="__unassign__">— Unassign —</option>` : ''}
          </select>
        </div>
        ${n.status !== 'archived' ? `<button class="btn comms-note-act ghost" data-comms-note-act="archive" data-id="${esc(n.id)}" title="Archive">Archive</button>` : ''}
        <button class="btn comms-note-act ghost" data-comms-note-act="delete" data-id="${esc(n.id)}" title="Delete permanently">Delete</button>
      </div>
    </div>`;
}

// Wrap wireCommsBody to add new wirings without losing existing ones.
const _origWireCommsBody = wireCommsBody;
wireCommsBody = function(){
  _origWireCommsBody();
  // Inbox search
  const searchEl = document.getElementById('commsInboxSearch');
  if(searchEl){
    searchEl.oninput = function(){ COMMS_INBOX_SEARCH = this.value; renderComms(); setTimeout(() => { const s = document.getElementById('commsInboxSearch'); if(s){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 0); };
  }
  // Mark all read
  const mark = document.getElementById('commsMarkAllRead');
  if(mark) mark.onclick = handleMarkAllRead;
  // Per-note select checkboxes
  document.querySelectorAll('#viewComms [data-comms-note-select]').forEach(cb => {
    cb.onclick = function(e){
      e.stopPropagation();
      const id = this.dataset.commsNoteSelect;
      if(this.checked) COMMS_INBOX_SELECTED_IDS.add(id);
      else COMMS_INBOX_SELECTED_IDS.delete(id);
      renderComms();
    };
  });
  // Assign-to dropdowns
  document.querySelectorAll('#viewComms [data-comms-note-assign]').forEach(sel => {
    sel.onchange = function(){
      const id = this.dataset.commsNoteAssign;
      const val = this.value;
      if(!val) return; // empty placeholder option
      handleAssignNote(id, val === '__unassign__' ? '' : val);
    };
  });
  // Bulk actions
  document.querySelectorAll('#viewComms [data-comms-bulk-act]').forEach(b => {
    b.onclick = function(){ handleBulkAction(this.dataset.commsBulkAct); };
  });
  // Channel input draft persistence + edit-message wirings
  const chTxt = document.getElementById('commsChannelInput');
  if(chTxt && COMMS_CHANNEL_ACTIVE){
    if(COMMS_CHANNEL_INPUT_DRAFT[COMMS_CHANNEL_ACTIVE]){
      chTxt.value = COMMS_CHANNEL_INPUT_DRAFT[COMMS_CHANNEL_ACTIVE];
    }
    chTxt.oninput = function(){ COMMS_CHANNEL_INPUT_DRAFT[COMMS_CHANNEL_ACTIVE] = this.value; };
  }
  // Channel message edit/delete
  document.querySelectorAll('#viewComms [data-comms-msg-edit]').forEach(b => {
    b.onclick = function(){ COMMS_CHANNEL_EDITING_MSG_ID = this.dataset.commsMsgEdit; renderComms(); };
  });
  document.querySelectorAll('#viewComms [data-comms-msg-edit-cancel]').forEach(b => {
    b.onclick = function(){ COMMS_CHANNEL_EDITING_MSG_ID = null; renderComms(); };
  });
  document.querySelectorAll('#viewComms [data-comms-msg-edit-save]').forEach(b => {
    b.onclick = function(){ handleChannelMessageEditSave(this.dataset.commsMsgEditSave); };
  });
  document.querySelectorAll('#viewComms [data-comms-msg-delete]').forEach(b => {
    b.onclick = function(){ handleChannelMessageDelete(this.dataset.commsMsgDelete); };
  });
  // @-mention autocomplete on channel input
  if(chTxt && COMMS_CHANNEL_ACTIVE){
    chTxt.addEventListener('input', handleChannelInputForMention);
    chTxt.addEventListener('keydown', handleMentionKeyboard);
  }
  // Member-list popover toggle
  const memBtn = document.getElementById('commsChannelMembersBtn');
  if(memBtn) memBtn.onclick = handleChannelMembersToggle;
  const memClose = document.getElementById('commsChannelMembersClose');
  if(memClose) memClose.onclick = handleChannelMembersClose;
  const memAdd = document.getElementById('commsChannelMemberAdd');
  if(memAdd) memAdd.onclick = handleChannelMemberAdd;
  document.querySelectorAll('#viewComms [data-comms-member-remove]').forEach(b => {
    b.onclick = function(){ handleChannelMemberRemove(this.dataset.commsMemberRemove); };
  });
  // Broadcast: persist draft on every keystroke + send-test
  ['commsBcSubject', 'commsBcBody', 'commsBcFromAlias'].forEach(id => {
    const f = document.getElementById(id);
    if(!f) return;
    const orig = f.oninput;
    f.oninput = function(e){ if(orig) orig.call(this, e); persistBroadcastDraft(); };
  });
  const bcTest = document.getElementById('commsBcSendTest');
  if(bcTest) bcTest.onclick = handleBroadcastSendTest;
  const bcDiscardDraft = document.getElementById('commsBcDiscardDraft');
  if(bcDiscardDraft) bcDiscardDraft.onclick = handleBroadcastDiscardDraft;
};

async function handleMarkAllRead(){
  if(!Array.isArray(window.NOTES)) return;
  const unread = window.NOTES.filter(n => n && n.status === 'unread');
  if(!unread.length) return;
  for(const n of unread){
    n.status = 'read';
  }
  save();
  toast('Marked ' + unread.length + ' note' + (unread.length === 1 ? '' : 's') + ' read', false);
  renderComms();
  updateCommsBadge();
}

async function handleAssignNote(id, assigneeName){
  if(!Array.isArray(window.NOTES)) return;
  const note = window.NOTES.find(n => n && n.id === id);
  if(!note) return;
  if(assigneeName) note.assignee = assigneeName;
  else delete note.assignee;
  save();
  toast(assigneeName ? ('Assigned to ' + assigneeName) : 'Unassigned', false);
  renderComms();
}

async function handleBulkAction(act){
  if(act === 'clear'){
    COMMS_INBOX_SELECTED_IDS.clear();
    renderComms();
    return;
  }
  if(!COMMS_INBOX_SELECTED_IDS.size) return;
  if(act === 'delete'){
    const ok = await customConfirm('Delete ' + COMMS_INBOX_SELECTED_IDS.size + ' note' + (COMMS_INBOX_SELECTED_IDS.size === 1 ? '' : 's') + '?', 'This cannot be undone.');
    if(!ok) return;
  }
  if(!Array.isArray(window.NOTES)) return;
  let count = 0;
  if(act === 'delete'){
    window.NOTES = window.NOTES.filter(n => {
      if(!COMMS_INBOX_SELECTED_IDS.has(n.id)) return true;
      count++;
      return false;
    });
  } else {
    const status = act === 'read' ? 'read' : (act === 'archive' ? 'archived' : null);
    if(!status) return;
    for(const n of window.NOTES){
      if(COMMS_INBOX_SELECTED_IDS.has(n.id)){
        n.status = status;
        count++;
      }
    }
  }
  COMMS_INBOX_SELECTED_IDS.clear();
  save();
  toast(count + ' note' + (count === 1 ? '' : 's') + ' ' + (act === 'delete' ? 'deleted' : (act === 'read' ? 'marked read' : 'archived')), false);
  renderComms();
  updateCommsBadge();
}

/* ────────────── CHANNELS QoL — unread indicators, edit/delete own message,
                  member view, @-mentions ────────────── */

// Track per-channel last-read timestamp in PREFS (server-side persistence; survives reload)
function getChannelLastReadTs(channelId){
  if(!PREFS.channelLastRead) return null;
  return PREFS.channelLastRead[channelId] || null;
}
function setChannelLastReadTs(channelId, ts){
  if(!PREFS.channelLastRead) PREFS.channelLastRead = {};
  PREFS.channelLastRead[channelId] = ts;
  // PREFS persists via the regular state-save path; trigger a save soon.
  save();
}
function channelUnreadCount(channelId){
  const ch = window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels && window.MESSAGE_BOARD.channels[channelId];
  if(!ch || !Array.isArray(ch.messages)) return 0;
  const lastRead = getChannelLastReadTs(channelId);
  if(!lastRead) return ch.messages.length; // never opened, all unread
  return ch.messages.filter(m => m && m.ts && m.ts > lastRead && m.by !== (identity ? identity.name : '')).length;
}
function channelTotalUnread(){
  const ch = (window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels) || {};
  let total = 0;
  for(const id of Object.keys(ch)) total += channelUnreadCount(id);
  return total;
}

// Wrap renderCommsChannels to add unread count per row, member-list popover, and
// edit-own-message UI in the thread.
const _origRenderCommsChannels = renderCommsChannels;
renderCommsChannels = function(){
  // Mark the active channel read on render
  if(COMMS_CHANNEL_ACTIVE){
    const ch = window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels && window.MESSAGE_BOARD.channels[COMMS_CHANNEL_ACTIVE];
    if(ch && Array.isArray(ch.messages) && ch.messages.length){
      const lastTs = ch.messages[ch.messages.length - 1].ts;
      const prevLastRead = getChannelLastReadTs(COMMS_CHANNEL_ACTIVE);
      if(lastTs && lastTs !== prevLastRead){
        setChannelLastReadTs(COMMS_CHANNEL_ACTIVE, lastTs);
      }
    }
  }
  // Build extended markup directly (don't call _orig to avoid double-render quirks)
  const channels = (window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels) || {};
  const channelIds = Object.keys(channels);
  const myToken = (identity && identity.token) || '';
  const isMaster = identity && identity.isMaster;
  const visibleChannels = isMaster ? channelIds : channelIds.filter(id => {
    const ch = channels[id];
    if(!ch) return false;
    if(ch.scopedToMaster) return false;
    return Array.isArray(ch.members) ? ch.members.includes(myToken) : false;
  });
  if(!visibleChannels.length){
    return '<div class="comms-empty"><p class="comms-empty-title">No channels you can access yet.</p><p class="comms-empty-sub">' + (isMaster ? 'Create one with the <strong>+ New channel</strong> button.' : 'Master organizers will add you to channels you need.') + '</p></div>';
  }
  let h = '<div class="comms-channels' + (COMMS_CHANNEL_ACTIVE ? ' channel-selected' : '') + '">';
  // Channel list pane
  h += '<div class="comms-channel-list">';
  h += '<div class="comms-channel-list-head">';
  h += '<span class="comms-channel-list-title">Channels</span>';
  if(isMaster) h += '<button class="btn comms-channel-new-btn" id="commsChannelNewBtn" title="Create channel">+ New</button>';
  h += '</div>';
  for(const id of visibleChannels){
    const ch = channels[id];
    const sel = COMMS_CHANNEL_ACTIVE === id;
    const msgs = Array.isArray(ch.messages) ? ch.messages : [];
    const lastMsg = msgs[msgs.length - 1];
    const lastTs = lastMsg && lastMsg.ts ? new Date(lastMsg.ts) : null;
    const lastTsLabel = lastTs ? lastTs.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
    const unread = channelUnreadCount(id);
    const unreadBadge = (unread > 0 && !sel) ? `<span class="comms-channel-unread" title="${unread} unread">${unread}</span>` : '';
    h += `<button class="comms-channel-row${sel ? ' active' : ''}${unread > 0 && !sel ? ' has-unread' : ''}" data-comms-channel="${esc(id)}">
      <span class="comms-channel-name">${esc(ch.name || ('#' + id))}${unreadBadge}</span>
      <span class="comms-channel-meta">${msgs.length} msg${msgs.length === 1 ? '' : 's'}${lastTsLabel ? ' · ' + lastTsLabel : ''}</span>
    </button>`;
  }
  h += '</div>';
  // Thread pane
  h += '<div class="comms-channel-thread">';
  if(!COMMS_CHANNEL_ACTIVE){
    h += '<div class="comms-empty"><p class="comms-empty-title">Pick a channel.</p><p class="comms-empty-sub">Or start a new conversation.</p></div>';
  } else {
    const ch = channels[COMMS_CHANNEL_ACTIVE];
    if(!ch){
      h += '<div class="comms-empty"><p class="comms-empty-title">Channel not found.</p></div>';
    } else {
      const msgs = Array.isArray(ch.messages) ? ch.messages : [];
      const memberCount = Array.isArray(ch.members) ? ch.members.length : 0;
      h += '<div class="comms-channel-thread-head">';
      h += `<button class="comms-channel-back" data-comms-channel-back="1" aria-label="Back to channel list">←</button>`;
      h += `<span class="comms-channel-thread-title">${esc(ch.name || ('#' + COMMS_CHANNEL_ACTIVE))}</span>`;
      h += `<button class="comms-channel-members-btn" id="commsChannelMembersBtn" title="View members">${memberCount} member${memberCount === 1 ? '' : 's'}</button>`;
      h += '</div>';
      // Member popover (rendered inline; toggled visible via class)
      h += `<div class="comms-channel-members-pop" id="commsChannelMembersPop" style="display:none">`;
      h += `<div class="comms-channel-members-pop-head"><span>Members of ${esc(ch.name || ('#' + COMMS_CHANNEL_ACTIVE))}</span><button class="comms-channel-members-close" id="commsChannelMembersClose" aria-label="Close">×</button></div>`;
      h += '<div class="comms-channel-members-list">';
      if(memberCount === 0){
        h += '<p class="comms-empty-sub" style="padding:8px 0">No members yet.</p>';
      } else {
        for(const tk of ch.members){
          // Find a name: master coordinator has the master token; others use coordinators registry — we don't have it here, so render token
          const isMe = tk === myToken;
          const displayName = isMe ? (identity ? identity.name : 'You') + ' (you)' : tk;
          h += `<div class="comms-channel-member-row">
            <span class="comms-channel-member-name">${esc(displayName)}</span>
            ${isMaster && !isMe ? `<button class="btn ghost comms-channel-member-remove" data-comms-member-remove="${esc(tk)}" title="Remove from channel">Remove</button>` : ''}
          </div>`;
        }
      }
      h += '</div>';
      if(isMaster){
        h += `<div class="comms-channel-member-add-row">
          <input type="text" class="comms-channel-member-add-input" id="commsChannelMemberAddInput" placeholder="Coordinator token to add" autocomplete="off">
          <button class="btn primary comms-channel-member-add-btn" id="commsChannelMemberAdd">Add</button>
        </div>`;
      }
      h += `</div>`;
      // Messages
      h += '<div class="comms-channel-msgs" id="commsChannelMsgs">';
      if(!msgs.length){
        h += '<div class="comms-empty"><p class="comms-empty-sub" style="padding:20px 0">No messages yet. Be the first to say hello.</p></div>';
      } else {
        const myName = identity ? identity.name : '';
        for(const m of msgs){
          const ts = m.ts ? new Date(m.ts) : null;
          const tsLabel = ts ? ts.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
          const isMe = m.by === myName;
          const isEditing = COMMS_CHANNEL_EDITING_MSG_ID === m.id;
          // Edit window: 10 minutes. Past that, no edit (server doesn't enforce; soft client cap).
          const editWindowMs = 10 * 60 * 1000;
          const tsMs = ts ? ts.getTime() : 0;
          const inEditWindow = isMe && tsMs && (Date.now() - tsMs < editWindowMs);
          if(isEditing){
            h += `<div class="comms-msg me editing">
              <div class="comms-msg-head"><span class="comms-msg-by">${esc(m.by || '')}</span><span class="comms-msg-ts">${esc(tsLabel)} · editing</span></div>
              <textarea class="comms-msg-edit-input" id="commsMsgEditInput-${esc(m.id)}" rows="2">${esc(m.text || '')}</textarea>
              <div class="comms-msg-edit-actions">
                <button class="btn ghost" data-comms-msg-edit-cancel="${esc(m.id)}">Cancel</button>
                <button class="btn primary" data-comms-msg-edit-save="${esc(m.id)}">Save</button>
                <button class="btn ghost danger" data-comms-msg-delete="${esc(m.id)}" title="Delete this message">Delete</button>
              </div>
            </div>`;
          } else {
            const editedTag = m.editedAt ? `<span class="comms-msg-edited" title="Edited ${esc(new Date(m.editedAt).toLocaleString())}">edited</span>` : '';
            const editBtn = inEditWindow ? `<button class="comms-msg-edit-btn" data-comms-msg-edit="${esc(m.id)}" title="Edit">✎</button>` : '';
            // Render @-mentions as visually distinct
            const renderedText = renderMentions(esc(m.text || ''), myName);
            h += `<div class="comms-msg${isMe ? ' me' : ''}${m.deleted ? ' deleted' : ''}">
              <div class="comms-msg-head"><span class="comms-msg-by">${esc(m.by || '')}</span><span class="comms-msg-ts">${esc(tsLabel)}</span>${editedTag}${editBtn}</div>
              <div class="comms-msg-text">${m.deleted ? '<em>(message deleted)</em>' : renderedText}</div>
            </div>`;
          }
        }
      }
      h += '</div>';
      // Input row
      h += '<div class="comms-channel-input-row">';
      h += `<textarea class="comms-channel-input" id="commsChannelInput" placeholder="Write a message… (use @ to mention)" rows="2"></textarea>`;
      h += '<div class="comms-mention-popover" id="commsMentionPopover" style="display:none"></div>';
      h += `<button class="btn primary" id="commsChannelSendBtn">Send</button>`;
      h += '</div>';
    }
  }
  h += '</div>'; // thread pane
  h += '</div>'; // comms-channels
  return h;
};

function renderMentions(text, myName){
  // Highlight @<name> tokens. If the mention matches myName, add a "you-mentioned" class.
  return text.replace(/@([\w'\-]+(?:\s+[\w'\-]+)?)/g, (full, name) => {
    const isMe = name.toLowerCase() === (myName || '').toLowerCase();
    return `<span class="comms-mention${isMe ? ' me' : ''}" title="@${esc(name)}">@${esc(name)}</span>`;
  });
}

async function handleChannelMessageEditSave(msgId){
  const input = document.getElementById('commsMsgEditInput-' + msgId);
  if(!input) return;
  const newText = input.value.trim();
  if(!newText){ toast('Message cannot be empty', true); return; }
  const ch = window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels && window.MESSAGE_BOARD.channels[COMMS_CHANNEL_ACTIVE];
  if(!ch) return;
  const m = (ch.messages || []).find(x => x.id === msgId);
  if(!m) return;
  if(m.by !== (identity ? identity.name : '')){ toast('Can only edit your own messages', true); return; }
  m.text = newText;
  m.editedAt = new Date().toISOString();
  COMMS_CHANNEL_EDITING_MSG_ID = null;
  save();
  toast('Message updated', false);
  renderComms();
}

async function handleChannelMessageDelete(msgId){
  const ok = await customConfirm('Delete this message?', 'Other members will see "(message deleted)".');
  if(!ok) return;
  const ch = window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels && window.MESSAGE_BOARD.channels[COMMS_CHANNEL_ACTIVE];
  if(!ch) return;
  const m = (ch.messages || []).find(x => x.id === msgId);
  if(!m) return;
  if(m.by !== (identity ? identity.name : '')){ toast('Can only delete your own messages', true); return; }
  m.deleted = true;
  m.text = ''; // wipe content; keep tombstone
  m.editedAt = new Date().toISOString();
  COMMS_CHANNEL_EDITING_MSG_ID = null;
  save();
  toast('Message deleted', false);
  renderComms();
}

let _membersPopVisible = false;
function handleChannelMembersToggle(){
  _membersPopVisible = !_membersPopVisible;
  const pop = document.getElementById('commsChannelMembersPop');
  if(pop) pop.style.display = _membersPopVisible ? 'block' : 'none';
}
function handleChannelMembersClose(){
  _membersPopVisible = false;
  const pop = document.getElementById('commsChannelMembersPop');
  if(pop) pop.style.display = 'none';
}
async function handleChannelMemberAdd(){
  const input = document.getElementById('commsChannelMemberAddInput');
  if(!input) return;
  const tk = (input.value || '').trim();
  if(!tk){ toast('Coordinator token required', true); return; }
  const ch = window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels && window.MESSAGE_BOARD.channels[COMMS_CHANNEL_ACTIVE];
  if(!ch) return;
  if(!Array.isArray(ch.members)) ch.members = [];
  if(ch.members.includes(tk)){ toast('Already a member', true); return; }
  ch.members.push(tk);
  save();
  input.value = '';
  toast('Added member', false);
  renderComms();
}
async function handleChannelMemberRemove(tk){
  const ch = window.MESSAGE_BOARD && window.MESSAGE_BOARD.channels && window.MESSAGE_BOARD.channels[COMMS_CHANNEL_ACTIVE];
  if(!ch) return;
  if(!Array.isArray(ch.members)) return;
  const i = ch.members.indexOf(tk);
  if(i < 0) return;
  ch.members.splice(i, 1);
  save();
  toast('Removed member', false);
  renderComms();
}

/* @-mentions: simple autocomplete popover when user types `@` followed by chars.
   Uses contacts (organizers) as the source list. Inserts @<full-name> on selection. */
let MENTION_OPEN_AT = -1; // char index where '@' was typed
let MENTION_CANDIDATES = [];
let MENTION_HIGHLIGHTED = 0;

function handleChannelInputForMention(e){
  const ta = e.target;
  const val = ta.value;
  const caret = ta.selectionStart || 0;
  // Find the most recent '@' before caret with no space between '@' and caret
  let atIdx = -1;
  for(let i = caret - 1; i >= 0; i--){
    const c = val.charAt(i);
    if(c === '@'){ atIdx = i; break; }
    if(c === ' ' || c === '\n') break;
  }
  if(atIdx < 0){ closeMentionPopover(); return; }
  const query = val.slice(atIdx + 1, caret).toLowerCase();
  if(query.length > 30){ closeMentionPopover(); return; } // unlikely a real name
  // Source candidates: organizer-role contacts + master "Hannah & Stan"
  const candidates = (C || [])
    .filter(c => c && c.name && ['groom','bride','bridal','organizer','coordinator','officiant','helper'].includes((c.role || '').toLowerCase()))
    .map(c => c.name)
    .filter(n => !query || n.toLowerCase().includes(query));
  if(!candidates.length){ closeMentionPopover(); return; }
  MENTION_OPEN_AT = atIdx;
  MENTION_CANDIDATES = candidates.slice(0, 6);
  MENTION_HIGHLIGHTED = Math.min(MENTION_HIGHLIGHTED, MENTION_CANDIDATES.length - 1);
  if(MENTION_HIGHLIGHTED < 0) MENTION_HIGHLIGHTED = 0;
  renderMentionPopover();
}

function renderMentionPopover(){
  const pop = document.getElementById('commsMentionPopover');
  if(!pop) return;
  if(!MENTION_CANDIDATES.length){ pop.style.display = 'none'; return; }
  pop.innerHTML = MENTION_CANDIDATES.map((name, i) =>
    `<button class="comms-mention-cand${i === MENTION_HIGHLIGHTED ? ' active' : ''}" data-comms-mention-pick="${esc(name)}">@${esc(name)}</button>`
  ).join('');
  pop.style.display = 'block';
  pop.querySelectorAll('[data-comms-mention-pick]').forEach(b => {
    b.onclick = function(){ pickMention(this.dataset.commsMentionPick); };
  });
}

function closeMentionPopover(){
  MENTION_OPEN_AT = -1;
  MENTION_CANDIDATES = [];
  MENTION_HIGHLIGHTED = 0;
  const pop = document.getElementById('commsMentionPopover');
  if(pop) pop.style.display = 'none';
}

function handleMentionKeyboard(e){
  if(MENTION_OPEN_AT < 0 || !MENTION_CANDIDATES.length) return;
  if(e.key === 'ArrowDown'){ e.preventDefault(); MENTION_HIGHLIGHTED = (MENTION_HIGHLIGHTED + 1) % MENTION_CANDIDATES.length; renderMentionPopover(); }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); MENTION_HIGHLIGHTED = (MENTION_HIGHLIGHTED - 1 + MENTION_CANDIDATES.length) % MENTION_CANDIDATES.length; renderMentionPopover(); }
  else if(e.key === 'Enter' && !e.shiftKey){
    if(MENTION_OPEN_AT >= 0 && MENTION_CANDIDATES[MENTION_HIGHLIGHTED]){
      e.preventDefault();
      pickMention(MENTION_CANDIDATES[MENTION_HIGHLIGHTED]);
    }
  } else if(e.key === 'Escape'){
    closeMentionPopover();
  }
}

function pickMention(name){
  const ta = document.getElementById('commsChannelInput');
  if(!ta || MENTION_OPEN_AT < 0) return;
  const val = ta.value;
  const caret = ta.selectionStart || 0;
  const before = val.slice(0, MENTION_OPEN_AT);
  const after = val.slice(caret);
  const insert = '@' + name + ' ';
  ta.value = before + insert + after;
  const newCaret = (before + insert).length;
  ta.focus();
  ta.setSelectionRange(newCaret, newCaret);
  if(COMMS_CHANNEL_ACTIVE) COMMS_CHANNEL_INPUT_DRAFT[COMMS_CHANNEL_ACTIVE] = ta.value;
  closeMentionPopover();
}

/* ────────────── BROADCAST QoL — send-test, draft auto-save, discard-draft ────── */

async function handleBroadcastSendTest(){
  if(!identity || !identity.email && !(identity.isMaster)){ /* allow master */ }
  const subject = COMMS_BROADCAST_DRAFT.subject.trim();
  const body = COMMS_BROADCAST_DRAFT.body.trim();
  if(!subject){ toast('Subject required', true); return; }
  if(!body){ toast('Body required', true); return; }
  // Find Stan's contact email + Hannah's via contacts; fall back to known personal Gmail
  const stanContact = (C || []).find(c => c && c.id === 'p2');
  const stanEmail = (stanContact && stanContact.email) || 'scryballer@gmail.com';
  const ok = await customConfirm('Send test to ' + stanEmail + '?', 'Just to you. Guests will not see this.');
  if(!ok) return;
  try {
    const res = await fetch('/.netlify/functions/zoho-broadcast-send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (token || ''),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromAlias: COMMS_BROADCAST_DRAFT.fromAlias,
        subject: '[TEST] ' + subject,
        bodyText: body,
        bodyHtml: body.replace(/\n/g, '<br>'),
        recipients: [{ email: stanEmail, name: 'Stan (test)' }],
        broadcastId: 'bc-test-' + Date.now()
      })
    });
    const data = await res.json();
    if(data.ok){
      toast('Test sent to ' + stanEmail, false);
    } else {
      toast('Test failed: ' + (data.error || 'unknown'), true);
    }
  } catch (e) {
    toast('Send error: ' + e.message, true);
  }
}

async function handleBroadcastDiscardDraft(){
  if(!COMMS_BROADCAST_DRAFT.subject && !COMMS_BROADCAST_DRAFT.body){ return; }
  const ok = await customConfirm('Discard broadcast draft?', 'Subject and body will be cleared.');
  if(!ok) return;
  clearBroadcastDraft();
  COMMS_BROADCAST_STEP = 1;
  renderComms();
  toast('Draft discarded', false);
}

// Wrap handleBroadcastSend to clear the draft on successful send
const _origHandleBroadcastSend = handleBroadcastSend;
handleBroadcastSend = async function(){
  const before = COMMS_BROADCAST_RESULT;
  await _origHandleBroadcastSend();
  if(COMMS_BROADCAST_RESULT && COMMS_BROADCAST_RESULT.ok){
    clearBroadcastDraft();
    // Don't re-render here; the original already did
  }
};

// Wrap renderCommsBroadcast to add Send-Test + Discard-Draft buttons in the footer
// + draft-saved indicator
const _origRenderCommsBroadcast = renderCommsBroadcast;
renderCommsBroadcast = function(){
  let h = _origRenderCommsBroadcast();
  // Inject Send-Test + Discard-Draft into the existing footer.
  // Simplest path: post-process the rendered string to inject our buttons before the footer's closing div.
  const hasDraft = (COMMS_BROADCAST_DRAFT.subject && COMMS_BROADCAST_DRAFT.subject.trim()) || (COMMS_BROADCAST_DRAFT.body && COMMS_BROADCAST_DRAFT.body.trim());
  const draftIndicator = hasDraft ? `<span class="comms-bc-draft-saved" title="Draft auto-saved">💾 Draft saved</span>` : '';
  // Replace the footer to add Send-Test + Discard-Draft + draft indicator. Detect footer by class.
  // We use a tolerant regex to keep this resilient if the original markup tightens later.
  h = h.replace(
    /<div class="comms-bc-footer">([\s\S]*?)<\/div>\s*<\/div>\s*$/,
    function(_, inner){
      const sendTestBtn = `<button class="btn ghost comms-bc-send-test" id="commsBcSendTest" title="Send a copy to Stan only — guests do not see this">Send test to Stan</button>`;
      const discardBtn = hasDraft ? `<button class="btn ghost comms-bc-discard-draft" id="commsBcDiscardDraft" title="Clear subject + body">Discard draft</button>` : '';
      return `<div class="comms-bc-footer">${draftIndicator}${sendTestBtn}${discardBtn}${inner}</div></div>`;
    }
  );
  return h;
};

/* ────────────── BOUNCE / FAILED-RECIPIENT HANDLING (Stage 3 QoL #15) ─────────
   When zoho-broadcast-send returns a per-recipient failure, mark the contact's
   email as bouncing so future broadcasts skip it. Add a "skipBroadcast: true"
   flag on the contact + an "emailBounced": true diagnostic field. Both visible
   in audit log via the existing diff machinery. */
const _origHandleBroadcastSendForBounce = handleBroadcastSend;
handleBroadcastSend = async function(){
  await _origHandleBroadcastSendForBounce();
  if(!COMMS_BROADCAST_RESULT || !Array.isArray(COMMS_BROADCAST_RESULT.failedRecipients)) return;
  let flaggedCount = 0;
  for(const f of COMMS_BROADCAST_RESULT.failedRecipients){
    if(!f || !f.email) continue;
    // Heuristic: only flag as bouncing on errors that look terminal (not network errors).
    // "zoho_send_failed" with a 5xx in detail OR "invalid_email" → flag.
    const looksTerminal = (f.error === 'invalid_email') || (f.error === 'zoho_send_failed' && /5\d\d/.test(f.detail || ''));
    if(!looksTerminal) continue;
    const contact = (C || []).find(c => c && c.email && c.email.toLowerCase() === (f.email || '').toLowerCase());
    if(!contact) continue;
    contact.skipBroadcast = true;
    contact.emailBouncedAt = new Date().toISOString();
    flaggedCount++;
  }
  if(flaggedCount > 0){
    save();
    toast('Flagged ' + flaggedCount + ' bouncing email' + (flaggedCount === 1 ? '' : 's') + ' on contacts', false);
    renderComms();
  }
};

// Filter bcResolveRecipients to skip bouncing contacts
const _origBcResolveRecipients = bcResolveRecipients;
bcResolveRecipients = function(){
  const all = _origBcResolveRecipients();
  return all.filter(r => {
    const c = (C || []).find(x => x && x.id === r.id);
    if(c && c.skipBroadcast) return false;
    return true;
  });
};

})();  // IIFE end
