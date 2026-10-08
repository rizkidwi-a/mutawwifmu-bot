# Riset Pengganti WhatsApp API untuk Bot MUTAWWIFMU

Status: riset mandiri (belum keputusan)
Tanggal akses sumber: **8 Oktober 2026**
Lingkup: memilih penyedia API WhatsApp yang dapat menghindari pengelolaan Meta for Developers secara langsung, untuk bot Node/TypeScript yang hanya menerima dan membalas pesan (bukan kampanye).
Basis repo: `README.md`, `CONTEXT.md`, `docs/adr/0001`, `docs/adr/0003`, `docs/adr/0006`, `.scratch/whatsapp-customer-service-chatbot/spec.md`, tiket `07-bsp-provider-fallback.md` dan `09-migrasi-ke-meta-cloud-api.md`, serta port `src/messageSender.ts`, `src/inboundTransport.ts`, `src/adapters/factory.ts`, `src/config.ts`.

> Catatan metode: klaim harga/fitur dikutip inline ke sumber primer resmi (Meta, WhatsApp, dan vendor). Angka kalkulator Meta diambil langsung dengan memilih pasar Indonesia; harga vendor yang memerlukan login/quote ditandai sebagai tidak transparan. Biaya penyedia (BSP) dan biaya Meta **dipisahkan**.

---

## 1. Ringkasan eksekutif

- Bot MUTAWWIFMU hanya perlu **REST kirim teks keluar**, **webhook HTTPS masuk**, **nomor Indonesia**, dan **handoff ke admin** — semuanya sudah diabstraksi oleh port `MessageSender` dan `InboundTransport` (`src/messageSender.ts`, `src/inboundTransport.ts`). Karena itu keputusan penyedia sepenuhnya dapat dipindah lewat satu titik: `createTransport()` di `src/adapters/factory.ts` + union `WhatsAppConfig` di `src/config.ts`.
- Karena bot **tidak berkampanye**, balasan konsumen normal adalah pesan non-template di dalam *customer service window* (CSW) 24 jam. Namun status tagihan pesan layanan berubah/berbeda antar dokumen per 1 Oktober 2026; jangan mengasumsikan balasan CSW selalu gratis (lihat §4 dan estimasi berskenario di §8).
- Menghindari Meta for Developers **tidak berarti menghindari Meta**. Jalur resmi tanpa mengurus dashboard Meta adalah lewat **Solution Partner / BSP** yang melakukan *Embedded Signup* untuk Anda (`https://developers.facebook.com/docs/whatsapp/solution-providers`, diakses 8 Okt 2026; `https://developers.facebook.com/docs/whatsapp/embedded-signup`, diakses 8 Okt 2026).
- Kandidat resmi yang paling cocok untuk bot *support-only* Node/TypeScript: **360dialog** (langganan tetap, API bergaya Cloud API, tanpa markup Meta), **Twilio** (bayar per pesan, SDK Node matang), **Gupshup** (fee per pesan paling murah di antara BSP yang publik), dan **Qontak/Mekari** (vendor Indonesia, "WhatsApp API resmi", sekaligus inbox agen).
- Gateway berbasis sesi WhatsApp Web (**Fonnte**, **Wablas**, **Baileys/whatsapp-web.js**) menghindari Meta for Developers dan berbiaya rendah, tetapi bukan Cloud API resmi. Fonnte sendiri menyebut layanannya *unofficial* dan menjelaskan penggunaan WhatsApp Web; risikonya adalah reliabilitas/SLA dan potensi pembatasan akun menurut kebijakan WhatsApp (lihat §6–§7).
- **Temuan penting khusus repo ini:** handoff ke admin lewat `MessageSender` (ADR-0006) adalah pesan **business-initiated ke nomor admin**. Di API resmi, pesan non-template hanya boleh dikirim bila jendela 24 jam terbuka; nomor admin yang belum pernah mengirim pesan ke bot akan memaksa **template** (berbayar + perlu persetujuan) atau gagal. Ini alasan teknis mengapa jalur Fonnte "langsung jalan", dan ini harus dijawab dalam desain §9.
- **Rekomendasi:** evaluasi **Twilio** untuk pilot/volume rendah yang ingin pay-as-you-go, **Gupshup** untuk fee provider terendah, atau **360dialog** bila menginginkan biaya tetap/volume lebih tinggi. Semuanya jalur resmi tetapi tetap perlu Meta Business Portfolio/WABA; pisahkan handoff admin dari jalur pesan konsumen. Pertahankan `fonnte` untuk pembuktian saja, kecuali pemilik menerima risiko model unofficial.

---

## 2. Kebutuhan bot MUTAWWIFMU (dari repo, bukan asumsi)

Dari `spec.md` dan ADR:

