# Pembuka dan Routing Tujuan Chat

## Problem Statement

Bot saat ini menjadikan alur intake calon jemaah sebagai jalur utama. Pengirim yang merupakan vendor, mitra bisnis, tim internal, atau pihak lain dapat ikut menerima pertanyaan intake yang tidak relevan sebelum terhubung dengan admin.

## Solution

Awali percakapan baru dengan sapaan dan pengantar Mutawwifmu, lalu tampilkan pilihan tujuan chat. Calon jemaah diteruskan ke intake yang sudah ada. Vendor/mitra, tim internal, dan keperluan lain dapat langsung memilih handoff ke admin tanpa menjalani intake calon jemaah.

Gunakan “Waalaikumsalam Wr. Wb” jika pesan pengguna lebih dulu berisi salam; untuk pesan tanpa salam gunakan sapaan netral. Pertahankan pengantar layanan yang diberikan pemilik:

> Terima kasih telah menghubungi Mutawwifmu, Travel Partner Top #1 Personalized Land Arrangement dan Premium Umrah Experience terpercaya untuk perjalanan ibadah dan wisata muslim di seluruh dunia 😇

## Pilihan Tujuan

1. **Calon jemaah / informasi paket** — lanjut ke alur intake calon jemaah yang sudah ada.
2. **Vendor / mitra bisnis** — langsung handoff ke admin dengan kategori `vendor_mitra`.
3. **Tim internal Mutawwifmu** — langsung handoff ke admin dengan kategori `internal`.
4. **Keperluan lain / ingin menghubungi admin** — langsung handoff ke admin dengan kategori `other`.

## Aturan Perilaku

- Tampilkan pembuka dan menu pada awal percakapan baru, tidak berulang di tengah percakapan yang sudah memiliki status/alur aktif.
- Handoff kategori non-calon-jemaah tidak boleh memulai atau melanjutkan intake calon jemaah.
- Permintaan berbicara dengan admin/manusia, kondisi darurat, dan perjalanan aktif tetap menyela langsung ke handoff tanpa menunggu pilihan menu.
- Jawaban menu yang tidak dikenali mendapat instruksi untuk memilih salah satu opsi; jangan menganggapnya otomatis sebagai calon jemaah.
- Gunakan kontrol interaktif yang didukung provider WhatsApp aktif; bila tidak tersedia, sediakan fallback pilihan bernomor.
- Admin menerima identitas pengirim, kategori/alasan handoff, serta konteks ringkas bila tersedia. Jangan meneruskan seluruh riwayat chat; ikuti kebijakan handoff yang sudah ada.

## Ruang Lingkup

- Sapaan/pengantar awal dan menu tujuan chat.
- Routing kategori ke intake calon jemaah atau handoff langsung.
- Konfirmasi kepada pengguna setelah permintaan handoff diteruskan.
- Tes unit/integrasi untuk jalur menu, fallback, serta regresi pada handoff dan intake yang ada.

## Di Luar Lingkup

- Mengubah isi atau urutan pertanyaan intake calon jemaah.
- Membuat queue/CRM atau mengubah kanal penerimaan admin.
- Mengirim seluruh transkrip percakapan kepada admin.

## Kriteria Penerimaan

- Percakapan baru menampilkan pengantar layanan dan pilihan tujuan.
- Pilihan calon jemaah masuk ke intake yang sudah ada.
- Pilihan vendor/mitra, tim internal, dan keperluan lain langsung membuat handoff dengan kategori yang benar, tanpa prompt intake calon jemaah.
- Pemicu admin/manusia, darurat, dan perjalanan aktif tetap bisa langsung handoff.
- Jawaban menu tidak valid meminta pengguna memilih ulang, dan tidak memulai intake secara keliru.
- Menu tidak muncul berulang pada percakapan yang sudah berjalan.
- Payload handoff mematuhi kebijakan tanpa riwayat percakapan penuh.

## Referensi

- `.scratch/lead-intake/spec.md`
- `.scratch/lead-intake/issues/01-intake-sebagai-alur-utama.md`
- `docs/adr/0010-handoff-admin-tanpa-riwayat.md`
