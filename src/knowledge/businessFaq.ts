/**
 * Pengetahuan FAQ dari materi bisnis MUTAWWIFMU (tiket 03: Private Premium
 * Umrah & Land Arrangement; tiket 04: layanan lain dalam profil perusahaan;
 * tiket 05: Harga Indikatif dari angka harga yang tercantum materi).
 *
 * Setiap jawaban disusun hanya dari fakta yang tercantum dalam materi bisnis:
 * - "BOOKLET MUTAWWIFMU.md" — profil perusahaan: layanan, armada, city tour,
 *   serta tabel harga mutawwif, dokumen, airport handling, transportasi, dan
 *   dokumentasi profesional.
 * - "HOTEL RATES MUTAWWIFMU (2).md" — layanan Private Premium Umrah &
 *   Land Arrangement, pilihan hotel Mekkah/Madinah, syarat & ketentuan.
 *
 * Jangan menambahkan rincian paket, layanan, atau ketentuan yang tidak
 * tercantum di materi tersebut. Pertanyaan yang tidak didukung materi atau
 * memerlukan konfirmasi admin diteruskan ke alur handoff (tiket 02), bukan
 * dijawab dari asumsi.
 *
 * Sejak ADR-0009 (tiket 01) jalur runtime `handleInbound` hanya memakai
 * jawaban untuk topik Harga Indikatif; entri non-harga tetap dipakai
 * `matchFaqTopic` untuk mengenali pertanyaan yang dicatat sebagai bagian
 * kebutuhan, bukan untuk dijawab.
 *
 * Tiket 09 menambahkan normalisasi varian ejaan nama layanan sebelum
 * pencocokan topik (mis. `muthowif`/`Mutowwif` → `mutawwif`) dan memperluas
 * pola yang didukung materi: bentuk "-nya" pada kata harga serta detail
 * dokumen paspor.
 *
 * Fitur harga-transportasi-per-rute: angka topik `price-transport` kini dari
 * tabel transport terbaru (`data/transportasi harga/`, 2026-10-12; SAR per
 * kendaraan/per grup) yang menggantikan angka BOOKLET, dan jawabannya
 * dirender per rute lewat `jawabanFaq()` sesuai kata kunci tujuan pada pesan
 * (lihat `transportRute.ts`). `faqAnswer("price-transport")` tetap memuat
 * seluruh rute sebagai materi acuan grounding angka.
 *
 * Fitur harga-fotografi-tasreh-cgk: angka `price-photographer-videographer`
 * kini dari `data/foto harga/` (2026-10-12) dan dirender per lokasi lewat
 * `jawabanFaq()` (lihat `fotoHarga.ts`) — label "Paket Spesial Ramadan"
 * menggantikan "High season" BOOKLET. Topik baru `price-tasreh` memuat angka
 * IDR 300.000 per pax dari percakapan admin (sumber: chat Cut Emelia dan Vira
 * Arman), dan `price-airport-handling` memakai angka CGK IDR 300.000 per pax
 * sebagai pengganti angka BOOKLET "Handling Bandara Jakarta".
 */
import type { Language } from "../conversation/language.ts";
import { susunJawabanFoto, susunMateriFoto } from "./fotoHarga.ts";
import { susunJawabanTransport, susunMateriTransport } from "./transportRute.ts";

/**
 * Topik Harga Indikatif (tiket 05): angka harga yang tercantum materi,
 * disampaikan sebagai acuan — bukan penawaran final, dengan penegasan bahwa
 * angka dapat berubah setelah diperiksa admin (tiket 04, ADR-0009). Satuan,
 * periode, dan ketentuan yang belum terverifikasi wajib dinyatakan apa adanya,
 * tidak ditafsirkan sendiri (spec: Testing Decisions, tiket 05).
 */
export type PriceTopic =
  | "price-mutawwif"
  | "price-document-arrangement"
  | "price-airport-handling"
  | "price-transport"
  | "price-city-tour"
  | "price-photographer-videographer"
  | "price-tasreh"
  | "price-hotel";

/** Topik FAQ yang didukung materi bisnis MUTAWWIFMU. */
export type FaqTopic =
  | "land-arrangement"
  | "tour-guide"
  | "mutawwif"
  | "multi-language-support"
  | "visa-documents"
  | "hotel-accommodation"
  | "transport-fleet"
  | "airport-handling"
  | "charity-program"
  | "photographer-videographer"
  | "tasreh"
  | "custom-itinerary"
  | "city-tour"
  | "city-tour-makkah"
  | "city-tour-madinah"
  | "city-tour-thaif"
  | "city-tour-alula"
  | PriceTopic;

/** Daftar topik Harga Indikatif untuk membedakannya dari topik FAQ. */
const PRICE_TOPICS: ReadonlySet<FaqTopic> = new Set<FaqTopic>([
  "price-mutawwif",
  "price-document-arrangement",
  "price-airport-handling",
  "price-transport",
  "price-city-tour",
  "price-photographer-videographer",
  "price-tasreh",
  "price-hotel",
]);

/** Apakah sebuah topik adalah topik Harga Indikatif (tiket 05)? */
export function isPriceTopic(topic: FaqTopic): topic is PriceTopic {
  return PRICE_TOPICS.has(topic);
}

