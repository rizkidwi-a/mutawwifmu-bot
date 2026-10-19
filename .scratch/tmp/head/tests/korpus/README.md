# Korpus Uji Pemahaman Bahasa

Folder ini berisi kasus uji untuk mengukur seberapa baik bot memahami bahasa
Indonesia sehari-hari. Semua berkas `.json` di folder ini otomatis digabung dan
dijalankan oleh:

```bash
node scripts/probe-cakupan.ts
```

Folder ini **ter-versioning git** — beda dengan `data/` (berisi data pribadi
seperti transkrip percakapan) yang sengaja diabaikan git. Korpus di sini adalah
*fixture* uji sintetis tanpa data pribadi, jadi aman disimpan dan dilacak.

**Anda tidak perlu menyentuh kode untuk menambah kasus** — cukup buat berkas
JSON baru di folder ini (atau tambahkan ke `dasar.json`), lalu jalankan
perintah di atas.

## Format satu kasus

```json
{
  "pesan": "brp hrg hotel di mekah?",
  "harapan": { "jenis": "faq", "topik": "price-hotel" },
  "grup": "gaul"
}
```

| Isian | Arti | Wajib |
| --- | --- | --- |
| `pesan` | Teks persis yang dikirim calon jemaah | ✅ |
| `harapan.jenis` | `faq`, `handoff`, atau `opener` | ✅ |
| `harapan.topik` | Topik materi yang diharapkan, mis. `price-hotel` | opsional |
| `grup` | Label gaya bahasa, mis. `gaul`, `typo`, `parafrase` | opsional |

### Arti `harapan.jenis`

- **`faq`** — seharusnya dijawab langsung dari materi bisnis.
- **`handoff`** — memang layak diteruskan ke admin (booking, penawaran khusus,
  konfirmasi harga/ketersediaan, permintaan manusia).
- **`opener`** — sapaan tanpa pertanyaan substantif.

### Soal `harapan.topik`

Isi bila Anda ingin menuntut topik tertentu. **Hapus baris ini** bila tidak
penting — yang penting bot menjawab dari materi, bukan ke topik mana.

Daftar topik yang valid ada di `src/knowledge/businessFaq.ts` (cari `topic:`).
Beberapa yang sering dipakai: `price-hotel`, `price-city-tour`, `price-transport`,
`price-mutawwif`, `price-photographer-videographer`, `price-document-arrangement`,
`land-arrangement`, `hotel-accommodation`, `mutawwif`, `transport-fleet`,
`visa-documents`, `airport-handling`, `photographer-videographer`,
`charity-program`, `city-tour-makkah`, `city-tour-madinah`, `city-tour-thaif`,
`city-tour-alula`.

## Cara menulis kasus yang berguna

Tulis **apa adanya seperti orang chat di WhatsApp** — tanpa kapitalisasi baku,
boleh singkatan, typo, dan campur bahasa. Justru itu yang ingin diuji.

Contoh yang baik:

```json
[
  { "pesan": "budget buat nginep di makkah kira-kira berapa", "harapan": { "jenis": "faq", "topik": "price-hotel" }, "grup": "parafrase" },
  { "pesan": "kendaraannya apa aja ya", "harapan": { "jenis": "faq", "topik": "transport-fleet" }, "grup": "parafrase" },
  { "pesan": "kalo bisa refund gak?", "harapan": { "jenis": "handoff" }, "grup": "gaul" }
]
```

## Membaca hasilnya

Laporan memuat tiga angka:

- **Rute tepat** — bot memilih jalur yang benar (jawab vs handoff vs opener).
- **Topik tepat** — bot memilih topik materi yang benar.
- **Pertanyaan materi terjawab** — inilah ukuran **"leluasa memahami"**:
  dari pertanyaan yang seharusnya bisa dijawab, berapa persen yang benar-benar
  terjawab, bukan jatuh ke handoff.

Bagian **"KASUS GAGAL DIPAHAMI"** menampilkan persis pertanyaan mana yang belum
dikenali — itulah bahan untuk menambah kasus baru dan memperbaiki bot.
