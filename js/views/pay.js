import { getOrder, subscribeOrder, demoMarkPaid, isLive } from '../data.js';
import { PAYMENT } from '../config.js';
import { rupiah, esc, hhmmss } from '../ui.js';

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
        // Placeholder QR. Replace with the QRIS payload/image returned by your payment provider.
        ? '<img class="pay__qr" src="assets/qris-placeholder.svg" alt="Kode QRIS">'
        : `<div class="pay__bank">Bank BCA<b>${esc(PAYMENT.bca.account)}</b>a.n. ${esc(PAYMENT.bca.holder)}<br>Nominal: <strong>${rupiah(o.total)}</strong></div>`}
      <p class="pay__timer" id="t">${left()}</p>
      ${isLive ? '' : '<button class="pay__dev" id="dev">Simulasi: tandai sudah dibayar (demo)</button>'}
    </section>`;

  const t = root.querySelector('#t');
  const timer = setInterval(() => { t.textContent = left(); }, 1000);
  const go = () => { location.hash = `#/order/${id}`; };
  const stop = subscribeOrder(id, (cur) => { if (cur.status === 'paid') go(); });
  root.addEventListener('click', (e) => { if (e.target.closest('#dev')) { demoMarkPaid(id); go(); } });
  return () => { clearInterval(timer); stop(); };
}
