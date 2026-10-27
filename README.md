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

## Structure
- `css/tokens.css`: design tokens derived from Figma. `css/app.css`: screens.
- `js/data.js`: all data access (Supabase or demo). `js/store.js`: cart. `js/views/*`: one file per screen.
- `assets/`: generated SVG food illustrations, batik pattern, QRIS placeholder (replace with real photos / the QR from your payment provider).

## Notes
- Drinks, the Transfer BCA page, the customer-details sheet and the side drawer are not in the Figma file; they are minimal additions so the flow works.
- Orders are created with two inserts (order, then items). For atomicity, move this into a Postgres function and call it with `supabase.rpc`.
- Demo mode: on the QRIS screen, "Simulasi: tandai sudah dibayar" marks the order paid.
