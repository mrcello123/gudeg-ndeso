// Data layer. Uses Supabase when SUPABASE_URL / SUPABASE_ANON_KEY are set in config.js,
// otherwise falls back to built-in demo data stored in localStorage.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SCHEMA, PAYMENT, PICKUP_ESTIMATE_MINUTES, DEFAULT_LOW_STOCK } from './config.js';

export const isLive = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/* ------------------------------------------------------------------ demo data */
const IMG = (n) => `assets/${n}.svg`;
const DEMO_ITEMS = [
  { id: 'nasi-putih', stock: 40, name: 'Nasi Putih', price: 5000, category: 'food', image: IMG('nasi-putih'), description: 'Nasi putih hangat sebagai pendamping lauk.' },
  { id: 'tempe-bacem', stock: 25, name: 'Tempe Bacem', price: 4000, category: 'food', image: IMG('tempe-bacem'), description: 'Tempe bacem adalah olahan tradisional khas Jawa (terutama Yogyakarta, Jawa Tengah, dan Jawa Timur) berupa tempe yang dimasak dengan bumbu manis dan gurih hingga meresap.' },
  { id: 'gudeg', stock: 30, name: 'Gudeg', price: 8000, category: 'food', image: IMG('gudeg'), description: 'Gudeg nangka muda yang dimasak perlahan dengan santan dan gula jawa hingga manis gurih.' },
  { id: 'krecek', stock: 15, name: 'Krecek', price: 7000, category: 'food', image: IMG('krecek'), description: 'Sambal goreng krecek pedas gurih, pelengkap khas gudeg.' },
  { id: 'tahu-bacem', stock: 25, name: 'Tahu Bacem', price: 4000, category: 'food', image: IMG('tahu-bacem'), description: 'Tahu yang dimasak dengan bumbu bacem manis gurih.' },
  // Drinks are not in the Figma frames: demo content only.
  { id: 'es-teh', stock: 50, name: 'Es Teh', price: 4000, category: 'drink', image: IMG('es-teh'), description: 'Teh manis dingin.' },
  { id: 'teh-hangat', stock: 40, name: 'Teh Hangat', price: 3000, category: 'drink', image: IMG('teh-hangat'), description: 'Teh manis hangat.' },
  { id: 'es-jeruk', stock: 3, name: 'Es Jeruk', price: 5000, category: 'drink', image: IMG('es-jeruk'), description: 'Jeruk peras segar dengan es.' },
];
const DEMO_PACKAGE = {
  id: 'gudeg-komplit', name: 'Gudeg Komplit (Kustomisasi)', price: 0, category: 'package', image: IMG('gudeg-komplit'),
  description: '', components: [['nasi-putih', 1], ['tempe-bacem', 2], ['tahu-bacem', 1], ['gudeg', 1]],
};

/* ------------------------------------------------------------------ helpers */
let sb = null;
async function client() {
  if (sb) return sb;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb;
}
export { client as getClient };
const S = SCHEMA;
const ms = (v) => (v ? new Date(v).getTime() : null);
const iso = (t) => new Date(t).toISOString();

let menuCache = null, menuAt = 0;
const LS_STOCK = 'gudeg.stock';   // demo mode: { [id]: { stock, available } } overrides
const loadStock = () => JSON.parse(localStorage.getItem(LS_STOCK) || '{}');
const LS_CUSTOM = 'gudeg.custom';   // demo mode: menu items added by the admin
const loadCustom = () => JSON.parse(localStorage.getItem(LS_CUSTOM) || '[]');
const demoItems = () => { const o = loadStock(); return [...DEMO_ITEMS, ...loadCustom()].map((i) => ({ ...i, low: DEFAULT_LOW_STOCK, available: true, ...(o[i.id] || {}) })); };

/** 'off' | 'untracked' | 'out' | 'low' | 'ok' */
export function stockState(i) {
  if (i.available === false) return 'off';
  if (i.stock == null) return 'untracked';
  if (i.stock <= 0) return 'out';
  return i.stock <= (i.low ?? DEFAULT_LOW_STOCK) ? 'low' : 'ok';
}
const stockError = (name) => Object.assign(new Error(`Stok ${name} tidak cukup`), { code: 'INSUFFICIENT_STOCK', item: name });

function normRow(r) {
  const c = S.menuItems.cols, v = S.menuItems.categoryValues;
  const num = (x) => (x == null ? null : Number(x));
  return {
    id: String(r[c.id]), name: r[c.name], price: Number(r[c.price]), image: r[c.image] || '', description: r[c.description] || '',
    category: r[c.category] === v.package ? 'package' : r[c.category] === v.drink ? 'drink' : 'food',
    stock: num(r[c.stock]), low: num(r[c.lowStock]) ?? DEFAULT_LOW_STOCK, available: r[c.available] !== false,
  };
}

