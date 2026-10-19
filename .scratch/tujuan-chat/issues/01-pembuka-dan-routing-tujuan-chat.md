# 01: Tambahkan pembuka dan routing tujuan chat

**What to build:** Pada awal percakapan baru, kirim sapaan/pengantar Mutawwifmu dan menu tujuan chat. Jika pengguna membuka dengan salam, balas dengan “Waalaikumsalam Wr. Wb”; jika tidak, gunakan sapaan netral. Setelah pengantar, tampilkan pilihan: (1) calon jemaah/informasi paket, (2) vendor/mitra bisnis, (3) tim internal Mutawwifmu, atau (4) keperluan lain/ingin menghubungi admin. Pilihan calon jemaah melanjutkan intake yang ada. Pilihan lainnya langsung membuat handoff berkategori ke admin tanpa masuk ke intake calon jemaah. Pertahankan jalur handoff langsung untuk permintaan admin/manusia, darurat, dan perjalanan aktif. Sertakan fallback teks bernomor bila kontrol interaktif tidak didukung provider WhatsApp aktif.

**Blocked by:** -

**Status:** resolved

- [x] Percakapan baru mendapat pengantar layanan dan pilihan tujuan; pengantar menggunakan teks yang disetujui pemilik.
- [x] Sapaan “Waalaikumsalam Wr. Wb” hanya digunakan sebagai balasan saat pesan pengguna berisi salam; selain itu gunakan sapaan netral.
- [x] Pilihan calon jemaah masuk ke alur intake yang sudah ada tanpa mengubah perilakunya.
- [x] Pilihan vendor/mitra, tim internal, dan keperluan lain langsung handoff dengan kategori yang benar, tanpa pertanyaan intake calon jemaah.
- [x] Handoff admin memuat identitas dan kategori/alasan serta konteks ringkas bila tersedia, tanpa riwayat percakapan penuh.
- [x] Pemicu permintaan admin/manusia, darurat, dan perjalanan aktif tetap dapat handoff tanpa menunggu pilihan menu.
- [x] Jawaban menu tidak dikenal meminta pengguna memilih ulang dan tidak salah masuk ke intake.
- [x] Menu pembuka tidak dikirim berulang pada percakapan yang sudah berjalan.
- [x] Tes mencakup tiap pilihan, fallback, handoff langsung, dan regresi alur intake yang ada.

## Comments

- Pemilik menyetujui rencana: pembuka layanan ditampilkan sebelum pilihan tujuan chat; calon jemaah melanjutkan intake, sedangkan vendor/mitra, tim internal, dan keperluan lain dapat langsung di-handoff ke admin.
- Implementasi selesai: provider aktif Fonnte memakai fallback teks bernomor; kategori handoff non-calon-jemaah diteruskan tanpa riwayat chat.
- Verifikasi ulang (sesi 2026-10-15): seluruh kriteria penerimaan tertutup oleh `tests/conversation/tujuanChat.test.ts`, `pertanyaanHargaSemuaFase.test.ts`, dan suite regresi handoff/intake; `npm test` 492 lolos (termasuk 11 kasus baru tiket 02) dan `npm run typecheck` bersih. Pelengkap dokumentasi: entri domain **Menu Tujuan Chat** ditambahkan ke `CONTEXT.md` karena sebelumnya hanya dirujuk sebagai istilah _avoid_ tanpa definisi.
