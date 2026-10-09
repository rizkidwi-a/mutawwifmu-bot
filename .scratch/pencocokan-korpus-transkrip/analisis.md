# Analisis Pencocokan Transkrip Nyata dengan Korpus

Status: `resolved` (analisis selesai; korpus `tests/korpus/transkrip-nyata.json` ditambahkan)
Tanggal: 10 Oktober 2026

## Ringkasan eksekutif

Empat transkrip percakapan admin–jemaah di `data/` dianalisis dan dicocokkan dengan
korpus pemahaman bahasa (`tests/korpus/`). Dari 423 pesan jemaah, 54 pesan yang
relevan untuk bot pra-pemesanan diambil apa adanya, dianonimkan, dilabeli, lalu
dijalankan lewat `classifyInbound` sebagai `tests/korpus/transkrip-nyata.json`.

Hasil pencocokan:

| Metrik | `dasar.json` (baseline) | `transkrip-nyata.json` |
| --- | --- | --- |
| Rute tepat | 32/41 (78%) | 38/54 (70%) |
| Kasus | 41 kasus sintetis | 54 kasus dari transkrip asli |

Dua temuan utama:

1. **Bot terlalu sering menjawab padahal seharusnya handoff** — 12 dari 16 kesalahan
   rute pada kasus nyata adalah *over-faq*: pesan yang layak diteruskan ke admin
   justru diklasifikasi `faq`. Ini risiko nyata karena ADR-0009 membuat pesan `faq`
   "dicatat apa adanya sebagai bagian kebutuhan" — konteks penting bisa salah tempat.
2. **Pola harga/typo varian masih lolos** — 4 kasus yang jelas terdukung materi
   jatuh ke `handoff`, terutama ejaan varian (`muthawif`, `Mutowwif`) dan pertanyaan
   harga yang menyebut cakupan layanan, bukan kata kunci harga baku.

## Data dan metode

| Folder (jemaah) | Pesan jemaah | Substantif setelah filter | Kasus terpilih |
| --- | --- | --- | --- |
| `+62 812-1008-778` | 4 | 4 | 3 |
| `Cut Emelia` | 174 | 155 | 15 |
| `Evi N` | 190 | 174 | 23 |
| `Vira Arman` | 55 | 55 | 13 |
| **Total** | **423** | **388** | **54** |

- Format: `chat.txt` dipakai (penanda `[tgl, jam] pengirim:` yang mudah diparse);
  `chat.md` berisi konten yang sama.
- Filter: pesan basa-basi (`ok`, `terima kasih`, `aamiin`, dst.), placeholder media,
  dan pesan <2 kata dibuang untuk analisis; sisanya dibaca manual.
- Pemilihan kasus: hanya pertanyaan yang mungkin datang ke bot saat **pra-pemesanan**
  (cakupan `CONTEXT.md`). Chatter pasca-booking (upload dokumen, koordinasi jam,
  konfirmasi transfer) dicatat sebagai temuan, bukan kasus korpus.
- Anonimisasi: nama orang, nomor telepon, email, dan akun media sosial dihapus dari
  kasus korpus. `tests/korpus/` ter-versioning git dan harus bebas data pribadi.

Profil singkat percakapan:

- **`+62 812-1008-778` (Indrajid)** — prospek baru, 4 pesan: tanya ketersediaan
  mutawwif dwibahasa untuk tanggal pasti, minta quotation (mutawwif + ziarah +
  fotografer). Murni tahap pra-pemesanan.
- **`Cut Emelia`** — calon jemaah yang sudah deal: 155 pesan, didominasi negosiasi
  detail (armada, Raudhah, skema DP, BRN hotel) lalu koordinasi pasca-DP. Banyak
  pertanyaan nyata yang belum tercakup materi (Raudhah/Nusuk, kereta Haramain,
  refund, vaksin, link payment).
- **`Evi N`** — calon jemaah berpengalaman, 190 pesan: bandingkan harga hotel,
  nego, T&C DP, asuransi, siskopatuh, masalah nama di tiket vs paspor, kolaborasi
  influencer. Paling kaya akan pertanyaan kebijakan.
- **`Vira Arman`** — prospek land arrangement keluarga, 55 pesan: struktur layanan
  sudah dipahami (1-2-4-5-6), pertanyaannya detail operasional: kapasitas GMC,
  ketepatan waktu Haramain, approval hotel untuk visa, ganti hotel setelah visa keluar.

