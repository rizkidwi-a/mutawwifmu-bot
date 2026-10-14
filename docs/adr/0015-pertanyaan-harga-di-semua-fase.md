# ADR-0015: Pertanyaan Harga Dijawab di Semua Fase Percakapan

Status: accepted

## Konteks

Pemilik melaporkan bot sering tidak menjawab pertanyaan tentang harga di akhir
percakapan atau setelah percakapan di-handoff ke admin: pada fase itu balasan
bot berputar di sekitar `"Terima kasih atas pesan Anda."` dan
`"Terima kasih, pertanyaan Anda saya catat..."`, sehingga pertanyaan kisaran
harga dan sejenisnya tidak pernah terjawab — termasuk yang angkanya justru
tercantum materi. Reproduksi seam dan tabel per fase:
`.scratch/harga-di-semua-fase/debug.md`.

Akar masalahnya struktural: hanya `routing.kind === "indicative-price"` yang
memiliki jalur jawaban harga, dan jalur itu hanya ada di `collecting`,
`reasking-field`, dan `sent`. Akibatnya:

- `admin-routed` (pilihan menu tujuan Vendor/Tim internal/Keperluan lain —
  status yang oleh ADR-0014 sengaja dibiarkan apa adanya) membalas `BASA_BASI`
  untuk **setiap** pesan, termasuk pertanyaan harga bermateri;
- `awaiting-question` (setelah "mau tanya") dan `awaiting-consent` (menunggu
  persetujuan penerusan) mencatat pertanyaan harga tanpa menjawabnya;
- pertanyaan harga tanpa angka materi ("kisaran harga paket umrah",
  "harganya berapa?", "apakah ada pricelistnya?" — yang terakhir bahkan tidak
  dikenali `PRICE_WORD`) tidak pernah dijawab di fase mana pun karena
  terklasifikasi `handoff/custom-quote-or-availability` atau
  `unsupported-question` (ADR-0005, ADR-0009).

## Keputusan

**Prinsip: setiap pertanyaan harga selalu memperoleh jawaban harga di semua
fase percakapan.** Implementasinya di seam `handleInbound` (state tetap
diturunkan dari riwayat):

- **Dua jalur jawaban.** Pertanyaan harga bertopik materi dijawab template
  Harga Indikatif (ADR-0005) apa pun fase-nya. Pertanyaan harga yang angkanya
  tidak tercantum materi dijawab `HARGA_KE_TIM`: materi belum memuat kepastian
  harga/ketersediaan dan penawaran khusus serta konfirmasinya ditangani tim
  customer service/penjualan. Tanpa angka yang dikarang, tanpa klaim harga
  final, tanpa janji ketersediaan/waktu balasan.
- **Detektor `isPertanyaanHarga`** — pesan bertanda pertanyaan yang memuat kata
  penanda harga (`PRICE_WORD`, kini diperluas dengan `pricelist`/`price list`/
  `daftar harga` dari transkrip nyata) atau ber-routing `indicative-price`.
  Pemicu mendesak (`emergency`, `active-trip`, `human-request`) dan
  `booking-or-payment` dikecualikan; pertanyaan meta ("Apa maksudnya dari
  kisaran anggaran?") dan parafrase tanpa kata penanda harga tetap ke jalur
  catat-pertanyaan — batas pola yang disengaja (ADR-0005).
- **Pencatatan tidak berubah.** Pertanyaan harga yang dijawab dari materi tidak
  dicatat ke Bagian Pertanyaan (perbaikan kecil: `awaiting-consent` dan
  `awaiting-question` yang dulu justru mencatatnya kini konsisten dengan
  `collecting`/`sent`). Pertanyaan harga tanpa materi tetap dicatat dan ikut
  Ringkasan Kebutuhan (invarian tiket 10: pertanyaan yang butuh tindak lanjut
  admin tidak boleh hilang), dengan jawaban harga digabung di depan lead
  pencatatan — bukan menggantikannya.
- **`admin-routed` dibuka khusus untuk pertanyaan harga.** Pengecualian
  ADR-0014 untuk `admin-routed` dicabut sebagian: pertanyaan harga dijawab di
  sana; pesan non-harga dan basa-basi tetap dibalas pengakuan singkat karena
  percakapan memang ditangani admin (ADR-0009 tidak berubah).
- **Prioritas penanganan ADR-0014 tetap**: pemicu mendesak > pertanyaan
  menyela > perbaikan bidang > pertanyaan harga > ulangi percakapan > menu
  lanjutan/perubahan kebutuhan. Pertanyaan bukan jawaban persetujuan: pesan
  seperti "boleh cek gak harganya?" tidak lagi dapat ditafsirkan sebagai
  penolakan penerusan (guard kini berlaku di semua state menunggu persetujuan).

## Konsekuensi

- Angka harga tetap hanya dari template manual materi; `HARGA_KE_TIM` tidak
  memuat angka apa pun, sehingga invarian "angka tidak boleh digenerasi"
  tetap berlaku.
- Jawaban Harga Indikatif kini juga keluar pada state `admin-routed`,
  `awaiting-question`, `awaiting-consent`, dan `awaiting-handoff-consent` —
  tindakan `record-faq-answer` (metrik `faqAnswered`) ikut menyertai seperti
  jalur lain.
- Pertanyaan harga tanpa materi kini selalu memperoleh penjelasan penawaran
  tim di samping pencatatan yang sudah ada; tidak ada perubahan pada isi
  Ringkasan Kebutuhan maupun format pesan admin (ADR-0006/ADR-0010).
- Bila kelak materi harga bertambah (mis. harga paket/land arrangement),
  cukup tambahkan entri topik harga di `businessFaq.ts`; detektor dan
  `HARGA_KE_TIM` tidak perlu diubah.

## Referensi

- `.scratch/harga-di-semua-fase/` — debug, spec, dan tiket implementasi.
- `docs/adr/0005-harga-indikatif-penyempitan-pola-harga.md`,
  `docs/adr/0009-fokus-intake-kebutuhan.md`,
  `docs/adr/0014-pasca-handoff-menu-lanjutan.md`.
