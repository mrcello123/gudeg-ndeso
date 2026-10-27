import { SERVICES } from '../icons.js';
import { store } from '../store.js';
import { createOrder } from '../data.js';
import { rupiah, esc, toast, askCustomer } from '../ui.js';
import { icons } from '../icons.js';
import { colsHeader, lineHtml } from './lines.js';

export function cart(root) {
  const { lines, note } = store.state;
  const sv = (k) => lines.filter((l) => l.service === k);

  root.innerHTML = `
    <div class="pill">${icons.cart.replace('<svg', '<svg class="pill__cart"')}<span>Keranjang</span></div>
    ${lines.length === 0 ? '<p class="state-msg">Keranjang masih kosong.<br><a href="#/" style="color:var(--color-brown-400)">Pilih menu</a></p>' : `
    ${Object.keys(SERVICES).filter((k) => sv(k).length).map((k) => `
      <section class="cart-section">
        <div class="cart-bar">${SERVICES[k].short}</div>
        ${colsHeader()}
        ${sv(k).map((l) => lineHtml(l, { check: l.selected })).join('')}
      </section>`).join('')}
    <hr class="total-rule">
    <div class="total"><span>Grand Total</span><b id="total">${rupiah(store.total())}</b></div>
    <div class="note-box">
      <label for="note">Tambahkan Catatan (Opsional)</label>
      <input class="note-input" id="note" placeholder="Cth : Sambalnya dibanyakin ya" value="${esc(note)}">
    </div>
    <div class="btn-wrap"><button class="btn" id="co">Checkout</button></div>`}`;

  root.addEventListener('click', async (e) => {
    const c = e.target.closest('.check[data-key]');
    if (c) {
      store.toggle(c.dataset.key);
      c.setAttribute('aria-checked', String(!(c.getAttribute('aria-checked') === 'true')));
      root.querySelector('#total').textContent = rupiah(store.total());
      return;
    }
    if (!e.target.closest('#co')) return;

    const chosen = store.selected();
    if (!chosen.length) return toast('Pilih minimal satu menu');
    const btn = e.target.closest('#co');
    const needTable = chosen.some((l) => l.service === 'dine-in');
    const customer = await askCustomer(store.state.customer, needTable);
    if (!customer) return;
    store.setCustomer(customer);
    btn.disabled = true;
    try {
      const order = await createOrder({ customer, note: store.state.note, lines: chosen });
      localStorage.setItem('gudeg.lastOrder', order.id);
      store.removeSelected();
      location.hash = `#/order/${order.id}`;
    } catch (err) {
      console.error(err);
      toast('Gagal membuat pesanan. Coba lagi.');
      btn.disabled = false;
    }
  });
  root.addEventListener('input', (e) => { if (e.target.id === 'note') store.setNote(e.target.value); });
}
