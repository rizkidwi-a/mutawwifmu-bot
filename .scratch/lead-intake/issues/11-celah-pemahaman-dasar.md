# 11: Tutup celah pemahaman yang tersisa di korpus dasar

**What to build:** Probe korpus saat ini 109/118 rute tepat (92%); `dasar.json`
masih 32/41. Sepuluh kasus tersisa terbagi dua kelas — kerjakan kelas A,
luruskan kelas B bersama pemilik:

**Kelas A — celah pola yang jelas (boleh dikerjakan langsung):**

| # | Pesan | Harapan korpus | Aktual | Dugaan akar masalah |
| --- | --- | --- | --- | --- |
| 1 | "biaya tur kotanya gimana?" | `faq`/`price-city-tour` | `handoff` | `\btur kota\b` tidak cocok karena akhiran `-nya` |
| 2 | "kendaraannya apa aja ya" | `faq`/`transport-fleet` | `handoff` | `\bkendaraan\b` tidak cocok karena akhiran `-nya` |
| 3 | "yang nemenin ibadah namanya apa ya" | `faq`/`mutawwif` | `handoff` | "nemenin/menemani" belum jadi penanda mutawwif (bandingkan "membimbing" pada tiket 09) |
| 4 | "mau kasih sedekah lewat kalian bisa?" | `faq`/`charity-program` | `handoff` | "sedekah" belum ada di pola charity |
| 5 | "keliling madinah bisa dibantu?" | `faq`/`city-tour-madinah` | `handoff` | "keliling" belum jadi penanda city tour |
| 6 | "brp hrg hotel di mekah?" | `faq`/`price-hotel` | `faq`/`hotel-accommodation` (topik meleset) | singkatan "hrg" belum ada di `PRICE_WORD` |

- Untuk #1–#2, tangani akhiran `-nya` secara sistematis (bukan tambalan per
  kata): tiket 09 sudah melakukannya untuk kata harga; jangan sampai
  memperlebar pola hingga menyeret pernyataan biasa.
- Untuk #3, ikuti pola tiket 09: "nemenin" hanya menandai mutawwif bila
  konteksnya ibadah/umroh dalam satu klausa.
- Invarian tetap: tanpa klaim harga final, tanpa janji ketersediaan; Harga
  Indikatif hanya untuk angka yang tercantum materi.

**Kelas B — bertabrakan dengan keputusan tercatat (butuh keputusan pemilik):**

| # | Pesan | Harapan korpus | Perilaku sekarang | Keputusan yang tercatat |
| --- | --- | --- | --- | --- |
| 7 | "boleh minta pricelist?" | `faq` | `handoff` | Tiket 08: permintaan penawaran/daftar harga → admin |
| 8 | "price list nya lengkap gak?" | `faq` | `handoff` | Pertanyaan kelengkapan daftar, bukan angka tertentu |
| 9 | "kisaran biaya hotel per malam brp ya?" | `faq`/`price-hotel` | `handoff` | ADR-0005/tiket 05: satuan "per malam" tidak tercantum materi, tidak ditafsirkan |
| 10 | "budget buat nginep di makkah kira-kira berapa" | `faq`/`price-hotel` | `handoff` | Kata "budget/anggaran" sengaja memicu `custom-quote-or-availability` |

Untuk kelas B: jangan membalikkan keputusan diam-diam. Pilih salah satu, lalu
catat alasannya di komentar tiket ini:

- **(i)** implementasi mengikuti korpus (mis. `pricelist` dijawab dengan
  Harga Indikatif topik terkait), disertai penyesuaian aturan/ADR; atau
- **(ii)** korpus diperbarui menjadi `handoff` karena perilaku sekarang yang
  benar, dengan alasan singkat per kasus.

**Blocked by:** none

**Status:** needs-triage

## Testing Decisions

- `node scripts/probe-cakupan.ts` sebelum/sesudah: kelas A menaikkan
  `dasar.json` dari 32/41 ke minimal 37/41 tanpa regresi korpus lain
  (`transkrip-nyata.json` 54/54, `topik-gap.json` 16/16, `varian-ejaan.json`
  6/6) dan tanpa mengubah `harapan` di luar keputusan kelas B.
- Setiap kasus kelas A ditambahkan sebagai tes tetap di
  `tests/conversation/classifyInbound.test.ts` agar tidak hanya terjaga probe.
- Kelas B: keputusan + alasan wajib tercatat; bila korpus diubah, ubah
  `tests/korpus/dasar.json` dengan komentar "catatan" yang menjelaskan
  alasan dan tanggal keputusan.
- `npm test` dan `npm run typecheck` tetap hijau.

## Comments

- Sumber: hasil `node scripts/probe-cakupan.ts` per 2026-10-10 (probe 109/118,
  92%) dan pembaruan handoff sesi di
  `.scratch/whatsapp-customer-service-chatbot/HANDOFF-SESI.md`.
- Tiket 08/09 menutup kelas over-faq dan varian ejaan; tiket ini menutup sisa
  false-negative parafrase yang sengaja tidak diseret ke sana agar lingkup
  tiket 08/09 tetap sempit.
- Kandidat alternatif: sebagian kelas A bisa diserahkan ke lapisan pemaham
  Gemini (`classifyDenganFallback`, ADR-0008) bila diputuskan dipasang ke
  runtime; tetapi pola `-nya`, "sedekah", dan "hrg" tetap layak diperbaiki di
  regex karena murah dan tidak berisiko.
