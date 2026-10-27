// Fill these in to switch from the built-in demo data to your Supabase project.
// Use the anon (public) key only. Never put the service_role key in front-end code.
export const SUPABASE_URL = 'https://mmipvzvgfuazrflxfpiu.supabase.co';       // e.g. https://xxxx.supabase.co
export const SUPABASE_ANON_KEY = 'sb_publishable_v4bsfzC9NhgS1N1jMoClYQ_w0cEZ4Xy';  // e.g. eyJhbGciOi...

// If a table/column in your database is named differently, change it here (see data.js).
export const SCHEMA = {
  menuItems: {
    table: 'menu_items',
    cols: { id: 'id', name: 'name', price: 'price', category: 'category', image: 'image_url', description: 'description', available: 'is_available' },
    // values of `category` that mean: komplit package / food / drink
    categoryValues: { package: 'package', food: 'food', drink: 'drink' },
  },
  packageComponents: {
    table: 'package_components',
    cols: { packageId: 'package_id', itemId: 'menu_item_id', defaultQty: 'default_qty' },
  },
  orders: {
    table: 'orders',
    cols: { id: 'id', code: 'order_code', name: 'customer_name', phone: 'customer_phone', table: 'table_number', note: 'note', status: 'status', method: 'payment_method', total: 'total', expiresAt: 'expires_at', readyAt: 'estimated_ready_at', createdAt: 'created_at' },
    statusValues: { unpaid: 'unpaid', paid: 'paid' },
  },
  orderItems: {
    table: 'order_items',
    cols: { orderId: 'order_id', itemId: 'menu_item_id', name: 'name', service: 'service', qty: 'qty', unitPrice: 'unit_price', components: 'components' },
  },
};

export const PAYMENT = {
  holdMinutes: 60,                 // big timer on the QRIS screen
  bca: { account: '0000000000', holder: 'Warung Gudeg Mbah Tjip' }, // placeholder
};
export const PICKUP_ESTIMATE_MINUTES = 5;
