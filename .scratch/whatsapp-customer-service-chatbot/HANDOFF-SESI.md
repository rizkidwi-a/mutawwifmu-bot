# Handoff Sesi (ARSIP) — s.d. 2026-10-11

> **Diarsipkan 2026-10-13.** Handoff aktif sekarang ada di
> [`.scratch/HANDOFF-SESI.md`](../HANDOFF-SESI.md). Dokumen ini disimpan hanya
> sebagai penunjuk; seluruh riwayat lengkapnya tetap ada di riwayat git
> (`git log -- .scratch/whatsapp-customer-service-chatbot/HANDOFF-SESI.md`).

## Bagian yang dihapus dari dokumen ini (2026-10-13)

Bagian berikut sudah tidak relevan lagi dan dibuang, karena penggantinya sudah
ada di handoff baru atau di dokumen lain:

1. Header & "Tujuan sesi berikutnya" versi 2026-10-10/11 — fokusnya (uji coba +
   keputusan Gemini) sudah bergantian; lihat handoff baru.
2. Angka-angka basi (294 tes) — diganti 407 tes.
3. Detail blok "Celah pemahaman dasar (tiket 11)" — murni historis, semua `resolved`.
4. "Skenario uji coba" 11 langkah lama — usang setelah fitur `tujuan-chat`,
   `jeda-ambil-alih`, `penyela-pengumpulan`, dan perubahan intake 13 Okt.
5. Peringatan "jangan mulai perubahan perilaku baru sebelum evaluasi" — tidak
   berlaku lagi; perubahan perilaku sudah terjadi.
6. Bagian EC2 yang usang (klaim "hidup dan teruji", tmux lama) — diganti status
   terkini di handoff baru. Catatan operasional yang masih berguna sudah
   dipindahkan ke sana.
7. "Konteks singkat" lama — rujukan kadaluarsa ("issues/01–10", "289 tes",
   ADR tanpa 0011/0012); versi mutakhir ada di handoff baru.

## Yang dipindahkan ke handoff baru

Runbook menjalankan bot, perintah harian EC2/SSH, catatan tmux, usulan
pengerasan systemd, larangan menulis isi `.env`/`.pem`, larangan generasi angka,
dan daftar pekerjaan open — semuanya telah dipindahkan/diperbarui ke
`.scratch/HANDOFF-SESI.md`.