| Kebutuhan | Sumber | Implikasi pada penyedia |
| --- | --- | --- |
| Terima pesan masuk 24/7 | `spec.md` (Solution) | Wajib webhook HTTPS masuk; nomor harus "terhubung" terus |
| Balas teks bahasa ID/EN | `spec.md` (User Stories 3–5) | REST kirim teks sederhana sudah cukup |
| Tanpa kampanye/pesan proaktif | `spec.md` (Out of Scope); `docs/adr/0001` | Template marketing tidak dibutuhkan untuk balasan normal; tarif pesan layanan tetap perlu diverifikasi (§4) |
| Handoff ke admin (`+62 822 8388 6627`) | `docs/adr/0006`; `src/adminChannel.ts` | Butuh kanal keluar kedua — berpotensi kena aturan template |
| Nomor Indonesia, ganti via konfigurasi | `spec.md`; `docs/adr/0001` | Nomor produksi belum ditetapkan; provider harus dukung nomor +62 |
| Provider-agnostic | `src/adapters/factory.ts`; `src/messageSender.ts`; `src/inboundTransport.ts` | Menambah provider = satu cabang adapter, tanpa menyentuh seam percakapan |
| Tidak mengelola Meta for Developers | tiket 07 (`needs-info`) | Perlu BSP/Solution Partner yang menangani onboarding Meta |

Kontrak port yang harus dipenuhi adapter baru (dari kode):

- `MessageSender.sendText(to: string, text: string): Promise<void>` — nomor E.164 tanpa `+`.
- `InboundTransport.handleSubscription(url)` — handshake (atau `null` bila provider tidak punya, seperti Fonnte).
- `InboundTransport.readInbound(request): Promise<{ ok: true; messages } | { ok: false; status; reason }>` — autentikasi webhook + konversi payload ke `InboundMessage`.
- Pilihan provider dari `WHATSAPP_PROVIDER`; kredensial per provider divalidasi di `src/config.ts`.

---

## 3. Dua jalur yang berbeda secara mendasar

### 3.1 Jalur resmi: Cloud API Meta, dengan atau tanpa BSP

Meta mendefinisikan **Partner** sebagai penyedia layanan WhatsApp resmi bagi bisnis lain, terdiri dari **Solution Partner** (punya credit line, bisa menagih klien, klien tak perlu memasukkan metode pembayaran sendiri) dan **Tech Provider** (tanpa credit line; klien tetap memasang metode pembayaran sendiri) (`https://developers.facebook.com/docs/whatsapp/solution-providers`, diakses 8 Okt 2026).

Onboarding resmi langsung (yang ingin dihindari) mengharuskan: akun Facebook, registrasi developer, membuat Meta app use-case WhatsApp, business portfolio, WABA, verifikasi nomor telepon, display name, dan metode pembayaran (`https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started`, diakses 8 Okt 2026). Namun melalui **Embedded Signup**, alur ini dijalankan di dalam aplikasi BSP: pelanggan mengautentikasi, menyetujui ToS, memilih/membuat WABA, memverifikasi nomor, lalu BSP menerima WABA ID + phone number ID + token (`https://developers.facebook.com/docs/whatsapp/embedded-signup`, diakses 8 Okt 2026).

> Risiko transisi: **Embedded Signup v2/v3 dihentikan 15 Oktober 2026**; integrasi harus pindah ke v4 (`https://developers.facebook.com/docs/whatsapp/embedded-signup`, diakses 8 Okt 2026). BSP yang onboardingnya belum pindah versi berpotensi terganggu setelah tanggal itu — tanyakan status v4 ke calon BSP.

### 3.2 Jalur sesi / non-Cloud API: gateway WhatsApp Web / multi-device

Gateway jenis ini mengotomatiskan sesi WhatsApp Web/perangkat (bukan Cloud API), sehingga tidak menyentuh Meta for Developers. Fonnte secara eksplisit menyebut layanannya *unofficial* dan menjelaskan penggunaan WhatsApp Web (`https://fonnte.com/`, diakses 8 Okt 2026); dokumentasi Wablas juga memerlukan scan QR untuk menghubungkan perangkat (`https://wablas.com/documentation/api`, diakses 8 Okt 2026). Jangan menyamakan dua implementasi ini secara legal/kontraktual tanpa memeriksa syarat vendor; keduanya berbeda dari onboarding Cloud API resmi dan membawa risiko operasional sesi.

---

## 4. Model biaya Meta (berlaku untuk semua jalur resmi)

Meta menentukan biaya platform WhatsApp; BSP dapat menambahkan biaya sendiri. Tarif kategori tujuan Indonesia dibaca langsung dari kalkulator harga resmi Meta (memilih market `Indonesia`, lalu mata uang `USD`/`IDR`) pada 8 Oktober 2026: <https://business.whatsapp.com/products/platform-pricing>.

| Kategori harga Meta | USD/pesan | IDR/pesan | Catatan |
| --- | ---: | ---: | --- |
| Marketing | $0.0411 | Rp586.33 | Pesan template marketing |
| Utility | $0.0250 | Rp356.65 | Ada tingkatan volume pada kalkulator |
| Authentication | $0.0250 | Rp356.65 | Ada tingkatan volume pada kalkulator |
| Service | $0.0250 | Rp356.65 | Nilai dasar yang dikembalikan kalkulator; vendor berbeda dalam penerapan kuota/gratisnya |
| Authentication International | $0.1360 | Rp1,940.13 | Hanya bila memenuhi kategori autentikasi internasional |

