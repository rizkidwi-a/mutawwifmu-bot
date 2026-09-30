/**
 * Pengetahuan FAQ dari materi bisnis MUTAWWIFMU (tiket 03: Private Premium
 * Umrah & Land Arrangement; tiket 04: layanan lain dalam profil perusahaan).
 *
 * Setiap jawaban disusun hanya dari fakta yang tercantum dalam materi bisnis:
 * - "BOOKLET MUTAWWIFMU.md" — profil perusahaan: layanan, armada, city tour.
 * - "HOTEL RATES MUTAWWIFMU (2).md" — layanan Private Premium Umrah &
 *   Land Arrangement, pilihan hotel Mekkah/Madinah, syarat & ketentuan.
 *
 * Jangan menambahkan rincian paket, layanan, atau ketentuan yang tidak
 * tercantum di materi tersebut. Pertanyaan yang tidak didukung materi atau
 * memerlukan konfirmasi admin diteruskan ke alur handoff (tiket 02), bukan
 * dijawab dari asumsi.
 */
import type { Language } from "../conversation/language.ts";

/** Topik FAQ yang didukung materi bisnis MUTAWWIFMU. */
export type FaqTopic =
  | "land-arrangement"
  | "mutawwif"
  | "visa-documents"
  | "hotel-accommodation"
  | "transport-fleet"
  | "airport-handling"
  | "city-tour"
  | "city-tour-makkah"
  | "city-tour-madinah"
  | "city-tour-thaif"
  | "city-tour-alula";

interface FaqEntry {
  readonly topic: FaqTopic;
  /** Semua pola harus cocok; sinonim satu topik dirangkai dalam satu alternatif. */
  readonly patterns: readonly RegExp[];
  readonly answer: { readonly id: string; readonly en: string };
}

/**
 * Entri FAQ. Urutan menentukan prioritas bila sebuah pesan cocok dengan lebih
 * dari satu topik: topik yang lebih spesifik (mis. city tour per destinasi)
 * didahulukan.
 */
const ENTRIES: readonly FaqEntry[] = [
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
    topic: "city-tour-thaif",
    patterns: [/\b(city tour|tour|tur|wisata|ziarah|jalan-jalan)\b/i, /\b(thaif|taif|tha'if)\b/i],
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
    patterns: [/\b(city tour|tour|tur|wisata|ziarah|jalan-jalan)\b/i, /\b(al ?ula|al-ula)\b/i],
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
    patterns: [/\b(city tour|tour|tur|wisata|ziarah|jalan-jalan)\b/i, /\b(makkah|mekah|mekkah)\b/i],
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
    patterns: [/\b(city tour|tour|tur|wisata|ziarah|jalan-jalan)\b/i, /\b(madinah|medinah|medina)\b/i],
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
    patterns: [/\b(city tour|citytour|tur kota|tour (kota|ziarah|sejarah|tanah suci)|ziarah)\b/i],
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
    patterns: [/\b(mutawwif|mutawif|muthawwif|pemandu ibadah|pembimbing ibadah|worship guides?)\b/i],
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
    topic: "visa-documents",
    patterns: [/\b(visa|dokumen|document|asuransi|insurance)\b/i],
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
    topic: "airport-handling",
    patterns: [/\b(airport handling|handling bandara|airport|bandara|imigrasi|immigration|bagasi|baggage|kedatangan|kepulangan|arrival|departure)\b/i],
    answer: {
      id:
        "Airport handling MUTAWWIFMU mencakup pendampingan kedatangan dan kepulangan di bandara: imigrasi, bagasi, hingga transfer ke hotel. " +
        "Materi kami mencantumkan penanganan untuk Bandara Jakarta serta Bandara Jeddah (kedatangan dan kepulangan).",
      en:
        "MUTAWWIFMU's airport handling covers arrival and departure assistance at the airport: immigration, baggage, through to hotel transfer. " +
        "Our materials list handling for Jakarta Airport and Jeddah Airport (arrival and departure).",
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
];

/**
 * Cocokkan pesan Calon Jemaah dengan topik FAQ yang didukung materi.
 * Mengembalikan `null` bila tidak ada topik yang benar-benar didukung —
 * pemanggil yang menentukan apakah pesan diteruskan ke alur admin.
 */
export function matchFaqTopic(text: string): FaqTopic | null {
  for (const entry of ENTRIES) {
    if (entry.patterns.every((pattern) => pattern.test(text))) {
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
