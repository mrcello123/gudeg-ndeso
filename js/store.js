// Cart + session state (localStorage). Lines are grouped by service in the cart screen.
const KEY = 'gudeg.state.v1';
const base = { service: 'dine-in', lines: [], customer: { name: '', phone: '', table: '' }, note: '' };
let state = { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
const listeners = new Set();
const persist = () => { localStorage.setItem(KEY, JSON.stringify(state)); listeners.forEach((fn) => fn(state)); };

export const store = {
  get state() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  setService(s) { state.service = s; persist(); },
  setCustomer(c) { state.customer = { ...state.customer, ...c }; persist(); },
  setNote(n) { state.note = n; localStorage.setItem(KEY, JSON.stringify(state)); },

  addItem(item, qty = 1) {
    const key = `${item.id}:${state.service}`;
    const line = state.lines.find((l) => l.key === key);
    if (line) line.qty += qty;
    else state.lines.push({ key, itemId: item.id, name: item.name, price: item.price, image: item.image, qty, service: state.service, selected: true });
    persist();
  },
  addPackage(pkg, components) {
    const parts = components.filter((c) => c.qty > 0).map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty }));
    state.lines.push({
      key: `${pkg.id}:${Date.now()}`, itemId: pkg.id, name: pkg.name.replace(/\s*\(.*\)/, ''), price: parts.reduce((s, c) => s + c.price * c.qty, 0),
      image: pkg.image, qty: 1, service: state.service, selected: true, components: parts,
    });
    persist();
  },
  toggle(key) { const l = state.lines.find((x) => x.key === key); if (l) { l.selected = !l.selected; persist(); } },
  selected() { return state.lines.filter((l) => l.selected); },
  total() { return this.selected().reduce((s, l) => s + l.price * l.qty, 0); },
  count() { return state.lines.reduce((s, l) => s + l.qty, 0); },
  removeSelected() { state.lines = state.lines.filter((l) => !l.selected); state.note = ''; persist(); },
};
