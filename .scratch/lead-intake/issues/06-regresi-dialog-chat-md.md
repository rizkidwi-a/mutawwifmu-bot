# 06: Regresi end-to-end dari dialog nyata chat.md

**What to build:** Pakai dialog nyata `data/chat.md` sebagai skenario tes regresi: setiap pesan calon jemaah diproses lewat seam `handleInbound` dan hasilnya diperiksa — tidak ada pesan yang salah dijawab topik lain (tidak ada misfire), pesan informasi tidak dijawab template yang tidak nyambung, dan kebutuhan utama skenario (tanggal, pax, layanan, kebutuhan visa, rute) muncul lengkap pada ringkasan admin.

**Blocked by:** 03: Ringkasan kebutuhan yang rapi untuk admin; 04: Penegasan bahwa Harga Indikatif dapat berubah setelah diperiksa admin

**Status:** ready-for-agent

- [ ] Skenario multi-giliran dari `data/chat.md` (minimal: pembukaan, penyebutan tanggal/pax/layanan, pertanyaan harga, perubahan kebutuhan) berjalan tanpa error.
- [ ] Tidak ada balasan yang berasal dari topik FAQ non-harga.
- [ ] Pesan basa-basi dibalas singkat tanpa merusak alur intake; pesan pertanyaan yang tidak didukung terbawa ke admin.
- [ ] Ringkasan admin untuk skenario memuat seluruh kebutuhan utama yang disebutkan dalam dialog.
- [ ] Kumpulan kasus misfire pada `.scratch/eval-classify.txt` dijadikan kasus tes negatif.

## Comments