Tarif merupakan nilai kalkulator per pesan pada saat akses, bukan janji tarif kontrak. Pasar tujuan, kategori template, volume tier, kurs, serta perubahan jadwal Meta dapat mengubah tagihan. Meta juga menyebut pesan masuk pengguna → bisnis tidak dikenai biaya; biaya provider tetap dapat menghitung pesan masuk.

### Aturan pengiriman yang relevan

- CSW 24 jam dimulai ketika pengguna mengirim pesan. Pesan non-template hanya dapat dikirim selama jendela itu; pesan di luar jendela memerlukan template yang disetujui. Ini aturan kapan pesan boleh dikirim, bukan otomatis bukti bahwa pesannya gratis (`https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages`, diakses 8 Okt 2026).
- **Dokumen resmi tidak konsisten soal biaya balasan layanan per 1 Oktober 2026:**
  - Markdown dokumentasi Meta masih menyatakan semua pesan non-template dalam CSW gratis (`https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md`, diakses 8 Okt 2026).
  - Kalkulator resmi Meta saat dibaca mengembalikan harga kategori `Service` **$0.025/Rp356.65** untuk Indonesia; dokumentasi harga 360dialog menyebut pesan layanan ditagih per pesan pada tarif Utility/Authentication dan tidak mendapat diskon volume (`https://docs.360dialog.com/docs/get-started/pricing/free-vs-billed-messaging`, diakses 8 Okt 2026).
  - Halaman harga Gupshup menyatakan **1.000 pesan layanan pertama gratis dari biaya WhatsApp**, lalu menulis bahwa Meta mulai menagih pesan layanan pada 1 Oktober 2026 (`https://www.gupshup.io/pricing`, diakses 8 Okt 2026).
  - Halaman harga Twilio menyatakan tidak ada biaya Meta untuk pesan selama CSW, tetapi halaman itu juga menyebut tarif Meta per-template; ini tidak selaras dengan kalkulator Meta saat diakses (`https://www.twilio.com/en-us/whatsapp/pricing`, diakses 8 Okt 2026).

**Kesimpulan biaya yang aman:** jangan mengasumsikan seluruh balasan CSW gratis, dan jangan menganggap kuota 1.000 berlaku universal. Gunakan **$0.025/Rp356.65 per pesan layanan sebagai batas konservatif kalkulator saat ini**, lalu minta BSP mengonfirmasi tertulis apakah 1.000 pesan gratis berlaku pada akun/nomor Anda. Estimasi §8 menampilkan skenario dokumen yang berbeda, bukan menyamarkan ketidakpastian.

---

## 5. Perbandingan penyedia resmi (BSP / Solution Partner)

Semua angka di bawah adalah **biaya penyedia (BSP)**; biaya Meta ditagih terpisah kecuali disebut lain. URL diakses 8 Oktober 2026.

