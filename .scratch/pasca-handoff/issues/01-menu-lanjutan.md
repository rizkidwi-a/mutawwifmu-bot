# 01: Menu Lanjutan pasca-handoff menggantikan basa-basi telanjang

**What to build:** Saat state `sent` (Ringkasan Kebutuhan sudah terkirim) dan
pesan calon jemaah basa-basi atau tidak dikenali sebagai pembaruan/pertanyaan
spesifik, bot membalas **Menu Lanjutan** yang menyebut (a) bagian yang dapat
diperbarui beserta contoh kata kunci ("ubah jumlah jemaah") dan (b) cara
mengulang percakapan ("ulangi"). Pesan pemicunya tidak dicatat sebagai
Perubahan/pertanyaan sehingga "halo" tidak muncul di Ringkasan Kebutuhan dan
tidak meminta persetujuan kirim ulang. Balasan basa-basi berulang selalu
memberi Menu Lanjutan yang sama — tidak ada lagi `"Terima kasih atas pesan
Anda."` telanjang.

**Blocked by:** —

**Status:** resolved

- [x] Basa-basi pada state `sent` ("halo", "terima kasih", "assalamualaikum")
      dijawab Menu Lanjutan (ID/EN), bukan `BASA_BASI` kosong.
- [x] Pesan basa-basi itu tidak menambah `changeNotes`/`notedQuestions` dan
      tidak meminta persetujuan pengiriman ulang.
- [x] Balasan berulang tetap memuat Menu Lanjutan (tidak macet).
- [x] Perbaikan bidang berkata kunci ("ubah jumlah jemaah") tidak terpengaruh.
- [x] Tes baru di `tests/conversation/pascaHandoff.test.ts`; suite existing hijau.

## Comments

### Implementasi (sesi 2026-10-13)

`MENU_LANJUTAN_ID/EN` ditambahkan; cabang basa-basi `step()` mengembalikan Menu
Lanjutan saat `state.kind === "sent"`. `nextState()` tidak berubah di sini
(basa-basi tetap mempertahankan state `sent`).