function buildMenu(items, pkgs, comps) {
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const packages = pkgs.map((p) => ({ ...p, components: comps(p.id).map(([id, qty]) => ({ ...byId[id], qty })).filter((c) => c.id) }));
  packages.forEach((p) => { p.price = p.components.reduce((s, c) => s + c.price * c.qty, 0); });
  return {
    packages,
    foods: items.filter((i) => i.category === 'food'),
    drinks: items.filter((i) => i.category === 'drink'),
    index: { ...byId, ...Object.fromEntries(packages.map((p) => [p.id, p])) },
  };
}

/* ------------------------------------------------------------------ menu */
export async function getMenu({ fresh = false } = {}) {
  if (menuCache && !fresh && Date.now() - menuAt < 15000) return menuCache;   // stock changes, so don't cache for long
  if (!isLive) {
    const pkg = DEMO_PACKAGE;
    menuCache = buildMenu(demoItems().filter((i) => i.available), [pkg], () => pkg.components);
  } else {
    const db = await client();
    const m = S.menuItems, c = m.cols;
    const { data: rows, error } = await db.from(m.table).select('*').eq(c.available, true);
    if (error) throw error;
    const all = rows.map(normRow);
    const pc = S.packageComponents, pcc = pc.cols;
    const { data: compRows, error: e2 } = await db.from(pc.table).select('*');
    if (e2) throw e2;
    menuCache = buildMenu(all.filter((i) => i.category !== 'package'), all.filter((i) => i.category === 'package'),
      (pid) => compRows.filter((r) => String(r[pcc.packageId]) === pid).map((r) => [String(r[pcc.itemId]), Number(r[pcc.defaultQty]) || 1]));
  }
  menuAt = Date.now();
  return menuCache;
}

/* ------------------------------------------------------------------ admin: stock */
/** All food + drink rows, including hidden ones. Requires an admin session in live mode (RLS). */
export async function listStock() {
  let rows;
  if (!isLive) rows = demoItems();
  else {
    const db = await client(); const m = S.menuItems;
    const { data, error } = await db.from(m.table).select('*');
    if (error) throw error;
    rows = data.map(normRow);
  }
  return rows.filter((i) => i.category !== 'package').sort((a, b) => a.name.localeCompare(b.name));
}

/** Admin: create a new food/drink. stock = null means "not tracked" (unlimited). Returns the created item. */
export async function addItem({ name, price, category, image, description, stock }) {
  name = String(name || '').trim(); description = String(description || '').trim(); image = String(image || '').trim();
  if (name.length < 2 || name.length > 60) throw new Error('Nama menu 2–60 karakter.');
  if (!Number.isInteger(price) || price < 0 || price > 10_000_000) throw new Error('Harga harus berupa angka bulat.');
  if (!['food', 'drink'].includes(category)) throw new Error('Pilih kategori.');
  if (stock != null && (!Number.isInteger(stock) || stock < 0)) throw new Error('Stok harus angka 0 atau lebih.');
  if (image && !/^(https:\/\/|assets\/)/.test(image)) throw new Error('Link gambar harus diawali https:// atau assets/');
  image = image || (category === 'drink' ? 'assets/es-teh.svg' : 'assets/nasi-putih.svg');
  menuCache = null;

  if (!isLive) {
    const all = demoItems();
    if (all.some((i) => i.name.toLowerCase() === name.toLowerCase())) throw new Error('Nama menu sudah ada.');
    const item = { id: `custom-${Date.now().toString(36)}`, name, price, category, image, description, stock: stock ?? null };
    localStorage.setItem(LS_CUSTOM, JSON.stringify([...loadCustom(), item]));
    return { ...item, low: DEFAULT_LOW_STOCK, available: true };
  }
  const db = await client(), m = S.menuItems, c = m.cols;
  const { data, error } = await db.from(m.table).insert({
    [c.name]: name, [c.price]: price, [c.category]: m.categoryValues[category], [c.image]: image,
    [c.description]: description || null, [c.stock]: stock, [c.available]: true,
  }).select().single();
  if (error) throw new Error(error.code === '42501' ? 'Tidak diizinkan (bukan admin?)' : error.message);
  return normRow(data);
}

