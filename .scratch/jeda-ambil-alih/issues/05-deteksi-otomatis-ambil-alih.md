# 05: Ambil Alih otomatis (di luar cakupan saat ini)

**What to build:** Tidak ada perubahan untuk cakupan saat ini. Admin menggunakan perintah `#jeda <nomor>` dan `#lanjut <nomor>` secara manual dari nomor admin; deteksi otomatis pesan keluar tidak diaktifkan.

**Status:** wontfix

## Keputusan saat ini

- Kendali manual melalui perintah admin tetap menjadi satu-satunya cara Ambil Alih.
- Deteksi otomatis berdasarkan webhook pesan keluar provider tidak dikerjakan dalam cakupan saat ini.
- Tidak ada pengujian live yang diminta oleh tiket ini.
- Catatan bukti provider yang sudah ada dipertahankan sebagai referensi bila cakupan otomatisasi dipertimbangkan kembali: `.scratch/jeda-ambil-alih/evidence/05-provider-webhook.md`. Perilaku Fonnte yang belum diamati tetap tidak boleh dianggap sebagai bukti bahwa pesan keluar tidak dikirim ke webhook.

## Comments

- Keputusan pemilik: untuk sekarang gunakan cara manual dari admin dan keluarkan pekerjaan serta pengujian live Ambil Alih otomatis dari cakupan aktif. Jika otomatisasi diinginkan lagi, ajukan tiket baru dengan bukti provider yang sesuai.
