# Gudeg Ndeso: ordering app (HTML / CSS / JS)

Built from the Figma "Venture" page (8 screens): Home, Menu, Gudeg Komplit detail, Ala Carte detail, Keranjang, Order Detail (unpaid and paid), QRIS.

## Run
ES modules need a web server (opening index.html from disk will not work):

    npx serve .          # or: python3 -m http.server 8080

## Connect Supabase
1. Put your project URL and **anon** key in `js/config.js`.
2. If your table or column names differ from `supabase/schema.sql`, edit `SCHEMA` in `js/config.js`. Nothing else needs to change.
3. With the URL/key left empty the app runs on built-in demo data (stored in localStorage).
4. Marking an order `paid` must come from your payment webhook. The app listens for the change (Realtime, with polling fallback) and switches to the paid screen.

## Screen sizes
One codebase, three layouts (breakpoints at 720px and 1100px, see the end of `css/app.css`):
- **Phone:** single column, safe-area padding for iPhone notches, 2-column menu grid.
- **iPad / tablet (>=720px):** wider content, 3-column menu and home cards, the order form opens as a centred dialog instead of a bottom sheet.
- **Laptop (>=1100px):** full-width header, 4-column menu, dish detail pages split into picture (left) and order panel (right), wider admin tables.
`js/app.js` tags the page container with `data-page="<screen>"`, which the CSS uses to lay out each screen per device.

## Admin: login and stock
- Open the side drawer > **Admin** (or go to `#/admin`). The dashboard shows totals, low/sold-out counts and every food/drink item with a stock stepper (+/-), a number field, and a "Tampil di menu" switch. It refreshes live (Realtime on `menu_items` + polling), so sales made by customers show up on their own.
- **Demo mode:** log in with `admin@gudeg.local` / `admin123` (set in `DEMO_ADMIN`, `js/config.js`; ignored in live mode). Stock is kept in localStorage and goes down when a demo order is placed.
- **Live mode:**
  1. Run the `[NEW]` sections of `supabase/schema.sql` (stock columns, `admins` table, `is_admin()`, `adjust_stock`, `place_order`).
  2. Create the admin in Supabase Authentication > Users, turn **off** "Allow new users to sign up", then add the user to `admins` (the SQL file has the one-liner).
- **Riwayat Pesanan** (`#/admin/orders`): every order with customer, services, items, payment method and status (Lunas / Belum bayar / Kedaluwarsa), live-updating. Filter by status and period, search by name, phone or order code, switch to **Pelanggan** to see each customer's order count and total paid (tap one to see their full history), and download the filtered list as CSV. It loads the latest 300 orders. Needs the `admin reads orders` policies in `schema.sql` (or run `supabase/migration-admin-orders.sql` if you set up earlier).
- The login check in the browser only decides which screen to show. What actually protects the data is Row Level Security: only users in `admins` can change `menu_items`.
- Customers see sold-out items greyed out with a disabled "Habis" button, and can't add more than what is left. Checkout goes through `place_order`, which checks and reserves stock in one transaction and prices the order from the database, so two customers can't buy the last portion.
- Stock is reserved when an order is placed. An unpaid order that expires does **not** give its stock back automatically (that needs a scheduled job or a payment-webhook step).
- `stock = NULL` means "not tracked" (unlimited), `0` means sold out. Each item can have its own `low_stock_threshold` (default 5).

## Structure
- `css/tokens.css`: design tokens derived from Figma. `css/app.css`: screens.
- `js/data.js`: all data access (Supabase or demo). `js/auth.js`: admin login. `js/store.js`: cart. `js/views/*`: one file per screen (`admin.js` = login + stock dashboard).
- `assets/`: generated SVG food illustrations, batik pattern, QRIS placeholder (replace with real photos / the QR from your payment provider).

## Notes
- Drinks, the Transfer BCA page, the customer-details sheet and the side drawer are not in the Figma file; they are minimal additions so the flow works.
- Orders are created through the `place_order` Postgres function (atomic). Customers have no direct access to the orders tables; they go through `place_order`, `get_order` and `set_payment_method`.
- Demo mode: on the QRIS screen, "Simulasi: tandai sudah dibayar" marks the order paid.
