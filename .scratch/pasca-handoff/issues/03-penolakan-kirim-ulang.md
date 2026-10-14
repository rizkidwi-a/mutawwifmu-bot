# 03: Penolakan pengiriman ulang diikuti Menu Lanjutan

**What to build:** Saat state `awaiting-revision-consent` dan calon jemaah
menolak pengiriman ulang ("tidak"), balasan penolakan diikuti Menu Lanjutan
sehingga ada langkah berikutnya (perbarui bagian atau ulangi percakapan).
Perubahan yang sudah dicatat tetap tersimpan dan tetap dibawa pada putaran
berikutnya (invarian tiket 05 lead-intake).

**Blocked by:** 01

**Status:** resolved

- [x] Menolak pengiriman ulang membalas penolakan + Menu Lanjutan.
- [x] `changeNotes` tidak hilang setelah penolakan.
- [x] Penolakan pada state `awaiting-consent`/`awaiting-handoff-consent`
      tidak berubah (kembali ke idle/handoff).
- [x] Tes baru/lama di `tests/conversation/`; suite existing hijau.

## Comments

### Implementasi (sesi 2026-10-13)

Cabang `awaiting-revision-consent` + `menolak` memakai
`balasanDenganPrompt(CONSENT_REFUSED, MENU_LANJUTAN)`; cabang `ditolak` umum
tetap untuk state persetujuan lain.