/** patch: { stock?: number|null, available?: boolean } */
export async function updateItem(id, patch) {
  menuCache = null;
  if (!isLive) {
    const cur = demoItems().find((i) => i.id === id); if (!cur) return;
    const o = loadStock(); o[id] = { stock: cur.stock, available: cur.available, ...patch };
    localStorage.setItem(LS_STOCK, JSON.stringify(o));
    return;
  }
  const db = await client(), m = S.menuItems, c = m.cols, row = {};
  if ('stock' in patch) row[c.stock] = patch.stock;
  if ('available' in patch) row[c.available] = patch.available;
  const { data, error } = await db.from(m.table).update(row).eq(c.id, id).select();
  if (error) throw error;
  if (!data.length) throw new Error('Tidak diizinkan (bukan admin?)');   // RLS filters silently
}

/** Relative change (+/-). Atomic in Postgres so it never overwrites sales that happened meanwhile. Returns the new stock. */
export async function adjustStock(id, delta) {
  if (!isLive) {
    const cur = demoItems().find((i) => i.id === id);
    const next = Math.max(0, (cur?.stock ?? 0) + delta);
    await updateItem(id, { stock: next });
    return next;
  }
  const db = await client(), m = S.menuItems, c = m.cols;
  const { data, error } = await db.rpc(S.rpc.adjustStock, { p_id: id, p_delta: delta });
  if (error?.code === 'PGRST202') {   // function not installed: read-modify-write fallback
    const { data: r, error: e2 } = await db.from(m.table).select(c.stock).eq(c.id, id).single();
    if (e2) throw e2;
    const next = Math.max(0, (r[c.stock] ?? 0) + delta);
    await updateItem(id, { stock: next });
    return next;
  }
  if (error) throw error;
  menuCache = null;
  return data;
}

/** Calls cb(items) when stock changes (Realtime in live mode, plus polling; other tabs in demo mode). */
export function subscribeStock(cb) {
  let stop = false, channel = null;
  const tick = async () => { if (!stop) { try { cb(await listStock()); } catch { /* keep polling */ } } };
  const timer = setInterval(tick, isLive ? 6000 : 2500);
  const onStorage = (e) => { if (e.key === LS_STOCK) tick(); };
  window.addEventListener('storage', onStorage);
  if (isLive) client().then((db) => {
    if (stop) return;
    channel = db.channel('stock').on('postgres_changes', { event: '*', schema: 'public', table: S.menuItems.table }, tick).subscribe();
  });
  return () => { stop = true; clearInterval(timer); window.removeEventListener('storage', onStorage); if (channel) sb.removeChannel(channel); };
}

/* ------------------------------------------------------------------ orders */
const LS = 'gudeg.orders';
const loadOrders = () => JSON.parse(localStorage.getItem(LS) || '{}');
const saveOrders = (o) => localStorage.setItem(LS, JSON.stringify(o));

export async function createOrder({ customer, note, lines }) {
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const now = Date.now();
  const code = `OD-${String(now).slice(-6)}`;
  const expiresAt = now + PAYMENT.holdMinutes * 60000;

  if (!isLive) {
    // Check, then reserve stock (what the place_order Postgres function does in live mode).
    const need = new Map();
    for (const l of lines) {
      if (l.components) l.components.forEach((c) => need.set(c.id, (need.get(c.id) || 0) + c.qty * l.qty));
      else need.set(l.itemId, (need.get(l.itemId) || 0) + l.qty);
    }
    const items = demoItems(), over = loadStock();
    for (const [id, q] of need) { const it = items.find((i) => i.id === id); if (it && it.stock != null && it.stock < q) throw stockError(it.name); }
    for (const [id, q] of need) { const it = items.find((i) => i.id === id); if (it && it.stock != null) over[id] = { stock: it.stock - q, available: it.available }; }
    localStorage.setItem(LS_STOCK, JSON.stringify(over));
    menuCache = null;

    const order = {
      id: crypto.randomUUID(), code, name: customer.name, phone: customer.phone, table: customer.table || null, note: note || '',
      status: 'unpaid', method: null, total, expiresAt, readyAt: null, createdAt: now,
      items: lines.map((l) => ({ itemId: l.itemId, name: l.name, service: l.service, qty: l.qty, unitPrice: l.price, image: l.image, components: l.components || null })),
    };
    const all = loadOrders(); all[order.id] = order; saveOrders(all);
    return order;
  }

  const db = await client();
  // One atomic Postgres function: checks + reserves stock, prices every line from menu_items, inserts the order + items.
  const { data: newId, error } = await db.rpc(S.rpc.placeOrder, {
    p_name: customer.name, p_phone: customer.phone, p_table: customer.table || null, p_note: note || null,
    p_code: code, p_hold_minutes: PAYMENT.holdMinutes,
    p_items: lines.map((l) => ({ itemId: l.itemId, name: l.name, service: l.service, qty: l.qty, components: l.components || null })),
  });
  if (error) {
    const m = /INSUFFICIENT_STOCK:(.*)/.exec(error.message || '');
    throw m ? stockError(m[1].trim()) : error;
  }
  menuCache = null;
  return getOrder(newId);
}

