'use strict';

const CATEGORY_META = {
  korrupcio_elleni_harc_es_jogallam:      { label: 'Korrupció elleni harc és jogállam', icon: '⚖️' },
  gazdasag_es_koltsegvetes:               { label: 'Gazdaság és költségvetés',            icon: '📊' },
  adopolitika:                            { label: 'Adópolitika',                          icon: '🧾' },
  egeszsegugy:                            { label: 'Egészségügy',                          icon: '🏥' },
  oktatas_es_tudomany:                    { label: 'Oktatás és tudomány',                  icon: '📚' },
  szocialis_halo_es_csaladtamogatas:      { label: 'Szociális háló és családtámogatás',   icon: '👨‍👩‍👧' },
  nyugdij_es_idosgondozas:               { label: 'Nyugdíj és idősgondozás',             icon: '🌿' },
  gyermekvedelem:                         { label: 'Gyermekvédelem',                       icon: '🧒' },
  infrastruktura_es_kozlekedes:           { label: 'Infrastruktúra és közlekedés',         icon: '🛤️' },
  lakhatas:                               { label: 'Lakhatás',                             icon: '🏠' },
  energetika_kornyezet_es_allatvedelem:  { label: 'Energetika, környezet és állatvédelem', icon: '♻️' },
  kulpolitika_honvedelem_es_nemzetpolitika: { label: 'Külpolitika, honvédelem és nemzetpolitika', icon: '🌍' },
  allamigazgatas_es_onkormanyzatok:       { label: 'Államigazgatás és önkormányzatok',    icon: '🏛️' },
};

const HU_MONTHS = ['jan.','febr.','márc.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'];

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${y}. ${HU_MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}.`;
}

let currentFilter = 'all';
let allPromises = [];

document.addEventListener('DOMContentLoaded', () => {
  loadPromises();
  setupFilters();
  setupSubscribeForm();
});

async function loadPromises() {
  try {
    const res = await fetch('vallalasok.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allPromises = await res.json();
    renderAll(allPromises);
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

function renderAll(promises) {
  const today = new Date();

  // Compute stats
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

  // Group by category preserving order
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
      li.className = `promise-item ${status === 'done' ? 'is-done' : ''} ${status === 'expired' ? 'is-expired' : ''}`.trim();
      li.dataset.status = status;
      li.dataset.id = item.id;

      let badgeContent = '';
      if (status === 'done')    badgeContent = '✓';
      else if (status === 'expired') badgeContent = '–';

      const deadlineHtml = item.deadline
        ? `<span class="promise-deadline ${status === 'expired' ? 'is-expired' : ''}">
             Határidő: ${fmtDate(item.deadline)}
           </span>`
        : '';

      const donedateHtml = item.donedate
        ? `<span class="promise-donedate">Teljesítve: ${fmtDate(item.donedate)}</span>`
        : '';

      li.innerHTML = `
        <div class="promise-row">
          <span class="status-badge ${status}" aria-label="${status === 'done' ? 'Teljesítve' : status === 'expired' ? 'Lejárt' : 'Folyamatban'}">${badgeContent}</span>
          <div class="promise-body">
            <p class="promise-text">${escHtml(item.todo)}</p>
            <div class="promise-meta">
              ${deadlineHtml}
              ${donedateHtml}
            </div>
          </div>
          <button class="comment-toggle" aria-expanded="false" data-id="${item.id}">Megjegyzés</button>
        </div>
        <div class="comment-form-wrap" id="cf-${item.id}">
          <form class="comment-form" data-promise-id="${item.id}">
            <input type="text" name="name" placeholder="Neved (nem kötelező)" maxlength="80" autocomplete="off">
            <textarea name="comment" placeholder="Írd le megfigyelésedet vagy megjegyzésedet…" maxlength="2000" required></textarea>
            <div class="comment-form-footer">
              <span class="comment-form-note">Nem jelenik meg nyilvánosan — csak szerkesztői célra tároljuk.</span>
              <button type="submit" class="comment-submit">Küldés</button>
            </div>
          </form>
        </div>
      `;

      list.appendChild(li);
    });

    container.appendChild(section);
  }

  // Add empty state element
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.id = 'empty-state';
  empty.textContent = 'Ebben a szűrőben nincs találat.';
  container.appendChild(empty);

  attachItemListeners();
  applyFilter(currentFilter);
}

function attachItemListeners() {
  // Comment toggles
  document.querySelectorAll('.comment-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const wrap = document.getElementById(`cf-${id}`);
      const isOpen = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
      btn.textContent = isOpen ? 'Bezárás' : 'Megjegyzés';
      if (isOpen) wrap.querySelector('textarea').focus();
    });
  });

  // Comment forms
  document.querySelectorAll('.comment-form').forEach(form => {
    form.addEventListener('submit', handleCommentSubmit);
  });
}

async function handleCommentSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const promiseId = Number(form.dataset.promiseId);
  const name = form.elements.name.value.trim();
  const comment = form.elements.comment.value.trim();
  const btn = form.querySelector('.comment-submit');

  if (!comment) return;

  btn.disabled = true;
  btn.textContent = 'Küldés…';

  try {
    const res = await fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promise_id: promiseId, name: name || null, comment }),
    });

    if (!res.ok) throw new Error('Szerverhiba');

    showToast('Köszönjük a megjegyzést!');
    form.reset();

    // Close the form
    const wrap = form.closest('.comment-form-wrap');
    wrap.classList.remove('open');
    const toggle = wrap.previousElementSibling.querySelector('.comment-toggle');
    if (toggle) { toggle.textContent = 'Megjegyzés'; toggle.setAttribute('aria-expanded', 'false'); }
  } catch {
    showToast('Hiba küldés közben — próbáld újra.', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Küldés';
  }
}

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
    const status = item.dataset.status;
    const visible = filter === 'all' || status === filter;
    item.dataset.visible = visible;
    item.style.display = visible ? '' : 'none';
    if (visible) anyVisible = true;
  });

  // Hide entire category section if no visible items
  document.querySelectorAll('.category-section').forEach(section => {
    const hasVisible = [...section.querySelectorAll('.promise-item')].some(i => i.style.display !== 'none');
    section.style.display = hasVisible ? '' : 'none';
  });

  const empty = document.getElementById('empty-state');
  if (empty) empty.classList.toggle('visible', !anyVisible);
}

function setupSubscribeForm() {
  const form = document.getElementById('subscribe-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value.trim();
    if (!email) return;

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      showToast('Feliratkozás sikeres! Hamarosan értesítünk.');
      form.reset();
    } catch {
      // Fallback: just show thanks (subscribe endpoint optional)
      showToast('Köszönjük a feliratkozást!');
      form.reset();
    }
  });
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('comment-toast');
  toast.textContent = msg;
  toast.style.background = isError ? '#7b1f2e' : '';
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3500);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
