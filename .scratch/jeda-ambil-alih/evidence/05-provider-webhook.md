# Bukti webhook pesan keluar per provider

Status pemeriksaan: dokumentasi resmi ditinjau; pengamatan langsung Fonnte belum dilakukan. Fixture di `tests/fixtures/` dipakai untuk mengunci bentuk payload yang terdokumentasi, bukan diklaim sebagai tangkapan webhook live.

## Fonnte

Sumber: [Webhook Reply Message — Fonnte](https://docs.fonnte.com/webhook-reply-message/) (diakses 2026-10-10).

Kutipan: “Webhook make responding incoming message using custom data possible.” Contoh dokumentasi membaca `device`, `sender`, `message`, `timestamp`, dan `inboxid`; daftar *Available parameter* juga mencantumkan `Sender`, `Message`, `Timestamp`, dan `Inboxid`. Dokumentasi ini tidak menjelaskan event pesan yang dikirim dari nomor perangkat sendiri dan tidak mendefinisikan field `from_me`.

Fixture ilustratif berbasis field yang dicontohkan dokumentasi: `tests/fixtures/fonnte-incoming-message.json`. Tes transport memastikan payload tersebut diperlakukan sebagai pesan dari `sender`; fixture bukan payload live dan tidak membuktikan perilaku untuk pesan keluar.

**Hasil live belum diketahui.** `.scratch/webhook-aktif.md` mencatat proses bot dan tunnel sudah dihentikan serta URL webhook Fonnte sebelumnya tidak digunakan. Tanpa menyalakan endpoint dan mengirim satu pesan uji yang disetujui ke kontak uji, tidak ada dasar untuk menyatakan pesan dari nomor bot sampai atau tidak sampai ke webhook. Karena tebakan yang salah dapat membuat bot membalas ketika admin masih menangani percakapan, Ambil Alih otomatis Fonnte belum tersedia; gunakan `#jeda <nomor>` atau `#jeda`.

## WhatsApp Cloud API

Sumber: [Webhooks Notification Payload Reference — Meta](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components/) (diakses 2026-10-10).

Kutipan: “Messages webhooks describing a message sent by a business to a WhatsApp user have a different structure. You can easily identify these because they include a `statuses` array.” Meta juga menyatakan: “These webhooks don’t describe the contents of the outgoing message itself, only its status”. Dokumentasi menyebut status `sent`, `delivered`, dan `read`.

Subset payload contoh status `delivered` didokumentasikan di `tests/fixtures/whatsapp-cloud-outgoing-status.json`; tes adapter memastikan payload `statuses` itu tidak dikonversi menjadi pesan masuk. Transport tetap mencatat status melalui `catatStatusPengiriman`, tetapi status tidak dipakai sebagai pemicu Jeda Percakapan. Konten pesan keluar tidak tersedia pada webhook tersebut, sehingga tidak ada deteksi Ambil Alih otomatis; gunakan `#jeda <nomor>` atau `#jeda`.

## Kesimpulan aman

- Belum ada payload live Fonnte untuk pesan yang dikirim dari nomor bot; statusnya **belum terverifikasi**, bukan bukti bahwa Fonnte tidak mengirimkannya.
- Cloud API mendokumentasikan notifikasi status pesan keluar, bukan isi pesan keluar.
- Tidak ada kode deteksi otomatis yang ditambahkan. Jangan menyimpulkan pengambilalihan dari `from_me` yang tidak terdokumentasi, status read/delivered, atau tenggat waktu.
- Verifikasi Fonnte dapat dilanjutkan setelah webhook diaktifkan kembali dan kontak uji disetujui; simpan payload yang sudah meredaksi nomor/isi pribadi, lalu revisi keputusan tiket ini.
