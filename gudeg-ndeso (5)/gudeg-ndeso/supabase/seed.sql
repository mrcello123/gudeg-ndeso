-- Run ONCE after schema.sql: the demo menu + the Gudeg Komplit package.
insert into menu_items (name, price, category, image_url, description, stock) values
 ('Nasi Putih', 5000, 'food',  'assets/nasi-putih.svg',  'Nasi putih hangat sebagai pendamping lauk.', 40),
 ('Tempe Bacem', 4000, 'food', 'assets/tempe-bacem.svg', 'Tempe yang dimasak dengan bumbu bacem manis gurih.', 25),
 ('Gudeg', 8000, 'food',       'assets/gudeg.svg',       'Gudeg nangka muda dengan santan dan gula jawa.', 30),
 ('Krecek', 7000, 'food',      'assets/krecek.svg',      'Sambal goreng krecek pedas gurih.', 15),
 ('Tahu Bacem', 4000, 'food',  'assets/tahu-bacem.svg',  'Tahu dengan bumbu bacem manis gurih.', 25),
 ('Es Teh', 4000, 'drink',     'assets/es-teh.svg',      'Teh manis dingin.', 50),
 ('Teh Hangat', 3000, 'drink', 'assets/teh-hangat.svg',  'Teh manis hangat.', 40),
 ('Es Jeruk', 5000, 'drink',   'assets/es-jeruk.svg',    'Jeruk peras segar dengan es.', 20),
 ('Gudeg Komplit (Kustomisasi)', 0, 'package', 'assets/gudeg-komplit.svg', '', null);

insert into package_components (package_id, menu_item_id, default_qty)
select p.id, m.id, v.qty
from menu_items p
join (values ('Nasi Putih',1), ('Tempe Bacem',2), ('Tahu Bacem',1), ('Gudeg',1)) v(name, qty) on true
join menu_items m on m.name = v.name
where p.category = 'package';