/**
 * Kata penanda pertanyaan harga yang dipakai pola topik Harga Indikatif;
 * sengaja tidak memuat "berapa" polos agar "berapa lama ..." tetap jatuh ke
 * rincian yang tidak didukung materi. Bentuk berimbuhan "-nya" ("harganya",
 * "biayanya") ikut dikenali karena transkrip nyata memakainya (tiket 09),
 * dan singkatan "hrg" dari korpus dasar ikut dikenali (tiket 11). Varian
 * "pricelist"/"price list"/"daftar harga" ikut dikenali karena muncul pada
 * transkrip nyata ("apakah ada pricelistnya?", `.scratch/harga-di-semua-fase`).
 */
export const PRICE_WORD =
  /\b((harga|biaya|tarif|ongkos)(nya)?|hrg|pricelist(nya)?|price\s?lists?(nya)?|daftar\s+harga(nya)?|prices?|pricing|costs?|rates?|how much)\b/i;

/** Apakah pesan memuat kata penanda harga (lihat `PRICE_WORD`). */
export function memuatKataHarga(text: string): boolean {
  return PRICE_WORD.test(text);
}

/**
 * Kata penanda topik transportasi (dipakai pola `price-transport` sekaligus
 * penolak pola `price-city-tour`): pertanyaan "harga transport ziarah Makkah"
 * menanyakan rute transport (Ziarah Makkah pada tabel transport), bukan paket
 * city tour, sehingga jatuh ke topik transport (fitur
 * harga-transportasi-per-rute).
 */
const KATA_TRANSPORT =
  /\b(transportasi|transports?|armada|kendaraan|vehicles?|mobils?|minibus|buses?|hiace|coaster|staria|camry|sonata|gmc|sopir|drivers?|penjemputan|jemput|transfers?|shuttle)\b/i;

/** Pola penolak: pesan TIDAK memuat kata penanda transportasi. */
const TANPA_KATA_TRANSPORT = new RegExp(`^(?!.*${KATA_TRANSPORT.source})`, "i");

/**
 * Kata penanda layanan tasreh — pengurusan izin masuk Raudhah yang diterbitkan
 * sebagai barcode (materi: chat Cut Emelia dan Vira Arman, 2026). Varian
 * ejaan "tasreg" ikut dikenali karena dipakai calon jemaah.
 */
const PENANDA_TASREH = /\b(tasreh|tasreg)\b/i;

/**
 * Penanda topik mutawwif (tiket 09, diperluas tiket 11). "membimbing" dan
 * kata sehari-hari "nemenin/nemani/menemani" hanya menandai mutawwif bila
 * konteks ibadah/umroh muncul dalam satu klausa (maksimal 30 karakter); dengan
 * begitu "tour guide yang membimbing kami" tetap bukan mutawwif.
 */
const PENANDA_MUTAWWIF =
  /\b(mutawwif|mutawif|muthawwif|pemandu ibadah|pembimbing ibadah|(?:membimbing|nemenin|nemanin|nemani|menemani)(?=[^?!.]{0,30}\b(ibadah|umroh|umrah)\b)|worship guides?)\b/i;

/**
 * Kata pengantar city tour; destinasi ditentukan pola kedua tiap entri.
 * "keliling" masuk tiket 11 dari korpus dasar ("keliling madinah bisa
 * dibantu?").
 */
const KATA_CITY_TOUR = /\b(city tour|tour|tur|wisata|ziarah|jalan-jalan|keliling)\b/i;

/**
 * Varian ejaan nama layanan dari transkrip nyata (tiket 09, rekomendasi 3
 * analisis pencocokan transkrip). Kalimat asli tetap dipakai untuk mencatat
 * kebutuhan; normalisasi hanya menyatukan ejaan agar pola topik sederhana
 * mengenali maksud yang sama.
 */
const VARIAN_EJAAN: ReadonlyArray<readonly [RegExp, string]> = [
  // mutawwif: mutawif, muthawwif, muthawif, muthowif, mutthowif, mutowwif,
  // mutowif, termasuk bentuk feminin mutawwifah.
  [/\bmu+t+h?[ao]w+[ai]f(?:ah)?\b/gi, "mutawwif"],
  // Kereta Haramain: haramain dan ejaan ganda harramain.
  [/\bhar+am+[ai]{2}n\b/gi, "haramain"],
  // Siskopatuh: siskapatuh, termasuk bentuk berimbuhan "-nya".
  [/\bsisk[oa]patuh(?:nya)?\b/gi, "siskopatuh"],
];

/**
 * Normalkan varian ejaan nama layanan pada teks Calon Jemaah. Aman dipanggil
 * berulang (bentuk baku dinormalkan ke dirinya sendiri) dan tidak mengubah
 * teks asli milik pemanggil.
 */
export function normalkanVarianEjaan(text: string): string {
  let hasil = text;
  for (const [pola, baku] of VARIAN_EJAAN) {
    hasil = hasil.replace(pola, baku);
  }
  return hasil;
}

