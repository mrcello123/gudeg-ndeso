import { icons, SERVICES } from '../icons.js';
import { getMenu } from '../data.js';
import { store } from '../store.js';
import { rupiah, esc } from '../ui.js';

const heroPill = () => {
  const sv = SERVICES[store.state.service];
  return `<div class="pill">${icons[sv.icon]}<span>${sv.label}</span></div>`;
};
const notFound = (root) => { root.innerHTML = '<p class="state-msg">Menu tidak ditemukan.</p>'; };

/* Gudeg Komplit (customisable package) */
export async function packageDetail(root, { id }) {
  const m = await getMenu();
  const pkg = m.packages.find((p) => p.id === id);
  if (!pkg) return notFound(root);
  const comps = pkg.components.map((c) => ({ ...c }));
  const price = () => comps.reduce((s, c) => s + c.price * c.qty, 0);

  root.innerHTML = `
    <section class="detail__hero">
      <div class="detail__bg"></div>
      ${heroPill()}
      <img class="detail__dish" src="${esc(pkg.image)}" alt="${esc(pkg.name)}">
      <button class="btn detail__checkout" id="co">Checkout</button>
    </section>
    <section class="sheet">
      <h1 class="sheet__title">${esc(pkg.name)} <small>/ Porsi</small></h1>
      <p class="sheet__price" id="price" style="margin-top:44px"></p>
      <hr class="sheet__rule" style="margin-top:23px">
      <h2 class="mods__title">Modifikasi</h2>
      ${comps.map((c, i) => `
        <div class="mod">
          <div class="mod__img"><img src="${esc(c.image)}" alt=""></div>
          <div class="mod__info"><b>${esc(c.name)}</b>${rupiah(c.price)}</div>
          <div class="stepper" data-i="${i}">
            <button class="mini-btn" data-d="-1" aria-label="Kurangi ${esc(c.name)}">${icons.minus}</button>
            <output>${c.qty}</output>
            <button class="mini-btn" data-d="1" aria-label="Tambah ${esc(c.name)}">${icons.plus}</button>
          </div>
        </div>`).join('')}
      <div class="sheet__end"></div>
    </section>`;

  const priceEl = root.querySelector('#price');
  const co = root.querySelector('#co');
  const sync = () => { priceEl.textContent = rupiah(price()); co.disabled = price() === 0; };
  sync();

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (b) {
      const st = b.closest('.stepper'), c = comps[+st.dataset.i];
      c.qty = Math.max(0, c.qty + +b.dataset.d);
      st.querySelector('output').textContent = c.qty;
      return sync();
    }
    if (e.target.closest('#co')) { store.addPackage(pkg, comps); location.hash = '#/cart'; }
  });
}

/* Single ala-carte item */
export async function itemDetail(root, { id }) {
  const m = await getMenu();
  const item = m.index[id];
  if (!item || item.category === 'package') return notFound(root);
  let qty = 1;

  root.innerHTML = `
    <section class="detail__hero detail__hero--alacarte">
      <div class="detail__bg"></div>
      ${heroPill()}
      <img class="detail__dish" src="${esc(item.image)}" alt="${esc(item.name)}">
    </section>
    <section class="sheet">
      <h1 class="sheet__title">${esc(item.name)} <small>/ Porsi</small></h1>
      <p class="sheet__note">Note : Menu ini akan disajikan terpisah</p>
      <p class="sheet__price" id="price"></p>
      <hr class="sheet__rule">
      <p class="sheet__desc">${esc(item.description)}</p>
      <div class="stepper stepper--lg">
        <button class="mini-btn" data-d="-1" aria-label="Kurangi">${icons.minus}</button>
        <output id="qty">1</output>
        <button class="mini-btn" data-d="1" aria-label="Tambah">${icons.plus}</button>
      </div>
      <button class="btn" id="co">Checkout</button>
      <div class="sheet__end"></div>
    </section>`;

  const sync = () => { root.querySelector('#qty').textContent = qty; root.querySelector('#price').textContent = rupiah(item.price * qty); };
  sync();
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (b) { qty = Math.max(1, qty + +b.dataset.d); return sync(); }
    if (e.target.closest('#co')) { store.addItem(item, qty); location.hash = '#/cart'; }
  });
}
