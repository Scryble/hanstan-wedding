/* Registry Phase 2 (GiftRegistryP2)
   Renders the 3-panel registry from /data/*.json.
   Phase 2: ordering integration, price-unknown section, UX polish, status locks.
*/

(function () {
  const PATH_TOKENS = '/data/theme.tokens.json';
  const PATH_COPY = '/data/copy.registry.json';
  const PATH_GIFTS = '/data/gifts.json';
  const PATH_ORDERING = '/data/ordering.registry.json';

  const CHIP_KEYS = ['Dream', 'Home', 'Adventure', 'Hobby', 'Group'];

  const STATUS = {
    Available: 'Available',
    Pending: 'ClaimPendingConfirmation',
    Claimed: 'Claimed'
  };

  const state = {
    tokens: null,
    copy: null,
    gifts: [],
    ordering: null,
    selectedGiftId: null,
    activeChips: new Set(),
    budget: 200,
    activeLocatorSection: null,
    locatorEnabled: true,
    modalOpen: false,
    modalPath: null
  };

  const el = {
    railSiteLabel: document.getElementById('railSiteLabel'),
    howTitle: document.getElementById('howTitle'),
    howList: document.getElementById('howList'),
    chipStack: document.getElementById('chipStack'),
    btnShowAll: document.getElementById('btnShowAll'),
    btnClearAll: document.getElementById('btnClearAll'),
    middleTitle: document.getElementById('middleTitle'),
    dreamStanTitle: document.getElementById('dreamStanTitle'),
    dreamHannahTitle: document.getElementById('dreamHannahTitle'),
    dreamStan: document.getElementById('dreamStan'),
    dreamHannah: document.getElementById('dreamHannah'),
    dreamBlock: document.getElementById('dreamBlock'),
    sectionHomeTitle: document.getElementById('sectionHomeTitle'),
    sectionAdventureTitle: document.getElementById('sectionAdventureTitle'),
    sectionHobbyTitle: document.getElementById('sectionHobbyTitle'),
    tilesHome: document.getElementById('tilesHome'),
    tilesAdventure: document.getElementById('tilesAdventure'),
    tilesHobby: document.getElementById('tilesHobby'),
    outsideBudget: document.getElementById('outsideBudget'),
    outsideTitle: document.getElementById('outsideTitle'),
    outsideBlurb: document.getElementById('outsideBlurb'),
    outsideSlotNormal: document.getElementById('outsideSlotNormal'),
    outsideSlotDream: document.getElementById('outsideSlotDream'),
    outsideSlotGroup: document.getElementById('outsideSlotGroup'),
    priceUnknownBlock: document.getElementById('priceUnknownBlock'),
    tilesUnknown: document.getElementById('tilesUnknown'),
    detail: document.getElementById('detail'),
    middleScroll: document.getElementById('middleScroll'),

    budgetSlider: document.getElementById('budgetSlider'),
    budgetLabel: document.getElementById('budgetLabel'),
    budgetValue: document.getElementById('budgetValue'),

    modal: document.getElementById('modal'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalClose: document.getElementById('modalClose'),
    modalTitle: document.getElementById('modalTitle'),
    modalRightTitle: document.getElementById('modalRightTitle'),
    modalRightList: document.getElementById('modalRightList'),
    modalRightMerchant: document.getElementById('modalRightMerchant'),

    giftForm: document.getElementById('giftForm'),
    formGiftId: document.getElementById('formGiftId'),
    formPath: document.getElementById('formPath'),
    inputName: document.getElementById('inputName'),
    inputEmail: document.getElementById('inputEmail'),
    inputMsg: document.getElementById('inputMsg'),
    labelName: document.getElementById('labelName'),
    labelEmail: document.getElementById('labelEmail'),
    labelMsg: document.getElementById('labelMsg'),
    reqName: document.getElementById('reqName'),
    reqEmail: document.getElementById('reqEmail'),
    reqMsg: document.getElementById('reqMsg'),
    btnSubmit: document.getElementById('btnSubmit'),
    btnCancel: document.getElementById('btnCancel'),
    shippingNote: document.getElementById('shippingNote'),
    formError: document.getElementById('formError')
  };

  init();

  async function init() {
    const [tokens, copy, giftDoc, ordering] = await Promise.all([
      fetchJson(PATH_TOKENS),
      fetchJson(PATH_COPY),
      fetchJson(PATH_GIFTS),
      fetchJson(PATH_ORDERING)
    ]);

    state.tokens = tokens;
    state.copy = copy;
    state.gifts = (giftDoc && giftDoc.gifts) ? giftDoc.gifts.slice() : [];
    state.ordering = ordering || { sectionOrder: {}, dreamOrder: {} };

    applyThemeTokens(tokens);
    applyCopy(copy);
    hydrateLocalPendingOverrides();

    if (state.gifts.length > 0) {
      state.selectedGiftId = state.gifts[0].giftId;
    }

    buildChips();
    wireBudgetSlider();
    wireClearButtons();
    wireModal();
    wireScrollLocator();

    renderAll();
  }

  function fetchJson(path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Fetch failed: ' + path);
      return r.json();
    }).catch(function () { return null; });
  }

  function applyThemeTokens(tokens) {
    if (!tokens) return;
    var r = document.documentElement;
    if (tokens.colors) {
      r.style.setProperty('--rail-bg', tokens.colors.railBg);
      r.style.setProperty('--panel-bg', tokens.colors.panelBg);
      r.style.setProperty('--card-bg', tokens.colors.cardBg);
      r.style.setProperty('--text-primary', tokens.colors.textPrimary);
      r.style.setProperty('--text-muted', tokens.colors.textMuted);
      r.style.setProperty('--gold', tokens.colors.gold);
      r.style.setProperty('--chip-active-bg', tokens.colors.chipActiveBg);
      r.style.setProperty('--chip-active-text', tokens.colors.chipActiveText);
      r.style.setProperty('--chip-border', tokens.colors.chipBorder);
      r.style.setProperty('--overlay-bg', tokens.colors.tileOverlayBg);
      r.style.setProperty('--focus', tokens.colors.focus);
      r.style.setProperty('--danger', tokens.colors.danger);
    }
    if (tokens.radii) {
      r.style.setProperty('--r-chip', tokens.radii.chip + 'px');
      r.style.setProperty('--r-card', tokens.radii.card + 'px');
      r.style.setProperty('--r-tile', tokens.radii.tile + 'px');
      r.style.setProperty('--r-modal', tokens.radii.modal + 'px');
    }
    if (tokens.shadows) {
      r.style.setProperty('--shadow-chip', tokens.shadows.chip);
      r.style.setProperty('--shadow-card', tokens.shadows.card);
      r.style.setProperty('--shadow-tile', tokens.shadows.tile);
      r.style.setProperty('--shadow-modal', tokens.shadows.modal);
    }
    if (tokens.spacing) {
      r.style.setProperty('--s-xs', tokens.spacing.xs + 'px');
      r.style.setProperty('--s-sm', tokens.spacing.sm + 'px');
      r.style.setProperty('--s-md', tokens.spacing.md + 'px');
      r.style.setProperty('--s-lg', tokens.spacing.lg + 'px');
      r.style.setProperty('--s-xl', tokens.spacing.xl + 'px');
    }
  }

  function applyCopy(copy) {
    el.railSiteLabel.textContent = copy.siteLabel;
    el.howTitle.textContent = copy.leftRail.howItWorksTitle;
    el.howList.innerHTML = '';
    copy.leftRail.howItWorksLines.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      el.howList.appendChild(li);
    });
    el.btnShowAll.textContent = copy.leftRail.showAll;
    el.btnClearAll.textContent = copy.leftRail.clearAll;
    el.middleTitle.textContent = copy.middle.stickyHeader;
    el.dreamStanTitle.textContent = copy.middle.dreamStanTitle;
    el.dreamHannahTitle.textContent = copy.middle.dreamHannahTitle;
    el.sectionHomeTitle.textContent = copy.middle.sectionHome;
    el.sectionAdventureTitle.textContent = copy.middle.sectionAdventure;
    el.sectionHobbyTitle.textContent = copy.middle.sectionHobby;
    el.outsideTitle.textContent = copy.middle.outsideBudgetTitle;
    el.outsideBlurb.textContent = copy.middle.outsideBudgetBlurb;
    el.budgetLabel.textContent = copy.budget.label;
  }

  /* --- Chips --- */

  function buildChips() {
    el.chipStack.innerHTML = '';
    CHIP_KEYS.forEach(function (key) {
      var label = (key === 'Group') ? state.copy.leftRail.chips.Group : state.copy.leftRail.chips[key];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.setAttribute('data-chip', key);
      // Phase 2: chips as toggles, no "+" icon
      btn.innerHTML = '<span class="chip__leftAccent"></span><span class="chip__label">' + escapeHtml(label) + '</span><span class="chip__indicator">â—‹</span>';
      btn.addEventListener('click', function () { toggleChip(key); });
      el.chipStack.appendChild(btn);
    });
    syncChipUi();
  }

  function toggleChip(key) {
    if (state.activeChips.has(key)) state.activeChips.delete(key);
    else state.activeChips.add(key);
    state.locatorEnabled = state.activeChips.size === 0;
    state.activeLocatorSection = null;
    syncChipUi();
    renderAll();
  }

  function clearAllChips() {
    state.activeChips.clear();
    state.locatorEnabled = true;
    state.activeLocatorSection = null;
    syncChipUi();
    renderAll();
  }

  function syncChipUi() {
    var chips = el.chipStack.querySelectorAll('.chip');
    chips.forEach(function (chip) {
      var key = chip.getAttribute('data-chip');
      var active = state.activeChips.has(key);
      chip.classList.toggle('chip--active', active);
      chip.classList.remove('chip--locator');
      var indicator = chip.querySelector('.chip__indicator');
      if (indicator) indicator.textContent = active ? 'â—' : 'â—‹';
    });
  }

  function wireClearButtons() {
    el.btnShowAll.addEventListener('click', clearAllChips);
    el.btnClearAll.addEventListener('click', clearAllChips);
  }

  /* --- Budget --- */

  function wireBudgetSlider() {
    var cfg = state.copy.budget;
    var step = cfg.step;
    var min = step;
    var max = 1000;
    el.budgetSlider.min = String(min);
    el.budgetSlider.max = String(max);
    el.budgetSlider.step = String(step);
    el.budgetSlider.value = String(cfg.default);
    state.budget = cfg.default;
    el.budgetValue.textContent = '$' + state.budget;
    el.budgetSlider.addEventListener('input', function () {
      state.budget = Number(el.budgetSlider.value);
      el.budgetValue.textContent = '$' + state.budget;
      renderAll();
    });
  }

  /* --- Rendering --- */

  function renderAll() {
    var visible = getVisibleGifts();
    renderDreamBlocks(visible);
    renderSection('Home', visible, el.tilesHome);
    renderSection('Adventure', visible, el.tilesAdventure);
    renderSection('Hobby', visible, el.tilesHobby);
    renderOutsideBudget(visible);
    renderPriceUnknown();

    if (!state.selectedGiftId || !state.gifts.find(function (g) { return g.giftId === state.selectedGiftId; })) {
      state.selectedGiftId = (state.gifts[0] && state.gifts[0].giftId) ? state.gifts[0].giftId : null;
    }
    renderDetail();
    updateScrollLocator();
  }

  function getVisibleGifts() {
    var chips = state.activeChips;
    var cfg = state.copy.budget;
    var B = state.budget;
    var low = cfg.rangeLowMultiplier * B;
    var high = cfg.rangeHighMultiplier * B;

    return state.gifts.filter(function (g) {
      var chipPass = chips.size === 0 ? true : passesAnyChip(g, chips);
      var hasPrice = typeof g.price === 'number' && g.price > 0;
      var budgetPass = hasPrice && (g.price >= low) && (g.price <= high);
      return chipPass && budgetPass;
    });
  }

  function getEligibleOutsideBudget(visibleByChipOnly) {
    var cfg = state.copy.budget;
    var B = state.budget;
    var low = cfg.outsideLowMultiplier * B;
    var high = cfg.outsideHighMultiplier * B;
    return visibleByChipOnly.filter(function (g) {
      return (typeof g.price === 'number') && (g.price > low) && (g.price <= high);
    });
  }

  function passesAnyChip(g, chips) {
    for (var key of chips) {
      if (key === 'Dream' && g.isDreamGift) return true;
      if (key === 'Group' && g.isGroupGift) return true;
      if (key === 'Home' && hasTag(g, 'home')) return true;
      if (key === 'Adventure' && hasTag(g, 'adventure')) return true;
      if (key === 'Hobby' && hasTag(g, 'hobby')) return true;
    }
    return false;
  }

  // Phase 2: categoryTags is now {home:boolean, adventure:boolean, hobby:boolean}
  function hasTag(g, tag) {
    if (g.categoryTags && typeof g.categoryTags === 'object' && !Array.isArray(g.categoryTags)) {
      return g.categoryTags[tag] === true;
    }
    // Backward compat: array format
    if (Array.isArray(g.categoryTags)) {
      return g.categoryTags.indexOf(tag) >= 0 || g.categoryTags.indexOf(tag.charAt(0).toUpperCase() + tag.slice(1)) >= 0;
    }
    return false;
  }

  /* --- Ordering helpers --- */

  function sortByOrdering(gifts, orderList) {
    if (!orderList || !Array.isArray(orderList)) return gifts;
    var indexMap = {};
    orderList.forEach(function (id, i) { indexMap[id] = i; });
    return gifts.slice().sort(function (a, b) {
      var ai = (a.giftId in indexMap) ? indexMap[a.giftId] : 9999;
      var bi = (b.giftId in indexMap) ? indexMap[b.giftId] : 9999;
      return ai - bi;
    });
  }

  function sortSectionWithDreamPinned(gifts, sectionOrderList) {
    var ordered = sortByOrdering(gifts, sectionOrderList);
    var dream = ordered.filter(function (g) { return g.isDreamGift; });
    var nonDream = ordered.filter(function (g) { return !g.isDreamGift; });
    return dream.concat(nonDream);
  }

  /* --- Dream Blocks --- */

  function renderDreamBlocks(visible) {
    var so = state.ordering;
    var stanGifts = visible.filter(function (g) { return g.isDreamGift && g.dreamOwner === 'Stan'; });
    var hannahGifts = visible.filter(function (g) { return g.isDreamGift && g.dreamOwner === 'Hannah'; });

    stanGifts = sortByOrdering(stanGifts, so.dreamOrder && so.dreamOrder.Stan);
    hannahGifts = sortByOrdering(hannahGifts, so.dreamOrder && so.dreamOrder.Hannah);

    el.dreamStan.innerHTML = '';
    el.dreamHannah.innerHTML = '';
    stanGifts.forEach(function (g) { el.dreamStan.appendChild(buildTile(g, false)); });
    hannahGifts.forEach(function (g) { el.dreamHannah.appendChild(buildTile(g, false)); });

    var anyDream = stanGifts.length > 0 || hannahGifts.length > 0;
    el.dreamBlock.style.display = anyDream ? 'block' : 'none';
  }

  /* --- Sections --- */

  function renderSection(section, visible, container) {
    var so = state.ordering;
    var items = visible.filter(function (g) { return g.primarySection === section; });
    var orderList = so.sectionOrder && so.sectionOrder[section];
    items = sortSectionWithDreamPinned(items, orderList);
    container.innerHTML = '';
    items.forEach(function (g) { container.appendChild(buildTile(g, false)); });
  }

  /* --- Outside Budget --- */

  function renderOutsideBudget() {
    var chipOnly = state.gifts.filter(function (g) {
      return state.activeChips.size === 0 ? true : passesAnyChip(g, state.activeChips);
    });
    var eligible = getEligibleOutsideBudget(chipOnly);

    var slotNormal = eligible.find(function (g) { return !g.isDreamGift && !g.isGroupGift; }) || null;
    var slotDream = eligible.find(function (g) { return g.isDreamGift && !g.isGroupGift; }) || null;
    var slotGroup = eligible.find(function (g) { return g.isGroupGift; }) || null;

    el.outsideSlotNormal.innerHTML = '';
    el.outsideSlotDream.innerHTML = '';
    el.outsideSlotGroup.innerHTML = '';

    if (slotNormal) el.outsideSlotNormal.appendChild(buildTile(slotNormal, true));
    if (slotDream) el.outsideSlotDream.appendChild(buildTile(slotDream, true));
    if (slotGroup) el.outsideSlotGroup.appendChild(buildTile(slotGroup, true));

    var any = Boolean(slotNormal || slotDream || slotGroup);
    el.outsideBudget.style.display = any ? 'block' : 'none';
  }

  /* --- Price Unknown Section --- */

  function renderPriceUnknown() {
    var chipOnly = state.gifts.filter(function (g) {
      return state.activeChips.size === 0 ? true : passesAnyChip(g, state.activeChips);
    });
    var unknown = chipOnly.filter(function (g) {
      return g.allowGifterProvidedVariant === true && (typeof g.price !== 'number' || g.price <= 0 || g.price === null);
    });

    el.tilesUnknown.innerHTML = '';
    unknown.forEach(function (g) { el.tilesUnknown.appendChild(buildTile(g, false)); });
    el.priceUnknownBlock.style.display = unknown.length > 0 ? 'block' : 'none';
  }

  /* --- Tiles --- */

  function buildTile(gift, isMini) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    if (isMini) btn.style.minHeight = 'unset';
    btn.setAttribute('data-gift-id', gift.giftId);

    btn.addEventListener('click', function () {
      state.selectedGiftId = gift.giftId;
      renderDetail();
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        state.selectedGiftId = gift.giftId;
        renderDetail();
      }
    });

    var img = document.createElement('div');
    img.className = 'tile__img';
    img.style.backgroundImage = 'url(' + escapeCssUrl(gift.images && gift.images[0] ? gift.images[0] : '/assets/og-image.png') + ')';

    var body = document.createElement('div');
    body.className = 'tile__body';

    var title = document.createElement('div');
    title.className = 'tile__title';
    title.textContent = gift.title;

    var desc = document.createElement('p');
    desc.className = 'tile__desc';
    desc.textContent = gift.shortDescription || '';

    var priceEl = document.createElement('div');
    priceEl.className = 'tile__price';
    if (typeof gift.price === 'number' && gift.price > 0) {
      priceEl.textContent = '$' + gift.price;
    } else {
      priceEl.textContent = 'Price varies';
    }

    var badges = document.createElement('div');
    badges.className = 'badges';
    if (gift.isDreamGift) badges.appendChild(buildBadge('Dream Gift'));
    if (gift.isGroupGift) badges.appendChild(buildBadge('Group Gift'));

    body.appendChild(title);
    if (gift.shortDescription) body.appendChild(desc);
    body.appendChild(priceEl);
    body.appendChild(badges);

    btn.appendChild(img);
    btn.appendChild(body);

    // Status overlay: Pending and Claimed grayed identically, overlay text differs
    if (gift.status === STATUS.Pending || gift.status === STATUS.Claimed) {
      btn.classList.add('tile--disabled');
      var overlay = document.createElement('div');
      overlay.className = 'tile__overlay';
      overlay.textContent = (gift.status === STATUS.Pending) ? state.copy.right.statusPending : state.copy.right.statusClaimed;
      btn.appendChild(overlay);
    }

    return btn;
  }

  function buildBadge(text) {
    var b = document.createElement('span');
    b.className = 'badge';
    b.textContent = text;
    return b;
  }

  /* --- Detail Panel --- */

  function renderDetail() {
    var gift = state.gifts.find(function (g) { return g.giftId === state.selectedGiftId; }) || state.gifts[0] || null;
    if (!gift) { el.detail.innerHTML = ''; return; }

    var statusLabel = (gift.status === STATUS.Available) ? state.copy.right.statusAvailable
      : (gift.status === STATUS.Pending) ? state.copy.right.statusPending
      : state.copy.right.statusClaimed;

    var tags = [];
    if (gift.isDreamGift) tags.push('Dream');
    if (gift.isGroupGift) tags.push('Group');
    if (gift.categoryTags && typeof gift.categoryTags === 'object' && !Array.isArray(gift.categoryTags)) {
      if (gift.categoryTags.home) tags.push('Home');
      if (gift.categoryTags.adventure) tags.push('Adventure');
      if (gift.categoryTags.hobby) tags.push('Hobby');
    } else if (Array.isArray(gift.categoryTags)) {
      gift.categoryTags.forEach(function (t) { tags.push(t); });
    }

    // Phase 2: hero uses selectedGift.images[0]
    var heroUrl = (gift.images && gift.images[0]) ? gift.images[0] : '/assets/og-image.png';

    el.detail.innerHTML = '';

    var card = document.createElement('div');
    card.className = 'detailCard';

    var hero = document.createElement('div');
    hero.className = 'detailHero';
    hero.style.backgroundImage = 'url(' + escapeCssUrl(heroUrl) + ')';

    var body = document.createElement('div');
    body.className = 'detailBody';

    var titleEl = document.createElement('h2');
    titleEl.className = 'detailTitle';
    titleEl.textContent = gift.title;

    var statusRow = document.createElement('div');
    statusRow.className = 'detailStatus';

    var pill = document.createElement('div');
    pill.className = 'statusPill';
    pill.textContent = statusLabel;

    var priceEl = document.createElement('div');
    priceEl.className = 'price';
    if (typeof gift.price === 'number' && gift.price > 0) {
      priceEl.textContent = '$' + gift.price;
    } else {
      priceEl.textContent = 'Price varies';
    }

    statusRow.appendChild(pill);
    statusRow.appendChild(priceEl);

    var badgesEl = document.createElement('div');
    badgesEl.className = 'badges';
    tags.forEach(function (t) { badgesEl.appendChild(buildBadge(t)); });

    var descWrap = document.createElement('div');
    descWrap.className = 'detailDesc';

    var pShort = document.createElement('p');
    pShort.textContent = gift.shortDescription || '';

    var pLong = document.createElement('p');
    pLong.textContent = gift.longDescription || '';
    pLong.style.display = 'none';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn btn--ghost';
    toggle.textContent = state.copy.right.expandLong;
    toggle.addEventListener('click', function () {
      var open = pLong.style.display !== 'none';
      pLong.style.display = open ? 'none' : 'block';
      toggle.textContent = open ? state.copy.right.expandLong : state.copy.right.collapseLong;
    });

    descWrap.appendChild(pShort);
    descWrap.appendChild(toggle);
    descWrap.appendChild(pLong);

    body.appendChild(titleEl);
    body.appendChild(statusRow);
    body.appendChild(badgesEl);
    body.appendChild(descWrap);

    if (gift.status === STATUS.Available) {
      body.appendChild(buildCheckoutBlock(gift));
    } else if (gift.status === STATUS.Pending) {
      body.appendChild(buildPendingBlock());
    } else {
      if (gift.isGroupGift) {
        body.appendChild(buildGroupClaimedBlock(gift));
      } else {
        body.appendChild(buildClaimedBlock(gift));
      }
    }

    card.appendChild(hero);
    card.appendChild(body);
    el.detail.appendChild(card);
    updateModalMerchantPane(gift);
  }

  function buildCheckoutBlock(gift) {
    var blk = document.createElement('div');
    blk.className = 'block';

    var title = document.createElement('div');
    title.className = 'blockTitle';
    title.textContent = state.copy.right.checkoutTitle;

    var intro = document.createElement('p');
    intro.className = 'detailDesc';
    intro.textContent = state.copy.right.checkoutIntro;

    var btn1 = document.createElement('button');
    btn1.type = 'button';
    btn1.className = 'linkBtn';
    btn1.innerHTML = '<span>' + escapeHtml(state.copy.right.pathSendFunds) + '</span><span>\u2192</span>';
    btn1.addEventListener('click', function () { openModal(gift.giftId, 'SendFunds'); });

    var btn2 = document.createElement('button');
    btn2.type = 'button';
    btn2.className = 'linkBtn';
    btn2.innerHTML = '<span>' + escapeHtml(state.copy.right.pathPurchase) + '</span><span>\u2192</span>';
    btn2.addEventListener('click', function () { openModal(gift.giftId, 'PurchasePersonally'); });

    var expectTitle = document.createElement('div');
    expectTitle.className = 'blockTitle';
    expectTitle.textContent = state.copy.right.whatToExpectTitle;

    var ul = document.createElement('ul');
    ul.className = 'list';
    state.copy.right.whatToExpectLines.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    });

    var merchTitle = document.createElement('div');
    merchTitle.className = 'blockTitle';
    merchTitle.textContent = state.copy.right.merchantTitle;

    var merch = document.createElement('div');
    merch.className = 'detailDesc';
    var list = document.createElement('ul');
    list.className = 'list';
    (gift.preferredMerchants || []).forEach(function (m) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = m.merchantURL;
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.color = 'var(--gold)';
      a.textContent = m.merchantName;
      li.appendChild(a);
      li.appendChild(document.createTextNode(' \u2014 ' + (m.merchantReason || '')));
      list.appendChild(li);
    });
    merch.appendChild(list);

    blk.appendChild(title);
    blk.appendChild(intro);
    blk.appendChild(btn1);
    blk.appendChild(btn2);
    blk.appendChild(expectTitle);
    blk.appendChild(ul);
    blk.appendChild(merchTitle);
    blk.appendChild(merch);
    return blk;
  }

  function buildPendingBlock() {
    var blk = document.createElement('div');
    blk.className = 'block';
    var title = document.createElement('div');
    title.className = 'blockTitle';
    title.textContent = state.copy.right.statusPending;
    var line = document.createElement('p');
    line.className = 'detailDesc';
    line.textContent = state.copy.right.pendingBlockLine;
    blk.appendChild(title);
    blk.appendChild(line);
    return blk;
  }

  function buildClaimedBlock(gift) {
    var blk = document.createElement('div');
    blk.className = 'block';

    var t1 = document.createElement('div');
    t1.className = 'blockTitle';
    t1.textContent = state.copy.right.claimedMessageTitle;

    var msg = document.createElement('div');
    msg.className = 'msgCard';
    msg.textContent = gift.claimerMessage || '';

    var t2 = document.createElement('div');
    t2.className = 'blockTitle';
    t2.textContent = state.copy.right.replyTitle;

    var reply = document.createElement('div');
    reply.className = 'detailDesc';
    reply.textContent = gift.coupleReplyToClaimer || '';

    blk.appendChild(t1);
    blk.appendChild(msg);
    blk.appendChild(t2);
    blk.appendChild(reply);
    return blk;
  }

  function buildGroupClaimedBlock(gift) {
    var blk = document.createElement('div');
    blk.className = 'block';

    // Group gifts: show thank-you note first, then contributor tabs
    var t0 = document.createElement('div');
    t0.className = 'blockTitle';
    t0.textContent = state.copy.right.groupThankYouTitle;

    var thank = document.createElement('div');
    thank.className = 'msgCard';
    thank.textContent = gift.groupThankYouNote || '';

    var tabs = document.createElement('div');
    tabs.className = 'tabs';

    var msgWrap = document.createElement('div');
    msgWrap.style.marginTop = '10px';

    var contributors = Array.isArray(gift.contributors) ? gift.contributors : [];
    var activeIdx = 0;

    function renderContributor(idx) {
      msgWrap.innerHTML = '';
      var c = contributors[idx];
      if (!c) return;

      // Contributor names only in right panel
      var mTitle = document.createElement('div');
      mTitle.className = 'blockTitle';
      mTitle.textContent = state.copy.right.claimedMessageTitle;

      var m = document.createElement('div');
      m.className = 'msgCard';
      m.textContent = c.contributorMessage || '';

      var rTitle = document.createElement('div');
      rTitle.className = 'blockTitle';
      rTitle.textContent = state.copy.right.replyTitle;

      var r = document.createElement('div');
      r.className = 'detailDesc';
      r.textContent = c.coupleReplyToContributor || '';

      msgWrap.appendChild(mTitle);
      msgWrap.appendChild(m);
      msgWrap.appendChild(rTitle);
      msgWrap.appendChild(r);
    }

    contributors.forEach(function (c, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab' + (idx === 0 ? ' tab--active' : '');
      b.textContent = c.contributorName;
      b.addEventListener('click', function () {
        activeIdx = idx;
        Array.from(tabs.querySelectorAll('.tab')).forEach(function (t, i) {
          t.classList.toggle('tab--active', i === activeIdx);
        });
        renderContributor(activeIdx);
      });
      tabs.appendChild(b);
    });

    blk.appendChild(t0);
    blk.appendChild(thank);
    blk.appendChild(tabs);
    blk.appendChild(msgWrap);
    renderContributor(activeIdx);
    return blk;
  }

  /* --- Modal --- */

  function wireModal() {
    el.modalBackdrop.addEventListener('click', closeModal);
    el.modalClose.addEventListener('click', closeModal);
    el.btnCancel.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (!state.modalOpen) return;
      if (e.key === 'Escape') closeModal();
    });

    el.modalTitle.textContent = state.copy.overlay.title;
    el.labelName.textContent = state.copy.overlay.gifterName;
    el.labelEmail.textContent = state.copy.overlay.gifterEmail;
    el.labelMsg.textContent = state.copy.overlay.giftMessage;
    el.reqName.textContent = state.copy.overlay.required;
    el.reqEmail.textContent = state.copy.overlay.required;
    el.reqMsg.textContent = state.copy.overlay.required;
    el.btnSubmit.textContent = state.copy.overlay.submit;
    el.btnCancel.textContent = state.copy.overlay.cancel;
    el.shippingNote.textContent = state.copy.overlay.shippingNote;

    el.modalRightTitle.textContent = state.copy.overlay.rightPaneTitle;
    el.modalRightList.innerHTML = '';
    state.copy.overlay.rightPaneLines.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      el.modalRightList.appendChild(li);
    });

    el.giftForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitGiftForm();
    });
  }

  function openModal(giftId, path) {
    var gift = state.gifts.find(function (g) { return g.giftId === giftId; });
    if (!gift) return;
    if (gift.status !== STATUS.Available) return;

    state.modalOpen = true;
    state.modalPath = path;

    el.formGiftId.value = giftId;
    el.formPath.value = path;
    el.inputName.value = '';
    el.inputEmail.value = '';
    el.inputMsg.value = '';
    el.formError.textContent = '';

    el.modal.classList.add('modal--open');
    el.modal.setAttribute('aria-hidden', 'false');
    setTimeout(function () { el.inputName.focus(); }, 0);
    updateModalMerchantPane(gift);
  }

  function closeModal() {
    state.modalOpen = false;
    state.modalPath = null;
    el.modal.classList.remove('modal--open');
    el.modal.setAttribute('aria-hidden', 'true');
  }

  function submitGiftForm() {
    var giftId = el.formGiftId.value;
    var path = el.formPath.value;
    var name = (el.inputName.value || '').trim();
    var email = (el.inputEmail.value || '').trim();
    var msg = (el.inputMsg.value || '').trim();

    if (!name || !email || !msg) {
      el.formError.textContent = 'Please fill all required fields.';
      return;
    }

    var gift = state.gifts.find(function (g) { return g.giftId === giftId; });
    if (!gift) { el.formError.textContent = 'Gift not found.'; return; }

    if (!gift.isGroupGift) {
      gift.claimerName = name;
      gift.claimerEmail = email;
      gift.claimerMessage = msg;
    } else {
      if (!Array.isArray(gift.contributors)) gift.contributors = [];
      gift.contributors.push({
        contributorName: name,
        contributorEmail: email,
        contributorMessage: msg,
        coupleReplyToContributor: ''
      });
    }

    gift.status = STATUS.Pending;
    persistLocalPendingOverride(gift.giftId, gift.status);

    postNetlifyForm({
      giftId: gift.giftId,
      giftTitle: gift.title,
      isGroupGift: String(Boolean(gift.isGroupGift)),
      path: path,
      gifterName: name,
      gifterEmail: email,
      giftMessage: msg,
      submittedAtISO: new Date().toISOString()
    });

    closeModal();
    renderAll();
  }

  function postNetlifyForm(fields) {
    var formName = 'gift-claim';
    var body = new URLSearchParams();
    body.append('form-name', formName);
    Object.keys(fields).forEach(function (k) { body.append(k, fields[k]); });
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).catch(function () {});
  }

  function persistLocalPendingOverride(giftId, status) {
    try {
      var key = 'hanstan_registry_local_overrides_v1';
      var raw = localStorage.getItem(key);
      var doc = raw ? JSON.parse(raw) : {};
      doc[giftId] = { status: status };
      localStorage.setItem(key, JSON.stringify(doc));
    } catch (e) {}
  }

  function hydrateLocalPendingOverrides() {
    try {
      var key = 'hanstan_registry_local_overrides_v1';
      var raw = localStorage.getItem(key);
      if (!raw) return;
      var doc = JSON.parse(raw);
      Object.keys(doc).forEach(function (giftId) {
        var override = doc[giftId];
        var g = state.gifts.find(function (x) { return x.giftId === giftId; });
        if (g && override && override.status) {
          g.status = override.status;
        }
      });
    } catch (e) {}
  }

  function updateModalMerchantPane(gift) {
    el.modalRightMerchant.innerHTML = '';
    var title = document.createElement('div');
    title.className = 'blockTitle';
    title.textContent = state.copy.right.merchantTitle;

    var list = document.createElement('ul');
    list.className = 'list';
    (gift.preferredMerchants || []).forEach(function (m) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = m.merchantURL;
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.color = 'var(--gold)';
      a.textContent = m.merchantName;
      li.appendChild(a);
      li.appendChild(document.createTextNode(' \u2014 ' + (m.merchantReason || '')));
      list.appendChild(li);
    });
    el.modalRightMerchant.appendChild(title);
    el.modalRightMerchant.appendChild(list);
  }

  /* --- Scroll Locator --- */

  function wireScrollLocator() {
    el.middleScroll.addEventListener('scroll', function () {
      updateScrollLocator();
    }, { passive: true });
  }

  function updateScrollLocator() {
    if (!state.locatorEnabled) {
      clearLocatorHighlights();
      return;
    }

    var container = el.middleScroll;
    var cTop = container.getBoundingClientRect().top;

    var sections = [
      { key: 'Home', el: document.getElementById('sectionHome') },
      { key: 'Adventure', el: document.getElementById('sectionAdventure') },
      { key: 'Hobby', el: document.getElementById('sectionHobby') }
    ];

    var threshold = 90;
    var candidate = null;

    for (var i = 0; i < sections.length; i++) {
      var top = sections[i].el.getBoundingClientRect().top - cTop;
      if (top <= threshold) candidate = sections[i].key;
    }

    if (candidate && candidate !== state.activeLocatorSection) {
      state.activeLocatorSection = candidate;
      applyLocatorHighlight(candidate);
    }

    if (container.scrollTop < 20) {
      state.activeLocatorSection = null;
      clearLocatorHighlights();
    }
  }

  function clearLocatorHighlights() {
    var chips = el.chipStack.querySelectorAll('.chip');
    chips.forEach(function (chip) { chip.classList.remove('chip--locator'); });
  }

  function applyLocatorHighlight(sectionKey) {
    clearLocatorHighlights();
    var chips = el.chipStack.querySelectorAll('.chip');
    chips.forEach(function (chip) {
      var key = chip.getAttribute('data-chip');
      if (key === sectionKey) chip.classList.add('chip--locator');
    });
  }

  /* --- Utilities --- */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeCssUrl(url) {
    return '"' + String(url).replace(/"/g, '%22') + '"';
  }

  /* ============ VERSION POLLING (Section 12.2) ============ */

  const REGISTRY_POLL_MS = 10000;
  const VERSION_ENDPOINT = '/.netlify/functions/registry-version';

  var _lastKnownPublishedVersion = null;

  async function pollRegistryVersion() {
    try {
      var r = await fetch(VERSION_ENDPOINT, { cache: 'no-store' });
      if (!r.ok) return;
      var result = await r.json();
      var incoming = result.publishedVersion;
      if (_lastKnownPublishedVersion === null) {
        _lastKnownPublishedVersion = incoming;
        return;
      }
      if (incoming !== _lastKnownPublishedVersion) {
        _lastKnownPublishedVersion = incoming;
        await refreshRegistryData();
      }
    } catch (e) {}
  }

  async function refreshRegistryData() {
    var prevSelectedId = state.selectedGiftId;
    var prevScrollTop = (document.getElementById('middleScroll') || {}).scrollTop || 0;

    var [tokens, copy, giftDoc, ordering] = await Promise.all([
      fetchJson(PATH_TOKENS),
      fetchJson(PATH_COPY),
      fetchJson(PATH_GIFTS),
      fetchJson(PATH_ORDERING)
    ]);

    state.tokens = tokens;
    state.copy = copy;
    state.gifts = (giftDoc && giftDoc.gifts) ? giftDoc.gifts.slice() : [];
    state.ordering = ordering || { sectionOrder: {}, dreamOrder: {} };

    applyThemeTokens(tokens);
    applyCopy(copy);

    if (prevSelectedId && state.gifts.find(function (g) { return g.giftId === prevSelectedId; })) {
      state.selectedGiftId = prevSelectedId;
    } else if (state.gifts.length > 0) {
      state.selectedGiftId = state.gifts[0].giftId;
    } else {
      state.selectedGiftId = null;
    }

    renderAll();

    var ms = document.getElementById('middleScroll');
    if (ms) ms.scrollTop = prevScrollTop;
  }

  setInterval(pollRegistryVersion, REGISTRY_POLL_MS);

})();
