import { isLive, listStock, addItem, updateItem, adjustStock, subscribeStock, stockState, listOrders, subscribeOrders } from '../data.js';
import { icons } from '../icons.js';
import { currentAdmin, login, logout } from '../auth.js';
import { SERVICES } from '../icons.js';
import { esc, toast, rupiah } from '../ui.js';

const adminNav = (active) => `
  <nav class="adm-tabs" aria-label="Admin">
    <a href="#/admin"${active === 'stock' ? ' aria-current="page"' : ''}>Stok</a>
    <a href="#/admin/orders"${active === 'orders' ? ' aria-current="page"' : ''}>Riwayat Pesanan</a>
  </nav>`;

/* ------------------------------------------------------------------ login */
export async function adminLogin(root) {
  if (await currentAdmin()) { location.hash = '#/admin'; return; }
  root.innerHTML = `
    <div class="pill"><span>Admin</span></div>
    <form class="auth" id="f" novalidate>
      <h2>Masuk Admin</h2>
      <label>Email<input name="email" type="email" autocomplete="username" required></label>
      <label>Kata sandi<input name="password" type="password" autocomplete="current-password" required></label>
      <p class="modal__err" role="alert"></p>
      <button class="btn" type="submit">Masuk</button>
      ${isLive ? '' : '<p class="auth__hint">Mode demo: admin@gudeg.local / admin123</p>'}
    </form>`;
  const f = root.querySelector('#f'), err = f.querySelector('.modal__err'), btn = f.querySelector('.btn');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { email, password } = Object.fromEntries(new FormData(f));
    if (!email.trim() || !password) { err.textContent = 'Email dan kata sandi wajib diisi.'; return; }
    btn.disabled = true; err.textContent = '';
    try { await login(email, password); location.hash = '#/admin'; }
    catch (x) { err.textContent = x.message; btn.disabled = false; f.password.value = ''; f.password.focus(); }
  });
}

/* ------------------------------------------------------------------ dashboard */
const LABEL = { ok: 'Aman', low: 'Menipis', out: 'Habis', off: 'Disembunyikan', untracked: 'Tidak dilacak' };
const RANK = { out: 0, low: 1, ok: 2, untracked: 3, off: 4 };
const FILTERS = [['all', 'Semua'], ['low', 'Menipis'], ['out', 'Habis'], ['food', 'Makanan'], ['drink', 'Minuman']];

