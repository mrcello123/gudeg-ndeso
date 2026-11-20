-- Already ran the earlier schema.sql? Run just this file to enable the admin order history.

grant select on ndeso_orders, ndeso_order_items to authenticated;
drop policy if exists "admin reads orders" on ndeso_orders;
drop policy if exists "admin reads order items" on ndeso_order_items;
create policy "admin reads orders" on ndeso_orders for select to authenticated using (is_admin());
create policy "admin reads order items" on ndeso_order_items for select to authenticated using (is_admin());
-- Live refresh of the history screen (safe to re-run)
do $$ begin alter publication supabase_realtime add table ndeso_orders;
exception when duplicate_object then null; end $$;
