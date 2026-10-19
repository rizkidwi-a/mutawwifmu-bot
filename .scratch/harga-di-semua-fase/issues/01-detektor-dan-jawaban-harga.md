# 01: Detektor pertanyaan harga dan jawaban HARGA_KE_TIM

**What to build:** Tambahkan detektor `isPertanyaanHarga(text, routing)` dan
jawaban `HARGA_KE_TIM_ID/EN` untuk pertanyaan harga yang angkanya tidak
tercantum materi.

- `PRICE_WORD` di `src/knowledge/businessFaq.ts` diperluas dengan varian nyata
  transkrip: `pricelist`/`pricelistnya`, `price list`, `daftar harga`.
- `isPertanyaanHarga`: pesan bertanda pertanyaan yang memuat kata penanda
  harga atau ber-routing `indicative-price`. Pemicu mendesak (`emergency`,
  `active-trip`, `human-request`) dan `booking-or-payment` dikecualikan;
  pertanyaan meta ("Apa maksudnya dari kisaran anggaran?") tidak ikut
  terdeteksi karena "anggaran/budget/murah/mahal" sengaja bukan kata penanda
  harga yang dijawab.
- `jawabanPertanyaanHarga(text, routing, language)`: mengembalikan jawaban
  Harga Indikatif + tindakan `record-faq-answer` untuk (a), atau
  `HARGA_KE_TIM` tanpa tindakan untuk sisanya; `null` bila bukan pertanyaan
  harga.
- `HARGA_KE_TIM_ID/EN`: materi belum memuat kepastian harga/ketersediaan;
  penawaran khusus serta konfirmasi harga dan ketersediaan ditangani tim
  customer service/penjualan MUTAWWIFMU. Tanpa angka, tanpa "Harga Indikatif",
  tanpa klaim harga final/ketersediaan/janji waktu balasan.

**Blocked by:** —

**Status:** resolved

- [x] `PRICE_WORD` mengenali `pricelistnya`, `price list`, `daftar harga`.
- [x] `isPertanyaanHarga` mengenali pertanyaan harga dengan/sans materi dan
      mengecualikan pemicu mendesak serta booking/pembayaran.
- [x] `HARGA_KE_TIM` tidak memuat angka, "Harga Indikatif", klaim harga final,
      atau janji ketersediaan (lulus pola larangan tes `indicativePricing`).
- [x] Tes terkait hijau.

## Comments

### Implementasi (sesi 2026-10-13)

`PRICE_WORD` diperluas di `businessFaq.ts` (sekalian membuat pertanyaan
pricelist bertopik materi jadi `indicative-price`); `isPertanyaanHarga`,
`jawabanPertanyaanHarga`, dan `HARGA_KE_TIM_ID/EN` ditambahkan di
`handleInbound.ts`.