export async function adminDashboard(root) {
  const admin = await currentAdmin();
  if (!admin) { location.hash = '#/admin/login'; return; }

  let items = await listStock(), query = '', filter = 'all';
  const by = (id) => items.find((i) => i.id === id);

  root.innerHTML = `
    <div class="pill"><span>Dasbor Stok</span></div>
    ${adminNav('stock')}
    <div class="adm-user"><span>${esc(admin.email)}</span><button id="out" type="button">Keluar</button></div>
        <details class="adm-add" id="add">
      <summary>+ Tambah Menu</summary>
      <form id="addf" novalidate>
        <label>Nama menu<input name="name" maxlength="60" autocomplete="off" required></label>
        <div class="adm-add__row">
          <label>Harga (Rp)<input name="price" inputmode="numeric" pattern="[0-9]*" placeholder="8000" required></label>
          <label>Kategori<select name="category"><option value="food">Makanan</option><option value="drink">Minuman</option></select></label>
        </div>
        <div class="adm-add__row">
          <label>Stok awal<input name="stock" inputmode="numeric" pattern="[0-9]*" placeholder="Kosong = tak terbatas"></label>
          <label>Link gambar (opsional)<input name="image" placeholder="https://… atau assets/…"></label>
        </div>
        <label>Deskripsi (opsional)<input name="description" maxlength="200" autocomplete="off"></label>
        <p class="modal__err" role="alert"></p>
        <button class="btn" type="submit">Simpan Menu</button>
      </form>
    </details>
    <div class="adm-stats" id="stats"></div>
    <div class="adm-tools">
      <input id="q" type="search" placeholder="Cari menu…" aria-label="Cari menu" autocomplete="off">
      <div class="chips" id="chips" role="group" aria-label="Filter">${FILTERS.map(([k, l]) => `<button type="button" class="chip" data-f="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('')}</div>
    </div>
    <div class="adm-list" id="list"></div>
    <p class="adm-sync" id="sync"></p>`;
  const $l = root.querySelector('#list'), $s = root.querySelector('#stats'), $sync = root.querySelector('#sync');
  
  const addf = root.querySelector('#addf'), addErr = addf.querySelector('.modal__err'), addBtn = addf.querySelector('.btn');
  addf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(addf)), num = (v) => (String(v).trim() === '' ? null : Number(v));
    addBtn.disabled = true; addErr.textContent = '';
    try {
      const item = await addItem({ name: f.name, price: num(f.price) ?? NaN, category: f.category, image: f.image, description: f.description, stock: num(f.stock) });
      items = [...items, item]; query = ''; filter = 'all'; root.querySelector('#q').value = '';
      root.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.f === 'all')));
      refreshAll(); addf.reset(); root.querySelector('#add').open = false; toast(`${item.name} ditambahkan`);
    } catch (x) { addErr.textContent = x.message; }
    addBtn.disabled = false;
  });

  const row = (i) => {
    const s = stockState(i), n = esc(i.name);
    return `
    <div class="adm-row" data-id="${esc(i.id)}" data-state="${s}">
      <div class="thumb"><img src="${esc(i.image)}" alt=""></div>
      <div class="adm-row__info"><b>${n}</b><span class="st st--${s}">${LABEL[s]}</span></div>
      <div class="stepper adm-step">
        <button class="mini-btn" type="button" data-adj="-1" aria-label="Kurangi stok ${n}">${icons.minus}</button>
        <input class="adm-qty" inputmode="numeric" pattern="[0-9]*" value="${i.stock ?? ''}" placeholder="–" aria-label="Stok ${n}">
        <button class="mini-btn" type="button" data-adj="1" aria-label="Tambah stok ${n}">${icons.plus}</button>
      </div>
      <label class="switch"><input type="checkbox" data-avail ${i.available ? 'checked' : ''}><span>Tampil di menu</span></label>
    </div>`;
  };

  const visible = () => items.filter((i) => {
    const s = stockState(i);
    if (query && !i.name.toLowerCase().includes(query)) return false;
    return filter === 'all' || filter === s || filter === i.category;
  }).sort((a, b) => RANK[stockState(a)] - RANK[stockState(b)] || a.name.localeCompare(b.name));

  const paintStats = () => {
    const c = { low: 0, out: 0 }; items.forEach((i) => { const s = stockState(i); if (s in c) c[s]++; });
    $s.innerHTML = `
      <div class="adm-stat"><b>${items.length}</b><span>Total menu</span></div>
      <div class="adm-stat adm-stat--low"><b>${c.low}</b><span>Menipis</span></div>
      <div class="adm-stat adm-stat--out"><b>${c.out}</b><span>Habis</span></div>`;
    $sync.textContent = `Diperbarui ${new Date().toLocaleTimeString('id-ID')}${isLive ? '' : ' · mode demo'}`;
  };
  const paintList = () => {
    const v = visible();
    $l.innerHTML = v.length ? v.map(row).join('') : '<p class="state-msg">Tidak ada menu yang cocok.</p>';
  };
  // Update one row in place (keeps keyboard focus on the button that was just pressed).
  const paintRow = (id) => {
    const el = $l.querySelector(`.adm-row[data-id="${CSS.escape(id)}"]`), i = by(id);
    if (!el || !i) return;
    const s = stockState(i), inp = el.querySelector('.adm-qty'), st = el.querySelector('.st');
    el.dataset.state = s; st.className = `st st--${s}`; st.textContent = LABEL[s];
    if (document.activeElement !== inp) inp.value = i.stock ?? '';
    el.querySelector('[data-avail]').checked = i.available;
  };
  const refreshAll = () => { paintStats(); paintList(); };
  refreshAll();

  const fail = async (x) => { console.error(x); toast('Gagal menyimpan. Coba lagi.'); items = await listStock().catch(() => items); refreshAll(); };

  root.addEventListener('click', async (e) => {
    if (e.target.closest('#out')) { await logout(); location.hash = '#/'; return; }
    const chip = e.target.closest('[data-f]');
    if (chip) {
      filter = chip.dataset.f;
      root.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      return paintList();
    }
    const b = e.target.closest('[data-adj]');
    if (!b) return;
    const id = b.closest('.adm-row').dataset.id, it = by(id), d = +b.dataset.adj;
    it.stock = Math.max(0, (it.stock ?? 0) + d); paintRow(id); paintStats();    // optimistic
    try { it.stock = await adjustStock(id, d); paintRow(id); paintStats(); } catch (x) { fail(x); }
  });

  root.addEventListener('change', async (e) => {
    const rowEl = e.target.closest('.adm-row'); if (!rowEl) return;
    const id = rowEl.dataset.id, it = by(id);
    try {
      if (e.target.matches('[data-avail]')) {
        it.available = e.target.checked; paintRow(id); paintStats();
        await updateItem(id, { available: it.available });
      } else if (e.target.matches('.adm-qty')) {
        const raw = e.target.value.trim();
        if (!/^\d{1,6}$/.test(raw)) { toast('Isi dengan angka 0 atau lebih'); e.target.value = it.stock ?? ''; return; }
        it.stock = +raw; paintRow(id); paintStats();
        await updateItem(id, { stock: it.stock });
      }
    } catch (x) { fail(x); }
  });
  root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.adm-qty')) e.target.blur(); });
  root.querySelector('#q').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); paintList(); });

  // Live updates. Never rebuild the list while the admin is typing in a stock field.
  return subscribeStock((fresh) => {
    items = fresh; paintStats();
    if (!$l.contains(document.activeElement) || !document.activeElement.matches('.adm-qty')) paintList();
  });
}


/* ------------------------------------------------------------------ order history */
const fmtDate = (t) => new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const METHOD = { qris: 'QRIS', bca: 'Transfer BCA' };
const OSTATE = { paid: 'Lunas', unpaid: 'Belum bayar', expired: 'Kedaluwarsa' };
const OCLASS = { paid: 'ok', unpaid: 'low', expired: 'off' };
const orderState = (o) => (o.status === 'paid' ? 'paid' : o.expiresAt && o.expiresAt < Date.now() ? 'expired' : 'unpaid');
const svcOf = (o) => [...new Set(o.items.map((i) => i.service))].map((k) => SERVICES[k]?.short || k);
const digits = (x) => String(x ?? '').replace(/\D/g, '');
const RANGES = [['all', 'Semua waktu'], ['today', 'Hari ini'], ['7d', '7 hari'], ['30d', '30 hari']];
const STATES = [['all', 'Semua'], ['paid', 'Lunas'], ['unpaid', 'Belum bayar'], ['expired', 'Kedaluwarsa']];
const PAGE = 50;

function rangeStart(r) {
  if (r === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  return r === '7d' ? Date.now() - 7 * 864e5 : r === '30d' ? Date.now() - 30 * 864e5 : 0;
}

function toCsv(orders) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;   // quotes + neutralise spreadsheet formulas
  const head = ['Kode', 'Waktu', 'Nama', 'Telepon', 'Layanan', 'Meja', 'Metode', 'Status', 'Total', 'Item', 'Catatan'];
  const rows = orders.map((o) => [o.code, fmtDate(o.createdAt), o.name, o.phone, svcOf(o).join(' / '), o.table || '', METHOD[o.method] || '', OSTATE[orderState(o)], o.total,
    o.items.map((i) => `${i.qty}x ${i.name}`).join('; '), o.note]);
  return '\ufeff' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export async function adminOrders(root) {
  const admin = await currentAdmin();
  if (!admin) { location.hash = '#/admin/login'; return; }

  let orders = await listOrders();
  let tab = 'orders', state = 'all', range = 'all', query = '', shown = PAGE;
  const opened = new Set();

  root.innerHTML = `
    <div class="pill"><span>Riwayat Pesanan</span></div>
    ${adminNav('orders')}
    <div class="adm-user"><span>${esc(admin.email)}</span><button id="out" type="button">Keluar</button></div>
    <div class="adm-stats" id="stats"></div>
    <div class="adm-tools">
      <input id="q" type="search" placeholder="Cari nama, no. telp, atau kode pesanan…" aria-label="Cari pesanan" autocomplete="off">
      <div class="chips" role="group" aria-label="Status">${STATES.map(([k, l]) => `<button type="button" class="chip" data-state="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('')}</div>
      <div class="chips" role="group" aria-label="Periode">${RANGES.map(([k, l]) => `<button type="button" class="chip" data-range="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('')}</div>
      <div class="adm-seg" role="tablist" aria-label="Tampilan">
        <button type="button" role="tab" data-tab="orders" aria-selected="true">Pesanan</button>
        <button type="button" role="tab" data-tab="customers" aria-selected="false">Pelanggan</button>
        <button type="button" class="adm-csv" id="csv">Unduh CSV</button>
      </div>
    </div>
    <div class="adm-list adm-list--orders" id="list"></div>
    <p class="adm-sync" id="sync"></p>`;
  const $l = root.querySelector('#list'), $s = root.querySelector('#stats'), $sync = root.querySelector('#sync');

  const filtered = () => {
    const from = rangeStart(range), q = query.toLowerCase(), qd = digits(query);
    return orders.filter((o) => {
      if (state !== 'all' && orderState(o) !== state) return false;
      if (from && o.createdAt < from) return false;
      if (!q) return true;
      return o.name?.toLowerCase().includes(q) || o.code?.toLowerCase().includes(q) || (qd.length >= 3 && digits(o.phone).includes(qd));
    });
  };

  const customers = (list) => {
    const m = new Map();
    for (const o of list) {
      const key = digits(o.phone) || (o.name || '').toLowerCase();
      const c = m.get(key) || { key, name: o.name, phone: o.phone, count: 0, spent: 0, last: 0 };
      c.count++;
      if (orderState(o) === 'paid') c.spent += o.total;
      if (o.createdAt > c.last) { c.last = o.createdAt; c.name = o.name; c.phone = o.phone; }
      m.set(key, c);
    }
    return [...m.values()].sort((a, b) => b.spent - a.spent || b.count - a.count);
  };

  const orderRow = (o) => {
    const st = orderState(o);
    const items = o.items.map((i) => {
      const parts = Array.isArray(i.components) && i.components.length ? `<small>${i.components.map((c) => `${esc(c.name)} ×${c.qty}`).join(', ')}</small>` : '';
      return `<li><span><b>${i.qty}× ${esc(i.name)}</b>${parts}<small>${esc(SERVICES[i.service]?.short || i.service)}</small></span><span>${rupiah(i.unitPrice * i.qty)}</span></li>`;
    }).join('');
    return `
    <details class="ord" data-id="${esc(o.id)}"${opened.has(o.id) ? ' open' : ''}>
      <summary>
        <span class="ord__code"><b>${esc(o.code)}</b><small>${fmtDate(o.createdAt)}</small></span>
        <span class="ord__cust"><b>${esc(o.name)}</b><small>${esc(o.phone)}</small></span>
        <span class="ord__svc">${svcOf(o).map((x) => `<i>${esc(x)}</i>`).join('')}</span>
        <span class="ord__total">${rupiah(o.total)}</span>
        <span class="st st--${OCLASS[st]} ord__st">${OSTATE[st]}</span>
      </summary>
      <div class="ord__body">
        <ul class="ord__items">${items}</ul>
        <dl class="ord__meta">
          <div><dt>Meja</dt><dd>${esc(o.table || '–')}</dd></div>
          <div><dt>Pembayaran</dt><dd>${esc(METHOD[o.method] || 'Belum dipilih')}</dd></div>
          <div><dt>Catatan</dt><dd>${esc(o.note || '–')}</dd></div>
        </dl>
      </div>
    </details>`;
  };

  const custRow = (c) => `
    <button type="button" class="cust" data-key="${esc(c.key)}" data-phone="${esc(c.phone)}" aria-label="Lihat pesanan ${esc(c.name)}">
      <span class="cust__who"><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></span>
      <span class="cust__n"><b>${c.count}</b><small>pesanan</small></span>
      <span class="cust__spent"><b>${rupiah(c.spent)}</b><small>dibayar lunas</small></span>
      <span class="cust__last"><small>Terakhir</small><b>${fmtDate(c.last)}</b></span>
    </button>`;

  const paint = () => {
    const list = filtered();
    const paid = list.filter((o) => orderState(o) === 'paid'), pend = list.filter((o) => orderState(o) === 'unpaid');
    $s.innerHTML = `
      <div class="adm-stat"><b>${list.length}</b><span>Pesanan</span></div>
      <div class="adm-stat adm-stat--ok"><b>${rupiah(paid.reduce((n, o) => n + o.total, 0))}</b><span>Pendapatan (lunas)</span></div>
      <div class="adm-stat adm-stat--low"><b>${rupiah(pend.reduce((n, o) => n + o.total, 0))}</b><span>Belum dibayar</span></div>`;
    $sync.textContent = `Diperbarui ${new Date().toLocaleTimeString('id-ID')} · ${orders.length} pesanan terakhir dimuat${isLive ? '' : ' · mode demo'}`;
    if (tab === 'customers') {
      const cs = customers(list);
      $l.className = 'adm-list adm-list--custs';
      $l.innerHTML = cs.length ? cs.map(custRow).join('') : '<p class="state-msg">Belum ada pelanggan yang cocok.</p>';
    } else {
      $l.className = 'adm-list adm-list--orders';
      $l.innerHTML = list.length
        ? list.slice(0, shown).map(orderRow).join('') + (list.length > shown ? `<button type="button" class="chip adm-more" id="more">Tampilkan lebih banyak (${list.length - shown})</button>` : '')
        : '<p class="state-msg">Belum ada pesanan yang cocok.</p>';
    }
  };
  paint();

  const press = (sel, attr, val) => root.querySelectorAll(sel).forEach((b) => b.setAttribute(attr, String(b.dataset[Object.keys(b.dataset)[0]] === val)));
  root.addEventListener('click', async (e) => {
    if (e.target.closest('#out')) { await logout(); location.hash = '#/'; return; }
    const st = e.target.closest('[data-state]'), rg = e.target.closest('[data-range]'), tb = e.target.closest('[data-tab]');
    if (st) { state = st.dataset.state; press('[data-state]', 'aria-pressed', state); shown = PAGE; return paint(); }
    if (rg) { range = rg.dataset.range; press('[data-range]', 'aria-pressed', range); shown = PAGE; return paint(); }
    if (tb) { tab = tb.dataset.tab; press('[data-tab]', 'aria-selected', tab); return paint(); }
    if (e.target.closest('#more')) { shown += PAGE; return paint(); }
    if (e.target.closest('#csv')) {
      const url = URL.createObjectURL(new Blob([toCsv(filtered())], { type: 'text/csv;charset=utf-8' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `riwayat-pesanan-${new Date().toISOString().slice(0, 10)}.csv` });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const c = e.target.closest('.cust');
    if (c) {   // a customer's full history = the orders list filtered to their phone number
      query = c.dataset.phone; root.querySelector('#q').value = query; tab = 'orders'; shown = PAGE;
      press('[data-tab]', 'aria-selected', tab); paint(); window.scrollTo({ top: root.querySelector('.adm-tools').offsetTop, behavior: 'smooth' });
    }
  });
  root.addEventListener('toggle', (e) => {   // remember which orders are expanded across live refreshes
    const d = e.target.closest?.('.ord'); if (!d) return;
    d.open ? opened.add(d.dataset.id) : opened.delete(d.dataset.id);
  }, true);
  root.querySelector('#q').addEventListener('input', (e) => { query = e.target.value.trim(); shown = PAGE; paint(); });

  return subscribeOrders((fresh) => { orders = fresh; paint(); });
}
