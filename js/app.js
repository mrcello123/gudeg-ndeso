import { icons } from './icons.js';
import { store } from './store.js';
import { $ } from './ui.js';
import { home } from './views/home.js';
import { menu } from './views/menu.js';
import { packageDetail, itemDetail } from './views/detail.js';
import { cart } from './views/cart.js';
import { order } from './views/order.js';
import { pay } from './views/pay.js';

const routes = [
  [/^\/?$/, home],
  [/^\/menu\/([\w-]+)$/, menu, ['service']],
  [/^\/package\/([\w-]+)$/, packageDetail, ['id']],
  [/^\/item\/([\w-]+)$/, itemDetail, ['id']],
  [/^\/cart$/, cart],
  [/^\/order\/([\w-]+)$/, order, ['id']],
  [/^\/pay\/(qris|bca)\/([\w-]+)$/, pay, ['method', 'id']],
];

let cleanup = null, token = 0;

async function render() {
  const path = location.hash.replace(/^#/, '') || '/';
  const my = ++token;
  if (cleanup) { cleanup(); cleanup = null; }
  closeDrawer();

  const hit = routes.map(([re, fn, keys = []]) => { const m = path.match(re); return m && { fn, params: Object.fromEntries(keys.map((k, i) => [k, m[i + 1]])) }; }).find(Boolean);
  const old = $('#view');
  const fresh = old.cloneNode(false);   // drops listeners attached by the previous view
  old.replaceWith(fresh);
  if (!hit) { fresh.innerHTML = '<p class="state-msg">Halaman tidak ditemukan.<br><a href="#/">Kembali ke beranda</a></p>'; return; }

  fresh.innerHTML = '<div class="skeleton"></div>';
  try {
    const out = await hit.fn(fresh, hit.params);
    if (my !== token) { if (typeof out === 'function') out(); return; }   // user navigated away meanwhile
    cleanup = typeof out === 'function' ? out : null;
  } catch (err) {
    console.error(err);
    fresh.innerHTML = '<p class="state-msg">Terjadi kesalahan saat memuat halaman.</p>';
  }
  window.scrollTo(0, 0);
}

/* Header + drawer */
$('#menu-icon').innerHTML = icons.menu;
$('#cart-icon').innerHTML = icons.cart;
const badge = $('#badge');
const syncBadge = () => { const n = store.count(); badge.textContent = n; badge.hidden = n === 0; };
store.subscribe(syncBadge); syncBadge();

const drawer = $('#drawer'), scrim = $('#scrim'), menuBtn = $('#menu-btn');
function openDrawer() {
  const last = localStorage.getItem('gudeg.lastOrder');
  $('#drawer-last').hidden = !last;
  if (last) $('#drawer-last').href = `#/order/${last}`;
  drawer.hidden = false; scrim.hidden = false; scrim.onclick = closeDrawer; menuBtn.setAttribute('aria-expanded', 'true');
}
function closeDrawer() { drawer.hidden = true; if (!$('#modal').hidden) return; scrim.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => (drawer.hidden ? openDrawer() : closeDrawer()));
drawer.addEventListener('click', (e) => { if (e.target.closest('a')) closeDrawer(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

window.addEventListener('hashchange', render);
render();
