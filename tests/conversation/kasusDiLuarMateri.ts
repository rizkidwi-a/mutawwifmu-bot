/**
 * 12 pesan transkrip nyata yang sebelumnya diklasifikasi `faq` padahal layak
 * diteruskan ke admin (tiket 08), dikelompokkan mengikuti kelompok pola tiket.
 *
 * Dipakai dua tes sebagai satu sumber data:
 * - `classifyInbound.test.ts` menjaga rutenya jatuh ke handoff; dan
 * - `pesanSela.test.ts` menjaga invarian tiket 06: pertanyaan yang menyela
 *   pengumpulan tetap dicatat sebagai bagian kebutuhan, bukan mengisi bidang.
 *
 * Rujukan: ADR-0005 (permintaan harga/ketersediaan spesifik tetap ke admin)
 * dan ADR-0009 (pertanyaan tanpa materi diteruskan, tidak dikarang).
 */
export const DI_LUAR_MATERI: ReadonlyArray<readonly [kelompok: string, pesan: string]> = [
  // 1. Permintaan harga spesifik yang menyebut hotel/tanggal/daftar item.
  [
    "harga spesifik",
    "boleh tolong di check gak yaa untuk harganya: 13-20 Januari - Jumeirah Jabal Omar - " +
      "Deluxe Room Haram View. 20-24 Januari - Diyar Ajwa. King Room",
  ],
  [
    "harga spesifik",
    "Boleh minta tlg dicarikan hotel di pelataran at least elaf kinda.. syukur kl bs Safwah " +
      "Tower atau hotel lain yg deket ke masjidil haram. Di Madinah pengen di golden tulip " +
      "alwahbi atau hotel lain yg deket. Transport tlg hitungkan kl ke Jeddah-mekkah-madinah-jeddah " +
      "pk alharamain atau pake mobil kira2 berapa biayanya?",
  ],
  // 2. Selisih/upgrade harga — angka delta tidak tercantum materi (ADR-0005).
  ["selisih harga", "Kalo upgrade ke staria, tambahannya brp?"],
  // 3. Timing & ketersediaan yang tidak tercantum materi.
  ["timing", "Visa nya gpp h-1 bulan? Apakah kekejar?"],
  ["timing", "berapa bulan sebelum berangkat.. harus submit utk visa umroh bapak ibu mertua?"],
  // 4. Permintaan include/penambahan layanan ke penawaran.
  [
    "include ke penawaran",
    "apakah bisa include dibantu di airportnya untuk bagasi, air zam-zam, dll?",
  ],
  // 5. Kebijakan/proses di luar materi.
  [
    "kebijakan",
    "kak, pengalaman client kakak.. abis visa keluar masi bisa ganti hotel gak yah? atau sebaiknya jangan?",
  ],
  ["kebijakan", "kalo madinah dan jeddah biasanya handle hotel apa kak yang cepet approvalnya?"],
  [
    "kebijakan",
    "Mba raudhah itu apakah perlu pesan2 gitu? Kami baru pertama kali kalo umroh, tapi kami " +
      "typical yg udah sering travel ke luar makanya bisa book2 hotel sama pesawat sendiri.",
  ],
  // 6. Topik tanpa materi.
  ["topik tanpa materi", "Mas itu ada asuransi perjalanannya ga ya?"],
  ["topik tanpa materi", "Mas, mutawwif pilihanmu ada kerjasama dengan jago syariah ya?"],
  ["topik tanpa materi", "ohh tapi kan dari stasiun HHR ke Jeddah airport itu langsung kan ya?"],
];
