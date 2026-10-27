// Data layer. Uses Supabase when SUPABASE_URL / SUPABASE_ANON_KEY are set in config.js,
// otherwise falls back to built-in demo data stored in localStorage.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SCHEMA, PAYMENT, PICKUP_ESTIMATE_MINUTES } from './config.js';

export const isLive = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/* ------------------------------------------------------------------ demo data */
const IMG = (n) => `assets/${n}.svg`;
const DEMO_ITEMS = [
  { id: 'nasi-putih', name: 'Nasi Putih', price: 5000, category: 'food', image: IMG('nasi-putih'), description: 'Nasi putih hangat sebagai pendamping lauk.' },
  { id: 'tempe-bacem', name: 'Tempe Bacem', price: 4000, category: 'food', image: IMG('tempe-bacem'), description: 'Tempe bacem adalah olahan tradisional khas Jawa (terutama Yogyakarta, Jawa Tengah, dan Jawa Timur) berupa tempe yang dimasak dengan bumbu manis dan gurih hingga meresap.' },
  { id: 'gudeg', name: 'Gudeg', price: 8000, category: 'food', image: IMG('gudeg'), description: 'Gudeg nangka muda yang dimasak perlahan dengan santan dan gula jawa hingga manis gurih.' },
  { id: 'krecek', name: 'Krecek', price: 7000, category: 'food', image: IMG('krecek'), description: 'Sambal goreng krecek pedas gurih, pelengkap khas gudeg.' },
  { id: 'tahu-bacem', name: 'Tahu Bacem', price: 4000, category: 'food', image: IMG('tahu-bacem'), description: 'Tahu yang dimasak dengan bumbu bacem manis gurih.' },
  // Drinks are not in the Figma frames: demo content only.
  { id: 'es-teh', name: 'Es Teh', price: 4000, category: 'drink', image: IMG('es-teh'), description: 'Teh manis dingin.' },
  { id: 'teh-hangat', name: 'Teh Hangat', price: 3000, category: 'drink', image: IMG('teh-hangat'), description: 'Teh manis hangat.' },
  { id: 'es-jeruk', name: 'Es Jeruk', price: 5000, category: 'drink', image: IMG('es-jeruk'), description: 'Jeruk peras segar dengan es.' },
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
const S = SCHEMA;
const ms = (v) => (v ? new Date(v).getTime() : null);
const iso = (t) => new Date(t).toISOString();

let menuCache = null;
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
export async function getMenu() {
  if (menuCache) return menuCache;
  if (!isLive) {
    const pkg = DEMO_PACKAGE;
    menuCache = buildMenu(DEMO_ITEMS, [pkg], () => pkg.components);
    return menuCache;
  }
  const db = await client();
  const m = S.menuItems, c = m.cols, v = m.categoryValues;
  const { data: rows, error } = await db.from(m.table).select('*').eq(c.available, true);
  if (error) throw error;
  const norm = (r) => ({ id: String(r[c.id]), name: r[c.name], price: Number(r[c.price]), category: r[c.category], image: r[c.image] || '', description: r[c.description] || '' });
  const all = rows.map(norm);
  const items = all.filter((i) => i.category !== v.package).map((i) => ({ ...i, category: i.category === v.drink ? 'drink' : 'food' }));
  const pkgs = all.filter((i) => i.category === v.package).map((i) => ({ ...i, category: 'package' }));
  const pc = S.packageComponents, pcc = pc.cols;
  const { data: compRows, error: e2 } = await db.from(pc.table).select('*');
  if (e2) throw e2;
  menuCache = buildMenu(items, pkgs, (pid) => compRows.filter((r) => String(r[pcc.packageId]) === pid).map((r) => [String(r[pcc.itemId]), Number(r[pcc.defaultQty]) || 1]));
  return menuCache;
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
    const order = {
      id: crypto.randomUUID(), code, name: customer.name, phone: customer.phone, table: customer.table || null, note: note || '',
      status: 'unpaid', method: null, total, expiresAt, readyAt: null, createdAt: now,
      items: lines.map((l) => ({ itemId: l.itemId, name: l.name, service: l.service, qty: l.qty, unitPrice: l.price, image: l.image, components: l.components || null })),
    };
    const all = loadOrders(); all[order.id] = order; saveOrders(all);
    return order;
  }

  const db = await client();
  const o = S.orders, oc = o.cols;
  const { data: row, error } = await db.from(o.table).insert({
    [oc.code]: code, [oc.name]: customer.name, [oc.phone]: customer.phone, [oc.table]: customer.table || null,
    [oc.note]: note || null, [oc.status]: o.statusValues.unpaid, [oc.total]: total, [oc.expiresAt]: iso(expiresAt),
  }).select().single();
  if (error) throw error;
  const i = S.orderItems, ic = i.cols;
  const { error: e2 } = await db.from(i.table).insert(lines.map((l) => ({
    [ic.orderId]: row[oc.id], [ic.itemId]: l.itemId, [ic.name]: l.name, [ic.service]: l.service,
    [ic.qty]: l.qty, [ic.unitPrice]: l.price, [ic.components]: l.components || null,
  })));
  if (e2) { await db.from(o.table).delete().eq(oc.id, row[oc.id]); throw e2; }   // best-effort rollback
  return getOrder(row[oc.id]);
}

