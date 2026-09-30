# Jalur Verifikasi Nomor & Cutover ke Nomor Produksi

Dokumen ini menjelaskan (1) langkah verifikasi provider agar nomor pengembangan dapat dipakai, dan (2) jalur penggantian ke nomor produksi kelak. Perilaku percakapan tidak ikut berubah saat nomor diganti — nomor pengirim dan identitas provider sepenuhnya berasal dari konfigurasi (lihat ADR-0001 dan tes "perilaku percakapan tidak berubah saat nomor pengirim dan identitas provider diganti").

> Untuk cutover yang sedang berjalan, panduan praktis berupa checklist yang dapat
> dicentang ada di `docs/tutorial-cutover-nomor-produksi.md` — ikuti tutorial itu;
> dokumen ini menjadi referensi teknis di belakangnya.

## Kondisi sekarang

| Nilai | Sumber |
| --- | --- |
| Nomor pengembangan | `+62 895 0700 3830` (dikembangkan dan diverifikasi untuk pengembangan) |
| Nomor produksi | `+62 877 4587 3159` — **ditetapkan pemilik** (mantan nomor konsultasi profil); swap konfigurasi dilakukan setelah verifikasi dan identitas provider untuk nomor ini tersedia |
| Provider | WhatsApp Cloud API (Meta) sebagai pilihan utama, Fonnte (BSP) sebagai alternatif; lihat `docs/adr/0001-provider-whatsapp-cloud-api.md` dan `docs/adr/0003-provider-bsp-fonnte.md` |
| Kanal penerimaan admin | WhatsApp ke nomor admin `+62 822 8388 6627` lewat `WHATSAPP_ADMIN_NUMBER` (keputusan pemilik, lihat `docs/adr/0006-kanal-admin-whatsapp.md`) |

Konfigurasi yang mengendalikan identitas pengirim (lihat `.env.example`):

- `WHATSAPP_PROVIDER` — provider yang dipakai: `whatsapp-cloud-api` (default) atau `fonnte`.
- `WHATSAPP_SENDER_NUMBER` — nomor pengirim (E.164, mis. `+62 895 0700 3830`)
- `WHATSAPP_ADMIN_NUMBER` — nomor WhatsApp admin penerima handoff (lihat ADR-0006)
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — rahasia endpoint webhook; maknanya mengikuti provider (handshake pada Cloud API, token URL pada Fonnte)
- `WHATSAPP_API_TOKEN` — token provider
- `WHATSAPP_API_BASE_URL` — dasar API, default per provider
- `WHATSAPP_PHONE_NUMBER_ID` — Phone Number Id Cloud API (khusus Cloud API)
- `WHATSAPP_APP_SECRET` — app secret untuk verifikasi tanda tangan webhook (khusus Cloud API)
- `WHATSAPP_COUNTRY_CODE` — kode negara tujuan pada Fonnte (opsional, default `62`)

## Langkah verifikasi nomor pengembangan pada WhatsApp Cloud API (sekali di awal)

Langkah ini hanya dapat dilakukan oleh pemilik akun bisnis (manual, di dashboard Meta):

