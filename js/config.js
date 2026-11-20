// Fill these in to switch from the built-in demo data to your Supabase project.
// Use the publishable (anon) key only. Never put the secret / service_role key in front-end code.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';   // publishable key: safe in the browser because of RLS + grants

// If a table/column in your database is named differently, change it here (see data.js).
export const SCHEMA = {
  menuItems: {
    table: 'menu_items',
    cols: { id: 'id', name: 'name', price: 'price', category: 'category', image: 'image_url', description: 'description', available: 'is_available', stock: 'stock', lowStock: 'low_stock_threshold' },
    // values of `category` that mean: komplit package / food / drink
    categoryValues: { package: 'package', food: 'food', drink: 'drink' },
  },
  packageComponents: {
    table: 'package_components',
    cols: { packageId: 'package_id', itemId: 'menu_item_id', defaultQty: 'default_qty' },
  },
  orders: {
    table: 'ndeso_orders',   // prefixed so it can live next to an existing `orders` table in the same project
    cols: { id: 'id', code: 'order_code', name: 'customer_name', phone: 'customer_phone', table: 'table_number', note: 'note', status: 'status', method: 'payment_method', total: 'total', expiresAt: 'expires_at', readyAt: 'estimated_ready_at', createdAt: 'created_at' },
    statusValues: { unpaid: 'unpaid', paid: 'paid' },
  },
  orderItems: {
    table: 'ndeso_order_items',
    cols: { orderId: 'order_id', itemId: 'menu_item_id', name: 'name', service: 'service', qty: 'qty', unitPrice: 'unit_price', components: 'components' },
  },
  // Admin accounts: Supabase Auth users whose id is listed in this table.
  admins: { table: 'admins', cols: { userId: 'user_id' } },
  // Postgres functions (see supabase/schema.sql).
  rpc: { placeOrder: 'place_order', adjustStock: 'adjust_stock', getOrder: 'get_order', setMethod: 'set_payment_method' },
};

export const DEFAULT_LOW_STOCK = 5;   // "Menipis" at or below this (used when the row has no low_stock_threshold)

// Demo mode only (ignored when Supabase is configured). Never ship real credentials in front-end code.
export const DEMO_ADMIN = { email: 'admin@gudeg.local', password: 'admin123' };

export const PAYMENT = {
  holdMinutes: 60,                 // big timer on the QRIS screen
  bca: { account: '0000000000', holder: 'Warung Gudeg Mbah Tjip' }, // placeholder
};
export const PICKUP_ESTIMATE_MINUTES = 5;