## Pencocokan dengan korpus yang ada

### 1. Cocok dengan kasus `dasar.json` (parafrase nyata)

Pola tanya yang sama persis dengan kasus korpus eksisting muncul di transkrip:

| Kasus korpus `dasar.json` | Kembaran di transkrip |
| --- | --- |
| "land arrangement itu apa sih?" (faq, land-arrangement) | "mau tanya2 ttg land arrangement umroh apa bisa?" (Vira) |
| "harga bisa nego gak?" (handoff) | "ratenya bisa kita nego ga kak?" (Evi) |
| "saya mau bicara dengan manusia" (handoff) | "Kak, boleh saya telp ?" (Evi) |
| "bisa bayar DP dulu gak?" (handoff) | "bayar dp dulu atau bagaimana?", "bisa dp nya 20% dulu...?" (Evi/Cut Emelia) |
| "ada kerjasama untuk agen travel?" (handoff) | "ada kerjasama dengan jago syariah ya?", "kl mau berkolaborasi...?" (Evi) |
| "kendaraannya apa aja ya" (faq, transport-fleet) | "Mobil transportnya apa ya mba?" (Cut Emelia) |
| "perlu siapin dokumen apa aja?" (faq, visa-documents) | "ada lg yg perlu kami persiapkan selain tiket hotel pesawat?" (Cut Emelia) |

### 2. Varian baru dari topik yang sudah ada (ditambahkan ke korpus)

- **transport-fleet**: kapasitas bagasi/koper/stroller, "bisa 7 seats?", tipe
  kendaraan per segmen (sama rute vs taxi), seating kereta.
- **price-mutawwif**: konfirmasi satuan harga per grup ("mendampingi ... untuk kami
  bertiga kan harganya?"), ejaan varian `muthawif`/`Mutowwif`.
- **visa-documents**: "paspor halaman depan aja atau semuanya?", "copy paspor atau
  harus asli?".
- **city-tour**: "route city tour nya itu apa aja?".
- **land-arrangement**: "info land arrangement di luar tiket pesawat dan hotel".

### 3. Di luar materi — seharusnya `handoff` (gap besar)

Pertanyaan nyata yang **tidak punya padanan materi** sama sekali. Untuk kasus ini
perilaku benar adalah `handoff`; masalahnya 12 di antaranya justru diklasifikasi
`faq` oleh bot:

| Topik gap | Contoh pesan nyata | Klasifikasi bot sekarang |
| --- | --- | --- |
| Raudhah & Nusuk (cara pesan, batas usia anak) | "raudhah itu apakah perlu pesan2 gitu?" | `faq/hotel-accommodation` ❌ |
| Asuransi perjalanan | "ada asuransi perjalanannya ga ya?" | `faq/visa-documents` ❌ |
| Kerjasama/kolaborasi pihak ketiga | "mutawwif pilihanmu ada kerjasama dengan jago syariah ya?" | `faq/mutawwif` ❌ |
| Kereta Haramain (jadwal, ketepatan, rute) | "harramain train itu sbnrnya on-time banget ga yah?", "dari stasiun HHR ke Jeddah airport langsung kan ya?" | `faq/airport-handling` ❌ |
| Quotation harga spesifik (hotel tertentu) | "tolong di check gak yaa untuk harganya: 13-20 Januari - Jumeirah Jabal Omar ..." | `faq/hotel-accommodation` ❌ |
| Approval hotel untuk syarat visa | "handle hotel apa kak yang cepet approvalnya?" | `faq/hotel-accommodation` ❌ |
| Timing dokumen/visa | "berapa bulan sebelum berangkat harus submit utk visa?", "visa nya gpp h-1 bulan?" | `faq/visa-documents` ❌ |
| Kebijakan ganti hotel setelah visa | "abis visa keluar masi bisa ganti hotel gak yah?" | `faq/visa-documents` ❌ |
| Selisih harga upgrade armada | "kalo upgrade ke staria, tambahannya brp?" | `faq/transport-fleet` ❌ |
| Siskopatuh (biaya, kewajiban) | "berapa biaya siskopatuhnya?", "siskopatuh itu ga wajib ya?" | `handoff` ✓ |
| Refund/pembatalan | "ada refund ga kalo misal batal berangkat?" | `handoff` ✓ |
| Vaksin (timing, lokasi) | "untuk vaksin nya h-berapa ya?", "vaksin di malaysia bisa?" | `handoff` ✓ |
| Metode pembayaran | "bisa bayar pakai link payment ga?" | `handoff` ✓ |
| Konversi mata uang | "20 sar itu brp idr?" | `handoff` ✓ |
| Perlengkapan/konsumsi/zam-zam | "perlengkapan umrohnya dapat ga? kain ihram, buku doa...?" | `handoff` ✓ |
| T&C & skema pelunasan | "info Term & Condition kl kita sudah bayar DP spt apa?" | `handoff` ✓ |

## 16 selisih rute pada kasus nyata (detail)

**Salah paham (harus `faq`, bot `handoff`) — 4 kasus:**

1. "Jika tersedia, mohon nanti dapat diinfokan juga jasanya apa saja selain membimbing
   saat umroh, beserta tarifnya" → `handoff/custom-quote-or-availability`
   (kata "tersedia" memicu ketersediaan; padahal inti pertanyaan cakupan + tarif).
2. "Mutowwif nya ini mendampingi dari awal proses umroh sampai selesai untuk kami
   bertiga kan mba harganya?" → `handoff/unsupported-question`
   (ejaan `Mutowwif` + pola harga satuan per grup tak dikenali).
3. "Paspor nya apakah halaman depan aja atau semuanya?" → `handoff/unsupported-question`
   (pertanyaan detail dokumen tanpa kata kunci "visa"/"dokumen").
4. "kl kita mau tambah pakai muthawif itu biayanya berapa ?" → `handoff/unsupported-question`
   (ejaan `muthawif` — huruf ganda `th` tak cocok dengan `mutawwif`).

**Over-faq (harus `handoff`, bot `faq`) — 12 kasus:** lihat tabel gap di atas
(baris ber-tanda ❌), plus "apakah bisa include dibantu di airportnya untuk
bagasi, air zam-zam, dll?" → `faq/airport-handling` (kasus ambigu: cakupan layanan
vs permintaan include ke penawaran; label sengaja `handoff` karena "include" adalah
permintaan penawaran).

