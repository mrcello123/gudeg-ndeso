import { getOrder, subscribeOrder, demoPayEnabled, demoPay } from '../data.js';
import { PAYMENT } from '../config.js';
import { rupiah, esc, hhmmss, toast } from '../ui.js';

export async function pay(root, { method, id }) {
  const o = await getOrder(id);
  if (!o) { root.innerHTML = '<p class="state-msg">Pesanan tidak ditemukan.</p>'; return; }
  const isQris = method !== 'bca';
  const left = () => hhmmss((o.expiresAt || Date.now()) - Date.now());

  root.innerHTML = `
    <div class="pill"><span>${isQris ? 'QRIS' : 'Transfer BCA'}</span></div>
    <section class="pay">
      <h2>${isQris ? 'Scan Me' : 'Transfer ke'}</h2>
      ${isQris
        // Change the file name here if your real QRIS image is not assets/qris-placeholder.svg
        ? `<img class="pay__qr" src="assets/qris-placeholder.svg" alt="Kode QRIS"><div class="pay__bank">Nominal: <strong>${rupiah(o.total)}</strong><br>Kode pesanan: <strong>${esc(o.code)}</strong></div>`
        : `<div class="pay__bank">Bank BCA<b>${esc(PAYMENT.bca.account)}</b>a.n. ${esc(PAYMENT.bca.holder)}<br>Nominal: <strong>${rupiah(o.total)}</strong></div>`}
      <p class="pay__timer" id="t">${left()}</p>
    </section>`;

  const t = root.querySelector('#t');
  const timer = setInterval(() => { t.textContent = left(); }, 1000);
  const go = () => { location.hash = `#/order/${id}`; };
  const stop = subscribeOrder(id, (cur) => { if (cur.status === 'paid') go(); });

  // "Click to pay" demo button: shown only while demo payments are switched on (always in demo mode).
  let gone = false;
  demoPayEnabled().then((on) => {
    if (!on || gone) return;
    root.querySelector('.pay').insertAdjacentHTML('beforeend', '<button class="pay__dev" id="dev">Simulasi: tandai sudah dibayar (demo)</button>');
  }).catch(() => {});
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('#dev'); if (!b) return;
    b.disabled = true;
    try { await demoPay(id); go(); } catch (x) { console.error(x); toast('Simulasi pembayaran dimatikan.'); b.disabled = false; }
  });
  return () => { gone = true; clearInterval(timer); stop(); };
}