/**
 * Akhiran "-nya" pada kata benda ("tur kotanya", "kendaraannya") — tiket 11.
 * Dipakai `classifyInbound` sebagai pencocokan lanjutan hanya untuk pesan
 * berbentuk pertanyaan, agar pernyataan biasa ("kendaraannya bersih") tidak
 * tertarik menjadi topik materi. Batang minimal empat huruf supaya partikel
 * seperti "hanya", "punya", dan "tanya" tidak ikut terpotong.
 */
const AKHIRAN_NYA = /\b(\p{L}{4,})nya\b/giu;

export function normalkanAkhiranNya(text: string): string {
  return text.replace(AKHIRAN_NYA, "$1");
}

interface FaqEntry {
  readonly topic: FaqTopic;
  /** Semua pola harus cocok; sinonim satu topik dirangkai dalam satu alternatif. */
  readonly patterns: readonly RegExp[];
  readonly answer: { readonly id: string; readonly en: string };
}

/**
 * Entri FAQ. Urutan menentukan prioritas bila sebuah pesan cocok dengan lebih
 * dari satu topik: topik harga (Harga Indikatif) didahulukan agar pertanyaan
 * angka harga yang tercantum materi tidak jatuh ke topik layanan yang generik,
 * lalu topik yang lebih spesifik (mis. city tour per destinasi) didahulukan.
 */