| Penyedia | Biaya penyedia | Biaya Meta | Onboarding tanpa dashboard Meta? | REST kirim teks | Webhook masuk | Nomor +62 | Handoff/admin | Catatan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **360dialog** | Regular **$59 / €49 per nomor/bulan**; Premium **$119 / €99**; Higher Throughput **$299 / €249** (`https://docs.360dialog.com/docs/get-started/pricing`; `https://www.360dialog.com/whatsapp-api-pricing`) | **Tanpa markup**, pass-through rate card Meta (`https://www.360dialog.com/whatsapp-api-pricing`) | Ya — "Official Meta Solution Partner", signup ~30 menit, verifikasi bisnis 48 jam (Premium) (`https://www.360dialog.com/whatsapp-api-pricing`) | API bergaya Cloud API (Messages API) | Ya | Ya (nomor apa pun yang didukung Meta) | Perlu solusi sendiri; ada addon Inbox/otomasi (Premium) | Langganan tetap = biaya paling dapat diprediksi; ada Markdown LLM + MCP |
| **Twilio** | **$0.005 per pesan masuk dan keluar**, tanpa biaya bulanan provider WhatsApp pada model pay-as-you-go (`https://www.twilio.com/en-us/whatsapp/pricing`) | Meta ditagihkan terpisah. Tarif Meta per kategori/negara berlaku; halaman Twilio saat ini masih menyebut pesan dalam CSW bebas sehingga perlu konfirmasi karena bertentangan dengan kalkulator Meta (§4) | Ya — Self Sign-up di Console Twilio; tetap perlu akses admin Meta Business Portfolio/WABA, tetapi tidak perlu membuat/mengelola app Meta Developers sendiri (`https://www.twilio.com/docs/whatsapp/self-sign-up`) | Programmable Messaging REST + SDK Node resmi (`https://www.twilio.com/docs/whatsapp/api`) | Ya; webhook masuk + status callback (`https://www.twilio.com/docs/whatsapp/api`) | Ya, jika nomor/WABA lolos onboarding | Pesan admin tetap harus mematuhi jendela/template | Pilihan pay-as-you-go yang cocok untuk volume awal; validasi metode onboarding + format webhook |
| **Infobip** | Model bayar-per-pesan; **"zero message markup"** pada Partner Platform; paket/kustom via sales (`https://www.infobip.com/pricing`; `https://www.infobip.com/whatsapp-business/pricing`) | Rate card Meta, tanpa markup (klaim vendor) | Ya (Solution/Partner resmi) | Ya | Ya | Ya | Punya contact center/agen | Harga wajib minta kutipan; bukan self-serve penuh |
| **Gupshup** | **$0.001/pesan** untuk template keluar dan pesan sesi masuk/keluar; halaman harga menyebut wallet prabayar (`https://www.gupshup.io/pricing`) | Rate card Meta per negara; halaman Gupshup menyatakan 1.000 pesan layanan pertama bebas biaya WhatsApp, lalu layanan ditagih mulai 1 Okt 2026. Konfirmasi penerapan pada akun Indonesia sebelum kontrak (`https://www.gupshup.io/pricing`) | Ya (self-serve, menurut halaman produk) | Ya | Ya | Ya | Ada produk enterprise/inbox | Biaya provider terendah di antara harga publik yang ditemukan; Meta fee tetap terpisah |
| **Vonage** | WhatsApp **per delivered message** + platform fee (angka spesifik via sales) (`https://www.vonage.com/communications-apis/messages/pricing/`) | Rate card Meta | Ya | Ya (Messages API) | Ya | Ya | — | Harga WhatsApp tidak dipublikasi terbuka |
| **Bird (MessageBird)** | Model saldo pay-as-you-go; WhatsApp ditagih terpisah; plan/kuota (`https://bird.com/pricing`) | Rate card Meta | Ya | Ya (WhatsApp API) | Ya | Ya | Ada automations/inbox | Harga WhatsApp per negara minta kutipan |
| **Wati** | Langganan bulanan/tahunan + paket pay-as-you-go; trial 7 hari (`https://www.wati.io/pricing/`) | Rate card Meta | Ya | Ya | Ya | Ya | **Inbox tim bawaan** — cocok untuk handoff | Berorientasi kampanye/bulk; perlu cek batas pesan |
| **Qontak (Mekari)** | Paket berlangganan (harga per kutipan) yang sudah termasuk "WhatsApp API resmi", chatbot unlimited FAQ, AI dialog (Plus 100/bln; Ultimate 1.000/bln) (`https://qontak.com/id/harga/`) | Rate card Meta (via Qontak) | Ya (vendor lokal) | Ya | Ya | Ya | **Inbox omnichannel + agen** | Vendor Indonesia; bundling CRM; bukan API telanjang |

Catatan faktual: kategori "resmi" merujuk pada status partner Meta. Twilio, 360dialog, Infobip, Gupshup, Vonage, Bird, Wati, dan Qontak memposisikan diri sebagai penyedia WhatsApp Business API resmi; verifikasi status partner terkini di direktori Meta `https://developers.facebook.com/docs/whatsapp/solution-providers` (diakses 8 Okt 2026).

---

## 6. Perbandingan gateway sesi / integrasi non-Cloud API

| Gateway | Model | Klaim resmi | Risiko ban | Biaya |
| --- | --- | --- | --- | --- |
| **Fonnte** | Halaman resmi menampilkan tier Free Rp0, Regular Rp25.000, Regular Pro Rp66.000, Master Rp110.000, Super Rp175.000, Advanced Rp165.000, Ultra Rp255.000; tersedia pilihan Bulanan/Tahunan, jadi cek periode saat checkout (`https://fonnte.com/`) | **Menyatakan diri unofficial**; otomatisasi WhatsApp Web (`https://fonnte.com/`) | Tidak menjamin fixed SLA; situs menjelaskan risiko banned oleh WhatsApp dan tidak menyediakan refund terkait banned (`https://fonnte.com/`) | Provider yang sudah aktif di repo; sesuai untuk dev/POC, bukan pilihan produksi berisiko rendah |
| **Wablas** | Paket Lite (5.000 pesan) harga standar Rp36.000/bulan atau Rp240.000 untuk 12 bulan (ekuivalen Rp20.000/bulan); Small 10.000 pesan Rp69.000/bulan; Medium unlimited Rp86.000/bulan (`https://wablas.com/pricing`) | API device meminta scan QR untuk menghubungkan akun (`https://wablas.com/documentation/api`) — jalur sesi-perangkat, bukan integrasi Cloud API Meta | Pertimbangkan risiko sesi/nomor; jangan samakan harga gateway dengan SLA resmi BSP | Harga dan kuota tertera; webhook juga tersedia (`https://wablas.com/documentation/api`) |
| **Baileys** (library) | WebSocket langsung ke WhatsApp Web/Multi-Device; login via QR/pairing code (`https://github.com/WhiskeySockets/Baileys`, diakses 8 Okt 2026) | *"not affiliated, associated, authorized, endorsed by … WhatsApp"*; maintainer *"do not in any way condone the use of this application in practices that violate the Terms of Service"* (`https://github.com/WhiskeySockets/Baileys`) | Tinggi | Gratis (hanya biaya server) |
| **whatsapp-web.js** (library) | Puppeteer ke fungsi internal WhatsApp Web (`https://github.com/pedroslopez/whatsapp-web.js`, diakses 8 Okt 2026) | *"not affiliated, associated, authorized, endorsed by … WhatsApp"* (`https://github.com/pedroslopez/whatsapp-web.js`) | Tinggi | Gratis |

