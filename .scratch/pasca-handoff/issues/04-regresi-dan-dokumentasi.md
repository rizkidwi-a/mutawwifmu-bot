# 04: Regresi transkrip nyata, dokumentasi, dan ADR

**What to build:** Kunci perilaku baru dengan regresi dari transkrip nyata dan
dokumentasikan keputusannya.

- Regresi: urutan nyata `halo` → `tidak` → `halo` pada nomor `6285275258899`
  (lihat `.scratch/pasca-handoff/debug.md`) tidak lagi menghasilkan
  `"Terima kasih atas pesan Anda."` telanjang; balasannya memuat Menu Lanjutan.
- `CONTEXT.md`: tambahkan istilah **Menu Lanjutan** dan **Ulangi Percakapan**.
- `docs/adr/0014-pasca-handoff-menu-lanjutan.md`: keputusan menu lanjutan +
  ulangi percakapan pasca-handoff, termasuk memperjelas hubungannya dengan
  "reset seluruh draft" yang dulu di luar lingkup `.scratch/penyela-pengumpulan`.
- `README.md`: bagian perilaku percakapan menyebut perilaku pasca-handoff.

**Blocked by:** 01, 02, 03

**Status:** resolved

- [x] Regresi transkrip nyata untuk loop pasca-handoff ditambahkan dan hijau.
- [x] Istilah baru tercatat di `CONTEXT.md`.
- [x] ADR-0014 dibuat dengan status `accepted`.
- [x] `npm test` dan `npm run typecheck` hijau.

## Comments

### Implementasi (sesi 2026-10-13)

Regresi ditambahkan di `tests/conversation/pascaHandoff.test.ts` (kasus "halo →
tidak → halo"); ringkasan bukti tetap di `.scratch/pasca-handoff/debug.md`.
