'use strict';

// ─── Supabase config (anon/publishable key — safe for frontend) ──────
const SUPABASE_URL     = 'https://uffjqxhlzcrixgduqyuh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RBCWFno846-wW1Vmu36QJQ_hRnDlr6x';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORY_META = {
  korrupcio_elleni_harc_es_jogallam:        { label: 'Korrupció elleni harc és jogállam',       icon: '⚖️' },
  gazdasag_es_koltsegvetes:                 { label: 'Gazdaság és költségvetés',                icon: '📊' },
  adopolitika:                              { label: 'Adópolitika',                              icon: '🧾' },
  egeszsegugy:                              { label: 'Egészségügy',                              icon: '🏥' },
  oktatas_es_tudomany:                      { label: 'Oktatás és tudomány',                      icon: '📚' },
  szocialis_halo_es_csaladtamogatas:        { label: 'Szociális háló és családtámogatás',       icon: '👨‍👩‍👧' },
  nyugdij_es_idosgondozas:                 { label: 'Nyugdíj és idősgondozás',                 icon: '🌿' },
  gyermekvedelem:                           { label: 'Gyermekvédelem',                           icon: '🧒' },
  infrastruktura_es_kozlekedes:             { label: 'Infrastruktúra és közlekedés',             icon: '🛤️' },
  lakhatas:                                 { label: 'Lakhatás',                                 icon: '🏠' },
  energetika_kornyezet_es_allatvedelem:    { label: 'Energetika, környezet és állatvédelem',   icon: '♻️' },
  kulpolitika_honvedelem_es_nemzetpolitika: { label: 'Külpolitika, honvédelem és nemzetpolitika', icon: '🌍' },
  allamigazgatas_es_onkormanyzatok:         { label: 'Államigazgatás és önkormányzatok',        icon: '🏛️' },
};