---

## 7. Risiko resmi vs nonresmi (kutipan primer)

Kebijakan WhatsApp yang relevan (semua diakses 8 Okt 2026):

- **WhatsApp Business Messaging Policy** (diperbarui 23 Sep 2026): WhatsApp berhak *"limit or remove your access to or use of WhatsApp for Business"*, termasuk bila menjalankan layanan yang *"utilizes WhatsApp in violation of our terms or policies, such as messaging people at scale in an unauthorized manner"*. Bila akun dihentikan karena pelanggaran, WhatsApp *"may prohibit you and your organization from all future use of WhatsApp products and services"* (`https://www.whatsapp.com/legal/business-policy`).
- **WhatsApp Messaging Guidelines** (23 Sep 2026): penegakan memakai pemrosesan otomatis + tim peninjau manusia; tindakan mencakup *"Temporarily or permanently suspending an account"* (`https://www.whatsapp.com/legal/messaging-guidelines`).
- **WhatsApp Terms for WhatsApp Business Platform** (efektif 23 Sep 2026): penggunaan terikat Messaging Policy dan Meta Terms (`https://www.whatsapp.com/legal/WhatsApp-Terms-for-WhatsApp-Business-Platform`).
- **Policy Enforcement Platform** (diperbarui 21 Mei 2026): sanksi berulang pada akun yang melanggar (`https://developers.facebook.com/docs/whatsapp/overview/policy-enforcement`).

Implikasi untuk MUTAWWIFMU:

1. **Jalur nonresmi mempertaruhkan nomor produksi.** Nomor konsultasi perusahaan (dan nomor admin) berada di dalam akun WhatsApp yang bisa terkena pembatasan. Fonnte sendiri menyarankan nomor sekunder dan tidak menyediakan refund bila WhatsApp memblokir (`https://fonnte.com/`, diakses 8 Okt 2026).
2. **Kepatuhan data lebih sulit di klaim.** Pada jalur resmi, aliran pesan berada dalam kerangka ToS Meta yang eksplisit; pada jalur WhatsApp Web, otomatisasi berada di luar kerangka itu (lihat disclaimer Baileys/whatsapp-web.js di §6).
3. **Risiko reputasi & permintaan pengguna.** Pesan yang tidak diminta/berlebihan memicu blokir/laporan pengguna, yang oleh Meta dipakai membatasi pengiriman (`https://www.whatsapp.com/legal/business-policy`). Bot ini memang hanya membalas, sehingga risikonya rendah selama tidak ada kampanye — sesuai `spec.md` (Out of Scope).
4. **Jalur resmi pun bukan tanpa risiko.** Ada kuota kualitas, peninjauan opt-in, pembatasan akun bila kebijakan dilanggar, rate limit, dan template yang dapat ditolak. BSP resmi mengurangi ketergantungan pada sesi WhatsApp Web pihak ketiga, tetapi tidak menghapus penegakan kebijakan WhatsApp.

---

## 8. Estimasi biaya yang dapat dihitung

Ini simulasi agar model tagihan mudah dibandingkan; bukan proyeksi volume aktual atau penawaran vendor.

Asumsi (bukan klaim sumber):

- 3 balasan bot kepada calon jemaah per percakapan, semua dikirim dalam CSW; **handoff admin dikecualikan** karena penerima admin punya jendela layanan terpisah.
- Meta service reply Indonesia memakai harga dasar kalkulator **$0.025/Rp356.65** bila ditagih. Sumber publik berbeda apakah gratis selama CSW, apakah ada 1.000 pesan gratis, atau apakah tarif berlaku sejak pesan pertama; tabel menampilkan rentang model tersebut (§4).
- Biaya provider dihitung atas semua pesan masuk+keluar: Twilio **$0.005/pesan**, Gupshup **$0.001/pesan**, 360dialog **$59/bulan** (harga Regular €49, dikonversi oleh halaman resmi ke USD).
- Konversi IDR memakai kurs ilustratif **Rp16.500/USD**, bukan kurs resmi/penawaran; pajak, biaya bank, dan biaya infrastruktur tidak termasuk.

| Volume | Total pesan BSP (inbound + 3 balasan) | Pesan service keluar ke calon jemaah |
| --- | ---: | ---: |
| 300 percakapan/bulan | 1.200 | 900 |
| 800 percakapan/bulan | 3.200 | 2.400 |

