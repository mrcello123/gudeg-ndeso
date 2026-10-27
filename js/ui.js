export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const nf = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const rupiah = (n) => `Rp ${nf.format(n)}`;        // Rp 5.000,00
export const rupiahDot = (n) => `Rp. ${nf.format(n)}`;    // Rp. 5.000,00 (used in the nested lists)

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function mmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
export function hhmmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/** Bottom-sheet form asking for customer details. Resolves with {name, phone, table} or null if dismissed. */
export function askCustomer(prefill = {}, needTable = false) {
  const modal = $('#modal'), scrim = $('#scrim');
  modal.innerHTML = `
    <h3>Data Pemesan</h3>
    <label>Nama<input name="name" autocomplete="name" required value="${esc(prefill.name)}"></label>
    <label>No Telp<input name="phone" type="tel" autocomplete="tel" required value="${esc(prefill.phone)}"></label>
    ${needTable ? `<label>No. Meja<input name="table" inputmode="numeric" required value="${esc(prefill.table)}"></label>` : ''}
    <p class="modal__err" role="alert"></p>
    <button class="btn" type="submit">Lanjutkan</button>`;
  modal.hidden = false; scrim.hidden = false;
  modal.querySelector('input').focus();
  return new Promise((resolve) => {
    const close = (val) => { modal.hidden = true; scrim.hidden = true; modal.onsubmit = null; scrim.onclick = null; resolve(val); };
    scrim.onclick = () => close(null);
    modal.onsubmit = (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(modal));
      const name = (f.name || '').trim(), phone = (f.phone || '').trim(), table = (f.table || '').trim();
      const err = modal.querySelector('.modal__err');
      if (!name) return void (err.textContent = 'Nama wajib diisi.');
      if (!/^\+?[0-9\-\s]{8,16}$/.test(phone)) return void (err.textContent = 'Nomor telepon tidak valid.');
      if (needTable && !table) return void (err.textContent = 'Nomor meja wajib diisi.');
      close({ name, phone, table });
    };
  });
}
