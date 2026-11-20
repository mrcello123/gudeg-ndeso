import { icons } from '../icons.js';
import { getOrder, setPaymentMethod, subscribeOrder } from '../data.js';
import { rupiah, esc, mmss } from '../ui.js';
import { colsHeader, lineHtml } from './lines.js';

export async function order(root, { id }) {
  const o0 = await getOrder(id);
  if (!o0) { root.innerHTML = '<p class="state-msg">Pesanan tidak ditemukan.</p>'; return; }
  let timer;

  const draw = (o) => {
    clearInterval(timer);
    const paid = o.status === 'paid';
    const hasDine = o.items.some((i) => i.service === 'dine-in');
    const hasTake = o.items.some((i) => i.service === 'take-away');

    const stats = paid && (hasDine || hasTake) ? `
      <div class="stats">
        ${hasDine ? `<div class="stat">${icons.dineIn.replace('<svg', '<svg style="left:17px;top:12px;width:47px;height:47px"')}
          <span class="stat__label">Meja Makan</span><span class="stat__big">${esc(o.table || '-')}</span></div>` : '<div></div>'}
        ${hasTake ? `<div class="stat">${icons.takeAway.replace('<svg', '<svg style="left:23px;top:12px;width:33px;height:33px"')}
          <span class="stat__label">Take Away</span><span class="stat__big stat__big--time" id="eta">${mmss((o.readyAt || Date.now()) - Date.now())}</span>
          <span class="stat__badge">Sedang diproses</span><span class="stat__est">Estimasi Pengambilan Pesanan Kamu</span></div>` : ''}
      </div>` : '';

    root.innerHTML = `
      <div class="pill"><span>Order Detail</span></div>
      ${stats}
      <div class="info ${stats ? 'info--stats' : ''}">
        No. Pesanan: ${esc(o.code)}<br>Nama: ${esc(o.name)}<br>No Telp: ${esc(o.phone)}<br>
        Status: <span class="${paid ? 'status--paid' : 'status--unpaid'}">${paid ? 'SUDAH BAYAR' : 'BELUM DIBAYAR'}</span>
      </div>
      <div class="note-view"><p>Catatan:</p><div>${esc(o.note || 'Tidak ada catatan')}</div></div>
      <div class="order-lines">${colsHeader()}${o.items.map((i) => lineHtml(i)).join('')}</div>
      <hr class="total-rule">
      <div class="total"><span>Grand Total</span><b>${rupiah(o.total)}</b></div>
      ${paid ? '' : `
        <h2 class="pay-title">Pilih Metode Pembayaran</h2>
        <div class="pay-btns">
          <button class="btn" data-method="qris">QRIS</button>
          <button class="btn" data-method="bca">Transfer BCA</button>
        </div>`}`;

    const eta = root.querySelector('#eta');
    if (eta) timer = setInterval(() => { eta.textContent = mmss((o.readyAt || Date.now()) - Date.now()); }, 1000);
  };

  draw(o0);
  let status = o0.status;
  const stop = subscribeOrder(id, (o) => { if (o.status !== status) { status = o.status; draw(o); } });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-method]');
    if (!b) return;
    await setPaymentMethod(id, b.dataset.method);
    location.hash = `#/pay/${b.dataset.method}/${id}`;
  });
  return () => { stop(); clearInterval(timer); };
}
