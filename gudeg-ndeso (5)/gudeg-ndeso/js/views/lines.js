// Shared markup for cart / order lines.
import { icons, SERVICES } from '../icons.js';
import { rupiah, rupiahDot, esc } from '../ui.js';

export const colsHeader = () => '<div class="cart-cols"><span>Produk</span><span>Jumlah</span><span>Sub Total</span></div>';

/** opts.check: undefined = no checkbox column content, boolean = render a checkbox with that state. */
export function lineHtml(l, opts = {}) {
  const komplit = Array.isArray(l.components) && l.components.length > 0;
  const sv = SERVICES[l.service] || SERVICES['dine-in'];
  const price = l.price ?? l.unitPrice;
  const check = opts.check === undefined ? '<span></span>'
    : `<button class="check" role="checkbox" aria-checked="${opts.check}" data-key="${esc(l.key)}" aria-label="Pilih ${esc(l.name)}">${icons.check}</button>`;
  const name = komplit
    ? `<div class="line__name line__name--lg">${esc(l.name)}</div>`
    : `<div class="line__name">${esc(l.name)}<br>${rupiah(price)}</div>`;
  return `
    <div class="line ${komplit ? 'line--komplit' : ''}">
      <div class="line__row">
        ${check}
        <div class="thumb"><img src="${esc(l.image)}" alt=""></div>
        ${name}
        <div class="line__qty">${l.qty} Pcs</div>
        <div class="line__sub">${rupiah(price * l.qty)}</div>
      </div>
      ${komplit ? `<div class="line__parts">${l.components.map((c) => `
        <div class="line__part"><span>${esc(c.name)}</span><span>${c.qty} Pcs</span><span>${rupiahDot(c.price * c.qty)}</span></div>`).join('')}</div>` : ''}
      <div class="svc-tag">${icons[sv.icon]}<span>${sv.label}</span></div>
    </div>`;
}
