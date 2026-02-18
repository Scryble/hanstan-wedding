/* Admin Dashboard Phase 3 (NETLIFYADMIN-T2-WRITE-PATH-ADMIN-LIVE)
   Loads draft/published bundle from Netlify Blobs.
   Supports Save Draft, Publish Live, Undo Publish (server), Undo Draft Edit (local, N=10).
   Token entry via injected UI, persisted in sessionStorage.
*/

(function () {
  var BUNDLE_ENDPOINT = '/.netlify/functions/admin-read-registry-bundle';
  var WRITE_ENDPOINT = '/.netlify/functions/admin-write-registry';
  var UNDO_ENDPOINT = '/.netlify/functions/admin-undo-registry';
  var TOKEN_SS_KEY = 'hanstan_admin_write_token';
  var LOCAL_UNDO_KEY = 'hanstan_admin_draft_undo_stack';
  var LOCAL_UNDO_MAX = 10;

  var data = { tokens: null, copy: null, gifts: [], ordering: null };
  var snapshot = null;
  var activeGiftId = null;
  var activeOrderTab = 'Home';

  // Version state
  var currentMeta = null;
  var savedDraftSnapshot = null; // JSON string of draft payload at last load/save

  init();

  /* ============ INIT ============ */

  async function init() {
    injectControlBar();
    var bundle = await fetchBundle();
    if (!bundle) return;

    currentMeta = bundle.meta;
    var draft = bundle.draft;

    data.tokens = draft.theme || {};
    data.copy = draft.copy || {};
    var gd = draft.gifts;
    data.gifts = (gd && gd.gifts) ? gd.gifts.slice() : [];
    data.ordering = draft.ordering || { sectionOrder: { Home: [], Adventure: [], Hobby: [] }, dreamOrder: { Stan: [], Hannah: [] } };

    savedDraftSnapshot = draftPayloadJson();
    updateVersionDisplay();
    updateDirtyIndicator();

    wireTabs();
    wireGiftsTab();
    wireCopyTab();
    wireThemeTab();
    wireImportExportTab();
    wireDiagnosticsTab();
    renderGiftsList();
    renderOrderingList();
  }

  async function fetchBundle() {
    try {
      var r = await fetch(BUNDLE_ENDPOINT, { cache: 'no-store' });
      if (!r.ok) throw new Error('Bundle fetch failed');
      return await r.json();
    } catch (e) {
      showControlMsg('Error loading bundle: ' + e.message, true);
      return null;
    }
  }

  /* ============ CONTROL BAR (injected) ============ */

  function injectControlBar() {
    var bar = document.createElement('div');
    bar.id = 'adminControlBar';
    bar.style.cssText = [
      'display:flex', 'flex-wrap:wrap', 'align-items:center', 'gap:8px',
      'padding:10px 16px', 'background:var(--panel-bg,#120b1a)',
      'border-bottom:1px solid var(--border,#2a1f3d)',
      'font-size:13px', 'position:sticky', 'top:0', 'z-index:200'
    ].join(';');

    // Token input
    var tokenWrap = document.createElement('label');
    tokenWrap.style.cssText = 'display:flex;align-items:center;gap:6px;color:var(--muted,#cbb9dd);';
    tokenWrap.textContent = 'Token:';
    var tokenInp = document.createElement('input');
    tokenInp.id = 'adminTokenInput';
    tokenInp.type = 'password';
    tokenInp.placeholder = 'Paste write token';
    tokenInp.style.cssText = 'font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--border,#2a1f3d);background:var(--card-bg,#1a1224);color:var(--text-primary,#f3ecff);width:160px;';
    tokenInp.value = sessionStorage.getItem(TOKEN_SS_KEY) || '';
    tokenInp.addEventListener('input', function () {
      sessionStorage.setItem(TOKEN_SS_KEY, tokenInp.value);
    });
    tokenWrap.appendChild(tokenInp);
    bar.appendChild(tokenWrap);

    // Version display
    var verEl = document.createElement('span');
    verEl.id = 'adminVersionDisplay';
    verEl.style.cssText = 'color:var(--muted,#cbb9dd);font-size:12px;padding:0 8px;';
    bar.appendChild(verEl);

    // Dirty indicator
    var dirtyEl = document.createElement('span');
    dirtyEl.id = 'adminDirtyIndicator';
    dirtyEl.style.cssText = 'font-size:12px;padding:2px 8px;border-radius:6px;';
    bar.appendChild(dirtyEl);

    // Save Draft button
    var btnSaveDraft = document.createElement('button');
    btnSaveDraft.id = 'btnSaveDraft';
    btnSaveDraft.type = 'button';
    btnSaveDraft.textContent = 'Save Draft';
    btnSaveDraft.style.cssText = 'padding:6px 14px;border-radius:8px;border:none;cursor:pointer;background:var(--chip-active-bg,#d8b55b);color:var(--chip-active-text,#1b1026);font-size:13px;font-weight:600;';
    btnSaveDraft.addEventListener('click', function () { doWrite('save_draft'); });
    bar.appendChild(btnSaveDraft);

    // Publish Live button
    var btnPublish = document.createElement('button');
    btnPublish.id = 'btnPublishLive';
    btnPublish.type = 'button';
    btnPublish.textContent = 'Publish Live';
    btnPublish.style.cssText = 'padding:6px 14px;border-radius:8px;border:none;cursor:pointer;background:#2ecc71;color:#0a1f0a;font-size:13px;font-weight:600;';
    btnPublish.addEventListener('click', function () { doWrite('publish_live'); });
    bar.appendChild(btnPublish);

    // Undo Publish button (server)
    var btnUndoPublish = document.createElement('button');
    btnUndoPublish.id = 'btnUndoPublish';
    btnUndoPublish.type = 'button';
    btnUndoPublish.textContent = 'Undo Publish';
    btnUndoPublish.style.cssText = 'padding:6px 14px;border-radius:8px;border:1px solid var(--border,#2a1f3d);cursor:pointer;background:transparent;color:var(--text-primary,#f3ecff);font-size:13px;';
    btnUndoPublish.addEventListener('click', doUndoPublish);
    bar.appendChild(btnUndoPublish);

    // Undo Draft Edit button (local)
    var btnUndoDraft = document.createElement('button');
    btnUndoDraft.id = 'btnUndoDraftEdit';
    btnUndoDraft.type = 'button';
    btnUndoDraft.textContent = 'Undo Draft Edit';
    btnUndoDraft.style.cssText = 'padding:6px 14px;border-radius:8px;border:1px solid var(--border,#2a1f3d);cursor:pointer;background:transparent;color:var(--text-primary,#f3ecff);font-size:13px;';
    btnUndoDraft.addEventListener('click', doLocalUndoDraftEdit);
    bar.appendChild(btnUndoDraft);

    // Control msg
    var msgEl = document.createElement('span');
    msgEl.id = 'adminControlMsg';
    msgEl.style.cssText = 'font-size:12px;padding:0 4px;flex:1;';
    bar.appendChild(msgEl);

    document.body.insertBefore(bar, document.body.firstChild);
  }

  function updateVersionDisplay() {
    var el = document.getElementById('adminVersionDisplay');
    if (!el || !currentMeta) return;
    el.textContent = 'Published: ' + currentMeta.publishedVersion + '  |  Draft: ' + currentMeta.draftVersion;
  }

  function updateDirtyIndicator() {
    var el = document.getElementById('adminDirtyIndicator');
    if (!el) return;
    var current = draftPayloadJson();
    var isDirty = current !== savedDraftSnapshot;
    el.textContent = isDirty ? '● Unsaved changes' : '✓ Saved';
    el.style.background = isDirty ? 'rgba(231,76,60,0.18)' : 'rgba(46,204,113,0.18)';
    el.style.color = isDirty ? '#e74c3c' : '#2ecc71';
  }

  function showControlMsg(msg, isError) {
    var el = document.getElementById('adminControlMsg');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#e74c3c' : '#2ecc71';
    setTimeout(function () { if (el.textContent === msg) el.textContent = ''; }, 5000);
  }

  /* ============ DRAFT PAYLOAD HELPERS ============ */

  function buildDraftPayload() {
    return {
      gifts: { gifts: data.gifts },
      copy: data.copy,
      theme: data.tokens,
      ordering: data.ordering
    };
  }

  function draftPayloadJson() {
    return JSON.stringify(buildDraftPayload());
  }

  /* ============ WRITE ACTIONS ============ */

  async function doWrite(mode) {
    var token = sessionStorage.getItem(TOKEN_SS_KEY) || '';
    if (!token) { showControlMsg('Enter write token first.', true); return; }
    if (!currentMeta) { showControlMsg('No meta loaded.', true); return; }

    pushLocalDraftUndo();

    var payload = buildDraftPayload();
    var body = {
      mode: mode,
      payload: payload,
      client: {
        expectedPublishedVersion: currentMeta.publishedVersion,
        expectedDraftVersion: currentMeta.draftVersion
      }
    };

    try {
      var r = await fetch(WRITE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(body)
      });

      var result = await r.json();

      if (r.status === 409) {
        showControlMsg('Version conflict — reloading.', true);
        currentMeta = result.server;
        updateVersionDisplay();
        return;
      }
      if (!r.ok) {
        showControlMsg('Error: ' + (result.error || r.status), true);
        return;
      }

      currentMeta = result.meta;
      savedDraftSnapshot = draftPayloadJson();
      updateVersionDisplay();
      updateDirtyIndicator();
      showControlMsg(mode === 'save_draft' ? 'Draft saved.' : 'Published live.', false);
    } catch (e) {
      showControlMsg('Request failed: ' + e.message, true);
    }
  }

  async function doUndoPublish() {
    var token = sessionStorage.getItem(TOKEN_SS_KEY) || '';
    if (!token) { showControlMsg('Enter write token first.', true); return; }

    try {
      var r = await fetch(UNDO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ mode: 'undo_publish' })
      });

      var result = await r.json();

      if (r.status === 400 && result.error === 'no_undo') {
        showControlMsg('No previous published version to undo.', true);
        return;
      }
      if (!r.ok) {
        showControlMsg('Error: ' + (result.error || r.status), true);
        return;
      }

      currentMeta = result.meta;
      updateVersionDisplay();
      showControlMsg('Publish undone. Now live: ' + currentMeta.publishedVersion, false);
    } catch (e) {
      showControlMsg('Request failed: ' + e.message, true);
    }
  }

  /* ============ LOCAL DRAFT UNDO STACK (N=10, localStorage) ============ */

  function pushLocalDraftUndo() {
    try {
      var raw = localStorage.getItem(LOCAL_UNDO_KEY);
      var stack = raw ? JSON.parse(raw) : [];
      stack.unshift(draftPayloadJson());
      if (stack.length > LOCAL_UNDO_MAX) stack = stack.slice(0, LOCAL_UNDO_MAX);
      localStorage.setItem(LOCAL_UNDO_KEY, JSON.stringify(stack));
    } catch (e) {}
  }

  function doLocalUndoDraftEdit() {
    try {
      var raw = localStorage.getItem(LOCAL_UNDO_KEY);
      var stack = raw ? JSON.parse(raw) : [];
      if (stack.length === 0) { showControlMsg('No local undo available.', true); return; }
      var prev = stack.shift();
      localStorage.setItem(LOCAL_UNDO_KEY, JSON.stringify(stack));
      var bundle = JSON.parse(prev);
      data.gifts = (bundle.gifts && bundle.gifts.gifts) ? bundle.gifts.gifts : [];
      data.copy = bundle.copy || {};
      data.tokens = bundle.theme || {};
      data.ordering = bundle.ordering || { sectionOrder: { Home: [], Adventure: [], Hobby: [] }, dreamOrder: { Stan: [], Hannah: [] } };
      activeGiftId = null;
      renderGiftsList();
      renderOrderingList();
      wireCopyTab();
      wireThemeTab();
      document.getElementById('giftEditorPanel').innerHTML = '<div class="editor-placeholder">Undo Draft Edit complete.</div>';
      updateDirtyIndicator();
      showControlMsg('Draft edit undone.', false);
    } catch (e) {
      showControlMsg('Local undo failed: ' + e.message, true);
    }
  }

  /* ============ FETCH JSON (kept for diagnostics etc) ============ */

  function fetchJson(path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Fetch failed: ' + path);
      return r.json();
    }).catch(function () { return null; });
  }

  /* ============ TABS ============ */

  function wireTabs() {
    var nav = document.getElementById('tabNav');
    nav.querySelectorAll('.tabBtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        nav.querySelectorAll('.tabBtn').forEach(function (b) { b.classList.remove('tabBtn--active'); });
        btn.classList.add('tabBtn--active');
        document.querySelectorAll('.tabContent').forEach(function (c) { c.classList.remove('tabContent--active'); });
        var target = document.getElementById('tab-' + btn.getAttribute('data-tab'));
        if (target) target.classList.add('tabContent--active');
      });
    });
  }

  /* ============ GIFTS TAB ============ */

  function wireGiftsTab() {
    document.getElementById('giftSearch').addEventListener('input', renderGiftsList);
    document.getElementById('giftFilter').addEventListener('change', renderGiftsList);
    document.getElementById('giftSort').addEventListener('change', renderGiftsList);
    document.getElementById('btnAddGift').addEventListener('click', addNewGift);

    document.querySelectorAll('[data-ordertab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-ordertab]').forEach(function (b) { b.classList.remove('tabBtn--active'); });
        btn.classList.add('tabBtn--active');
        activeOrderTab = btn.getAttribute('data-ordertab');
        renderOrderingList();
      });
    });
  }

  function renderGiftsList() {
    var search = (document.getElementById('giftSearch').value || '').toLowerCase();
    var filter = document.getElementById('giftFilter').value;
    var sort = document.getElementById('giftSort').value;

    var list = data.gifts.filter(function (g) {
      var matchSearch = !search || g.title.toLowerCase().indexOf(search) >= 0 || g.giftId.toLowerCase().indexOf(search) >= 0;
      var matchFilter = filter === 'all' || g.primarySection === filter;
      return matchSearch && matchFilter;
    });

    list.sort(function (a, b) {
      if (sort === 'price') return (a.price || 0) - (b.price || 0);
      if (sort === 'status') return (a.status || '').localeCompare(b.status || '');
      return (a.title || '').localeCompare(b.title || '');
    });

    var container = document.getElementById('giftsMaster');
    container.innerHTML = '';

    list.forEach(function (g) {
      var row = document.createElement('div');
      row.className = 'gift-row' + (g.giftId === activeGiftId ? ' gift-row--active' : '');

      var title = document.createElement('span');
      title.className = 'gift-row__title';
      title.textContent = g.title;

      var section = document.createElement('span');
      section.className = 'gift-row__section';
      section.textContent = g.primarySection;

      var price = document.createElement('span');
      price.className = 'gift-row__price';
      price.textContent = (typeof g.price === 'number' && g.price > 0) ? '$' + g.price : '—';

      var statusCls = 'gift-row__status';
      if (g.status === 'Available') statusCls += ' gift-row__status--available';
      else if (g.status === 'ClaimPendingConfirmation') statusCls += ' gift-row__status--pending';
      else statusCls += ' gift-row__status--claimed';

      var status = document.createElement('span');
      status.className = statusCls;
      status.textContent = g.status === 'ClaimPendingConfirmation' ? 'Pending' : g.status;

      row.appendChild(title);
      row.appendChild(section);
      row.appendChild(price);
      row.appendChild(status);

      row.addEventListener('click', function () {
        activeGiftId = g.giftId;
        renderGiftsList();
        renderGiftEditor(g);
      });

      container.appendChild(row);
    });

    updateDirtyIndicator();
  }

  function addNewGift() {
    saveSnapshot();
    var id = 'gift-' + Date.now();
    var g = {
      giftId: id,
      title: 'New Gift',
      shortDescription: '',
      longDescription: '',
      images: ['/assets/og-image.png'],
      categoryTags: { home: false, adventure: false, hobby: false },
      primarySection: 'Home',
      isDreamGift: false,
      dreamOwner: null,
      isGroupGift: false,
      price: 0,
      currency: 'USD',
      allowGifterProvidedVariant: false,
      preferredMerchants: [],
      alternativeMerchants: [],
      acquisitionNotes: '',
      status: 'Available',
      claimerName: '',
      claimerEmail: '',
      claimerMessage: '',
      coupleReplyToClaimer: '',
      contributors: [],
      groupThankYouNote: ''
    };
    data.gifts.push(g);
    ensureOrdering(g);
    activeGiftId = id;
    renderGiftsList();
    renderGiftEditor(g);
  }

  function renderGiftEditor(gift) {
    var panel = document.getElementById('giftEditorPanel');
    panel.innerHTML = '';

    var form = document.createElement('div');
    form.className = 'editor-form';

    form.appendChild(makeField('text', 'Gift ID', gift.giftId, function (v) { gift.giftId = v; }));
    form.appendChild(makeField('text', 'Title', gift.title, function (v) { gift.title = v; updateDirtyIndicator(); }));
    form.appendChild(makeField('text', 'Short Description', gift.shortDescription || '', function (v) { gift.shortDescription = v; }));
    form.appendChild(makeTextarea('Long Description', gift.longDescription || '', function (v) { gift.longDescription = v; }));

    var row1 = document.createElement('div');
    row1.className = 'editor-row';
    row1.appendChild(makeSelect('Primary Section', ['Home', 'Adventure', 'Hobby'], gift.primarySection, function (v) { gift.primarySection = v; }));
    row1.appendChild(makeField('number', 'Price', gift.price || '', function (v) { gift.price = v ? Number(v) : null; }));
    form.appendChild(row1);

    var catSec = document.createElement('div');
    catSec.className = 'editor-section';
    catSec.innerHTML = '<div class="editor-section-title">Category Tags</div>';
    var catRow = document.createElement('div');
    catRow.className = 'editor-row-3';
    var tags = gift.categoryTags || {};
    catRow.appendChild(makeCheckbox('Home', tags.home === true, function (v) {
      if (!gift.categoryTags || typeof gift.categoryTags !== 'object') gift.categoryTags = {};
      gift.categoryTags.home = v;
    }));
    catRow.appendChild(makeCheckbox('Adventure', tags.adventure === true, function (v) {
      if (!gift.categoryTags || typeof gift.categoryTags !== 'object') gift.categoryTags = {};
      gift.categoryTags.adventure = v;
    }));
    catRow.appendChild(makeCheckbox('Hobby', tags.hobby === true, function (v) {
      if (!gift.categoryTags || typeof gift.categoryTags !== 'object') gift.categoryTags = {};
      gift.categoryTags.hobby = v;
    }));
    catSec.appendChild(catRow);
    form.appendChild(catSec);

    var flagSec = document.createElement('div');
    flagSec.className = 'editor-section';
    flagSec.innerHTML = '<div class="editor-section-title">Flags</div>';
    var flagRow = document.createElement('div');
    flagRow.className = 'editor-row';

    var dreamCheck = makeCheckbox('Is Dream Gift', gift.isDreamGift, function (v) {
      saveSnapshot();
      gift.isDreamGift = v;
      if (!v) {
        removeDreamOrdering(gift.giftId);
        gift.dreamOwner = null;
      } else {
        gift.dreamOwner = gift.dreamOwner || 'Stan';
        ensureDreamOrdering(gift.giftId, gift.dreamOwner);
      }
      renderGiftEditor(gift);
      renderOrderingList();
    });
    flagRow.appendChild(dreamCheck);

    if (gift.isDreamGift) {
      flagRow.appendChild(makeSelect('Dream Owner', ['Stan', 'Hannah'], gift.dreamOwner || 'Stan', function (v) {
        saveSnapshot();
        var old = gift.dreamOwner;
        gift.dreamOwner = v;
        if (old && old !== v) {
          removeDreamOrderingFrom(gift.giftId, old);
        }
        ensureDreamOrdering(gift.giftId, v);
        renderOrderingList();
      }));
    }
    flagSec.appendChild(flagRow);

    var flagRow2 = document.createElement('div');
    flagRow2.className = 'editor-row';
    flagRow2.appendChild(makeCheckbox('Is Group Gift', gift.isGroupGift, function (v) { gift.isGroupGift = v; renderGiftEditor(gift); }));
    flagRow2.appendChild(makeCheckbox('Allow Gifter-Provided Variant', gift.allowGifterProvidedVariant === true, function (v) { gift.allowGifterProvidedVariant = v; }));
    flagSec.appendChild(flagRow2);
    form.appendChild(flagSec);

    var imgSec = document.createElement('div');
    imgSec.className = 'editor-section';
    imgSec.innerHTML = '<div class="editor-section-title">Images (first is hero)</div>';
    var imgList = document.createElement('div');
    imgList.className = 'image-list';
    (gift.images || []).forEach(function (url, i) {
      var item = document.createElement('div');
      item.className = 'image-item';
      var inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'field__input'; inp.value = url;
      inp.addEventListener('change', function () { gift.images[i] = inp.value; });
      var upBtn = document.createElement('button');
      upBtn.type = 'button'; upBtn.className = 'btn btn--sm'; upBtn.textContent = '↑';
      upBtn.disabled = i === 0;
      upBtn.addEventListener('click', function () {
        if (i > 0) { var t = gift.images[i]; gift.images[i] = gift.images[i - 1]; gift.images[i - 1] = t; renderGiftEditor(gift); }
      });
      var rmBtn = document.createElement('button');
      rmBtn.type = 'button'; rmBtn.className = 'btn btn--sm btn--danger'; rmBtn.textContent = '✕';
      rmBtn.addEventListener('click', function () { gift.images.splice(i, 1); renderGiftEditor(gift); });
      item.appendChild(inp); item.appendChild(upBtn); item.appendChild(rmBtn);
      imgList.appendChild(item);
    });
    var addImgBtn = document.createElement('button');
    addImgBtn.type = 'button'; addImgBtn.className = 'btn btn--sm'; addImgBtn.textContent = '+ Add Image';
    addImgBtn.addEventListener('click', function () { gift.images.push('/assets/og-image.png'); renderGiftEditor(gift); });
    imgSec.appendChild(imgList);
    imgSec.appendChild(addImgBtn);
    form.appendChild(imgSec);

    var merchSec = document.createElement('div');
    merchSec.className = 'editor-section';
    merchSec.innerHTML = '<div class="editor-section-title">Preferred Merchants</div>';
    var merchList = document.createElement('div');
    merchList.className = 'merchant-list';
    (gift.preferredMerchants || []).forEach(function (m, i) {
      var item = document.createElement('div');
      item.className = 'merchant-item';
      var inpName = document.createElement('input'); inpName.type = 'text'; inpName.className = 'field__input'; inpName.value = m.merchantName; inpName.placeholder = 'Name';
      inpName.addEventListener('change', function () { m.merchantName = inpName.value; });
      var inpUrl = document.createElement('input'); inpUrl.type = 'text'; inpUrl.className = 'field__input'; inpUrl.value = m.merchantURL; inpUrl.placeholder = 'URL';
      inpUrl.addEventListener('change', function () { m.merchantURL = inpUrl.value; });
      var inpReason = document.createElement('input'); inpReason.type = 'text'; inpReason.className = 'field__input'; inpReason.value = m.merchantReason || ''; inpReason.placeholder = 'Reason';
      inpReason.addEventListener('change', function () { m.merchantReason = inpReason.value; });
      var rmBtn = document.createElement('button'); rmBtn.type = 'button'; rmBtn.className = 'btn btn--sm btn--danger'; rmBtn.textContent = '✕';
      rmBtn.addEventListener('click', function () { gift.preferredMerchants.splice(i, 1); renderGiftEditor(gift); });
      item.appendChild(inpName); item.appendChild(inpUrl); item.appendChild(inpReason); item.appendChild(rmBtn);
      merchList.appendChild(item);
    });
    var addMerchBtn = document.createElement('button');
    addMerchBtn.type = 'button'; addMerchBtn.className = 'btn btn--sm'; addMerchBtn.textContent = '+ Add Merchant';
    addMerchBtn.addEventListener('click', function () {
      if (!gift.preferredMerchants) gift.preferredMerchants = [];
      gift.preferredMerchants.push({ merchantName: '', merchantReason: '', merchantURL: '' });
      renderGiftEditor(gift);
    });
    merchSec.appendChild(merchList);
    merchSec.appendChild(addMerchBtn);
    form.appendChild(merchSec);

    var statusSec = document.createElement('div');
    statusSec.className = 'editor-section';
    statusSec.innerHTML = '<div class="editor-section-title">Status & Messages</div>';

    var statusRow = document.createElement('div');
    statusRow.className = 'editor-row';
    var statusDisplay = document.createElement('div');
    statusDisplay.innerHTML = '<span style="color:var(--muted);font-size:12px;text-transform:uppercase;">Current Status:</span> <strong>' + esc(gift.status) + '</strong>';
    statusRow.appendChild(statusDisplay);

    if (gift.status === 'ClaimPendingConfirmation') {
      var confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'btn btn--primary';
      confirmBtn.textContent = 'Confirm → Claimed';
      confirmBtn.addEventListener('click', function () {
        saveSnapshot();
        gift.status = 'Claimed';
        renderGiftEditor(gift);
        renderGiftsList();
      });
      statusRow.appendChild(confirmBtn);
    }
    statusSec.appendChild(statusRow);

    if (!gift.isGroupGift) {
      statusSec.appendChild(makeField('text', 'Claimer Name', gift.claimerName || '', function (v) { gift.claimerName = v; }));
      statusSec.appendChild(makeField('text', 'Claimer Email', gift.claimerEmail || '', function (v) { gift.claimerEmail = v; }));
      statusSec.appendChild(makeTextarea('Claimer Message', gift.claimerMessage || '', function (v) { gift.claimerMessage = v; }));
      statusSec.appendChild(makeTextarea('Couple Reply', gift.coupleReplyToClaimer || '', function (v) { gift.coupleReplyToClaimer = v; }));
    }

    form.appendChild(statusSec);

    if (gift.isGroupGift) {
      var contribSec = document.createElement('div');
      contribSec.className = 'editor-section';
      contribSec.innerHTML = '<div class="editor-section-title">Group Gift</div>';
      contribSec.appendChild(makeTextarea('Group Thank-You Note', gift.groupThankYouNote || '', function (v) { gift.groupThankYouNote = v; }));

      var contribList = document.createElement('div');
      contribList.className = 'contributor-list';
      (gift.contributors || []).forEach(function (c, i) {
        var item = document.createElement('div');
        item.className = 'contributor-item';
        item.style.flexDirection = 'column';
        item.style.alignItems = 'stretch';
        item.style.gap = '4px';
        item.style.padding = '8px';
        item.style.border = '1px solid var(--border)';
        item.style.borderRadius = '10px';

        item.appendChild(makeMiniField('Name', c.contributorName, function (v) { c.contributorName = v; }));
        item.appendChild(makeMiniField('Email', c.contributorEmail, function (v) { c.contributorEmail = v; }));
        item.appendChild(makeMiniField('Message', c.contributorMessage, function (v) { c.contributorMessage = v; }));
        item.appendChild(makeMiniField('Reply', c.coupleReplyToContributor || '', function (v) { c.coupleReplyToContributor = v; }));

        var rmBtn = document.createElement('button'); rmBtn.type = 'button'; rmBtn.className = 'btn btn--sm btn--danger'; rmBtn.textContent = 'Remove Contributor';
        rmBtn.addEventListener('click', function () { gift.contributors.splice(i, 1); renderGiftEditor(gift); });
        item.appendChild(rmBtn);
        contribList.appendChild(item);
      });

      var addContribBtn = document.createElement('button');
      addContribBtn.type = 'button'; addContribBtn.className = 'btn btn--sm'; addContribBtn.textContent = '+ Add Contributor';
      addContribBtn.addEventListener('click', function () {
        if (!gift.contributors) gift.contributors = [];
        gift.contributors.push({ contributorName: '', contributorEmail: '', contributorMessage: '', coupleReplyToContributor: '' });
        renderGiftEditor(gift);
      });

      contribSec.appendChild(contribList);
      contribSec.appendChild(addContribBtn);
      form.appendChild(contribSec);
    }

    form.appendChild(makeTextarea('Acquisition Notes', gift.acquisitionNotes || '', function (v) { gift.acquisitionNotes = v; }));

    var actions = document.createElement('div');
    actions.className = 'editor-actions';

    var dupBtn = document.createElement('button');
    dupBtn.type = 'button'; dupBtn.className = 'btn'; dupBtn.textContent = 'Duplicate';
    dupBtn.addEventListener('click', function () { duplicateGift(gift); });

    var delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.className = 'btn btn--danger'; delBtn.textContent = 'Delete';
    if (gift.status !== 'Available') {
      delBtn.disabled = true;
      delBtn.title = 'Delete only allowed for Available gifts (preserves pending/claimed truth)';
    }
    delBtn.addEventListener('click', function () {
      if (gift.status !== 'Available') return;
      saveSnapshot();
      data.gifts = data.gifts.filter(function (g) { return g.giftId !== gift.giftId; });
      removeFromOrdering(gift.giftId);
      activeGiftId = null;
      renderGiftsList();
      document.getElementById('giftEditorPanel').innerHTML = '<div class="editor-placeholder">Gift deleted.</div>';
    });

    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);
    form.appendChild(actions);

    panel.appendChild(form);
  }

  function duplicateGift(gift) {
    saveSnapshot();
    var clone = JSON.parse(JSON.stringify(gift));
    clone.giftId = gift.giftId + '-copy-' + Date.now();
    clone.title = gift.title + ' (copy)';
    clone.status = 'Available';
    clone.claimerName = '';
    clone.claimerEmail = '';
    clone.claimerMessage = '';
    clone.coupleReplyToClaimer = '';
    clone.contributors = [];
    clone.groupThankYouNote = '';
    data.gifts.push(clone);
    ensureOrdering(clone);
    activeGiftId = clone.giftId;
    renderGiftsList();
    renderGiftEditor(clone);
  }

  /* ============ ORDERING ============ */

  function ensureOrdering(gift) {
    var so = data.ordering.sectionOrder;
    if (!so[gift.primarySection]) so[gift.primarySection] = [];
    if (so[gift.primarySection].indexOf(gift.giftId) < 0) so[gift.primarySection].push(gift.giftId);
    if (gift.isDreamGift && gift.dreamOwner) ensureDreamOrdering(gift.giftId, gift.dreamOwner);
  }

  function ensureDreamOrdering(giftId, owner) {
    var d = data.ordering.dreamOrder;
    if (!d[owner]) d[owner] = [];
    if (d[owner].indexOf(giftId) < 0) d[owner].push(giftId);
  }

  function removeDreamOrdering(giftId) {
    var d = data.ordering.dreamOrder;
    ['Stan', 'Hannah'].forEach(function (o) {
      if (d[o]) d[o] = d[o].filter(function (id) { return id !== giftId; });
    });
  }

  function removeDreamOrderingFrom(giftId, owner) {
    var d = data.ordering.dreamOrder;
    if (d[owner]) d[owner] = d[owner].filter(function (id) { return id !== giftId; });
  }

  function removeFromOrdering(giftId) {
    var so = data.ordering.sectionOrder;
    ['Home', 'Adventure', 'Hobby'].forEach(function (s) {
      if (so[s]) so[s] = so[s].filter(function (id) { return id !== giftId; });
    });
    removeDreamOrdering(giftId);
  }

  function renderOrderingList() {
    var container = document.getElementById('orderingList');
    container.innerHTML = '';

    var list;
    if (activeOrderTab === 'DreamStan') {
      list = (data.ordering.dreamOrder && data.ordering.dreamOrder.Stan) || [];
    } else if (activeOrderTab === 'DreamHannah') {
      list = (data.ordering.dreamOrder && data.ordering.dreamOrder.Hannah) || [];
    } else {
      list = (data.ordering.sectionOrder && data.ordering.sectionOrder[activeOrderTab]) || [];
    }

    list.forEach(function (giftId, idx) {
      var gift = data.gifts.find(function (g) { return g.giftId === giftId; });
      var item = document.createElement('div');
      item.className = 'order-item';
      item.draggable = true;
      item.setAttribute('data-idx', idx);

      var handle = document.createElement('span');
      handle.className = 'order-item__handle';
      handle.textContent = '☰';

      var title = document.createElement('span');
      title.className = 'order-item__title';
      title.textContent = gift ? gift.title : giftId;

      item.appendChild(handle);
      item.appendChild(title);

      item.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', String(idx));
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', function () { item.classList.remove('drag-over'); });

      item.addEventListener('drop', function (e) {
        e.preventDefault();
        item.classList.remove('drag-over');
        var fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        var toIdx = idx;
        if (fromIdx === toIdx) return;
        saveSnapshot();
        var moved = list.splice(fromIdx, 1)[0];
        list.splice(toIdx, 0, moved);
        renderOrderingList();
      });

      container.appendChild(item);
    });

    if (list.length === 0) {
      container.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px;">No items in this ordering list.</div>';
    }
  }

  /* ============ COPY TAB ============ */

  function wireCopyTab() {
    var grid = document.getElementById('copyGrid');
    grid.innerHTML = '';
    renderCopyFields(grid, data.copy, '', 'copy');
  }

  function renderCopyFields(container, obj, path, usedIn) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(function (key) {
      var val = obj[key];
      var fullPath = path ? path + '.' + key : key;

      if (typeof val === 'string') {
        var field = document.createElement('div');
        field.className = 'copy-field panel';
        field.innerHTML = '<div class="copy-field__label">' + esc(fullPath) + '</div>';
        var hint = document.createElement('div');
        hint.className = 'copy-field__hint';
        hint.textContent = 'Used in: ' + usedIn;
        field.appendChild(hint);
        var inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'field__input'; inp.value = val;
        inp.addEventListener('change', function () { setNestedValue(data.copy, fullPath, inp.value); updateDirtyIndicator(); });
        field.appendChild(inp);
        container.appendChild(field);
      } else if (typeof val === 'number') {
        var field2 = document.createElement('div');
        field2.className = 'copy-field panel';
        field2.innerHTML = '<div class="copy-field__label">' + esc(fullPath) + '</div>';
        var inp2 = document.createElement('input');
        inp2.type = 'number'; inp2.className = 'field__input'; inp2.value = val;
        inp2.addEventListener('change', function () { setNestedValue(data.copy, fullPath, Number(inp2.value)); updateDirtyIndicator(); });
        field2.appendChild(inp2);
        container.appendChild(field2);
      } else if (Array.isArray(val)) {
        var field3 = document.createElement('div');
        field3.className = 'copy-field panel';
        field3.innerHTML = '<div class="copy-field__label">' + esc(fullPath) + ' (array)</div>';
        var ta = document.createElement('textarea');
        ta.className = 'ta'; ta.rows = 4; ta.value = val.join('\n');
        ta.addEventListener('change', function () {
          setNestedValue(data.copy, fullPath, ta.value.split('\n').filter(function (l) { return l.length > 0; }));
          updateDirtyIndicator();
        });
        field3.appendChild(ta);
        container.appendChild(field3);
      } else if (typeof val === 'object') {
        renderCopyFields(container, val, fullPath, usedIn);
      }
    });
  }

  /* ============ THEME TAB ============ */

  function wireThemeTab() {
    var grid = document.getElementById('themeGrid');
    grid.innerHTML = '';
    renderThemeFields(grid, data.tokens, '');
    updateThemePreview();
  }

  function renderThemeFields(container, obj, path) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(function (key) {
      var val = obj[key];
      var fullPath = path ? path + '.' + key : key;

      if (typeof val === 'string') {
        var field = document.createElement('div');
        field.className = 'theme-field';
        field.innerHTML = '<div class="theme-field__label">' + esc(fullPath) + '</div>';

        if (val.match(/^#[0-9a-fA-F]{3,8}$/)) {
          var row = document.createElement('div');
          row.className = 'color-picker-row';
          var colorInp = document.createElement('input');
          colorInp.type = 'color'; colorInp.value = val;
          var textInp = document.createElement('input');
          textInp.type = 'text'; textInp.className = 'field__input'; textInp.value = val;
          colorInp.addEventListener('input', function () { textInp.value = colorInp.value; setNestedValue(data.tokens, fullPath, colorInp.value); updateThemePreview(); updateDirtyIndicator(); });
          textInp.addEventListener('change', function () { colorInp.value = textInp.value; setNestedValue(data.tokens, fullPath, textInp.value); updateThemePreview(); updateDirtyIndicator(); });
          row.appendChild(colorInp); row.appendChild(textInp);
          field.appendChild(row);
        } else {
          var inp = document.createElement('input');
          inp.type = 'text'; inp.className = 'field__input'; inp.value = val;
          inp.addEventListener('change', function () { setNestedValue(data.tokens, fullPath, inp.value); updateThemePreview(); updateDirtyIndicator(); });
          field.appendChild(inp);
        }
        container.appendChild(field);
      } else if (typeof val === 'number') {
        var field2 = document.createElement('div');
        field2.className = 'theme-field';
        field2.innerHTML = '<div class="theme-field__label">' + esc(fullPath) + '</div>';
        var range = document.createElement('input');
        range.type = 'range'; range.min = '0'; range.max = '100'; range.value = String(val);
        range.style.width = '100%';
        var numInp = document.createElement('input');
        numInp.type = 'number'; numInp.className = 'field__input'; numInp.value = val; numInp.style.width = '80px';
        range.addEventListener('input', function () { numInp.value = range.value; setNestedValue(data.tokens, fullPath, Number(range.value)); updateThemePreview(); updateDirtyIndicator(); });
        numInp.addEventListener('change', function () { range.value = numInp.value; setNestedValue(data.tokens, fullPath, Number(numInp.value)); updateThemePreview(); updateDirtyIndicator(); });
        field2.appendChild(range);
        field2.appendChild(numInp);
        container.appendChild(field2);
      } else if (typeof val === 'object') {
        renderThemeFields(container, val, fullPath);
      }
    });
  }

  function updateThemePreview() {
    var box = document.getElementById('themePreviewBox');
    var t = data.tokens;
    if (!t || !t.colors) return;
    box.style.background = t.colors.panelBg || '#120b1a';
    var chip = box.querySelector('.preview-chip');
    chip.style.background = t.colors.chipActiveBg || '#d8b55b';
    chip.style.color = t.colors.chipActiveText || '#1b1026';
    chip.style.borderRadius = (t.radii && t.radii.chip || 14) + 'px';
    var tile = box.querySelector('.preview-tile');
    tile.style.background = t.colors.cardBg || '#1a1224';
    tile.style.border = '1px solid ' + (t.colors.gold || '#d8b55b');
    tile.style.color = t.colors.textPrimary || '#f3ecff';
    tile.style.borderRadius = (t.radii && t.radii.tile || 16) + 'px';
    box.querySelector('.preview-text-primary').style.color = t.colors.textPrimary || '#f3ecff';
    box.querySelector('.preview-text-muted').style.color = t.colors.textMuted || '#cbb9dd';
  }

  /* ============ IMPORT/EXPORT TAB ============ */

  function wireImportExportTab() {
    document.getElementById('btnBatchPreview').addEventListener('click', previewBatch);
    document.getElementById('btnBatchImport').addEventListener('click', importBatch);
    document.getElementById('btnExportBundle').addEventListener('click', exportBundle);
    document.getElementById('importFileInput').addEventListener('change', function () {
      document.getElementById('btnImportBundle').disabled = !this.files.length;
    });
    document.getElementById('btnImportBundle').addEventListener('click', importBundle);
    document.getElementById('btnUndo').addEventListener('click', undoLastAction);
  }

  var batchItems = [];

  function previewBatch() {
    var msg = document.getElementById('batchMsg');
    var area = document.getElementById('batchPreviewArea');
    msg.className = 'msg'; msg.textContent = '';
    area.innerHTML = '';
    batchItems = [];

    try {
      var raw = document.getElementById('batchInput').value.trim();
      var parsed = JSON.parse(raw);
      if (parsed.batchName !== 'Gift Intake Batch1') {
        msg.className = 'msg msg--error';
        msg.textContent = 'batchName must be exactly "Gift Intake Batch1"';
        return;
      }
      if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
        msg.className = 'msg msg--error';
        msg.textContent = 'items array is empty or missing';
        return;
      }

      parsed.items.forEach(function (item, i) {
        var div = document.createElement('div');
        div.className = 'batch-item';
        var title = item.title || ('Untitled #' + (i + 1));
        var price = item.price;
        var variant = item.allowGifterProvidedVariant === true;
        var warn = '';
        if (!variant && (typeof price !== 'number' || price <= 0) && item.preferredMerchants && item.preferredMerchants.length > 0) {
          warn = 'Publish gating: merchant-linked gift requires numeric price when allowGifterProvidedVariant=false';
        }
        div.innerHTML = '<strong>' + esc(title) + '</strong> — ' + (typeof price === 'number' ? '$' + price : 'no price') +
          (variant ? ' (variant allowed)' : '') + (warn ? '<div class="batch-item__warn">⚠ ' + esc(warn) + '</div>' : '');
        area.appendChild(div);
      });

      batchItems = parsed.items;
      document.getElementById('btnBatchImport').disabled = false;
      msg.className = 'msg msg--success';
      msg.textContent = parsed.items.length + ' items ready to import as Draft.';
    } catch (e) {
      msg.className = 'msg msg--error';
      msg.textContent = 'Invalid JSON: ' + e.message;
    }
  }

  function importBatch() {
    if (batchItems.length === 0) return;
    saveSnapshot();

    batchItems.forEach(function (item) {
      var id = 'gift-batch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      var g = {
        giftId: id,
        title: item.title || 'Untitled',
        shortDescription: item.shortDescription || '',
        longDescription: item.longDescription || '',
        images: item.images || ['/assets/og-image.png'],
        categoryTags: item.categoryTags || { home: false, adventure: false, hobby: false },
        primarySection: item.primarySection || 'Home',
        isDreamGift: item.isDreamGift || false,
        dreamOwner: item.dreamOwner || null,
        isGroupGift: item.isGroupGift || false,
        price: (typeof item.price === 'number') ? item.price : null,
        currency: 'USD',
        allowGifterProvidedVariant: item.allowGifterProvidedVariant || false,
        preferredMerchants: item.preferredMerchants || [],
        alternativeMerchants: [],
        acquisitionNotes: '',
        status: 'Available',
        claimerName: '', claimerEmail: '', claimerMessage: '', coupleReplyToClaimer: '',
        contributors: [],
        groupThankYouNote: ''
      };
      data.gifts.push(g);
      ensureOrdering(g);
    });

    batchItems = [];
    document.getElementById('btnBatchImport').disabled = true;
    document.getElementById('batchMsg').className = 'msg msg--success';
    document.getElementById('batchMsg').textContent = 'Imported. Gifts added as Available (Draft).';
    document.getElementById('batchPreviewArea').innerHTML = '';
    renderGiftsList();
    renderOrderingList();
  }

  function exportBundle() {
    var bundle = {
      gifts: { gifts: data.gifts },
      copy: data.copy,
      tokens: data.tokens,
      ordering: data.ordering
    };
    downloadJson('hanstan-registry-bundle.json', bundle);
    document.getElementById('exportMsg').className = 'msg msg--success';
    document.getElementById('exportMsg').textContent = 'Bundle exported.';
  }

  function importBundle() {
    var fileInput = document.getElementById('importFileInput');
    var msg = document.getElementById('importMsg');
    if (!fileInput.files.length) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var bundle = JSON.parse(e.target.result);
        var errors = [];
        if (!bundle.gifts || !bundle.gifts.gifts) errors.push('Missing gifts.gifts');
        if (!bundle.copy) errors.push('Missing copy');
        if (!bundle.tokens) errors.push('Missing tokens');
        if (!bundle.ordering) errors.push('Missing ordering');
        if (errors.length > 0) {
          msg.className = 'msg msg--error';
          msg.textContent = 'Validation failed: ' + errors.join('; ');
          return;
        }
        saveSnapshot();
        data.gifts = bundle.gifts.gifts;
        data.copy = bundle.copy;
        data.tokens = bundle.tokens;
        data.ordering = bundle.ordering;
        msg.className = 'msg msg--success';
        msg.textContent = 'Bundle imported successfully.';
        renderGiftsList();
        renderOrderingList();
        wireCopyTab();
        wireThemeTab();
      } catch (err) {
        msg.className = 'msg msg--error';
        msg.textContent = 'Invalid JSON file.';
      }
    };
    reader.readAsText(fileInput.files[0]);
  }

  /* ============ SNAPSHOT & UNDO (in-memory single snapshot, kept for import/export tab btnUndo) ============ */

  function saveSnapshot() {
    snapshot = {
      gifts: JSON.parse(JSON.stringify(data.gifts)),
      ordering: JSON.parse(JSON.stringify(data.ordering)),
      copy: JSON.parse(JSON.stringify(data.copy)),
      tokens: JSON.parse(JSON.stringify(data.tokens))
    };
    document.getElementById('btnUndo').disabled = false;
    document.getElementById('undoMsg').textContent = 'Snapshot saved. Undo available.';
  }

  function undoLastAction() {
    if (!snapshot) return;
    data.gifts = snapshot.gifts;
    data.ordering = snapshot.ordering;
    data.copy = snapshot.copy;
    data.tokens = snapshot.tokens;
    snapshot = null;
    document.getElementById('btnUndo').disabled = true;
    document.getElementById('undoMsg').textContent = 'Undo complete. No further snapshots.';
    activeGiftId = null;
    renderGiftsList();
    renderOrderingList();
    wireCopyTab();
    wireThemeTab();
    document.getElementById('giftEditorPanel').innerHTML = '<div class="editor-placeholder">Undo complete.</div>';
    updateDirtyIndicator();
  }

  /* ============ DIAGNOSTICS TAB ============ */

  function wireDiagnosticsTab() {
    document.getElementById('btnRunDiag').addEventListener('click', runDiagnostics);
  }

  function runDiagnostics() {
    var B = Number(document.getElementById('diagBudget').value) || 200;
    var container = document.getElementById('diagResults');
    container.innerHTML = '';

    var low = 0.75 * B;
    var high = 1.25 * B;
    var oLow = 1.25 * B;
    var oHigh = 1.42 * B;

    var inBand = [];
    var outsideBand = [];
    var priceUnknown = [];
    var outOfRange = [];

    data.gifts.forEach(function (g) {
      var hasPrice = typeof g.price === 'number' && g.price > 0;
      var isVariant = g.allowGifterProvidedVariant === true;

      if (isVariant && !hasPrice) {
        priceUnknown.push(g);
      } else if (hasPrice && g.price >= low && g.price <= high) {
        inBand.push(g);
      } else if (hasPrice && g.price > oLow && g.price <= oHigh) {
        outsideBand.push(g);
      } else {
        outOfRange.push(g);
      }
    });

    var slotNormal = outsideBand.find(function (g) { return !g.isDreamGift && !g.isGroupGift; }) || null;
    var slotDream = outsideBand.find(function (g) { return g.isDreamGift && !g.isGroupGift; }) || null;
    var slotGroup = outsideBand.find(function (g) { return g.isGroupGift; }) || null;

    container.appendChild(makeDiagBand('In-Band ($' + low.toFixed(0) + '–$' + high.toFixed(0) + ')', inBand));
    container.appendChild(makeDiagBand('Just Outside Band ($' + oLow.toFixed(0) + '–$' + oHigh.toFixed(0) + ') — strict 3 slots', [slotNormal, slotDream, slotGroup].filter(Boolean)));
    container.appendChild(makeDiagBand('Price Unknown (allowGifterProvidedVariant=true, no price)', priceUnknown));
    container.appendChild(makeDiagBand('Out of Range', outOfRange));
  }

  function makeDiagBand(title, items) {
    var band = document.createElement('div');
    band.className = 'diag-band';
    var t = document.createElement('div');
    t.className = 'diag-band__title';
    t.textContent = title + ' (' + items.length + ')';
    band.appendChild(t);

    var list = document.createElement('div');
    list.className = 'diag-band__items';
    items.forEach(function (g) {
      var item = document.createElement('div');
      item.className = 'diag-item';
      item.innerHTML = '<span>' + esc(g.title) + ' <small>(' + esc(g.giftId) + ')</small></span>' +
        '<span class="diag-item__price">' + (typeof g.price === 'number' ? '$' + g.price : 'N/A') + '</span>';
      list.appendChild(item);
    });
    if (items.length === 0) {
      list.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:4px;">None</div>';
    }
    band.appendChild(list);
    return band;
  }

  /* ============ HELPERS ============ */

  function makeField(type, label, value, onChange) {
    var wrap = document.createElement('label');
    wrap.textContent = label;
    var inp = document.createElement('input');
    inp.type = type; inp.className = 'field__input'; inp.value = value;
    inp.addEventListener('change', function () { onChange(inp.value); });
    wrap.appendChild(inp);
    return wrap;
  }

  function makeTextarea(label, value, onChange) {
    var wrap = document.createElement('label');
    wrap.textContent = label;
    var ta = document.createElement('textarea');
    ta.className = 'field__textarea ta'; ta.rows = 3; ta.value = value;
    ta.addEventListener('change', function () { onChange(ta.value); });
    wrap.appendChild(ta);
    return wrap;
  }

  function makeSelect(label, options, value, onChange) {
    var wrap = document.createElement('label');
    wrap.textContent = label;
    var sel = document.createElement('select');
    sel.className = 'field__input';
    options.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      if (o === value) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () { onChange(sel.value); });
    wrap.appendChild(sel);
    return wrap;
  }

  function makeCheckbox(label, checked, onChange) {
    var wrap = document.createElement('div');
    wrap.className = 'checkbox-row';
    var inp = document.createElement('input');
    inp.type = 'checkbox'; inp.checked = checked;
    inp.addEventListener('change', function () { onChange(inp.checked); });
    var lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.fontSize = '14px';
    wrap.appendChild(inp);
    wrap.appendChild(lbl);
    return wrap;
  }

  function makeMiniField(label, value, onChange) {
    var wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '4px';
    wrap.style.alignItems = 'center';
    var lbl = document.createElement('span');
    lbl.textContent = label + ':';
    lbl.style.fontSize = '12px';
    lbl.style.color = 'var(--muted)';
    lbl.style.minWidth = '50px';
    var inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'field__input'; inp.value = value; inp.style.flex = '1';
    inp.addEventListener('change', function () { onChange(inp.value); });
    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    return wrap;
  }

  function setNestedValue(obj, path, value) {
    var keys = path.split('.');
    var target = obj;
    for (var i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
  }

  function downloadJson(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