function mapOrder(row, items, img) {
  const o = S.orders, oc = o.cols, ic = S.orderItems.cols;
  return {
    id: row[oc.id], code: row[oc.code], name: row[oc.name], phone: row[oc.phone], table: row[oc.table], note: row[oc.note] || '',
    status: row[oc.status] === o.statusValues.paid ? 'paid' : 'unpaid', method: row[oc.method], total: Number(row[oc.total]),
    expiresAt: ms(row[oc.expiresAt]), readyAt: ms(row[oc.readyAt]), createdAt: ms(row[oc.createdAt]),
    items: items.map((r) => ({ itemId: String(r[ic.itemId]), name: r[ic.name], service: r[ic.service], qty: r[ic.qty], unitPrice: Number(r[ic.unitPrice]), image: img(String(r[ic.itemId])), components: r[ic.components] })),
  };
}

export async function getOrder(id) {
  const menu = await getMenu();
  const img = (itemId) => menu.index[itemId]?.image || '';
  if (!isLive) {
    const o = loadOrders()[id];
    return o ? { ...o, items: o.items.map((it) => ({ ...it, image: it.image || img(it.itemId) })) } : null;
  }
  const db = await client();
  const o = S.orders, oc = o.cols, ic = S.orderItems.cols;
  const { data, error } = await db.rpc(S.rpc.getOrder, { p_id: id });   // customers have no direct table access
  if (error) throw error;
  if (!data) return null;
  return mapOrder(data.order, data.items, img);
}

export async function setPaymentMethod(id, method) {
  if (!isLive) { const all = loadOrders(); if (all[id]) { all[id].method = method; saveOrders(all); } return; }
  const db = await client();
  const { error } = await db.rpc(S.rpc.setMethod, { p_id: id, p_method: method });
  if (error) throw error;
}

/** Calls cb(order) whenever the order changes. Returns an unsubscribe function. */
export function subscribeOrder(id, cb) {
  // Polling: with no direct table access for customers, Realtime has nothing to deliver to them.
  let stop = false;
  const tick = async () => { if (!stop) { try { const o = await getOrder(id); if (o) cb(o); } catch { /* keep polling */ } } };
  const timer = setInterval(tick, isLive ? 5000 : 1500);
  return () => { stop = true; clearInterval(timer); };
}

/* ------------------------------------------------------------------ admin: order history */
/** Newest first, with their items. Requires an admin session in live mode (RLS). */
export async function listOrders({ limit = 300 } = {}) {
  const menu = await getMenu();
  const img = (itemId) => menu.index[itemId]?.image || '';
  if (!isLive) {
    return Object.values(loadOrders()).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
      .map((o) => ({ ...o, items: o.items.map((it) => ({ ...it, image: it.image || img(it.itemId) })) }));
  }
  const db = await client(), o = S.orders, i = S.orderItems;
  const { data, error } = await db.from(o.table).select(`*, ${i.table}(*)`).order(o.cols.createdAt, { ascending: false }).limit(limit);
  if (error) throw error;
  return data.map((r) => mapOrder(r, r[i.table] || [], img));
}

/** Calls cb(orders) when orders change (Realtime in live mode, plus polling; other tabs in demo mode). */
export function subscribeOrders(cb) {
  let stop = false, channel = null;
  const tick = async () => { if (!stop) { try { cb(await listOrders()); } catch { /* keep polling */ } } };
  const timer = setInterval(tick, isLive ? 8000 : 2500);
  const onStorage = (e) => { if (e.key === LS) tick(); };
  window.addEventListener('storage', onStorage);
  if (isLive) client().then((db) => {
    if (stop) return;
    channel = db.channel('orders-admin').on('postgres_changes', { event: '*', schema: 'public', table: S.orders.table }, tick).subscribe();
  });
  return () => { stop = true; clearInterval(timer); window.removeEventListener('storage', onStorage); if (channel) sb.removeChannel(channel); };
}

/** Demo only: marks an order as paid (in production your payment webhook does this). */
export function demoMarkPaid(id) {
  const all = loadOrders();
  if (all[id]) { all[id].status = 'paid'; all[id].readyAt = Date.now() + PICKUP_ESTIMATE_MINUTES * 60000; saveOrders(all); }
}
if (!isLive) window.gudegDev = { pay: demoMarkPaid };