### Biaya bulanan pada 300 percakapan

| Jalur | Biaya provider | Skenario Meta service fee | Total (USD) | IDR ilustratif |
| --- | ---: | --- | ---: | ---: |
| Meta Cloud API langsung | $0 | $0 (dokumen Meta/Twilio) sampai $22.50 (900 × $0.025, model 360dialog/kalkulator) | **$0–$22.50** | Rp0–Rp371.250 |
| 360dialog Regular | $59.00 | $0–$22.50 | **$59.00–$81.50** | Rp973.500–Rp1.344.750 |
| Twilio | 1.200 × $0.005 = $6.00 | $0–$22.50 | **$6.00–$28.50** | Rp99.000–Rp470.250 |
| Gupshup | 1.200 × $0.001 = $1.20 | $0 menurut klaim 1.000 pesan service gratis di halaman Gupshup (900 reply) | **$1.20** | Rp19.800 |

### Biaya bulanan pada 800 percakapan

| Jalur | Biaya provider | Skenario Meta service fee | Total (USD) | IDR ilustratif |
| --- | ---: | --- | ---: | ---: |
| Meta Cloud API langsung | $0 | $0 (dokumen Meta/Twilio), $35 (Gupshup: 1.000 gratis + 1.400 × $0.025), atau $60 (360dialog/kalkulator: 2.400 × $0.025) | **$0–$60** | Rp0–Rp990.000 |
| 360dialog Regular | $59.00 | $0–$60 | **$59.00–$119.00** | Rp973.500–Rp1.963.500 |
| Twilio | 3.200 × $0.005 = $16.00 | $0–$60 | **$16.00–$76.00** | Rp264.000–Rp1.254.000 |
| Gupshup | 3.200 × $0.001 = $3.20 | $35 menurut skema Gupshup (1.000 gratis + 1.400 billable) | **$38.20** | Rp630.300 |

### Catatan biaya dan handoff

- Jumlah pesan masuk tidak ditagih oleh Meta menurut dokumentasi Meta, tetapi provider seperti Twilio dan Gupshup menghitung biaya provider untuk pesan inbound.
- Rentang bukan diskon yang dijamin: **Meta markdown** menyatakan non-template CSW gratis; **Gupshup** menyebut 1.000 service reply gratis; **360dialog** menyebut service reply ditagih pada tarif Utility/Authentication; kalkulator Meta memberikan nilai dasar Indonesia Rp356.65. Minta konfirmasi tertulis sebelum memilih BSP.
- Handoff admin lewat WhatsApp adalah pesan ke penerima lain dengan CSW tersendiri. Bila admin belum membuka CSW, bot mungkin perlu template Utility yang disetujui. Pada tarif kalkulator saat riset, biayanya kira-kira **$0.025/Rp356.65 per template Meta**, ditambah biaya provider per pesan; hitung `jumlah handoff × tarif template` secara terpisah. Untuk 60/160 handoff, komponen Meta konservatif sekitar $1.50/$4.00, belum termasuk biaya provider.
- Biaya infrastruktur (VPS + domain + tunnel/SSL) berdiri sendiri dan belum termasuk; tiket 07 mencatat proses bot harus dipindah ke server dengan URL webhook stabil (`.scratch/whatsapp-customer-service-chatbot/issues/07-bsp-provider-fallback.md`).

---

## 9. Rekomendasi implementasi (di atas adapter provider-agnostic)

Arsitektur repo sudah tepat: jangan ubah `src/conversation/`, cukup tambah adapter dan satu cabang di `createTransport()` (`src/adapters/factory.ts`) dengan union config baru di `src/config.ts`.

### 9.1 Pilihan penyedia

1. **Rekomendasi awal untuk volume kecil/belum diketahui — Twilio.** Biaya provider pay-as-you-go $0.005 per pesan masuk/keluar tanpa biaya langganan WhatsApp bulanan, API/SDK Node matang, dan ada Self Sign-up melalui Console. Ini menghindari pembuatan app Meta Developers, **tetapi tetap membutuhkan admin Meta Business Portfolio/WABA dan verifikasi bisnis** (`https://www.twilio.com/docs/whatsapp/self-sign-up`, diakses 8 Okt 2026). Meta fee harus dikonfirmasi karena halaman Twilio dan kalkulator Meta tidak konsisten (§4).
2. **Biaya provider terendah — Gupshup.** Halaman harga menampilkan $0.001/pesan; pantas diuji bila prioritasnya biaya, tetapi minta konfirmasi tertulis untuk onboarding + nomor Indonesia dan kuota service fee yang berlaku (`https://www.gupshup.io/pricing`, diakses 8 Okt 2026).
3. **Untuk biaya provider tetap atau volume lebih besar — 360dialog Regular.** €49/$59 per nomor per bulan, ditambah biaya Meta; perkiraan titik impas biaya provider terhadap Twilio sekitar 11.800 total pesan/bulan ($59 ÷ $0.005), belum menghitung perbedaan fitur/kurs. Tetap buat adapter provider khusus: jangan menganggap base URL/kredensial saja cukup (`https://www.360dialog.com/whatsapp-api-pricing`, diakses 8 Okt 2026).
4. **Jika membutuhkan inbox agen/CRM vendor lokal:** Qontak/Mekari atau Wati dapat dievaluasi, tetapi paket dan total biaya perlu quote sesuai jumlah agen/fitur (`https://qontak.com/id/harga/`; `https://www.wati.io/pricing/`, diakses 8 Okt 2026).
5. **Fonnte:** pertahankan sebagai adapter fallback (sudah ada di `src/adapters/fonnte/`) untuk pengembangan/pembuktian; bukan opsi produksi berisiko rendah karena vendor menyatakan layanan unofficial (`https://fonnte.com/`, diakses 8 Okt 2026).

