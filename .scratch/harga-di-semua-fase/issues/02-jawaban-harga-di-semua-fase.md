# 02: Pertanyaan harga dijawab di semua fase percakapan

**What to build:** Sambungkan `jawabanPertanyaanHarga` ke setiap cabang
`step()` yang selama ini menelan pertanyaan harga, tanpa mengubah perilaku
pencatatan yang sudah dikunci tes:

- `admin-routed`: pertanyaan harga dijawab (Harga Indikatif / `HARGA_KE_TIM`)
  menggantikan `BASA_BASI`; pesan non-harga tetap `BASA_BASI`.
- `sent`/`awaiting-revision-consent`: pertanyaan harga tanpa materi dijawab
  `HARGA_KE_TIM` di depan lead pencatatan, lalu tetap meminta persetujuan
  pengiriman ulang (pertanyaannya tetap masuk Bagian Pertanyaan).
- `awaiting-consent`: pertanyaan harga dijawab lebih dulu, lalu permintaan
  konfirmasi persetujuan diulang; yang bermateri tidak lagi dicatat sebagai
  pertanyaan (konsisten dengan `collecting`/`sent`).
- `awaiting-question`: isi pertanyaan berupa harga dijawab langsung (bukan
  "akan saya simpan di bagian pertanyaan"); yang bermateri tidak dicatat.
- `collecting`/penyela/`reasking-field`: jawaban harga digabung di depan lead
  yang berlaku; pencatatan tetap seperti semula.
- `awaiting-handoff-consent`: jawaban Harga Indikatif digabung dengan
  persetujuan handoff; pertanyaan harga tanpa materi sudah terjawab oleh lead
  handoff `custom-quote-or-availability` (tanpa duplikasi).

**Blocked by:** 01

**Status:** resolved

- [x] `admin-routed` tidak lagi membalas `BASA_BASI` untuk pertanyaan harga.
- [x] `sent` menjawab "kisaran harga paket umrah berapa?" dan "apakah ada
      pricelistnya?" dengan `HARGA_KE_TIM` + tetap mencatat + meminta
      persetujuan pengiriman ulang.
- [x] `awaiting-consent` menjawab "Berapa harga fotografer?" (Harga Indikatif)
      lalu mengulang konfirmasi persetujuan; pertanyaan bermateri tidak masuk
      `notedQuestions`.
- [x] `awaiting-question` menjawab isi pertanyaan berupa harga.
- [x] Pemicu mendesak, basa-basi, pernyataan bermuatan kata harga, Perbaikan
      Bidang, dan Ulangi Percakapan tidak berubah.
- [x] Suite existing hijau (termasuk `topikGapHandoff` dan `indicativePricing`).

## Comments

### Implementasi (sesi 2026-10-13)

Cabang `admin-routed`, blok `awaiting-question`, cabang `menyela`,
`reasking-field`, `next.kind === "awaiting-consent"`, `next.kind ===
"collecting"`, dan `next.kind === "awaiting-revision-consent"` pada `step()`
digabungkan dengan `jawabanPertanyaanHarga`; `nextState()` mengeluarkan
pertanyaan harga bermateri dari pencatatan pada `awaiting-consent` dan
`awaiting-question`.
