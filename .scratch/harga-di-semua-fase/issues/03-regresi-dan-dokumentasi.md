# 03: Regresi transkrip nyata, dokumentasi, dan ADR

**What to build:** Kunci perilaku baru dengan regresi dari transkrip nyata dan
dokumentasikan keputusannya.

- Regresi: `apakah ada pricelistnya?` (transkrip nyata 21:35:21) dijawab
  (memuat penanganan tim), bukan sekadar "saya catat"; `Apa maksudnya dari
  kisaran anggaran?` tetap BUKAN jawaban harga; pernyataan bermuatan kata harga
  tetap bukan jawaban harga.
- `docs/adr/0015-pertanyaan-harga-di-semua-fase.md`: keputusan prinsip
  "pertanyaan harga selalu dijawab", dua jalur jawaban (Harga Indikatif /
  penawaran tim), batas pencatatan, dan hubungannya dengan ADR-0005, ADR-0009,
  ADR-0014 (termasuk pencabutan pengecualian `admin-routed`).
- `README.md`: bagian perilaku percakapan menyebut pertanyaan harga yang tetap
  dijawab setelah handoff/akhir percakapan.
- `CONTEXT.md`: perbarui istilah terkait bila perlu.

**Blocked by:** 01, 02

**Status:** resolved

- [x] Regresi transkrip nyata ditambahkan dan hijau.
- [x] ADR-0015 dibuat dengan status `accepted`.
- [x] `README.md` diperbarui.
- [x] `npm test` dan `npm run typecheck` hijau.

## Comments

### Implementasi (sesi 2026-10-13)

Regresi ditambahkan di `tests/conversation/pertanyaanHargaSemuaFase.test.ts`;
bukti repro tetap di `.scratch/harga-di-semua-fase/debug.md`. `CONTEXT.md` tidak
diubah: `Harga Indikatif` sudah menjadi istilah yang tepat dan jawaban
`HARGA_KE_TIM` bukan istilah domain baru (hanya penegasan bahwa penawaran
khusus ditangani admin, yang sudah tercakup istilah **Permintaan Tindak
Lanjut**).