### 9.2 Pola adapter yang harus dipertahankan

- Implementasikan `MessageSender.sendText` dan `InboundTransport` persis seperti port saat ini; auth webhook per provider berada di adapter, bukan di `src/server.ts`.
- **Autentikasi webhook wajib.** Cloud API memakai handshake `hub.verify_token` + HMAC `X-Hub-Signature-256` (`README.md`); BSP yang meneruskan webhook Cloud API umumnya mempertahankan skema ini, tetapi ada yang memakai signature/token sendiri — verifikasi dokumentasi BSP dan jangan mengandalkan token di URL saja.
- **Idempotensi pesan masuk.** Simpan `id` pesan masuk (Cloud API punya `messages[].id`; Fonnte memakai `inboxid`, lihat `src/adapters/fonnte/webhook.ts`) untuk mencegah balasan ganda saat webhook di-retry.
- **Normalisasi nomor** tetap ke E.164 tanpa `+` (`src/config.ts`), dan abaikan pengirim grup.
- **Ganti provider lewat konfigurasi** (`WHATSAPP_PROVIDER`) tanpa mengubah perilaku percakapan; uji dengan `tests/transport/endToEnd*.test.ts` yang sudah ada.

### 9.3 Menyelesaikan masalah handoff admin (temuan kritis)

Handoff di ADR-0006 dikirim sebagai pesan WhatsApp ke nomor admin melalui `MessageSender` yang sama. Di API resmi, pesan **business-initiated** ke nomor admin yang belum membuka CSW memerlukan **template** yang disetujui (berbayar), atau akan ditolak. Opsi mitigasi, dari yang paling disarankan:

1. **Pakai inbox/agen BSP** (Qontak/Wati/360dialog Inbox) sehingga handoff masuk ke inbox, bukan ke WhatsApp pribadi. Ini menghilangkan masalah CSW/template dan memberi riwayat + multi-agen.
2. **Pisahkan kanal notifikasi internal** (email/Telegram/Slack) untuk alert handoff, sementara balasan konsumen tetap lewat API resmi. Perubahan hanya di implementasi `AdminChannel` (`src/adminChannel.ts`), sesuai ADR-0006 yang menyatakan seam admin dapat diganti tanpa mengubah seam percakapan.
3. **Template handoff sekali-approve** (kategori utility) untuk mengirim ke nomor admin; menambah biaya dan langkah persetujuan, tetapi menjaga alur yang sekarang.
4. **Jangan mengandalkan** admin mengirim pesan ke bot dulu untuk membuka CSW — rapuh secara operasional.

### 9.4 Langkah migrasi konkret (tanpa menyentuh kode di riset ini)

1. Putuskan BSP (§9.1) dan konfirmasi: status Solution Partner, dukungan nomor +62, status Embedded Signup v4 (batas 15 Okt 2026), serta tarif rate card Indonesia.
2. Catat keputusan sebagai ADR baru yang melengkapi ADR-0001/ADR-0003 (jangan mengganti; keduanya menyatakan revisi harus lewat ADR baru).
3. Tambah adapter baru di `src/adapters/<provider>/` (sender + webhook) dan satu cabang di `factory.ts`; tambah union config di `config.ts`.
4. Selesaikan keputusan kanal handoff (§9.3) dan tulis runbook onboarding + verifikasi webhook.
5. Migrasikan nomor produksi lewat `docs/whatsapp-number-cutover.md`.
6. Tutup tiket 07 (status `needs-info`) setelah (a) kanal admin final dan (b) proses bot di server dengan URL webhook stabil; tiket 06 & 09 terkait cutover.

---

## 10. Rekomendasi ringkas (satu paragraf)