1. Buat aplikasi di [Meta for Developers](https://developers.facebook.com/) dan tambahkan produk **WhatsApp**.
2. Siapkan WhatsApp Business Account (WABA) dan Business Portfolio; isi profil bisnis (nama tampilan, kategori).
3. Daftarkan nomor `+62 895 0700 3830` ke WABA melalui dashboard WhatsApp > API Setup, lalu verifikasi kepemilikan nomor via **OTP SMS atau telepon**.
   - Nomor harus dapat menerima SMS/telepon OTP; jika nomor sudah terdaftar di WhatsApp biasa/WhatsApp Business, migrasikan ke WhatsApp Business Platform terlebih dahulu.
4. Catat **Phone Number Id** dan buat **access token permanen** (System User di Meta Business Settings) dengan izin `whatsapp_business_messaging` dan `whatsapp_business_management`.
5. Salin **App Secret** (Settings > Basic) untuk verifikasi tanda tangan webhook.
6. Daftarkan endpoint webhook: URL publik HTTPS proses bot (lihat README bagian tunnel) + `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, lalu subscribe field **messages**.
7. Uji kirim dan terima pesan ke nomor pengembangan, lalu cocokkan dengan tes transport (`npm test`).

Status verifikasi nomor ada di dashboard WhatsApp > Phone Numbers (status harus **Verified/Connected**).

## Langkah verifikasi nomor pengembangan pada Fonnte (alternatif)

Langkah ini dipakai bila akun Meta for Developers belum dapat dibuat (lihat `docs/adr/0003-provider-bsp-fonnte.md`). Hanya kredensial Fonnte yang perlu diisi; `WHATSAPP_PHONE_NUMBER_ID` dan `WHATSAPP_APP_SECRET` tidak relevan.

1. Daftar akun di Fonnte, tambahkan perangkat WhatsApp dengan nomor `+62 895 0700 3830`, lalu hubungkan lewat QR atau kode Sinkit.
2. Pastikan perangkat berstatus **connected** dan **auto read** aktif; tanpa auto read, webhook tidak pernah dipanggil.
3. Salin token perangkat ke `WHATSAPP_API_TOKEN`, lalu isi `WHATSAPP_SENDER_NUMBER` dan `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (token acak yang hanya kamu tahu).
4. Daftarkan webhook di menu perangkat: `https://<host-publik>/webhook?token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN>`.
5. Jalankan proses bot, lalu smoke test: kirim pesan ke nomor pengembangan dan pastikan balasan bot masuk.
6. Jalankan `npm test` dan `npm run typecheck` untuk memastikan kontrak transport tetap hijau.

## Jalur cutover ke nomor produksi

Tiket terkait: `.scratch/whatsapp-customer-service-chatbot/issues/06-production-number-cutover.md`.

1. **Pilih dan miliki nomor produksi** — nomor yang dapat menerima OTP dan sudah disetujui untuk WhatsApp Business Platform. Untuk cutover berjalan nomor sudah ditetapkan pemilik: `+62 877 4587 3159`; syaratnya tetap: kendali penuh di tangan MUTAWWIFMU dan lolos verifikasi provider.
2. **Verifikasi provider untuk nomor produksi** — daftarkan nomor ke WABA yang sama (atau WABA baru), verifikasi via OTP, lalu setujui nama tampilan bisnis. Untuk volume/fitur produksi, lengkapi **Business Verification** Meta (dokumen legal bisnis).
3. **Dapatkan identitas baru** — catat Phone Number Id baru dan perbarui token bila diperlukan.
4. **Ganti konfigurasi saja** (tanpa perubahan kode):
   - `WHATSAPP_SENDER_NUMBER=+62 <nomor produksi>`
   - `WHATSAPP_PHONE_NUMBER_ID=<phone number id baru>`
   - `WHATSAPP_API_TOKEN=<token baru bila ada>`
   - bila WABA berubah, perbarui juga langganan webhook ke WABA baru.
   - Jalankan `npm run cutover:check` — laporan harus menyatakan **siap**
     (konfigurasi provider lengkap dan nomor pengirim bukan nomor
     pengembangan); perintah keluar dengan kode 1 bila belum siap.
5. **Restart proses bot** (`npm start` atau layanan yang menjalankannya) agar konfigurasi termuat ulang.
6. **Smoke test end-to-end** — dari nomor pribadi ke nomor produksi:
   - kirim pesan apa pun → balasan awal terkirim;
   - ajukan pertanyaan FAQ (mis. "Apa itu land arrangement?") → dijawab dari
     materi tanpa handoff, dan `GET /metrics` menunjukkan `faqAnswered` bertambah;
   - minta berbicara dengan manusia lalu jawab `ya` pada permintaan persetujuan
     → pesan handoff masuk ke nomor admin WhatsApp (`WHATSAPP_ADMIN_NUMBER`)
     dan `handOffsForwarded` bertambah;
   - jalankan `npm test` untuk memastikan seluruh tes — termasuk
     `tests/transport/cutoverParity.test.ts` yang menjaga FAQ dan handoff tetap
     berfungsi pada konfigurasi nomor produksi — tetap hijau.
7. **Perbarui/pastikan informasi kontak publik yang dikendalikan MUTAWWIFMU**
   mengarahkan calon jemaah ke nomor produksi yang aktif (`+62 877 4587 3159`):
   - nomor produksi saat ini **sama dengan** nomor konsultasi yang sudah tercantum
     di materi publik, jadi permukaan umumnya tidak perlu diubah — yang perlu
     dilakukan adalah memastikan semuanya konsisten menampilkan nomor tersebut
     dan tidak ada yang menampilkan nomor pengembangan;
   - permukaan yang diketahui: situs `www.mutawwifmu.com` (halaman
     kontak/footer), akun Instagram `@mutawwifmu` (bio/kontak), serta
     `BOOKLET MUTAWWIFMU.md` (baris kontak pada sampul, bagian "Konsultasi
     dengan Admin via WhatsApp", dan blok kontak penutup) beserta materi
     cetak/digital lain yang memuat nomor;
   - jangan mengaktifkan publikasi nomor sebelum nomor terverifikasi dan bot
     sudah menjawab dari nomor tersebut;
   - nomor admin handoff (`+62 822 8388 6627`) bukan untuk publik — jangan
     dicantumkan sebagai kontak calon jemaah.
8. **Pensiunkan nomor pengembangan** (opsional) — hapus dari WABA setelah produksi stabil; jangan hapus sebelum smoke test lolos.

## Batasan migrasi riwayat percakapan

Pergantian nomor **tidak membawa riwayat percakapan**. Jangan menjanjikan
riwayat berpindah ke nomor produksi: provider yang tersedia (WhatsApp Cloud API
maupun Fonnte) tidak mendukung pemindahan riwayat chat antar nomor.

- Riwayat chat di aplikasi WhatsApp calon jemaah tetap berada pada percakapan
  dengan nomor sebelumnya; chat dengan nomor produksi dimulai dari kosong. Bila
  calon jemaah menanyakannya, sampaikan bahwa chat lama tetap ada di aplikasi
  mereka sedangkan bot kini melayani nomor produksi — cukup memulai percakapan
  baru di nomor tersebut.
- Konteks percakapan multi-giliran bot disimpan di balik port `ConversationStore`
  (implementasi aktif in-memory per nomor calon jemaah); ia tidak ikut berpindah
  antar-proses maupun antar-nomor, dan keputusan penyimpanan persisten serta
  kebijakan retensi data belum diambil (spec).
- Yang tetap tersedia setelah cutover: isi Permintaan Tindak Lanjut/handoff yang
  sudah diteruskan ke admin tercatat pada kanal admin saat diteruskan (lengkap
  dengan ringkasan dan konteks percakapan saat itu) — bukan lewat pemindahan
  riwayat.

## Checklist keberhasilan cutover

- `npm run cutover:check` menyatakan siap: konfigurasi provider lengkap dan
  nomor pengirim bukan nomor pengembangan.
- Pesan masuk ke nomor produksi menghasilkan balasan; jalur FAQ dan handoff ke
  admin tetap berfungsi (uji pada langkah smoke test).
- Tidak ada nilai nomor pengembangan yang tertinggal di konfigurasi.
- Perilaku percakapan identik — tidak ada perubahan kode pada
  `src/conversation/`; dijaga tes `tests/config.test.ts` dan
  `tests/transport/cutoverParity.test.ts`.
- Informasi kontak publik yang dikendalikan MUTAWWIFMU sudah menunjuk nomor
  produksi yang aktif.
- Batasan migrasi riwayat percakapan dikomunikasikan tanpa menjanjikan riwayat
  berpindah.
- Gate pra-produksi kanal admin **terpenuhi**: keputusan pemilik sudah ada
  (pesan WhatsApp ke nomor admin, ADR-0006) dan dipakai implementasi
  `WhatsAppAdminChannel`.
