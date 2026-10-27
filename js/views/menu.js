import { icons, SERVICES } from '../icons.js';
import { getMenu } from '../data.js';
import { store } from '../store.js';
import { rupiah, esc, toast } from '../ui.js';

export async function menu(root, { service }) {
  if (!SERVICES[service]) service = 'dine-in';
  store.setService(service);
  const m = await getMenu();
  const sv = SERVICES[service];
  const card = (i) => `
    <article class="food-card">
      <div class="food-card__img" data-open="${esc(i.id)}"><img src="${esc(i.image)}" alt="${esc(i.name)}" loading="lazy"></div>
      <h3 class="food-card__name" data-open="${esc(i.id)}">${esc(i.name)}</h3>
      <p class="food-card__price">${rupiah(i.price)}</p>
      <button class="mini-btn" data-add="${esc(i.id)}">Pesan</button>
    </article>`;
  let tab = 'food';

  root.innerHTML = `
    <div class="pill">${icons[sv.icon]}<span>${sv.label}</span></div>
    <h2 class="section-title">Menu Paket</h2>
    ${m.packages.map((p) => `
      <article class="package-card">
        <div class="package-card__img" data-package="${esc(p.id)}"><img src="${esc(p.image)}" alt="${esc(p.name)}"></div>
        <div class="package-card__body">
          <h3 class="package-card__title">${esc(p.name)}</h3>
          <p class="package-card__unit">/ Porsi</p>
          <button class="btn" data-package="${esc(p.id)}">Pesan</button>
        </div>
      </article>`).join('')}
    <h2 class="section-title section-title--alacarte">Menu Ala Carte</h2>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-tab="food" aria-selected="true">Food</button>${icons.chevron}
      <button class="tab" role="tab" data-tab="drink" aria-selected="false">Drinks</button>
    </div>
    <div class="food-grid" id="grid"></div>`;

  const grid = root.querySelector('#grid');
  const draw = () => {
    const list = tab === 'food' ? m.foods : m.drinks;
    grid.innerHTML = list.length ? list.map(card).join('') : '<p class="state-msg" style="grid-column:1/-1">Belum ada menu.</p>';
  };
  draw();

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) {
      tab = t.dataset.tab;
      root.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b === t)));
      return draw();
    }
    const pk = e.target.closest('[data-package]');
    if (pk) { location.hash = `#/package/${pk.dataset.package}`; return; }
    const open = e.target.closest('[data-open]');
    if (open) { location.hash = `#/item/${open.dataset.open}`; return; }
    const add = e.target.closest('[data-add]');
    if (add) {
      const item = m.index[add.dataset.add];
      store.addItem(item, 1);
      toast(`${item.name} ditambahkan ke keranjang`);
    }
  });
}
