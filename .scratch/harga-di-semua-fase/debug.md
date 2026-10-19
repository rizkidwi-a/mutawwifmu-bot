# Debug: pertanyaan harga tidak dijawab di akhir percakapan dan setelah handoff

Tanggal: 2026-10-13
Sumber bukti: repro seam `handleInbound` (`.scratch/harga-di-semua-fase/repro.ts`),
`data/transkrip-percakapan.csv` (nomor `6285275258899`).

## Gejala yang dilaporkan

Bot sering tidak menjawab pertanyaan tentang harga di akhir percakapan atau
setelah percakapan di-handoff ke admin — percakapan sudah berada di "bagian
chat 'Terima kasih atas pesan Anda.'" sehingga pertanyaan kisaran harga dan
sejenisnya ditelan balasan pengakuan atau sekadar dicatat.

## Root cause

Satu penyebab bersama: **hanya `routing.kind === "indicative-price"` yang
memperoleh jawaban harga, itupun hanya di cabang `collecting`/`reasking-field`/
`sent`. Fase lain tidak memiliki jalur jawaban harga sama sekali**, sehingga
pertanyaan harga jatuh ke balasan pengakuan (`BASA_BASI`) atau ke jalur
pencatatan pertanyaan tanpa jawaban.

Rinci per fase (hasil repro):

| Fase | Pesan | Balasan sebelum perbaikan |
| --- | --- | --- |
| `admin-routed` (menu tujuan 2/3/4, agen) | `Berapa harga fotografer?` | `Terima kasih atas pesan Anda.` |
| `admin-routed` | `kisaran harga paket umrah berapa?` | `Terima kasih atas pesan Anda.` |
| `awaiting-question` (sesudah "mau tanya") | `Berapa harga fotografer?` | `Baik, akan saya simpan di bagian pertanyaan...` (materi ada, tetap tidak dijawab) |
| `awaiting-consent` (menunggu persetujuan) | `Berapa harga fotografer?` | `Terima kasih, pertanyaan Anda saya catat...` (materi ada, tetap tidak dijawab) |
| `sent` (ringkasan terkirim) | `kisaran harga paket umrah berapa?` | `Terima kasih, pertanyaan Anda saya catat...` (tanpa jawaban harga) |
| `sent` | `apakah ada pricelistnya?` | `Terima kasih, pertanyaan Anda saya catat...` (tanpa jawaban harga) |
| `collecting` (penyela) | `mau tanya, kisaran harga paket umrah berapa?` | `Baik, akan saya simpan di bagian pertanyaan...` (tanpa jawaban harga) |
| `awaiting-handoff-consent` | `Berapa harga fotografer?` | lead handoff saja (tanpa jawaban harga) |

Kondisi khusus yang memperparah laporan:

1. **`admin-routed`** (`.scratch/pasca-handoff/debug.md` dulu menandainya di
   luar lingkup) membalas `BASA_BASI` untuk **setiap** pesan — termasuk
   pertanyaan harga yang angkanya justru ada di materi. Inilah "bagian chat
   'Terima kasih atas pesan Anda.'" yang dilaporkan.
2. **Pertanyaan harga tanpa angka materi** ("harga paket umrah", "harganya
   berapa?", "pricelist") terklasifikasi `handoff/custom-quote-or-availability`
   (atau `unsupported-question` untuk "pricelist" — kata "pricelist" bahkan
   tidak dikenali `PRICE_WORD`), sehingga di mana pun masuknya ia hanya
   dicatat sebagai pertanyaan untuk admin, tidak pernah dijawab.
3. Transkrip nyata memuat kasus ini: `saya ingin bertanya, apakah ada
   pricelistnya?` (21:35:21) hanya dibalas "Baik, akan saya simpan di bagian
   pertanyaan dan nanti dikonfirmasi admin." dan tenggelam sebagai baris
   "- Pertanyaan yang dicatat" pada Ringkasan.

## Yang BUKAN penyebab

- Jeda/ambil-alih admin (`#jeda`/`#lanjut`, ADR-0011) — tidak memanggil seam
  sama sekali; state hanya bertahan apa adanya.
- Materi harga — materi cukup untuk mutawwif, visa/dokumen, hotel, transport
  per rute, airport handling, city tour, tasreh, fotografi; yang tidak ada
  angkanya (paket/land arrangement, pricelist umum) memang tidak boleh
  dikarang (invarian "angka tidak boleh digenerasi").

## Catatan tentang repro sesi sebelumnya

`.scratch/harga-pasca-handoff/repro.ts` (commit `67cc073`) memakai pembantu tes
`Percakapan` yang otomatis mengirim "Halo" lalu "1" (calon jemaah), sehingga
skenario "admin-routed"-nya tidak pernah benar-benar mencapai state
`admin-routed` — kesimpulan "0 kasus BASA_BASI" pada commit itu tidak berlaku
untuk kasus yang dilaporkan. Repro lama digantikan `repro.ts` di direktori ini
(driver riwayat mentah tanpa auto-pilih menu) yang mengonfirmasi delapan titik
gagal pada tabel di atas.

## Keputusan perbaikan

Lihat `.scratch/harga-di-semua-fase/spec.md` dan tiket `01`–`03`:

1. Pertanyaan harga **selalu dijawab** di semua fase: Harga Indikatif bila
   angkanya tercantum materi; penjelasan bahwa penawaran/konfirmasi harga
   ditangani tim bila tidak — tidak pernah jatuh ke `BASA_BASI` telanjang.
2. "pricelist" dkk. dikenali sebagai kata penanda harga.
3. Pencatatan ke Bagian Pertanyaan tidak berubah: pertanyaan yang dijawab dari
   materi tidak dicatat; pertanyaan harga yang butuh tindak lanjut admin tetap
   dicatat dan ikut Ringkasan (invarian tiket 10).