Untuk bot MUTAWWIFMU yang volumenya belum ditetapkan, mulai evaluasi **Twilio** untuk onboarding/API matang tanpa app Meta Developers dan biaya provider tanpa langganan tetap; bandingkan **Gupshup** bila mengejar biaya per pesan paling rendah. Pilih **360dialog** bila biaya tetap/API partner lebih bernilai dan volume cukup untuk membenarkan langganan €49 per nomor/bulan. Ketiganya tetap memakai WhatsApp/Meta dan dapat mensyaratkan Meta Business Portfolio/WABA; BSP bukan cara melewati verifikasi bisnis. Jangan anggap balasan CSW gratis sebelum BSP mengonfirmasi aturan terbaru. Fonnte secara eksplisit menyebut dirinya unofficial; Wablas memakai pairing QR dan status resminya perlu diverifikasi langsung, sehingga keduanya bukan pengganti Cloud API yang setara dari sisi model koneksi. Jangan pindahkan nomor produksi tanpa menerima risiko uptime dan pembatasan. Sebelum cutover, selesaikan juga handoff admin (inbox, kanal internal, atau template) dan webhook HTTPS stabil.

---

## Lampiran A. Daftar sumber primer (semua diakses 8 Oktober 2026)

Meta & WhatsApp:

- Harga Platform WhatsApp Business — `https://developers.facebook.com/docs/whatsapp/pricing`
- Model harga (Markdown) — `https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md`
- Pengiriman pesan layanan & CSW — `https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages`
- Cloud API overview — `https://developers.facebook.com/docs/whatsapp/cloud-api/overview`
- Memulai Cloud API — `https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started`
- Kalkulator harga dinamis (dipilih market Indonesia) — `https://business.whatsapp.com/products/platform-pricing`
- Partner (Solution Partner/Tech Provider) — `https://developers.facebook.com/docs/whatsapp/solution-providers`
- Embedded Signup (v2/v3 deprecation 15 Okt 2026) — `https://developers.facebook.com/docs/whatsapp/embedded-signup`
- Policy Enforcement — `https://developers.facebook.com/docs/whatsapp/overview/policy-enforcement`
- Kebijakan Pesan Bisnis — `https://www.whatsapp.com/legal/business-policy`
- Panduan Pesan — `https://www.whatsapp.com/legal/messaging-guidelines`
- Ketentuan Platform WhatsApp Business — `https://www.whatsapp.com/legal/WhatsApp-Terms-for-WhatsApp-Business-Platform`

Vendor:

- 360dialog harga — `https://www.360dialog.com/whatsapp-api-pricing`; dokumen harga — `https://docs.360dialog.com/docs/get-started/pricing`; free vs billed — `https://docs.360dialog.com/docs/get-started/pricing/free-vs-billed-messaging`
- Twilio harga — `https://www.twilio.com/en-us/whatsapp/pricing`; API WhatsApp — `https://www.twilio.com/docs/whatsapp/api`; Self Sign-up — `https://www.twilio.com/docs/whatsapp/self-sign-up`
- Infobip harga — `https://www.infobip.com/pricing`; WhatsApp pricing — `https://www.infobip.com/whatsapp-business/pricing`
- Gupshup harga — `https://www.gupshup.io/pricing`
- Vonage Messages pricing — `https://www.vonage.com/communications-apis/messages/pricing/`
- Bird pricing — `https://bird.com/pricing`
- Wati pricing — `https://www.wati.io/pricing/`
- Qontak harga — `https://qontak.com/id/harga/`
- Fonnte — `https://fonnte.com/`
- Wablas — `https://wablas.com/`
- Baileys — `https://github.com/WhiskeySockets/Baileys`
- whatsapp-web.js — `https://github.com/pedroslopez/whatsapp-web.js`

Repo:

- `docs/adr/0001-provider-whatsapp-cloud-api.md`, `docs/adr/0003-provider-bsp-fonnte.md`, `docs/adr/0006-kanal-admin-whatsapp.md`
- `.scratch/whatsapp-customer-service-chatbot/spec.md`
- `.scratch/whatsapp-customer-service-chatbot/issues/07-bsp-provider-fallback.md`, `.../09-migrasi-ke-meta-cloud-api.md`
- `src/messageSender.ts`, `src/inboundTransport.ts`, `src/adapters/factory.ts`, `src/config.ts`, `README.md`

## Lampiran B. Batas riset & verifikasi tersisa

- Kalkulator resmi Meta mengembalikan harga Indonesia secara dinamis; angka §4 adalah snapshot 8 Oktober 2026 dan harus dicek ulang saat kontrak/onboarding.
- **Ambiguitas pesan layanan gratis vs berbayar** (§4) harus dikonfirmasi tertulis ke BSP sebelum menghitung biaya produksi; halaman Meta, kalkulator Meta, Gupshup, Twilio, dan 360dialog tidak seragam.
- **Harga Infobip, Vonage, Bird, Wati, dan Qontak** tidak dipublikasikan penuh; beberapa memerlukan kutipan sales. Angka pada §5 adalah model/komponen yang terpublikasi, bukan total kontrak.
- Harga Fonnte dan Wablas berubah sesuai paket/periode; harga yang ditampilkan saat riset dicatat di §6, tetapi harus diverifikasi ulang sebelum membayar.
- **Status partner Meta terkini** (khususnya setelah perubahan Embedded Signup 15 Okt 2026) sebaiknya diverifikasi di direktori Meta sebelum menandatangani.
