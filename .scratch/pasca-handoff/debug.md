# Debug: bot membalas "Terima kasih atas pesan Anda." terus-menerus

Tanggal: 2026-10-13
Sumber bukti: `data/transkrip-percakapan.csv` (nomor `6285275258899`),
repro seam `handleInbound`.

## Gejala yang dilaporkan

Setelah konfirmasi ke admin (Ringkasan Kebutuhan terkirim), nomor di `#jeda`,
lalu di `#lanjut`, kemudian calon jemaah chat lagi. Bot hanya membalas
"Terima kasih atas pesan Anda." pada setiap pesan berikutnya.

## Root cause

Bukan disebabkan `#jeda`/`#lanjut`. Gerbang jeda (`src/server.ts`) memang tidak
memanggil seam dan tidak menyimpan riwayat selama dijeda (ADR-0011), sehingga
setelah `#lanjut` state alur tetap seperti sebelum dijeda — dan state itulah
yang bermasalah.

Setelah Ringkasan Kebutuhan diteruskan dan pengiriman ulang ditolak, state
turunannya adalah `sent` ("Ringkasan Kebutuhan sudah terkirim"). Untuk pesan
basa-basi, `step()` mengambil cabang:

```ts
if (state.kind !== "idle" && isBasaBasi(text)) {
  const prompt = promptSetelahBasaBasi(state, indonesian); // "" untuk "sent"
  return { reply: prompt === "" ? lead : balasanDenganPrompt(lead, prompt), ... };
}
```

`promptSetelahBasaBasi("sent")` mengembalikan `""` (tidak ada langkah lanjutan
untuk state `sent`), sehingga balasannya hanya `BASA_BASI_ID` =
"Terima kasih atas pesan Anda." `nextState("sent", basa-basi)` juga
mengembalikan state `sent` tanpa perubahan. Akibatnya:

- setiap pesan basa-basi ("halo", "terima kasih", "assalamualaikum") dijawab
  persis sama,
- state tidak pernah maju, jadi terasa seperti loop tak berujung,
- tidak ada petunjuk untuk memperbarui kebutuhan atau mengulang percakapan.

Bukti transkrip nyata (sebelum jeda dimulai 21:47:38 WIB):

```
2026-10-10 21:41:28,6285275258899,calon-jemaah,tidak
2026-10-10 21:41:28,6285275258899,asisten,"Baik, informasi Anda tidak akan saya teruskan. ..."
2026-10-10 21:46:37,6285275258899,calon-jemaah,halo
2026-10-10 21:46:37,6285275258899,asisten,Terima kasih atas pesan Anda.
```

Repro seam mengonfirmasi hal yang sama dan menunjukkan dua cacat tambahan:

| Pesan (state `sent`) | Balasan saat ini |
| --- | --- |
| `halo` | `Terima kasih atas pesan Anda.` |
| `terima kasih` | `Terima kasih atas pesan Anda.` |
| `assalamualaikum` | `Terima kasih atas pesan Anda.` |
| `ulangi percakapan` | dicatat sebagai *Perubahan: ulangi percakapan* + minta persetujuan kirim ulang |
| `1` | dicatat sebagai *Perubahan: 1* + minta persetujuan kirim ulang |

Jadi tidak ada kata kunci/pilihan untuk mengulang percakapan; pesan apa pun
yang tidak dikenali masuk ke catatan perubahan kebutuhan.

## Kondisi yang sama tetapi berbeda state

`admin-routed` (kontak memilih vendor/mitra, tim internal, atau keperluan lain
di menu tujuan) juga membalas `BASA_BASI` untuk setiap pesan. Ini **bukan**
guest case yang dilaporkan (nomor `6285275258899` adalah calon jemaah) dan
memang disengaja: percakapan seperti itu ditangani admin. Di luar lingkup
perbaikan ini.

## Perbaikan yang diusulkan

Lihat `.scratch/pasca-handoff/spec.md` dan tiket `01`–`04`:

1. Pasca-handoff, pesan yang tidak cocok penanganan spesifik dibalas **Menu
   Lanjutan** (cara memperbarui bagian tertentu dengan kata kunci, atau
   mengulang percakapan) — bukan `BASA_BASI` kosong.
2. Kata kunci mengulang percakapan ("ulangi", "mulai dari awal", dst.)
   mengembalikan alur ke pembuka + menu tujuan.
3. Penolakan pengiriman ulang juga diikuti Menu Lanjutan agar ada jalan keluar.