const HU_MONTHS = ['jan.','febr.','márc.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'];
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${y}. ${HU_MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}.`;
}

let currentFilter = 'all';
let allPromises   = [];
let currentUser   = null;

// ─── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Restore session (handles OAuth redirect token in URL hash too)
  const { data: { session } } = await sb.auth.getSession();
  if (session) setUser(session.user);

  sb.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  loadPromises();
  setupFilters();
  setupSubscribeForm();
  setupAuthButtons();
});

// ─── Auth ────────────────────────────────────────────────────────────
function setUser(user) {
  currentUser = user;
  const loginBtn  = document.getElementById('login-btn');
  const userInfo  = document.getElementById('user-info');
  const emailEl   = document.getElementById('user-email-display');
  const avatarEl  = document.getElementById('user-avatar');

  if (user) {
    loginBtn.style.display  = 'none';
    userInfo.classList.add('visible');
    emailEl.textContent = user.email ?? '';
    // Initials avatar (or Google photo if available)
    const pic = user.user_metadata?.avatar_url;
    if (pic) {
      avatarEl.innerHTML = `<img src="${pic}" alt="">`;
    } else {
      avatarEl.textContent = (user.email ?? 'U')[0].toUpperCase();
    }
  } else {
    loginBtn.style.display  = 'flex';
    userInfo.classList.remove('visible');
  }
}

function setupAuthButtons() {
  document.getElementById('login-btn').addEventListener('click', () => {
    sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  });
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
    setUser(null);
  });
}

// ─── Data ────────────────────────────────────────────────────────────
async function loadPromises() {
  try {
    const res = await fetch('vallalasok.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allPromises = await res.json();
    renderAll(allPromises);
    renderHighlights(allPromises);
  } catch (err) {
    document.getElementById('promises-container').innerHTML =
      `<div class="loading-state" style="color:#e05c6e">Hiba az adatok betöltésekor: ${err.message}</div>`;
  }
}

function classifyItem(item) {
  if (item.isdone) return 'done';
  if (item.deadline) {
    const dl = new Date(item.deadline);
    dl.setHours(23, 59, 59, 999);
    if (dl < new Date()) return 'expired';
  }
  return 'pending';
}

// ─── Highlights ──────────────────────────────────────────────────────
function renderHighlights(promises) {
  // Left: recently completed (sorted by donedate desc)
  const done = promises
    .filter(p => p.isdone)
    .sort((a, b) => (b.donedate ?? '').localeCompare(a.donedate ?? ''))
    .slice(0, 5);

  const doneList = document.getElementById('recently-done');
  if (done.length === 0) {
    doneList.innerHTML = '<li class="highlight-empty">Még nincs teljesített vállalás.</li>';
  } else {
    doneList.innerHTML = done.map(p => `
      <li class="highlight-item" data-promise-id="${p.id}" role="button" tabindex="0" title="Ugrás a vállaláshoz">
        <span class="hi-check">✓</span>
        <span>${escHtml(p.todo)}</span>
      </li>`).join('');
  }

  // Right: last 5 by id (most recently added to the tracker)
  const added = [...promises].sort((a, b) => b.id - a.id).slice(0, 5);
  document.getElementById('recently-added').innerHTML = added.map(p => `
    <li class="highlight-item" data-promise-id="${p.id}" role="button" tabindex="0" title="Ugrás a vállaláshoz">
      <span class="hi-dot">◆</span>
      <span>${escHtml(p.todo)}</span>
    </li>`).join('');

  // Scroll-to on click
  document.querySelectorAll('.highlight-item[data-promise-id]').forEach(item => {
    const activate = () => scrollToPromise(item.dataset.promiseId);
    item.addEventListener('click', activate);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
  });
}

// ─── Render promises ─────────────────────────────────────────────────
function renderAll(promises) {
  let totalDone = 0, totalPending = 0, totalExpired = 0;
  promises.forEach(p => {
    const s = classifyItem(p);
    if (s === 'done') totalDone++;
    else if (s === 'expired') totalExpired++;
    else totalPending++;
  });
  document.getElementById('stat-total').textContent   = promises.length;
  document.getElementById('stat-done').textContent    = totalDone;
  document.getElementById('stat-pending').textContent = totalPending;
  document.getElementById('stat-expired').textContent = totalExpired;

  // Group by category
  const groups = {};
  promises.forEach(p => {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  });

  const container = document.getElementById('promises-container');
  container.innerHTML = '';

  for (const [catKey, items] of Object.entries(groups)) {
    const meta = CATEGORY_META[catKey] || { label: catKey, icon: '•' };
    const section = document.createElement('section');
    section.className = 'category-section';
    section.dataset.category = catKey;

    section.innerHTML = `
      <div class="category-header">
        <span class="category-icon" aria-hidden="true">${meta.icon}</span>
        <h2 class="category-title">${meta.label}</h2>
        <span class="category-count">${items.length}</span>
      </div>
      <ul class="promise-list"></ul>
    `;

    const list = section.querySelector('.promise-list');
    items.forEach(item => {
      const status = classifyItem(item);
      const li = document.createElement('li');
      li.className = `promise-item${status === 'done' ? ' is-done' : ''}${status === 'expired' ? ' is-expired' : ''}`;
      li.dataset.status = status;
      li.dataset.id = item.id;

      let badgeContent = '';
      if (status === 'done')    badgeContent = '✓';
      else if (status === 'expired') badgeContent = '–';

      const donedateHtml = item.donedate
        ? `<div class="promise-donedate">Teljesítve: ${fmtDate(item.donedate)}</div>` : '';

      li.innerHTML = `
        <div class="promise-row">
          <span class="status-badge ${status}" aria-label="${status === 'done' ? 'Teljesítve' : status === 'expired' ? 'Lejárt' : 'Folyamatban'}">${badgeContent}</span>
          <div class="promise-body">
            <p class="promise-text">${escHtml(item.todo)}</p>
            ${donedateHtml}
          </div>
          <button class="comment-toggle" data-id="${item.id}">Megjegyzés</button>
        </div>
        <div class="comment-form-wrap" id="cf-${item.id}"></div>
      `;
      list.appendChild(li);
    });

    container.appendChild(section);
  }

  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.id = 'empty-state';
  empty.textContent = 'Ebben a szűrőben nincs találat.';
  container.appendChild(empty);

  attachItemListeners();
  applyFilter(currentFilter);
}

// ─── Item event listeners ────────────────────────────────────────────
function attachItemListeners() {
  document.querySelectorAll('.comment-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const wrap = document.getElementById(`cf-${id}`);
      const isOpen = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
      btn.textContent = isOpen ? 'Bezárás' : 'Megjegyzés';

      if (isOpen) {
        if (!currentUser) {
          // Show login prompt
          wrap.innerHTML = `
            <div class="login-prompt">
              <p>A megjegyzéshez be kell jelentkezned Google fiókkal.</p>
              <button class="btn-google-inline" id="inline-login-${id}">
                <svg width="14" height="14" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Bejelentkezés Google-lal
              </button>
            </div>`;
          document.getElementById(`inline-login-${id}`)?.addEventListener('click', () => {
            sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
          });
        } else {
          // Show comment form
          wrap.innerHTML = `
            <form class="comment-form" data-promise-id="${id}">
              <textarea name="comment" placeholder="Írd le megfigyelésedet vagy megjegyzésedet…" maxlength="2000" required></textarea>
              <div class="comment-form-footer">
                <span class="comment-form-note">Nem jelenik meg nyilvánosan — szerkesztői célra tároljuk.</span>
                <button type="submit" class="comment-submit">Küldés</button>
              </div>
            </form>`;
          wrap.querySelector('.comment-form').addEventListener('submit', handleCommentSubmit);
          wrap.querySelector('textarea').focus();
        }
      }
    });
  });
}

// ─── Comment submit ──────────────────────────────────────────────────
async function handleCommentSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;

  const form      = e.currentTarget;
  const promiseId = Number(form.dataset.promiseId);
  const comment   = form.elements.comment.value.trim();
  const btn       = form.querySelector('.comment-submit');
  if (!comment) return;

  const { data: { session } } = await sb.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) { showToast('Lejárt a bejelentkezés, kérjük jelentkezz be újra.', true); return; }

  btn.disabled = true;
  btn.textContent = 'Küldés…';

  try {
    const res = await fetch('/api/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ promise_id: promiseId, comment }),
    });
    if (!res.ok) throw new Error('Szerverhiba');

    showToast('Köszönjük a megjegyzést!');
    form.reset();

    const wrap   = form.closest('.comment-form-wrap');
    const toggle = wrap.previousElementSibling?.querySelector('.comment-toggle');
    wrap.classList.remove('open');
    if (toggle) { toggle.textContent = 'Megjegyzés'; toggle.setAttribute('aria-expanded', 'false'); }
  } catch {
    showToast('Hiba küldés közben — próbáld újra.', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Küldés';
  }
}

// ─── Filters ─────────────────────────────────────────────────────────
function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilter(currentFilter);
    });
  });
}

function applyFilter(filter) {
  let anyVisible = false;
  document.querySelectorAll('.promise-item').forEach(item => {
    const visible = filter === 'all' || item.dataset.status === filter;
    item.style.display = visible ? '' : 'none';
    if (visible) anyVisible = true;
  });
  document.querySelectorAll('.category-section').forEach(section => {
    const has = [...section.querySelectorAll('.promise-item')].some(i => i.style.display !== 'none');
    section.style.display = has ? '' : 'none';
  });
  const empty = document.getElementById('empty-state');
  if (empty) empty.classList.toggle('visible', !anyVisible);
}

// ─── Subscribe form ──────────────────────────────────────────────────
function setupSubscribeForm() {
  const form = document.getElementById('subscribe-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = form.querySelector('button[type="submit"]');
    const input = form.querySelector('input[type="email"]');
    const email = input?.value?.trim();
    if (!email) return;

    btn.disabled = true;
    btn.textContent = '…';

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Szerverhiba');
      showToast('Köszönjük a feliratkozást! Értesítünk a fontosabb változásokról.');
      form.reset();
    } catch {
      showToast('Hiba történt — próbáld újra.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Feliratkozás';
    }
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const toast = document.getElementById('comment-toast');
  toast.textContent = msg;
  toast.style.background = isError ? '#7b1f2e' : '';
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3500);
}

function scrollToPromise(id) {
  // Make sure "Összes" filter is active so the item is visible
  const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
  if (allBtn && currentFilter !== 'all') {
    allBtn.click();
  }

  const target = document.querySelector(`.promise-item[data-id="${id}"]`);
  if (!target) return;

  // Offset for sticky navbar + filter bar (~110px)
  const offset = 120;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });

  // Flash highlight
  target.classList.remove('flashing');
  void target.offsetWidth; // reflow to restart animation
  target.classList.add('flashing');
  target.addEventListener('animationend', () => target.classList.remove('flashing'), { once: true });
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Suggest modal ────────────────────────────────────────────────────
(function setupSuggest() {
  const DEFAULT_DEADLINE = '2030-03-30';

  const fab      = document.getElementById('fab-suggest');
  const overlay  = document.getElementById('suggest-overlay');
  const closeBtn = document.getElementById('suggest-close');
  const authWall = document.getElementById('suggest-auth-wall');
  const form     = document.getElementById('suggest-form');
  const loginBtn = document.getElementById('suggest-login-btn');
  const isDoneRadios = () => document.querySelectorAll('[name="isdone"]');
  const donedateGroup = () => document.getElementById('sg-donedate');
  const deadlineGroup = () => document.getElementById('sg-deadline');

  function openModal() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    refreshAuthState();
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    form.reset();
    // Reset conditional fields
    donedateGroup().style.display = 'none';
    deadlineGroup().style.display = '';
    document.getElementById('sg-donedate').querySelector
      ? null : null; // just reset
  }

  function refreshAuthState() {
    if (currentUser) {
      authWall.classList.remove('show');
      form.classList.add('show');
    } else {
      authWall.classList.add('show');
      form.classList.remove('show');
    }
  }

  // Open / close
  fab.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Login from within modal
  loginBtn?.addEventListener('click', () => {
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  });

  // Update auth state when user logs in/out
  const _origSetUser = setUser;
  window._suggestAuthRefresh = refreshAuthState;

  // Toggle donedate / deadline fields based on radio
  document.addEventListener('change', (e) => {
    if (e.target.name !== 'isdone') return;
    const isDone = e.target.value === 'true';
    donedateGroup().style.display = isDone ? '' : 'none';
    deadlineGroup().style.display = isDone ? 'none' : '';
    if (isDone) {
      document.getElementById('s-donedate').required = true;
    } else {
      document.getElementById('s-donedate').required = false;
    }
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const { data: { session } } = await sb.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) { showToast('Lejárt a munkamenet, kérjük jelentkezz be újra.', true); return; }

    const btn = document.getElementById('suggest-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Küldés…';

    const data = Object.fromEntries(new FormData(form));
    const payload = {
      todo:     data.todo?.trim(),
      category: data.category,
      isdone:   data.isdone === 'true',
      donedate: data.isdone === 'true' ? (data.donedate || null) : null,
      deadline: data.isdone === 'false' ? (data.deadline || DEFAULT_DEADLINE) : null,
      source:   data.source?.trim() || null,
    };

    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      closeModal();
      showToast('Köszönjük! Hamarosan megvizsgáljuk.');
    } catch {
      showToast('Hiba küldés közben — próbáld újra.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Beküldés';
    }
  });
})();
