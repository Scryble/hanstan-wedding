/* === CHANGE LOG ===
 * DA-UNIFIED (2026-03-17): Status chip moved from absolute overlay on image to
 *   flow element in tile body before title.
 * HW-012E (2026-03-06): Tile overlay variants (--pending purple, --claimed gold), softened
 *   tile--disabled, statusPill variants, cta--primary/secondary + hints, tile--flash click.
 * HW-012B (2026-03-06): Group gift budget bypass, outside budget/price-unknown group exclusions,
 *   image fallback probes in buildTile + buildDetailContent, guestNotes rendering.
 * HW-012A (2026-03-06): Two-column layout, unified detail modal, dream section removal,
 *   mobile dead code removal (openMobileDetail, bottomSheet, mobileBar, mobileDetail),
 *   submitGiftForm banner redirect to detailModal.
 * === END CHANGE LOG === */

/* Registry Phase 2 (GiftRegistryP2)
   Renders the 3-panel registry via Netlify Function endpoints.
   Phase 2: ordering integration, price-unknown section, UX polish, status locks.
*/

(function () {
  const PATH_TOKENS = '/.netlify/functions/data-theme-tokens';
  const PATH_COPY = '/.netlify/functions/data-copy-registry';
  const PATH_GIFTS = '/.netlify/functions/data-gifts';
  const PATH_ORDERING = '/.netlify/functions/data-ordering-registry';

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
    detailModal: document.getElementById('detailModal'),
    detailModalBack: document.getElementById('detailModalBack'),
    detailModalScroll: document.getElementById('detailModalScroll'),
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

    buildChips();
    wireBudgetSlider();
    wireClearButtons();
    wireModal();
    wireScrollLocator();
    el.detailModalBack.addEventListener('click', closeDetailModal);

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
      var label = (key === 'Group') ?
        state.copy.leftRail.chips.Group : state.copy.leftRail.chips[key];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.setAttribute('data-chip', key);
      // Phase 2: chips as toggles, no "+" icon
      btn.innerHTML = '<span class="chip__leftAccent"></span><span class="chip__label">' + escapeHtml(label) + '</span><span class="chip__indicator">\u25CB</span>';
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

  /* [TICKET 2 — F1] showAllGifts replaces clearAllChips */
  function showAllGifts() {
    state.activeChips.clear();
    state.budget = Number(el.budgetSlider.max);
    el.budgetSlider.value = String(state.budget);
    el.budgetValue.textContent = '$' + state.budget;
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
      if (indicator) indicator.textContent = active ? '\u25CF' : '\u25CB';
    });
  }

  /* [TICKET 2 — F1b] wireClearButtons references showAllGifts */
  function wireClearButtons() {
    el.btnShowAll.addEventListener('click', showAllGifts);
    el.btnClearAll.addEventListener('click', showAllGifts);
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
    el.dreamBlock.style.display = 'none';
    renderSection('Home', visible, el.tilesHome);
    renderSection('Adventure', visible, el.tilesAdventure);
    renderSection('Hobby', visible, el.tilesHobby);
    renderOutsideBudget(visible);
    renderPriceUnknown();

    /* [TICKET 2 — R2] Hide section headers when no visible gifts */
    document.getElementById('sectionHome').style.display = el.tilesHome.children.length ? '' : 'none';
    document.getElementById('sectionAdventure').style.display = el.tilesAdventure.children.length ? '' : 'none';
    document.getElementById('sectionHobby').style.display = el.tilesHobby.children.length ? '' : 'none';

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
      var budgetPass = g.isGroupGift || (hasPrice && (g.price >= low) && (g.price <= high));
      return chipPass && budgetPass;
    });
  }

  function getEligibleOutsideBudget(visibleByChipOnly) {
    var cfg = state.copy.budget;
    var B = state.budget;
    var low = cfg.outsideLowMultiplier * B;
    var high = cfg.outsideHighMultiplier * B;
    return visibleByChipOnly.filter(function (g) {
      return !g.isGroupGift && (typeof g.price === 'number') && (g.price > low) && (g.price <= high);
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
      return !g.isGroupGift && g.allowGifterProvidedVariant === true && (typeof g.price !== 'number' || g.price <= 0 || g.price === null);
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
      btn.classList.add('tile--flash');
      setTimeout(function () {
        btn.classList.remove('tile--flash');
        openDetailModal(gift.giftId);
      }, 120);
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.classList.add('tile--flash');
        setTimeout(function () {
          btn.classList.remove('tile--flash');
          openDetailModal(gift.giftId);
        }, 120);
      }
    });

    var imgUrl = gift.images && gift.images[0] ? gift.images[0] : '/assets/og-image.png';
    var img = document.createElement('div');
    img.className = 'tile__img';
    img.style.backgroundImage = 'url(' + escapeCssUrl(imgUrl) + ')';
    if (imgUrl !== '/assets/og-image.png') {
      var probe = new Image();
      probe.onerror = function () { img.style.backgroundImage = "url('/assets/og-image.png')"; };
      probe.src = imgUrl;
    }

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

    // DA-UNIFIED: Status chip in body flow, before title
    if (gift.status === STATUS.Pending || gift.status === STATUS.Claimed) {
      btn.classList.add('tile--disabled');
      var overlay = document.createElement('div');
      overlay.className = 'tile__overlay tile__overlay--' + (gift.status === STATUS.Pending ? 'pending' : 'claimed');
      overlay.textContent = (gift.status === STATUS.Pending) ?
        state.copy.right.statusPending : state.copy.right.statusClaimed;
      body.appendChild(overlay);
    }

    body.appendChild(title);
    if (gift.shortDescription) body.appendChild(desc);
    body.appendChild(priceEl);
    body.appendChild(badges);

    btn.appendChild(img);
    btn.appendChild(body);

    return btn;
  }

  function buildBadge(text) {
    var b = document.createElement('span');
    b.className = 'badge';
    b.textContent = text;
    return b;
  }

  /* --- Detail Modal (HW-012A) --- */

  function openDetailModal(giftId) {
    var gift = state.gifts.find(function (g) { return g.giftId === giftId; });
    if (!gift) return;
    state.selectedGiftId = giftId;

    var content = buildDetailContent(gift);
    el.detailModalScroll.innerHTML = '';
    el.detailModalScroll.appendChild(content);
    el.detailModal.hidden = false;
    el.detailModal.classList.add('detailModal--open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    el.detailModal.classList.remove('detailModal--open');
    el.detailModal.hidden = true;
    document.body.style.overflow = '';
    state.selectedGiftId = null;
  }

  function buildDetailContent(gift) {
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

    var heroUrl = (gift.images && gift.images[0]) ? gift.images[0] : '/assets/og-image.png';

    var card = document.createElement('div');
    card.className = 'detailCard';

    var hero = document.createElement('div');
    hero.className = 'detailHero';
    hero.style.backgroundImage = 'url(' + escapeCssUrl(heroUrl) + ')';
    if (heroUrl !== '/assets/og-image.png') {
      var probe = new Image();
      probe.onerror = function () { hero.style.backgroundImage = "url('/assets/og-image.png')"; };
      probe.src = heroUrl;
    }

    var body = document.createElement('div');
    body.className = 'detailBody';

    var titleEl = document.createElement('h2');
    titleEl.className = 'detailTitle';
    titleEl.textContent = gift.title;

    var statusRow = document.createElement('div');
    statusRow.className = 'detailStatus';

    var pill = document.createElement('div');
    var pillVariant = (gift.status === STATUS.Available) ? 'available'
      : (gift.status === STATUS.Pending) ? 'pending' : 'claimed';
    pill.className = 'statusPill statusPill--' + pillVariant;
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

    if (gift.guestNotes && gift.guestNotes.trim()) {
      var notesEl = document.createElement('p');
      notesEl.className = 'detailGuestNotes';
      notesEl.textContent = gift.guestNotes;
      descWrap.appendChild(notesEl);
    }

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
    updateModalMerchantPane(gift);
    return card;
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
    btn1.className = 'cta--primary';
    btn1.textContent = state.copy.right.pathSendFunds;
    btn1.addEventListener('click', function () { openModal(gift.giftId, 'SendFunds'); });

    var hint1 = document.createElement('p');
    hint1.className = 'cta__hint';
    hint1.textContent = 'We receive funds directly \u2014 simplest for everyone.';

    var btn2 = document.createElement('button');
    btn2.type = 'button';
    btn2.className = 'cta--secondary';
    btn2.textContent = state.copy.right.pathPurchase;
    btn2.addEventListener('click', function () { openModal(gift.giftId, 'PurchasePersonally'); });

    var hint2 = document.createElement('p');
    hint2.className = 'cta__hint';
    hint2.textContent = 'You buy from a retailer and ship to us.';

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
    blk.appendChild(hint1);
    blk.appendChild(btn2);
    blk.appendChild(hint2);
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

    /* [TICKET 3 — R5] Email validation */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      el.formError.textContent = 'Please enter a valid email address.';
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

    closeModal();
    renderAll();

    /* [TICKET 3 — R3] Success confirmation banner */
    var successMsg = (state.copy.right && state.copy.right.claimSuccessMessage)
      ? state.copy.right.claimSuccessMessage
      : 'Thank you! Your intent-to-gift has been recorded.';
    var successBanner = document.createElement('div');
    successBanner.className = 'claim-success';
    successBanner.textContent = successMsg;
    if (el.detailModalScroll) {
      el.detailModalScroll.insertBefore(successBanner, el.detailModalScroll.firstChild);
    }
    setTimeout(function () { if (successBanner.parentNode) successBanner.parentNode.removeChild(successBanner); }, 6000);

    /* [TICKET 3 — R6] Form error handling with .catch() */
    postNetlifyForm({
      giftId: gift.giftId,
      giftTitle: gift.title,
      isGroupGift: String(Boolean(gift.isGroupGift)),
      path: path,
      gifterName: name,
      gifterEmail: email,
      giftMessage: msg,
      submittedAtISO: new Date().toISOString()
    }).catch(function () {
      var warnBanner = document.createElement('div');
      warnBanner.className = 'claim-warning';
      warnBanner.textContent = 'Submission could not be sent. Your claim is saved locally and will sync when connectivity is restored.';
      if (el.detailModalScroll) {
        el.detailModalScroll.insertBefore(warnBanner, el.detailModalScroll.firstChild);
      }
      setTimeout(function () { if (warnBanner.parentNode) warnBanner.parentNode.removeChild(warnBanner); }, 8000);
    });
  }

  /* [TICKET 3 — R6] postNetlifyForm returns promise */
  function postNetlifyForm(fields) {
    var formName = 'gift-claim';
    var body = new URLSearchParams();
    body.append('form-name', formName);
    Object.keys(fields).forEach(function (k) { body.append(k, fields[k]); });
    return fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
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

  /* [TICKET 4 — R4] Reconciliation: only preserve overrides where server hasn't caught up */
  function hydrateLocalPendingOverrides() {
    try {
      var key = 'hanstan_registry_local_overrides_v1';
      var raw = localStorage.getItem(key);
      if (!raw) return;
      var doc = JSON.parse(raw);
      var dirty = false;
      Object.keys(doc).forEach(function (giftId) {
        var override = doc[giftId];
        var g = state.gifts.find(function (x) { return x.giftId === giftId; });
        if (g && override && override.status) {
          if (g.status === 'Available' && override.status === 'ClaimPendingConfirmation') {
            g.status = override.status;
          } else {
            delete doc[giftId];
            dirty = true;
          }
        }
      });
      if (dirty) {
        if (Object.keys(doc).length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(doc));
        }
      }
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

    /* [TICKET 4 — R1] Re-hydrate local overrides after polling refresh */
    hydrateLocalPendingOverrides();

    closeDetailModal();
    renderAll();

    var ms = document.getElementById('middleScroll');
    if (ms) ms.scrollTop = prevScrollTop;
  }

  setInterval(pollRegistryVersion, REGISTRY_POLL_MS);

})();