const ENTRIES: readonly FaqEntry[] = [
  {
    topic: "price-photographer-videographer",
    patterns: [
      PRICE_WORD,
      // "foto" (bentuk sehari-hari) ikut dikenali agar "harga foto di Masjid
      // Nabawi" mencapai matcher lokasi, bukan jatuh ke handoff.
      /\b(fotos?|fotografer|videografer|photograph(y|ers?)?|videograph(y|ers?)?|kameraman|dokumentasi|documentation|photos?|videos?)\b/i,
    ],
    answer: {
      // Materi = template (fitur harga-fotografi-tasreh-cgk): seluruh 13 baris
      // dari `data/foto harga/` — label "Paket Spesial Ramadan" menggantikan
      // "High season" BOOKLET, plus durasi, meeting point, dan add-on.
      id: susunMateriFoto("id"),
      en: susunMateriFoto("en"),
    },
  },
  {
    topic: "price-document-arrangement",
    patterns: [PRICE_WORD, /\b(visas?|dokumen|documents?|asuransi|insurance)\b/i],
    answer: {
      id:
        "Harga Indikatif pengurusan visa — bukan penawaran final (satuan per pax sesuai materi): " +
        "Visa Umrah Reguler IDR 2.980.000 per pax dan Asuransi Perjalanan IDR 100.000 per pax. " +
        "Untuk Visa Umrah Express materi tidak mencantumkan angka dan menyarankan menghubungi admin dengan harga yang menyesuaikan. " +
        "Angka dapat berubah setelah diperiksa admin — mohon konfirmasi harga terkini kepada tim kami.",
      en:
        "Indicative Prices for visa arrangement — not a final offer (per pax as stated in our materials): " +
        "Regular Umrah Visa IDR 2,980,000 per pax and Travel Insurance IDR 100,000 per pax. " +
        "For the Express Umrah Visa our materials list no figure and direct you to contact the admin with an adjusted price. " +
        "Figures may change after being reviewed by our admin — please confirm the current price with our team.",
    },
  },
  {
    topic: "price-city-tour",
    patterns: [
      PRICE_WORD,
      /\b(city ?tour|tur kota|tour (kota|ziarah|sejarah|tanah suci)|ziarah)\b/i,
      TANPA_KATA_TRANSPORT,
    ],
    answer: {
      id:
        "Harga Indikatif city tour — bukan penawaran final. " +
        "Setiap paket sudah termasuk transportasi, mutawwif profesional, dan free snack. " +
        "City Tour Basic Makkah: SAR 820 (2 pax, Camry), SAR 930 (4 pax, Staria), SAR 1.045 (7 pax, Hiace), SAR 1.235 (21 pax, Coaster), SAR 1.705 (49 pax, Bus). " +
        "City Tour Basic Madinah: SAR 820 (2 pax), SAR 880 (4 pax), SAR 995 (7 pax), SAR 1.165 (21 pax), SAR 1.395 (49 pax). " +
        "City Tour Premium Thaif: SAR 920 (2 pax), SAR 1.235 (4 pax), SAR 1.345 (7 pax), SAR 1.665 (21 pax), SAR 2.095 (49 pax). " +
        "Untuk City Tour Premium Exclusive Al Ula materi tidak mencantumkan angka — tercantum \"Harga Spesial\" dan Anda dapat meminta penawarannya kepada tim kami. " +
        "Angka dapat berubah setelah diperiksa admin dan tidak menjamin ketersediaan jadwal — mohon konfirmasi harga dan jadwal kepada tim kami.",
      en:
        "Indicative Prices for city tours — not a final offer. " +
        "Every package already includes transportation, a professional mutawwif, and a free snack. " +
        "City Tour Basic Makkah: SAR 820 (2 pax, Camry), SAR 930 (4 pax, Staria), SAR 1,045 (7 pax, Hiace), SAR 1,235 (21 pax, Coaster), SAR 1,705 (49 pax, Bus). " +
        "City Tour Basic Madinah: SAR 820 (2 pax), SAR 880 (4 pax), SAR 995 (7 pax), SAR 1,165 (21 pax), SAR 1,395 (49 pax). " +
        "City Tour Premium Thaif: SAR 920 (2 pax), SAR 1,235 (4 pax), SAR 1,345 (7 pax), SAR 1,665 (21 pax), SAR 2,095 (49 pax). " +
        "For City Tour Premium Exclusive Al Ula our materials list no figure — it shows a \"Special Price\" and you may request the offer from our team. " +
        "Figures may change after being reviewed by our admin and do not guarantee schedule availability — please confirm the price and schedule with our team.",
    },
  },
  {
    topic: "price-transport",
    patterns: [PRICE_WORD, KATA_TRANSPORT],
    answer: {
      id: susunMateriTransport("id"),
      en: susunMateriTransport("en"),
    },
  },
  {
    topic: "price-airport-handling",
    patterns: [PRICE_WORD, /\b(airport|bandara|imigrasi|immigration|bagasi|baggage|handling|arrival|departure)\b/i],
    answer: {
      // Angka CGK (IDR 300.000 per pax) dari percakapan admin menggantikan
      // angka BOOKLET "Handling Bandara Jakarta IDR 350.000" — keputusan
      // pemilik 2026-10-13 (spec harga-fotografi-tasreh-cgk). Keterangan
      // periode 2025–2026 hanya melekat pada baris Jeddah (daftar harga).
      id:
        "Harga Indikatif airport handling — bukan penawaran final: " +
        "Handling Bandara CGK (keberangkatan dan kepulangan) IDR 300.000 per pax " +
        "— mencakup pendampingan dari mobil ke bagasi dan dari bagasi kembali ke mobil. " +
        "Handling Bandara Jeddah untuk kedatangan dan kepulangan SAR 300 per grup; " +
        "Handling Bandara Jeddah untuk kepulangan dan penjemputan (termasuk mutawwif gratis saat umroh 1x) SAR 900 per grup " +
        "— kedua baris Jeddah mengikuti daftar harga yang mencatat periode 2025–2026. " +
        "Harga dapat berubah sewaktu-waktu, termasuk setelah diperiksa admin — mohon konfirmasi harga terkini kepada tim kami.",
      en:
        "Indicative Prices for airport handling — not a final offer: " +
        "CGK Airport Handling (departure and return) IDR 300,000 per pax " +
        "— covering assistance from the vehicle to the baggage area and back from baggage to the vehicle. " +
        "Jeddah Airport Handling for arrival and departure SAR 300 per group; " +
        "Jeddah Airport Handling for departure and pickup (including a free mutawwif for 1x umrah) SAR 900 per group " +
        "— both Jeddah lines follow the price list noted for the 2025–2026 period. " +
        "Prices may change at any time, including after being reviewed by our admin — please confirm the current price with our team.",
    },
  },
  {
    topic: "price-mutawwif",
    patterns: [PRICE_WORD, PENANDA_MUTAWWIF],
    answer: {
      id:
        "Harga Indikatif layanan mutawwif — bukan penawaran final (satuan per grup sesuai materi): " +
        "Mutawwif Reguler berbahasa Indonesia SAR 300 (low season) dan SAR 350 (high season); " +
        "Mutawwif Bilingual (Indonesia, Arab, Inggris) SAR 350 (low season) dan SAR 400 (high season). " +
        "Angka dapat berubah setelah diperiksa admin — mohon konfirmasi harga terkini kepada tim kami.",
      en:
        "Indicative Prices for our mutawwif service — not a final offer (per group as stated in our materials): " +
        "Regular Mutawwif (Indonesian-speaking) SAR 300 (low season) and SAR 350 (high season); " +
        "Bilingual Mutawwif (Indonesian, Arabic, English) SAR 350 (low season) and SAR 400 (high season). " +
        "Figures may change after being reviewed by our admin — please confirm the current price with our team.",
    },
  },
  {
    topic: "price-hotel",
    patterns: [PRICE_WORD, /\b(hotels?|kamar|rooms?|akomodasi|accommodation|menginap|penginapan)\b/i],
    answer: {
      id:
        "Untuk harga hotel, materi kami memuat keterangan satuan yang bertentangan: sampul daftar harga menyebut \"Harga dalam SAR per orang\", " +
        "sementara catatan bagian tabel Makkah menyebut \"Semua harga dalam SAR per kamar\" dan bagian Madinah kembali menyebut \"per orang\". " +
        "Karena itu satuan harga hotel BELUM TERVERIFIKASI dan harus dikonfirmasi admin — " +
        "saya tidak dapat menyebutkan angkanya sebagai harga per orang maupun per kamar. " +
        "Sebagai gambaran, daftar (Early Bird Season 1448 H) mencantumkan Harga Indikatif per hotel, periode, dan tipe kamar " +
        "(Double, Triple, Quad, Junior Suite/Executive Suite) dengan meal plan Fullboard Fareast — " +
        "misalnya Al Marwa Rotana Makkah periode 16 Juni – 09 Juli 2026 tercantum SAR 1.250 (Double), SAR 1.520 (Triple), SAR 1.790 (Quad). " +
        "Ini bukan penawaran final dan tidak menjamin ketersediaan hotel; " +
        "angka dapat berubah setelah diperiksa admin — " +
        "silakan sampaikan hotel, periode, dan tipe kamar yang diminati untuk dikonfirmasi tim kami.",
      en:
        "For hotel prices, our materials contain conflicting unit statements: the rate list cover states \"Prices in SAR per person\", " +
        "while the Makkah table section states \"All prices in SAR per room\" and the Madinah section again states \"per person\". " +
        "Because of this the hotel price unit is NOT YET VERIFIED and must be confirmed by our admin — " +
        "I cannot state the figures as per-person or per-room prices. " +
        "As an illustration, the list (Early Bird Season 1448 H) shows Indicative Prices per hotel, period, and room type " +
        "(Double, Triple, Quad, Junior Suite/Executive Suite) with the Fullboard Fareast meal plan — " +
        "for example Al Marwa Rotana Makkah for the 16 June – 09 July 2026 period is listed as SAR 1,250 (Double), SAR 1,520 (Triple), SAR 1,790 (Quad). " +
        "This is not a final offer and does not guarantee hotel availability; " +
        "figures may change after being reviewed by our admin — " +
        "please share the hotel, period, and room type you are interested in for our team to confirm.",
    },
  },
  {
    topic: "price-tasreh",
    patterns: [PRICE_WORD, PENANDA_TASREH],
    answer: {
      // Angka dari percakapan admin (Cut Emelia: "pengurusan tasreh Raudhah
      // seharga Rp300.000/pax"; Vira Arman: "tasreh diluar aplikasi kami ada
      // ... IDR 300.000/Pax") — keduanya sepakat IDR 300.000 per pax.
      id:
        "Harga Indikatif pengurusan tasreh (barcode izin masuk Raudhah) — bukan penawaran final: " +
        "IDR 300.000 per pax. " +
        "Tasreh diterbitkan dalam bentuk barcode sebagai bukti izin masuk Raudhah sesuai jadwal yang tersedia. " +
        "Angka dapat berubah setelah diperiksa admin — mohon konfirmasi harga terkini kepada tim kami.",
      en:
        "Indicative Price for tasreh arrangement (Raudhah entry barcode) — not a final offer: " +
        "IDR 300,000 per pax. " +
        "The tasreh is issued as a barcode as proof of entry to Raudhah according to the available schedule. " +
        "Figures may change after being reviewed by our admin — please confirm the current price with our team.",
    },
  },
  {
    topic: "land-arrangement",
    patterns: [
      /\b(private premium|premium private|land arrangement|layanan darat|private umrah|umrah privat|umrah premium|premium umrah)\b/i,
    ],
    answer: {
      id:
        "Private Premium Umrah & Land Arrangement adalah layanan premium MUTAWWIFMU untuk pengalaman ibadah yang eksklusif, personal, dan berkelas. " +
        "Melalui layanan ini kami mengelola kebutuhan darat di Tanah Suci — mulai dari akomodasi, transportasi, pemanduan ibadah, dokumentasi, hingga pengurusan dokumen — dengan standar premium dan pendampingan profesional, dan seluruhnya dapat disesuaikan dengan kebutuhan Anda.",
      en:
        "Private Premium Umrah & Land Arrangement is MUTAWWIFMU's premium service for an exclusive, personal, and refined worship experience. " +
        "Through this service we manage your land arrangements in the Holy Land — from accommodation, transportation, and worship guidance to documentation and document handling — with premium standards and professional assistance, and everything can be customized to your needs.",
    },
  },
  {
    topic: "tour-guide",
    patterns: [
      /\b(tour guides?|pemandu wisata|guide (wisata|lokal|profesional)|190 negara|luar negeri|manca negara|negara lain|ke berbagai negara|di berbagai negara|ke luar negri|worldwide|seluruh dunia|other countries|countries)\b/i,
    ],
    answer: {
      id:
        "Tour Guide MUTAWWIFMU adalah pemandu wisata profesional di 190 negara yang memahami budaya, bahasa, dan karakteristik setiap destinasi. " +
        "Jaringan mitra tour guide, hotel, dan transportasi kami tersebar di seluruh dunia — untuk umrah, haji, wisata religi, maupun perjalanan ke berbagai negara. " +
        "Untuk destinasi tertentu, ketersediaan pemandu perlu dikonfirmasi terlebih dahulu oleh tim kami.",
      en:
        "MUTAWWIFMU's Tour Guide service provides professional tour guides in 190 countries who understand the culture, language, and characteristics of each destination. " +
        "Our network of tour guide, hotel, and transportation partners spans the world — for umrah, hajj, religious tourism, and trips to many countries. " +
        "For specific destinations, guide availability needs to be confirmed by our team first.",
    },
  },
  {
    topic: "city-tour-thaif",
    patterns: [KATA_CITY_TOUR, /\b(thaif|taif|tha'if)\b/i],
    answer: {
      id:
        "City Tour Premium Thaif mencakup kunjungan ke Masjid Abdullah bin Abbas dan Pabrik Parfum Mawar. " +
        "Paket sudah termasuk transportasi, mutawwif profesional, dan free snack. Kereta gantung dan Restoran Nasi Mandhi belum termasuk dalam paket.",
      en:
        "City Tour Premium Thaif covers visits to Masjid Abdullah bin Abbas and the Rose Perfume Factory. " +
        "The package already includes transportation, a professional mutawwif, and a free snack. The cable car and Nasi Mandhi Restaurant are not included in the package.",
    },
  },
  {
    topic: "city-tour-alula",
    patterns: [KATA_CITY_TOUR, /\b(al ?ula|al-ula)\b/i],
    answer: {
      id:
        "City Tour Premium Exclusive Al Ula mencakup Maraya Concert Hall, Old Town Al Ula, Elephant Rock, dan Habitas Al-Ula. " +
        "Untuk paket ini materi kami menyebutkan harga spesial; rincian penawarannya perlu dikonfirmasi oleh tim kami.",
      en:
        "City Tour Premium Exclusive Al Ula covers Maraya Concert Hall, Old Town Al Ula, Elephant Rock, and Habitas Al-Ula. " +
        "For this package our materials mention a special price; the offer details need to be confirmed by our team.",
    },
  },
  {
    topic: "city-tour-makkah",
    patterns: [KATA_CITY_TOUR, /\b(makkah|mekah|mekkah)\b/i],
    answer: {
      id:
        "City Tour Basic Makkah mencakup kunjungan ke Jabal Tsur (Gua Nabi Muhammad), Padang Arafah (tempat wukuf), Jabal Rahmah, Muzdalifah dan Mina, serta Jabal Nur (Gua Hira). " +
        "Paket sudah termasuk transportasi, mutawwif profesional, dan free snack.",
      en:
        "City Tour Basic Makkah covers visits to Jabal Tsur (the Cave of Prophet Muhammad), the Plain of Arafah (the place of wukuf), Jabal Rahmah, Muzdalifah and Mina, as well as Jabal Nur (the Cave of Hira). " +
        "The package already includes transportation, a professional mutawwif, and a free snack.",
    },
  },
  {
    topic: "city-tour-madinah",
    patterns: [KATA_CITY_TOUR, /\b(madinah|medinah|medina)\b/i],
    answer: {
      id:
        "City Tour Basic Madinah mencakup kunjungan ke Masjid Bilal, shalat di Masjid Quba, Kebun Kurma, dan Jabal Uhud (Perang Uhud). " +
        "Paket sudah termasuk transportasi, mutawwif profesional, dan free snack.",
      en:
        "City Tour Basic Madinah covers visits to Masjid Bilal, praying at Masjid Quba, the Date Farm, and Jabal Uhud (the Battle of Uhud). " +
        "The package already includes transportation, a professional mutawwif, and a free snack.",
    },
  },
  {
    topic: "city-tour",
    patterns: [/\b(city tour|citytour|tur kota|keliling|tour (kota|ziarah|sejarah|tanah suci)|ziarah)\b/i],
    answer: {
      id:
        "City Tour Saudi Arabia dari MUTAWWIFMU mengajak Anda menjelajahi situs-situs bersejarah dan ikonik di tanah suci. " +
        "Setiap paket city tour sudah termasuk transportasi, mutawwif profesional, dan free snack. " +
        "Paket yang tercantum adalah City Tour Basic (Makkah dan Madinah), City Tour Premium (Thaif), serta City Tour Premium Exclusive (Al Ula).",
      en:
        "MUTAWWIFMU's City Tour Saudi Arabia invites you to explore historic and iconic sites in the Holy Land. " +
        "Every city tour package already includes transportation, a professional mutawwif, and a free snack. " +
        "The packages listed are City Tour Basic (Makkah and Madinah), City Tour Premium (Thaif), and City Tour Premium Exclusive (Al Ula).",
    },
  },
  {
    topic: "mutawwif",
    patterns: [PENANDA_MUTAWWIF],
    answer: {
      id:
        "MUTAWWIFMU menyediakan mutawwif (pemandu ibadah) profesional bersertifikat. " +
        "Jenis yang tercantum dalam materi kami adalah Mutawwif Reguler berbahasa Indonesia serta Mutawwif Bilingual (Indonesia, Arab, Inggris).",
      en:
        "MUTAWWIFMU provides certified professional mutawwif (worship guides). " +
        "Our materials list Regular Mutawwif (Indonesian-speaking) and Bilingual Mutawwif (Indonesian, Arabic, English).",
    },
  },
  {
    topic: "multi-language-support",
    patterns: [
      /\b(multibahasa|multi[- ]?language(s)?|multilingual|bilingual|interpreter(s)?|translator(s)?|penerjemah|pilihan bahasa|bahasa (apa|apa saja)|what languages|languages? (do|does|yang|supported|available|speak)|language support|support(ed)? (in )?(other )?languages?)\b/i,
    ],
    answer: {
      id:
        "MUTAWWIFMU menyediakan layanan multibahasa untuk jemaah internasional: Bahasa Indonesia, Arab, Inggris, dan berbagai bahasa lainnya. " +
        "Untuk kebutuhan bahasa tertentu, silakan dikonfirmasikan lebih dahulu kepada tim kami.",
      en:
        "MUTAWWIFMU provides multi-language support for international guests: Indonesian, Arabic, English, and various other languages. " +
        "For a specific language need, please confirm it with our team first.",
    },
  },
  {
    topic: "visa-documents",
    patterns: [/\b(visa|dokumen|document|paspor|passports?|asuransi|insurance)\b/i],
    answer: {
      id:
        "MUTAWWIFMU mengurus visa dan dokumen perjalanan secara lengkap, profesional, dan tanpa ribet. " +
        "Layanan yang tercantum dalam materi kami meliputi Visa Umrah Reguler, Visa Umrah Express, dan Asuransi Perjalanan.",
      en:
        "MUTAWWIFMU arranges visas and travel documents completely and professionally, without the hassle. " +
        "The services listed in our materials include Regular Umrah Visa, Express Umrah Visa, and Travel Insurance.",
    },
  },
  {
    topic: "tasreh",
    patterns: [PENANDA_TASREH],
    answer: {
      id:
        "MUTAWWIFMU menyediakan layanan pengurusan tasreh — izin masuk Raudhah — yang diterbitkan dalam bentuk barcode sesuai jadwal yang tersedia. " +
        "Rincian layanan dan angkanya perlu dikonfirmasi oleh tim kami.",
      en:
        "MUTAWWIFMU provides a tasreh arrangement service — permission to enter Raudhah — issued as a barcode according to the available schedule. " +
        "Service details and pricing need to be confirmed by our team.",
    },
  },
  {
    topic: "airport-handling",
    patterns: [/\b(airport handling|handling bandara|airport|bandara|imigrasi|immigration|bagasi|baggage|kedatangan|kepulangan|arrival|departure)\b/i],
    answer: {
      id:
        "Airport handling MUTAWWIFMU mencakup pendampingan kedatangan dan kepulangan di bandara: imigrasi, bagasi, hingga transfer ke hotel. " +
        "Materi kami mencantumkan penanganan untuk Bandara Jakarta (CGK) serta Bandara Jeddah (kedatangan dan kepulangan).",
      en:
        "MUTAWWIFMU's airport handling covers arrival and departure assistance at the airport: immigration, baggage, through to hotel transfer. " +
        "Our materials list handling for Jakarta Airport (CGK) and Jeddah Airport (arrival and departure).",
    },
  },
  {
    topic: "transport-fleet",
    patterns: [/\b(transportasi|transport|armada|kendaraan|vehicles?|mobil|minibus|bus|hiace|coaster|staria|camry|sonata|gmc|pengemudi|driver|sopir|penjemputan|jemput|transfers?|shuttle|antar)\b/i],
    answer: {
      id:
        "MUTAWWIFMU mengelola transportasi lengkap dari dan ke bandara serta antar destinasi dengan armada yang nyaman dan terjadwal. " +
        "Armada yang tercantum: Camry/Sonata (2–3 penumpang), Hyundai Staria (hingga 6 penumpang), GMC (hingga 6 penumpang), Toyota Hiace (9–12 penumpang), Coaster (19–29 penumpang), dan Bus (49 penumpang), dilengkapi AC, GPS, serta pengemudi profesional berpengalaman.",
      en:
        "MUTAWWIFMU manages complete transportation to and from the airport as well as between destinations with comfortable, scheduled fleets. " +
        "The fleets listed are: Camry/Sonata (2–3 passengers), Hyundai Staria (up to 6 passengers), GMC (up to 6 passengers), Toyota Hiace (9–12 passengers), Coaster (19–29 passengers), and Bus (49 passengers), equipped with AC, GPS, and experienced professional drivers.",
    },
  },
  {
    topic: "hotel-accommodation",
    patterns: [/\b(hotel|akomodasi|accommodation|kamar|room|menginap|inap|penginapan|stay|bintang|reservasi)\b/i],
    answer: {
      id:
        "Untuk akomodasi, MUTAWWIFMU melayani reservasi hotel yang nyaman, bersih, dan strategis sesuai kebutuhan serta anggaran. " +
        "Kami memiliki jaringan mitra hotel terpercaya di Mekkah dan Madinah, mulai dari hotel bintang 3 hingga hotel bintang 5 berstandar internasional dengan lokasi strategis dekat Masjidil Haram dan Masjid Nabawi. " +
        "Tipe kamar yang tercantum: Double (2 orang), Triple (3 orang), Quad (4 orang), dan Junior Suite/Executive Suite, dengan paket makan Fullboard Fareast (3x makan sehari menu Asia Tenggara/masakan Indonesia) kecuali dinyatakan lain. " +
        "Detail harga dan ketersediaan perlu dikonfirmasi oleh tim kami.",
      en:
        "For accommodation, MUTAWWIFMU arranges hotel reservations that are comfortable, clean, and strategically located, according to your needs and budget. " +
        "We have a network of trusted hotel partners in Makkah and Madinah, from affordable 3-star hotels to international-standard 5-star hotels, strategically located near Masjidil Haram and Masjid Nabawi. " +
        "The room types listed are Double (2 guests), Triple (3 guests), Quad (4 guests), and Junior Suite/Executive Suite, with the Fullboard Fareast meal plan (3 meals a day with Southeast Asian/Indonesian cuisine) unless stated otherwise. " +
        "Price details and availability need to be confirmed by our team.",
    },
  },
  {
    topic: "charity-program",
    patterns: [/\b(charity|charities|amal|donasi|donation(s)?|sedekah|program sosial|social program|kegiatan sosial|social (activity|activities|impact))\b/i],
    answer: {
      id:
        "Charity Program MUTAWWIFMU adalah program sosial yang terintegrasi dalam perjalanan — berbagi dan memberdayakan komunitas lokal di destinasi. " +
        "Untuk penyelenggaraan pada perjalanan tertentu, silakan dikonfirmasikan lebih dahulu bersama tim kami.",
      en:
        "MUTAWWIFMU's Charity Program is a social program integrated into the journey — sharing with and empowering local communities at the destination. " +
        "For its arrangement on a particular trip, please confirm it with our team first.",
    },
  },
  {
    topic: "photographer-videographer",
    patterns: [
      /\b(fotos?|fotografer|videografer|photograph(y|ers?)?|videograph(y|ers?)?|kameraman|dokumentasi|documentation|photos?|videos?)\b/i,
    ],
    answer: {
      id:
        "MUTAWWIFMU menyediakan fotografer dan videografer profesional untuk dokumentasi selama perjalanan, mengabadikan momen ibadah dan wisata dalam kualitas premium. " +
        "Lokasi sesi yang tercantum dalam materi kami meliputi Pelataran Masjidil Haram, Masjid Nabawi, Jabal Kudai & Khandama, serta Al-Ula, termasuk momen spesial seperti akad nikah. " +
        "Hasil foto dan video disertai editing profesional. Rincian sesi dan penawarannya perlu dikonfirmasi oleh tim kami.",
      en:
        "MUTAWWIFMU provides professional photographers and videographers for documentation during your journey, capturing worship and travel moments in premium quality. " +
        "The session locations listed in our materials include the courtyard of Masjidil Haram, Masjid Nabawi, Jabal Kudai & Khandama, and Al-Ula, including special moments such as the akad nikah. " +
        "Photo and video results include professional editing. Session details and pricing need to be confirmed by our team.",
    },
  },
  {
    topic: "custom-itinerary",
    patterns: [
      /\b(itinerary|itineraries|itinerari|rencana perjalanan|custom (itinerary|itineraries|trip|perjalanan)|personalized (itinerary|trip)|dikustomisasi|kustomisasi)\b/i,
    ],
    answer: {
      id:
        "Custom Itinerary MUTAWWIFMU adalah itinerary personal sesuai kebutuhan, preferensi, dan anggaran Anda — dari umrah hingga wisata ke 190 negara. " +
        "Paket layanan dapat dikustomisasi sepenuhnya, misalnya destinasi, durasi, akomodasi, maupun fasilitas tambahan, dengan jadwal keberangkatan yang fleksibel. " +
        "Penyusunan itinerary dilakukan bersama tim kami setelah kebutuhan Anda dipahami.",
      en:
        "MUTAWWIFMU's Custom Itinerary is a personalized itinerary according to your needs, preferences, and budget — from umrah to trips across 190 countries. " +
        "The service package can be fully customized, for example destination, duration, accommodation, and additional facilities, with flexible departure scheduling. " +
        "The itinerary is prepared together with our team once your needs are understood.",
    },
  },
];

/**
 * Cocokkan pesan Calon Jemaah dengan topik FAQ yang didukung materi.
 * Mengembalikan `null` bila tidak ada topik yang benar-benar didukung —
 * pemanggil yang menentukan apakah pesan diteruskan ke alur admin.
 */
export function matchFaqTopic(text: string): FaqTopic | null {
  // Tiket 09: varian ejaan dinormalkan lebih dahulu agar ejaan yang sama-sama
  // benar (mis. muthawif/Mutowwif) tidak lolos dari pola topik sederhana.
  const pesan = normalkanVarianEjaan(text);
  for (const entry of ENTRIES) {
    if (entry.patterns.every((pattern) => pattern.test(pesan))) {
      return entry.topic;
    }
  }
  return null;
}

/** Ambil jawaban FAQ sebuah topik dalam bahasa Calon Jemaah. */
export function faqAnswer(topic: FaqTopic, language: Language): string {
  const entry = ENTRIES.find((candidate) => candidate.topic === topic);
  if (entry === undefined) {
    throw new Error(`Topik FAQ tidak dikenal: ${topic}`);
  }
  return language === "id" ? entry.answer.id : entry.answer.en;
}

/**
 * Jawaban FAQ untuk sebuah pesan (fitur harga-transportasi-per-rute dan
 * harga-fotografi-tasreh-cgk). Topik `price-transport` dirender per rute sesuai
 * kata kunci tujuan, dan `price-photographer-videographer` per lokasi sesi,
 * keduanya dari pesan Calon Jemaah; topik lain memakai `faqAnswer` apa adanya.
 * `faqAnswer` tetap memuat materi lengkap — termasuk seluruh rute transport dan
 * seluruh baris harga foto — sebagai acuan grounding angka (`pengamanAngka`).
 */
export function jawabanFaq(topic: FaqTopic, pesan: string, language: Language): string {
  if (topic === "price-transport") {
    return susunJawabanTransport(pesan, language);
  }
  if (topic === "price-photographer-videographer") {
    return susunJawabanFoto(pesan, language);
  }
  return faqAnswer(topic, language);
}
