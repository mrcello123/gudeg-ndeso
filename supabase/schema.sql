-- REFERENCE ONLY: the schema js/data.js assumes. Your existing database wins:
-- if names differ, edit SCHEMA in js/config.js instead of changing the database.

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  category text not null check (category in ('package','food','drink')),
  image_url text,
  description text,
  is_available boolean not null default true
);

create table package_components (          -- default contents of a customisable package
  package_id uuid references menu_items(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  default_qty int not null default 1,
  primary key (package_id, menu_item_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique,
  customer_name text not null,
  customer_phone text not null,
  table_number text,
  note text,
  status text not null default 'unpaid',    -- 'unpaid' | 'paid'
  payment_method text,                      -- 'qris' | 'bca'
  total numeric not null,
  expires_at timestamptz,
  estimated_ready_at timestamptz,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid,
  name text not null,
  service text not null,                    -- 'dine-in' | 'take-away' | 'pre-order'
  qty int not null,
  unit_price numeric not null,
  components jsonb                          -- for packages: [{id,name,qty,price}]
);

-- Minimum RLS for an anonymous ordering front-end (tighten for production):
alter table menu_items enable row level security;
alter table package_components enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
create policy "read menu" on menu_items for select using (true);
create policy "read components" on package_components for select using (true);
create policy "create order" on orders for insert with check (status = 'unpaid');
create policy "read order by id" on orders for select using (true);
create policy "update payment method" on orders for update using (status = 'unpaid') with check (status = 'unpaid');
create policy "create order items" on order_items for insert with check (true);
create policy "read order items" on order_items for select using (true);
-- Marking an order 'paid' should be done by your payment webhook (service role), never by the browser.
-- For live updates enable Realtime on the orders table.
