# 05: Verifikasi pesan keluar provider & Ambil Alih otomatis

**What to build:** Verifikasi apakah pesan yang dikirim **dari nomor bot** (mis. admin membalas pelanggan lewat perangkat tertaut WhatsApp yang sama) sampai ke endpoint webhook kita, lalu manfaatkan bila memungkinkan:

1. **Verifikasi per provider.** Fonnte (provider aktif — `.scratch/webhook-aktif.md`): periksa dokumentasi resmi + amati payload webhook nyata (kirim satu pesan dari nomor bot ke kontak uji, lihat apakah `POST /webhook` terpanggil dan apa field-nya, mis. `from_me`). Cloud API: catat perilakunya dari dokumentasi Meta (status `sent/delivered/read` sudah dicatat `catatStatusPengiriman`; pesan keluar biasanya tidak dikirim ke webhook `messages`). Bukti didokumentasikan: fixture payload + kutipan dokumentasi.
2. **Bila pesan keluar teramati:** implementasikan **Ambil Alih otomatis** — saat admin mengirim pesan ke kontak dari nomor bot, kontak itu otomatis masuk Jeda Percakapan (lewat port state jeda tiket 01, memakai gerbang tiket 03), dengan konfirmasi singkat ke nomor admin yang menyebut nomor kontak dan cara `#lanjut`. Jeda manual (`#jeda`) tetap ada sebagai pemicu eksplisit.
3. **Bila tidak teramati:** catat keterbatasan ini per provider di README bagian "Jeda & Ambil Alih" — Ambil Alih otomatis tidak tersedia, perintah `#jeda` adalah satu-satunya pemicu. **Jangan** mengarang deteksi dari sinyal lain (status read, tenggat waktu, dsb.): tebakan yang salah berarti bot membalas lagi di tengah percakapan admin.

**Blocked by:** 03: Gerbang jeda pada jalur pesan masuk

**Status:** needs-info

- [ ] Bukti tercatat (fixture payload + kutipan dokumentasi/hasil amatan) tentang apakah pesan keluar dari nomor bot sampai ke webhook, per provider (Fonnte dan Cloud API).
- [ ] Bila teramati: Ambil Alih otomatis diimplementasikan di layer transport/server (bukan di seam percakapan), dengan tes memakai fixture payload nyata; konfirmasi ke admin tanpa janji waktu balasan.
- [ ] Bila tidak teramati: keterbatasan didokumentasikan di README per provider; tidak ada kode deteksi spekulatif yang ditambahkan.
- [x] Field provider (`from_me` dsb.) hanya dibaca di `src/adapters/*`; layer percakapan dan state jeda tetap provider-agnostic.
- [x] `npm test` dan `npm run typecheck` tetap hijau (353 tes lulus).

## Prosedur verifikasi live (admin)

Lakukan hanya setelah server bot dan tunnel HTTPS aktif, URL webhook terbaru sudah terdaftar di Fonnte, dan `/metrics` merespons 200. Pakai nomor uji milik admin atau kontak yang sudah setuju; jangan gunakan percakapan calon jemaah sungguhan.

1. Dari nomor `WHATSAPP_ADMIN_NUMBER`, kirim ke chat nomor bot: `#jeda <nomor-uji>`. Tunggu konfirmasi jeda. Ini mencegah bot membalas nomor uji jika webhook menganggap pesan keluar sebagai pesan dari kontak.
2. Dari perangkat tertaut yang memakai nomor bot (`WHATSAPP_SENDER_NUMBER`), kirim **pesan biasa** ke nomor uji dengan teks unik, misalnya `UJI-WEBHOOK-OUTGOING-<tanggal-jam>`. Pesan ini dikirim ke nomor uji, **bukan** ke chat bot; jangan gunakan `#jeda` sebagai pesan uji provider.
3. Amati apakah `POST /webhook` terpanggil. Catat bentuk payload/field pengirim yang diterima (mis. `sender`, `from_me`, atau `statuses`) dan hasilnya. Simpan fixture yang sudah meredaksi nomor pribadi, token, serta data sensitif; jangan menyimpulkan hasil dari status terkirim/terbaca saja.
4. Setelah pengamatan, dari nomor `WHATSAPP_ADMIN_NUMBER` kirim ke chat nomor bot: `#lanjut <nomor-uji>` dan tunggu konfirmasi agar Jeda Percakapan uji berakhir.

## Testing Decisions

- Hasil verifikasi diuji lewat fixture payload webhook yang didokumentasikan (pola `tests/transport/endToEndFonnte.test.ts` yang sudah ada), bukan asumsi dari bentuk payload.
- Ambil Alih otomatis (bila ada) memakai jalur yang sama dengan `#jeda` manual sehingga efeknya teruji sekali (gerbang tiket 03).

## Comments

- Sumber: rekomendasi sesi 2026-10-10 — deteksi otomatis menyusul setelah perilaku Fonnte terverifikasi (`.scratch/jeda-ambil-alih/spec.md` Ruang Lingkup #5).
- Dugaan awal yang harus dibuktikan, bukan diandalkan: server sekarang me-skip pesan dengan `from === senderNumber` (`src/server.ts`), yang menyiratkan payload dari nomor sendiri pernah terlihat — tetapi bentuk field pengirim untuk pesan keluar (apakah `sender` berisi nomor kontak atau nomor bot) belum diketahui dan menentukan apakah auto-jeda bisa dipasang.
- Pemeriksaan 2026-10-10: kutipan dokumentasi resmi, fixture terdokumentasi, dan batas kesimpulan dicatat di `.scratch/jeda-ambil-alih/evidence/05-provider-webhook.md`. Tes mengunci fixture payload pesan masuk Fonnte dan status outgoing Cloud API; tidak ada deteksi otomatis yang ditambahkan. Catatan `.scratch/webhook-aktif.md` menyatakan proses/tunnel Fonnte nonaktif, sehingga pengamatan pesan dari nomor bot belum dilakukan. Status `needs-info` sampai endpoint aktif dan payload live dari satu pesan uji yang disetujui tersedia; jangan menyimpulkan Fonnte tidak mengirim pesan keluar dari dokumentasi yang ada.
- Prosedur uji live untuk admin ditambahkan di atas: `#jeda <nomor-uji>`, pesan bertanda unik dari perangkat tertaut bot ke nomor uji, amati POST webhook, lalu `#lanjut <nomor-uji>`. Prosedur ini belum dijalankan.
- Pemeriksaan read-only lanjutan: API profil Fonnte merespons HTTP 200 (`status=true`, `device_status=connect`), tetapi tidak mengembalikan konfigurasi URL webhook; `GET http://127.0.0.1:3000/metrics` gagal dengan `ECONNREFUSED`. Catatan `.scratch/webhook-aktif.md` tidak ditemukan saat pemeriksaan ini. Tidak ada pesan dikirim atau pengaturan provider diubah, jadi perilaku webhook pesan keluar masih belum diketahui.
