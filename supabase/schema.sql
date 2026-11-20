-- REFERENCE ONLY: the schema js/data.js assumes. Your existing database wins:
-- if names differ, edit SCHEMA in js/config.js instead of changing the database.
--
-- Already have the tables from the first version? Run ONLY the sections marked [NEW] below.

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  category text not null check (category in ('package','food','drink')),
  image_url text,
  description text,
  is_available boolean not null default true
);

-- [NEW] stock tracking. NULL stock = not tracked (unlimited); 0 = sold out.
alter table menu_items add column if not exists stock int check (stock is null or stock >= 0);
alter table menu_items add column if not exists low_stock_threshold int not null default 5;

create table if not exists package_components (          -- default contents of a customisable package
  package_id uuid references menu_items(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  default_qty int not null default 1,
  primary key (package_id, menu_item_id)
);

create table if not exists ndeso_orders (
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

create table if not exists ndeso_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references ndeso_orders(id) on delete cascade,
  menu_item_id uuid,
  name text not null,
  service text not null,                    -- 'dine-in' | 'take-away' | 'pre-order'
  qty int not null,
  unit_price numeric not null,
  components jsonb                          -- for packages: [{id,name,qty,price}]
);

-- Security model: RLS on everywhere, and the anonymous (customer) role gets NO direct access to orders at all.
-- Customers create / read / pay orders only through the functions place_order, get_order and set_payment_method below,
-- so nobody can list other customers' names and phone numbers through the API.
-- NOTE: new Supabase projects don't expose tables to the Data API until you GRANT, so the grants matter.
alter table menu_items enable row level security;
alter table package_components enable row level security;
alter table ndeso_orders enable row level security;
alter table ndeso_order_items enable row level security;
drop policy if exists "read menu" on menu_items;
drop policy if exists "read components" on package_components;
create policy "read menu" on menu_items for select to anon, authenticated using (true);
create policy "read components" on package_components for select to anon, authenticated using (true);
grant select on menu_items, package_components to anon, authenticated;
-- Marking an order 'paid' must be done by your payment webhook (service role), never by the browser.


-- =====================================================================
-- [NEW] Admin accounts
-- =====================================================================
-- 1. Supabase dashboard > Authentication > Users > "Add user" (email + password, tick "Auto confirm").
-- 2. Authentication > Sign In / Providers > turn OFF "Allow new users to sign up".
-- 3. Make that user an admin (replace the email):
--      insert into admins (user_id) select id from auth.users where email = 'owner@example.com';
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table admins enable row level security;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

grant select on admins to authenticated;
grant insert, update, delete on menu_items to authenticated;   -- RLS below still limits this to admins
drop policy if exists "admin reads own row" on admins;
create policy "admin reads own row" on admins for select to authenticated using (user_id = auth.uid());

-- Only admins can change the menu / stock. Customers keep read-only access via "read menu" above.
drop policy if exists "admin manages menu" on menu_items;
create policy "admin manages menu" on menu_items for all using (is_admin()) with check (is_admin());


-- Live stock updates on the admin dashboard (Realtime) - safe to re-run.
do $$ begin alter publication supabase_realtime add table menu_items;
exception when duplicate_object then null; end $$;

-- =====================================================================
-- [NEW] Atomic stock changes
-- =====================================================================
-- Admin +/- buttons: relative change, so it never overwrites sales that happened in the meantime.
create or replace function adjust_stock(p_id uuid, p_delta int) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  update menu_items set stock = greatest(0, coalesce(stock, 0) + p_delta) where id = p_id returning stock into v;
  return v;
end $$;
revoke execute on function adjust_stock(uuid, int) from public, anon;
grant execute on function adjust_stock(uuid, int) to authenticated;

-- Checkout: checks and reserves stock, prices every line from menu_items (the browser's prices are ignored),
-- and inserts the order + items in ONE transaction. Raises 'INSUFFICIENT_STOCK:<item name>' if something ran out.
-- Stock is reserved when the order is placed (unpaid). Expired unpaid orders are NOT restocked automatically.
create or replace function place_order(
  p_name text, p_phone text, p_table text, p_note text, p_code text, p_hold_minutes int, p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_total numeric := 0; v_line jsonb; v_unit numeric; v_qty int; r record;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;

  -- 1. reserve stock (rows locked in id order to avoid deadlocks)
  for r in
    select s.id, sum(s.q)::int as q
    from (
      select (i->>'itemId')::uuid as id, (i->>'qty')::int as q
        from jsonb_array_elements(p_items) i
       where jsonb_typeof(i->'components') is distinct from 'array'
      union all
      select (c->>'id')::uuid, (c->>'qty')::int * (i->>'qty')::int
        from jsonb_array_elements(p_items) i, jsonb_array_elements(i->'components') c
       where jsonb_typeof(i->'components') = 'array'
    ) s
    group by s.id order by s.id
  loop
    if r.q <= 0 then raise exception 'BAD_QTY'; end if;
    update menu_items set stock = stock - r.q
     where id = r.id and stock is not null and stock >= r.q;
    if not found and exists (select 1 from menu_items where id = r.id and stock is not null) then
      raise exception 'INSUFFICIENT_STOCK:%', (select name from menu_items where id = r.id);
    end if;
  end loop;

  -- 2. order header
  insert into ndeso_orders (order_code, customer_name, customer_phone, table_number, note, status, total, expires_at)
  values (p_code, p_name, p_phone, p_table, p_note, 'unpaid', 0, now() + make_interval(mins => p_hold_minutes))
  returning id into v_id;

  -- 3. lines, priced from the database
  for v_line in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_line->>'qty')::int;
    if jsonb_typeof(v_line->'components') = 'array' then
      select coalesce(sum(m.price * (c->>'qty')::int), 0) into v_unit
        from jsonb_array_elements(v_line->'components') c
        join menu_items m on m.id = (c->>'id')::uuid;
    else
      select price into v_unit from menu_items where id = (v_line->>'itemId')::uuid;
    end if;
    if v_unit is null then raise exception 'ITEM_NOT_FOUND'; end if;
    insert into ndeso_order_items (order_id, menu_item_id, name, service, qty, unit_price, components)
    values (v_id, (v_line->>'itemId')::uuid, v_line->>'name', v_line->>'service', v_qty, v_unit,
            case when jsonb_typeof(v_line->'components') = 'array' then v_line->'components' end);
    v_total := v_total + v_unit * v_qty;
  end loop;

  update ndeso_orders set total = v_total where id = v_id;
  return v_id;
end $$;
revoke execute on function place_order(text, text, text, text, text, int, jsonb) from public;
grant execute on function place_order(text, text, text, text, text, int, jsonb) to anon, authenticated;


-- =====================================================================
-- Customer access to their own order (by its unguessable uuid) without opening the table
-- =====================================================================
create or replace function get_order(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order', to_jsonb(o),
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from ndeso_order_items i where i.order_id = o.id), '[]'::jsonb)
  )
  from ndeso_orders o where o.id = p_id;
$$;
revoke execute on function get_order(uuid) from public;
grant execute on function get_order(uuid) to anon, authenticated;

-- Only lets the customer pick the payment method of an order that is still unpaid.
create or replace function set_payment_method(p_id uuid, p_method text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_method not in ('qris', 'bca') then raise exception 'BAD_METHOD'; end if;
  update ndeso_orders set payment_method = p_method where id = p_id and status = 'unpaid';
end $$;
revoke execute on function set_payment_method(uuid, text) from public;
grant execute on function set_payment_method(uuid, text) to anon, authenticated;


-- =====================================================================
-- [NEW] Admin: view customers' order history
-- =====================================================================
grant select on ndeso_orders, ndeso_order_items to authenticated;
drop policy if exists "admin reads orders" on ndeso_orders;
drop policy if exists "admin reads order items" on ndeso_order_items;
create policy "admin reads orders" on ndeso_orders for select to authenticated using (is_admin());
create policy "admin reads order items" on ndeso_order_items for select to authenticated using (is_admin());
-- Live refresh of the history screen (safe to re-run)
do $$ begin alter publication supabase_realtime add table ndeso_orders;
exception when duplicate_object then null; end $$;
