# Issue tracker: Local Markdown

Spesifikasi dan tiket untuk direktori ini disimpan sebagai file Markdown di `.scratch/`.

## Konvensi

- Satu fitur per direktori: `.scratch/<feature-slug>/`
- Spesifikasi fitur: `.scratch/<feature-slug>/spec.md`
- Setiap tiket implementasi adalah file tersendiri di `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, bernomor mulai `01`. Jangan gabungkan beberapa tiket dalam satu file.
- Status triase dicatat sebagai baris `Status:` di dekat bagian atas file tiket. Lihat `triage-labels.md` untuk nama label.
- Ada dua gaya tiket dengan kosakata status yang berbeda; jangan mencampur keduanya pada satu file:
  - Tiket fitur (punya `What to build:` dan `Blocked by:`) memakai label triase, dan ditutup dengan `resolved`.
  - Tiket gaya wayfinding (punya `Type:` dan `Answer:`) memakai `claimed` dan `resolved`, serta tetap memakai label triase bila perlu menunda ke pelapor lewat `needs-info`.
- Komentar dan riwayat percakapan ditambahkan di bagian bawah file, di bawah judul `## Comments`.

## Saat skill meminta untuk menerbitkan ke issue tracker

Buat file baru di `.scratch/<feature-slug>/` dan buat direktori tersebut bila belum ada.

## Saat skill meminta tiket terkait

Baca file pada path yang dirujuk. Biasanya pengguna akan memberikan path atau nomor tiket.

## Operasi wayfinding

Digunakan oleh `/wayfinder`. **Map** adalah satu file dengan satu file anak per tiket.

- **Map**: `.scratch/<effort>/map.md`, berisi bagian Notes / Decisions-so-far / Fog.
- **Tiket anak**: `.scratch/<effort>/issues/NN-<slug>.md`, bernomor mulai `01`, dengan pertanyaan di isi file. Baris `Type:` mencatat jenis tiket (`research`/`prototype`/`grilling`/`task`); baris `Status:` mencatat `claimed`/`resolved`.
- **Blocking**: baris `Blocked by: NN, NN` di dekat bagian atas file. Tiket siap dikerjakan jika semua tiket yang tercantum berstatus `resolved`.
- **Frontier**: periksa `.scratch/<effort>/issues/` untuk menemukan tiket terbuka, tidak terblokir, dan belum diklaim; pilih nomor terkecil terlebih dahulu.
- **Claim**: ubah `Status:` menjadi `claimed` dan simpan sebelum mulai bekerja.
- **Resolve**: tambahkan jawaban di bawah `## Answer`, ubah `Status:` menjadi `resolved`, lalu tambahkan pointer konteks (ringkasan + tautan) ke Decisions-so-far di `map.md`.
