# 03 — Pembaruan Angka dan Satuan

Status: resolved

What to build:
- Ganti seluruh angka transportasi lama (BOOKLET) pada template
  `price-transport` dengan angka tabel terbaru (2026-10-12), termasuk
  menghapus frasa lama "mulai ... hingga ..." yang tidak lagi sesuai.
- Terapkan satuan yang dikonfirmasi (asumsi: SAR per kendaraan/per grup) secara
  konsisten pada label harga; format angka memakai pemisah ribuan titik
  (mis. `SAR 1.550`) — normalisasi format saja, nilai verbatim.
- Pertahankan catatan bila satuan dari sumber masih belum konsisten (keputusan
  terbuka spec) — jangan menafsirkan satuan sendiri.

## Comments

Selesai (2026-10-13): keputusan pemilik — satuan **SAR per kendaraan (per
grup)**, angka tabel 2026-10-12 menggantikan angka BOOKLET sepenuhnya. Format
angka: pemisah ribuan titik (id) / koma (en); nilai verbatim dari tabel. Baris
generik "Hotel ..." dibaca: Ayesha/Jurana/Qarn dari hotel Makkah; stasiun
mengikuti konteks kota.

Blocked by: 01, 02, dan konfirmasi keputusan terbuka spec (satuan harga;
penggantian penuh angka BOOKLET; interpretasi baris "Hotel ..." generik).
