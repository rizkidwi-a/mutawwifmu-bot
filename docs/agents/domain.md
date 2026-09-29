# Dokumentasi domain

Panduan bagi skill engineering saat membaca dokumentasi domain direktori ini.

## Baca sebelum menjelajah

- `CONTEXT.md` di root, atau
- `CONTEXT-MAP.md` di root jika tersedia; file itu menunjuk ke `CONTEXT.md` untuk tiap konteks. Baca yang relevan dengan topik.
- ADR di `docs/adr/` yang berkaitan dengan area yang akan dikerjakan. Jika kelak repo menggunakan beberapa konteks, periksa juga `src/<context>/docs/adr/` untuk keputusan khusus konteks.

Jika file-file tersebut belum ada, lanjutkan tanpa menandai atau menyarankan pembuatannya di awal. Skill `/domain-modeling` akan membuatnya saat istilah atau keputusan benar-benar perlu diselesaikan.

## Struktur file

Repo single-context (default untuk sebagian besar repo):

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

Repo multi-context (ditandai dengan `CONTEXT-MAP.md` di root):

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                  # keputusan tingkat sistem
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/          # keputusan khusus konteks
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Gunakan kosakata glossary

Saat menyebut konsep domain dalam judul tiket, usulan refactor, hipotesis, atau nama tes, gunakan istilah sebagaimana didefinisikan di `CONTEXT.md`. Hindari sinonim yang secara eksplisit tidak digunakan glossary.

Jika konsep yang diperlukan belum ada di glossary, pertimbangkan apakah istilah baru itu memang dipakai proyek atau merupakan celah yang perlu dicatat untuk `/domain-modeling`.

## Tandai konflik ADR

Jika hasil kerja bertentangan dengan ADR yang ada, nyatakan secara eksplisit, jangan diam-diam mengabaikannya. Contoh:

> Bertentangan dengan ADR-0007 (...), tetapi layak dibuka kembali karena ...