## Rekomendasi

1. **Korpus** — `tests/korpus/transkrip-nyata.json` (54 kasus) sudah ditambahkan dan
   otomatis tergabung dalam `node scripts/probe-cakupan.ts`. Setiap ada transkrip
   jemaah baru, ulangi siklus ini: ekstrak pesan substantif → anonimkan → labeli →
   tambahkan kasus.
2. **Klasifikasi (prioritas)** — hentikan over-faq: pesan yang menyebut harga/
   ketersediaan spesifik (nama hotel, tanggal, "include", "tambahan brp", approval,
   kebijakan) harus `handoff` sesuai ADR-0005. 12 kasus di atas adalah regresi yang
   paling berbahaya karena bot menjawab di luar materi.
3. **Ketahanan ejaan** — tambahkan toleransi varian penulisan nama layanan:
   `muthowif/mutthowif/mutowwif`, `harramain/haramain`, `siskopatuh/siskapatuh`.
4. **Materi bisnis (butuh keputusan pemilik)** — topik yang paling sering ditanyakan
   tapi tidak ada di materi: Raudhah & Nusuk (termasuk batas usia anak), siskopatuh,
   asuransi perjalanan, refund/pembatalan, vaksin, kereta Haramain, metode pembayaran,
   dan T&C DP/pelunasan. Jika dijawab di materi, jadikan topik FAQ baru; jika tidak,
   minimal pastikan semuanya konsisten jatuh ke `handoff`.
5. **Di luar cakupan bot** — sebagian besar volume percakapan nyata (≈60% pesan Cut
   Emelia & Evi N) adalah koordinasi pasca-booking (upload berkas, BRN/HCN hotel,
   revisi jadwal). Ini ranah kanal admin (ADR-0006/ADR-0010), bukan korpus bot.

## Cara reproduksi

```bash
node scripts/probe-cakupan.ts        # 95 kasus (dasar.json + transkrip-nyata.json)
```

Catatan: angka baseline `dasar.json` saja (32/41 rute tepat, 78%) diambil sebelum
berkas transkrip ditambahkan; probe selalu menjalankan seluruh `.json` di folder.