export async function getOrder(id) {
  const menu = await getMenu();
  const img = (itemId) => menu.index[itemId]?.image || '';
  if (!isLive) {
    const o = loadOrders()[id];
    return o ? { ...o, items: o.items.map((it) => ({ ...it, image: it.image || img(it.itemId) })) } : null;
  }
  const db = await client();
  const o = S.orders, oc = o.cols, i = S.orderItems, ic = i.cols;
  const { data: row, error } = await db.from(o.table).select('*').eq(oc.id, id).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const { data: items, error: e2 } = await db.from(i.table).select('*').eq(ic.orderId, id);
  if (e2) throw e2;
  return {
    id: row[oc.id], code: row[oc.code], name: row[oc.name], phone: row[oc.phone], table: row[oc.table], note: row[oc.note] || '',
    status: row[oc.status] === o.statusValues.paid ? 'paid' : 'unpaid', method: row[oc.method], total: Number(row[oc.total]),
    expiresAt: ms(row[oc.expiresAt]), readyAt: ms(row[oc.readyAt]), createdAt: ms(row[oc.createdAt]),
    items: items.map((r) => ({ itemId: String(r[ic.itemId]), name: r[ic.name], service: r[ic.service], qty: r[ic.qty], unitPrice: Number(r[ic.unitPrice]), image: img(String(r[ic.itemId])), components: r[ic.components] })),
  };
}

export async function setPaymentMethod(id, method) {
  if (!isLive) { const all = loadOrders(); if (all[id]) { all[id].method = method; saveOrders(all); } return; }
  const db = await client(); const o = S.orders;
  await db.from(o.table).update({ [o.cols.method]: method }).eq(o.cols.id, id);
}

/** Calls cb(order) whenever the order changes. Returns an unsubscribe function. */
export function subscribeOrder(id, cb) {
  let stop = false, channel = null;
  const tick = async () => { if (!stop) { try { const o = await getOrder(id); if (o) cb(o); } catch { /* keep polling */ } } };
  const timer = setInterval(tick, isLive ? 8000 : 1500);
  if (isLive) client().then((db) => {
    if (stop) return;
    channel = db.channel(`order-${id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: S.orders.table, filter: `${S.orders.cols.id}=eq.${id}` }, tick).subscribe();
  });
  return () => { stop = true; clearInterval(timer); if (channel) sb.removeChannel(channel); };
}

/** Demo only: marks an order as paid (in production your payment webhook does this). */
export function demoMarkPaid(id) {
  const all = loadOrders();
  if (all[id]) { all[id].status = 'paid'; all[id].readyAt = Date.now() + PICKUP_ESTIMATE_MINUTES * 60000; saveOrders(all); }
}
if (!isLive) window.gudegDev = { pay: demoMarkPaid };
