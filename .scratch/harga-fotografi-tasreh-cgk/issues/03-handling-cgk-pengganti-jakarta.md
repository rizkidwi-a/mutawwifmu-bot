# 03 — Handling CGK Pengganti Angka BOOKLET

Status: resolved

What to build:
- `faqAnswer("price-airport-handling")`: ganti baris
  *Handling Bandara Jakarta IDR 350.000 per pax* menjadi
  **Handling Bandara CGK (keberangkatan dan kepulangan) IDR 300.000 per pax**
  (keputusan pemilik 2 — opsi a: harga sudah berubah dari BOOKLET).
- Dua baris Jeddah tidak berubah: SAR 300 per grup (kedatangan dan kepulangan)
  dan SAR 900 per grup (kepulangan + penjemputan, termasuk mutawwif gratis saat
  umroh 1x).
- Keterangan periode 2025–2026 hanya untuk daftar harga Jeddah (baris CGK
  berasal dari percakapan admin, bukan daftar itu) — penulisannya tidak boleh
  mengklaim angka CGK terikat periode itu.
- EN disesuaikan (`Jakarta Airport Handling` → `CGK Airport Handling`,
  IDR 300,000).

Blocked by: —

Catatan: `data/Vira Arman/chat.md` juga memuat cakupan CGK ("dari Mobil sampai
ke Bagasi dan dari Bagasi sampai kembali ke Mobil") — boleh disebut singkat
sebagai lingkup layanan tanpa menambah janji ketersediaan.

## Comments

Selesai (2026-10-13): baris Jakarta diganti menjadi
"Handling Bandara CGK (keberangkatan dan kepulangan) IDR 300.000 per pax —
mencakup pendampingan dari mobil ke bagasi dan dari bagasi kembali ke mobil";
kedua baris Jeddah tidak berubah dan keterangan periode 2025–2026 kini hanya
melekat pada baris Jeddah. EN disesuaikan (`CGK Airport Handling`, IDR
300,000). Entri non-harga `airport-handling` menyebut "Bandara Jakarta (CGK)".
Tes: `businessFaq.test.ts` memuat assert `doesNotMatch(/350[.,]000/)` dan
`indicativePricing.test.ts` memuat kasus seam CGK.
