# ADR-0011: Jeda Percakapan dan Ambil Alih admin

Status: accepted

## Konteks

Admin membalas calon jemaah **lewat nomor bot yang sama** (nomor bisnis 6289507003830). Sebelum keputusan ini, setiap pesan masuk selalu diproses seam percakapan dan dibalas bot, sehingga balasan admin yang sedang menangani percakapan direbut bot dan percakapan manual rusak. Satu-satunya cara menghentikan balasan otomatis adalah mematikan proses, yang (a) bersifat global — semua pelanggan ikut tidak dilayani, (b) menghapus state percakapan karena store masih in-memory, dan (c) memaksa pendaftaran ulang webhook provider setiap kali proses dinyalakan lagi.

Keputusan pemilik (2026-10-10): kendali eksplisit lewat perintah WhatsApp dari `WHATSAPP_ADMIN_NUMBER` (ADR-0006), memakai opsi kill switch global + jeda per kontak.

## Keputusan

Tambahkan **gerbang jeda di layer server**, di luar seam `handleInbound` (pola skip `from === senderNumber` yang sudah ada):

- **Jeda Percakapan** per kontak dan **Nonaktif Sementara** global, dengan state persisten di `data/jeda-state.json` (tiket 01).
- Perintah admin (`#jeda`, `#lanjut`, `#bot off`, `#bot on`, `#status`) diproses **sebelum** seam dan sebelum gerbang, hanya dari nomor admin (tiket 02) — inilah jalan kembali saat bot nonaktif.
- Pesan yang masuk saat dijeda: **satu baris transkrip** sebagai calon jemaah apa adanya (termasuk sebutan lampiran), **tanpa balasan**, **tanpa** `conversations.load`/`save`, dan **tanpa** pemberitahuan apa pun ke pelanggan.
- **Tanpa auto-resume**: jeda berakhir hanya lewat perintah eksplisit `#lanjut`/`#bot on`.

Alasan: state alur (draft Permintaan Tindak Lanjut, mode pembaruan setelah handoff) dan riwayat percakapan kontak yang sedang ditangani admin harus tetap utuh sampai admin selesai; "bot berhenti membalas" dipisahkan dari "proses berhenti".

## Konsekuensi

- Selama jeda, calon jemaah **tidak menerima balasan apa pun** — bukan pemberitahuan "admin akan segera membalas". Invarian lama tetap berlaku: tidak ada janji waktu balasan.
- Pesan selama jeda hanya tersimpan di transkrip CSV (ADR-0007) sebagai catatan untuk pemilik; pesan itu **tidak** masuk riwayat konteks bot karena memasukkannya akan menggeser state alur (mis. dianggap jawaban pengumpulan kebutuhan) padahal admin yang sedang menangani.
- State jeda memuat nomor pelanggan di `data/` yang di-ignore git, sama seperti transkrip percakapan.
- Bila kelak `WHATSAPP_ADMIN_NUMBER` disamakan dengan nomor bot, jalur perintah perlu ditinjau ulang (pesan dari nomor bot saat ini di-skip di `src/server.ts`); di luar lingkup keputusan ini.
- Ambil Alih otomatis (bot menjeda sendiri saat admin membalas dari nomor bot) menunggu verifikasi perilaku webhook provider terhadap pesan keluar; sampai itu terverifikasi, perintah eksplisit tetap menjadi pemicu.
