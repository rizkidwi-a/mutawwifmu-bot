# 06: Aktifkan nomor WhatsApp produksi

**What to build:** Setelah nomor produksi berada dalam kendali MUTAWWIFMU, calon jemaah dapat menghubungi bot melalui nomor tersebut dengan perilaku percakapan yang sama seperti pada nomor pengembangan.

**Blocked by:** 01: Sambungkan WhatsApp melalui nomor pengembangan; 02: Teruskan Permintaan Tindak Lanjut dengan persetujuan; 03: Jawab FAQ Private Premium Umrah; 04: Jawab FAQ layanan lain dalam profil; 05: Tampilkan Harga Indikatif dengan peringatan; prasyarat eksternal: pengguna memiliki akses dan dapat menyelesaikan verifikasi nomor produksi

**Status:** ready-for-human

- [ ] Nomor produksi dikonfigurasi melalui provider yang dipilih setelah akses dan verifikasi tersedia.
- [ ] Pesan masuk dan balasan keluar berhasil diuji end-to-end melalui nomor produksi.
- [x] Penggantian nomor tidak mengharuskan perubahan pada perilaku percakapan bot.
- [ ] Informasi kontak publik yang dikendalikan MUTAWWIFMU diperbarui agar calon jemaah menggunakan nomor produksi yang aktif.
- [x] Handoff ke admin dan jalur FAQ tetap berfungsi setelah cutover.
- [x] Batasan migrasi riwayat percakapan dari nomor sebelumnya dijelaskan; jangan menjanjikan riwayat berpindah jika provider tidak mendukungnya.

## Comments

### Implementasi software tiket 06 (agent)

Konteks: nomor produksi belum berada dalam kendali MUTAWWIFMU — akses dan verifikasi nomor adalah tindakan pemilik, sehingga poin 1, 2, dan 4 belum dapat diselesaikan sesi ini. Pekerjaan software diselesaikan lebih dulu agar cutover nanti tinggal konfigurasi + uji live.

Hasil kerja:

- `src/cutoverPreflight.ts` + `src/cutoverCheck.ts` (`npm run cutover:check`) — penilaian kesiapan konfigurasi sebelum cutover: konfigurasi provider lengkap (sesuai `WHATSAPP_PROVIDER`) dan nomor pengirim bukan nomor pengembangan `+62 895 0700 3830`. Keluar dengan kode 1 bila belum siap. Memperketat kriteria runbook "tidak ada nilai nomor pengembangan yang tertinggal di konfigurasi".
- `tests/transport/cutoverParity.test.ts` — bukti poin 3 dan 5 pada seam wiring: perilaku terlihat (balasan + tindakan + metrik) identik saat nomor pengirim diganti ke nomor produksi, serta jalur FAQ dan handoff ke admin tetap berfungsi dengan konfigurasi nomor produksi. Verifikasi ulang live tercakup langkah smoke test (poin 2). Tidak ada perubahan kode pada `src/conversation/`.
- `docs/whatsapp-number-cutover.md` — langkah cutover diperluas: gate `npm run cutover:check` (langkah 4), smoke test end-to-end yang mencakup jalur FAQ + handoff + metrik (langkah 6, poin 2 dan 5), langkah perbarui informasi kontak publik (langkah 7, poin 4: daftar permukaan yang dikendalikan MUTAWWIFMU), serta bagian baru "Batasan migrasi riwayat percakapan" (poin 6: riwayat tidak berpindah antar nomor karena provider tidak mendukungnya — jangan menjanjikan pemindahan riwayat).
- README — `npm run cutover:check` dan rujukan batasan migrasi riwayat percakapan.

Tes: 162 tes hijau (`npm test`, bertambah 10: 7 tes preflight + 3 tes cutover parity), `npm run typecheck` bersih.

Gate pra-produksi yang tetap terbuka — keputusan pemilik dan **tidak dikunci** di sesi ini: kanal penerimaan admin masih `LoggingAdminChannel` (sementara); keputusan kanal final dicatat sebagai ADR sebelum handoff dipakai di produksi (lihat README bagian Handoff ke admin).

Sisa tindakan manusia (alasan status `ready-for-human`):

1. Pilih dan miliki nomor produksi yang dapat menerima OTP dan disetujui untuk WhatsApp Business Platform, lalu verifikasikan pada provider terpilih (langkah 1–3 runbook).
2. Isi `.env` dengan identitas nomor produksi, jalankan `npm run cutover:check` sampai menyatakan siap, lalu restart proses bot (langkah 4–5).
3. Smoke test end-to-end melalui nomor produksi: balasan awal, pertanyaan FAQ, dan handoff dengan persetujuan (langkah 6) — laporkan hasilnya di sini.
4. Perbarui informasi kontak publik yang dikendalikan MUTAWWIFMU (situs, Instagram, booklet, materi lain) ke nomor produksi yang aktif (langkah 7).
5. Keputusan kanal admin (gate pra-produksi, terpisah dari cutover nomor).

Setelah poin 1–4 terpenuhi dan dikonfirmasi, tiket dapat ditinjau ulang untuk dinyatakan `resolved`.
