# 05: Tampilkan Harga Indikatif dengan peringatan

**What to build:** Calon jemaah dapat memperoleh gambaran dari angka harga yang tersedia saat ini tanpa salah mengira harga indikatif sebagai penawaran final atau satuan harga yang telah dipastikan.

**Blocked by:** 02: Teruskan Permintaan Tindak Lanjut dengan persetujuan; 03: Jawab FAQ Private Premium Umrah

**Status:** resolved

- [x] Bot dapat menyebut angka harga yang tersedia dalam materi saat ini sebagai Harga Indikatif.
- [x] Untuk harga hotel, bot menyebutkan secara jelas bahwa materi memiliki keterangan yang bertentangan—per orang pada sampul dan per kamar pada tabel—sehingga satuannya belum terverifikasi dan harus dikonfirmasi admin.
- [x] Jika unit, periode berlaku, atau ketentuan suatu harga belum jelas, bot tidak menafsirkannya sendiri sebagai harga per orang atau per kamar.
- [x] Bot tidak menyatakan harga indikatif sebagai harga final dan tidak menjanjikan ketersediaan hotel/layanan.
- [x] Permintaan penawaran khusus atau konfirmasi harga/ketersediaan diarahkan ke alur admin pada tiket 02.
- [x] Informasi tentang pemesanan atau pembayaran hanya dijelaskan sesuai materi; bot tidak melakukan transaksi.

## Comments

### Implementasi selesai — tiket resolved (agent)

Harga Indikatif dijawab sebagai jalur sendiri di atas modul pengetahuan yang sama (ADR-0004), dengan penyempitan pola harga/ketersediaan yang dinyatakan eksplisit di ADR-0005 (bukan diubah diam-diam).

- Modul pengetahuan `src/knowledge/businessFaq.ts` menambah tipe `PriceTopic` (nilai `price-*`) dan 7 entri Harga Indikatif: `price-mutawwif` (per grup), `price-document-arrangement` (per pax), `price-airport-handling`, `price-transport`, `price-city-tour`, `price-photographer-videographer`, serta `price-hotel`. Jawaban hanya mengutip angka materi (BOOKLET + HOTEL RATES) dengan penanda "Harga Indikatif", larangan klaim penawaran final, dan ajakan konfirmasi ke tim. Entri harga didahulukan dalam urutan entri agar "Berapa harga fotografer?" tidak jatuh ke topik layanan generik.
- Jawaban harga hotel menyatakan konflik satuan materi ("per orang" di sampul, "per kamar" di catatan tabel Makkah, "per orang" kembali di Madinah), menyatakan satuan belum terverifikasi, dan tidak melabeli angka sebagai per orang/per kamar. Satuan yang tidak tercantum materi ("per malam") ditolak ditafsirkan — pesan jatuh ke alur admin.
- `src/conversation/classifyInbound.ts` menambah hasil klasifikasi `indicative-price` dan menyempitkan `custom-quote-or-availability` menjadi dua pola: permintaan penawaran/konfirmasi harga/ketersediaan (tetap selalu handoff) dan sisa pertanyaan harga yang angkanya tidak tercantum materi (diperiksa setelah pencocokan Harga Indikatif). Pesan dengan rincian tak didukung materi tetap handoff lebih dahulu. Tes `tests/conversation/classifyInbound.test.ts` lama tetap hijau tanpa diubah.
- Tindakan tetap `record-faq-answer` dengan topik `price-*` (metrik `faqAnswered`, wiring generik tidak berubah); `BotTurn` tidak berubah.
- Tes: `tests/knowledge/businessFaq.test.ts` (invarian angka harga dilonggarkan untuk topik harga; invarian tanpa klaim harga final/durasi karangan dipertahankan; groundedness angka + konflik satuan hotel), `tests/conversation/indicativePricing.test.ts` (perilaku seam: jawaban Harga Indikatif ID/EN, hotel dengan konflik satuan, penawaran/konfirmasi/satuan tak tercantum/booking tetap ke alur tiket 02), serta penyesuaian sadar pada `tests/conversation/faqAnswer.test.ts` dan `tests/conversation/otherProfileServicesFaq.test.ts` (pesan "Berapa harga fotografer?"/"Berapa harga hotel di Mekkah?" kini Harga Indikatif; kasus penawaran khusus diganti pesan penawaran eksplisit agar penjaga alur admin tetap ada).
- README bagian "Harga Indikatif" ditambahkan.

Catatan untuk tiket 06: materi transportasi memuat ketentuan yang belum konsisten (nilai tabel SAR, catatan kaki "IDR per grup") — sudah disampaikan apa adanya ke calon jemaah dan layak dikonfirmasi pemilik saat penyeberangan nomor produksi.
