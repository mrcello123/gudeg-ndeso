import { icons, SERVICES } from '../icons.js';
import { store } from '../store.js';

const DESC = {
  'dine-in': 'Nikmati langsung hidangan hangat di tempat dengan suasana yang nyaman dan pelayanan terbaik dari kami.',
  'take-away': 'Pesan dengan mudah tanpa perlu menunggu lama, lalu ambil pesanan Anda atau nikmati di rumah.',
  'pre-order': 'Pesan lebih awal untuk jumlah tertentu atau kebutuhan khusus, sehingga semua dapat disiapkan dengan lebih rapi dan tepat waktu.',
};
const TITLE = { 'dine-in': 'Makan di Tempat (Dine In)', 'take-away': 'Bawa Pulang (Take Away)', 'pre-order': 'Pre-Order' };

export function home(root) {
  root.innerHTML = `
    <section class="hero">
      <h1 class="hero__title">Selamat Datang di Warung Gudeg Mbah Tjip</h1>
      <p class="hero__text">Kami hadir dengan berbagai pilihan layanan untuk memudahkan Anda...</p>
    </section>
    <div class="service-list">
      ${Object.keys(SERVICES).map((k) => `
        <article class="service">
          <div class="service__head">${icons[SERVICES[k].icon]}<h2 class="service__title">${TITLE[k]}</h2></div>
          <p class="service__desc">${DESC[k]}</p>
          <button class="btn btn--primary" data-service="${k}">Pesan Sekarang</button>
        </article>`).join('')}
    </div>`;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-service]');
    if (!b) return;
    store.setService(b.dataset.service);
    location.hash = `#/menu/${b.dataset.service}`;
  });
}
