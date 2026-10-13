/**
 * Rute transportasi: data harga per rute dan pencocokan kata kunci tujuan
 * (fitur harga-transportasi-per-rute).
 *
 * Sumber angka: `data/transportasi harga/WhatsApp Image 2026-10-12 at 13.48.14.md`
 * (tabel "Transport Mutawwifmu", 23 rute × 6 armada) — menggantikan angka
 * lama BOOKLET sepenuhnya (keputusan pemilik, 2026-10-13). Satuan: SAR per
 * kendaraan (per grup). Angka disimpan verbatim sebagai string; pemisah
 * ribuan hanya ditambahkan saat render, tanpa menafsirkan nilai.
 *
 * Pencocokan deterministik (bukan LLM): lokasi yang disebut, arah
 * ("dari X ke Y"), penanda rute khusus (Taif, Badar, Masjid Ayesha/Jurana/
 * Qarn Al Manzil, stasiun kereta, ziarah kota, sewa per jam), serta armada
 * yang disebut menentukan baris yang ditampilkan. Pesan tanpa tujuan yang
 * dikenali dibalas dengan menu daftar rute — tetap Harga Indikatif, bukan
 * handoff (keputusan pemilik: tampilkan rute yang memungkinkan untuk
 * tujuan yang mungkin; menu hanya bila tidak ada rute yang cocok).
 */
import type { Language } from "../conversation/language.ts";

/** Armada pada tabel transport, sesuai urutan kolom sumber. */
export const ARMADA_URUT = ["camry", "staria", "gmc", "hiace", "coaster", "bus"] as const;
export type Armada = (typeof ARMADA_URUT)[number];

/** Label armada; nama model sama pada kedua bahasa. */
export const ARMADA_LABEL: Readonly<Record<Armada, { readonly id: string; readonly en: string }>> = {
  camry: { id: "Camry/Sonata", en: "Camry/Sonata" },
  staria: { id: "H1 Staria", en: "H1 Staria" },
  gmc: { id: "GMC", en: "GMC" },
  hiace: { id: "Hiace", en: "Hiace" },
  coaster: { id: "Coaster", en: "Coaster" },
  bus: { id: "Bus", en: "Bus" },
};

/**
 * Grup lokasi yang dikenali dari kata kunci pesan. Varian bandara dipisah
 * dari kotanya agar "dari bandara Madinah" tidak menjadi "dari Madinah"
 * (arahnya berbeda pada tabel), sementara sebutan polos ("dari Jeddah")
 * tetap cocok untuk keduanya.
 */
export type GrupLokasi =
  | "jeddah"
  | "jeddahBandara"
  | "makkah"
  | "madinah"
  | "madinahBandara"
  | "taif"
  | "badar"
  | "ayesha"
  | "jurana"
  | "qarn"
  | "stasiun"
  | "hotel";

/** Penanda rute khusus; rute khusus hanya tampil bila penandanya disebut. */
export type TagKhusus =
  | "taif"
  | "badar"
  | "ayesha"
  | "jurana"
  | "qarn"
  | "stasiun"
  | "ziarat"
  | "perJam";

export interface RuteTransport {
  readonly nomor: string;
  readonly label: { readonly id: string; readonly en: string };
  /** Harga verbatim dari tabel sumber, satuan SAR per kendaraan (per grup). */
  readonly harga: Readonly<Record<Armada, string>>;
  readonly asal: readonly GrupLokasi[];
  readonly tujuan: readonly GrupLokasi[];
  /** Titik singgah yang ikut menentukan kecocokan rute (mis. via Badar). */
  readonly via: readonly GrupLokasi[];
  /** Rute khusus: hanya tampil bila tag ini disebut pada pesan. */
  readonly khusus: TagKhusus | null;
  /** Rute PP/kota yang cocok tanpa memandang arah. */
  readonly abaikanArah: boolean;
  /** Rute yang berlaku di mana saja (sewa per jam). */
  readonly abaikanCakupan: boolean;
}

/** 23 rute tabel "Transport Mutawwifmu" (2026-10-12), urutan sesuai sumber. */
export const RUTE_TRANSPORT: readonly RuteTransport[] = [
  {
    nomor: "01",
    label: { id: "Bandara Jeddah → Hotel Makkah", en: "Jeddah Airport to Makkah Hotel" },
    harga: { camry: "400", staria: "500", gmc: "650", hiace: "550", coaster: "800", bus: "950" },
    asal: ["jeddahBandara"], tujuan: ["makkah"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "02",
    label: { id: "Hotel Makkah → Bandara Jeddah", en: "Makkah Hotel to Jeddah Airport" },
    harga: { camry: "350", staria: "450", gmc: "650", hiace: "550", coaster: "750", bus: "950" },
    asal: ["makkah"], tujuan: ["jeddahBandara"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "03",
    label: { id: "Hotel Makkah → Hotel Madinah", en: "Makkah Hotel to Madina Hotel" },
    harga: { camry: "600", staria: "700", gmc: "1100", hiace: "800", coaster: "1150", bus: "1350" },
    asal: ["makkah"], tujuan: ["madinah"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "04",
    label: { id: "Hotel Madinah → Hotel Makkah", en: "Madina Hotel to Makkah Hotel" },
    harga: { camry: "600", staria: "700", gmc: "1100", hiace: "800", coaster: "1150", bus: "1350" },
    asal: ["madinah"], tujuan: ["makkah"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "05",
    label: { id: "Bandara Madinah → Hotel Madinah", en: "Madina Airport to Madina Hotel" },
    harga: { camry: "300", staria: "350", gmc: "550", hiace: "500", coaster: "650", bus: "850" },
    asal: ["madinahBandara"], tujuan: ["madinah"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "06",
    label: { id: "Hotel Madinah → Bandara Madinah", en: "Madina Hotel to Madina Airport" },
    harga: { camry: "270", staria: "300", gmc: "500", hiace: "450", coaster: "600", bus: "850" },
    asal: ["madinah"], tujuan: ["madinahBandara"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "07",
    label: { id: "Bandara Jeddah → Hotel Madinah", en: "Jeddah Airport to Madina Hotel" },
    harga: { camry: "650", staria: "750", gmc: "1100", hiace: "800", coaster: "1150", bus: "1550" },
    asal: ["jeddahBandara"], tujuan: ["madinah"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "08",
    label: { id: "Hotel Madinah → Bandara Jeddah", en: "Madina Hotel to Jeddah Airport" },
    harga: { camry: "650", staria: "750", gmc: "1100", hiace: "800", coaster: "1150", bus: "1550" },
    asal: ["madinah"], tujuan: ["jeddahBandara"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "09",
    label: { id: "Jeddah → Ziarah Taif, kembali ke Jeddah", en: "Jeddah to Taif Ziarat & Return Jeddah" },
    harga: { camry: "750", staria: "850", gmc: "1500", hiace: "1150", coaster: "1650", bus: "1950" },
    asal: ["jeddah", "jeddahBandara"], tujuan: ["taif"], via: [], khusus: "taif", abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "10",
    label: { id: "Makkah → Ziarah Taif, kembali ke Makkah", en: "Makkah to Taif Ziarat & Return Makkah" },
    harga: { camry: "600", staria: "750", gmc: "1100", hiace: "850", coaster: "1150", bus: "1350" },
    asal: ["makkah"], tujuan: ["taif"], via: [], khusus: "taif", abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "11",
    label: { id: "Bandara Jeddah → Hotel Jeddah", en: "Jeddah Airport to Jeddah Hotel" },
    harga: { camry: "350", staria: "400", gmc: "500", hiace: "450", coaster: "650", bus: "650" },
    asal: ["jeddahBandara"], tujuan: ["jeddah", "hotel"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "12",
    label: { id: "Hotel Jeddah → Bandara Jeddah", en: "Jeddah Hotel to Jeddah Airport" },
    harga: { camry: "300", staria: "350", gmc: "450", hiace: "400", coaster: "550", bus: "650" },
    asal: ["jeddah", "hotel"], tujuan: ["jeddahBandara"], via: [], khusus: null, abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "13",
    label: { id: "Hotel Makkah → Hotel Madinah via Badar", en: "Makkah Hotel to Madina Hotel via Badar" },
    harga: { camry: "750", staria: "850", gmc: "1300", hiace: "950", coaster: "1350", bus: "1650" },
    asal: ["makkah"], tujuan: ["madinah"], via: ["badar"], khusus: "badar", abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "14",
    label: { id: "Hotel Madinah → Hotel Makkah via Badar", en: "Madina Hotel to Makkah Hotel via Badar" },
    harga: { camry: "750", staria: "850", gmc: "1300", hiace: "950", coaster: "1350", bus: "1650" },
    asal: ["madinah"], tujuan: ["makkah"], via: ["badar"], khusus: "badar", abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "15",
    label: { id: "Hotel Madinah → Badar → kembali ke Madinah", en: "Madina Hotel to Badar to Back Madina" },
    harga: { camry: "600", staria: "700", gmc: "1100", hiace: "800", coaster: "1050", bus: "1250" },
    asal: ["madinah", "hotel"], tujuan: ["badar"], via: [], khusus: "badar", abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "16",
    label: { id: "Hotel → Masjid Ayesha → kembali ke Hotel", en: "Hotel to Masjid Ayesha to Back Hotel" },
    harga: { camry: "270", staria: "320", gmc: "450", hiace: "270", coaster: "550", bus: "650" },
    asal: ["hotel", "makkah"], tujuan: ["ayesha"], via: [], khusus: "ayesha", abaikanArah: true, abaikanCakupan: false,
  },
  {
    nomor: "17",
    label: { id: "Hotel → Masjid Jurana → kembali ke Hotel", en: "Hotel to Masjid Jurana to Back Hotel" },
    harga: { camry: "300", staria: "350", gmc: "500", hiace: "450", coaster: "650", bus: "750" },
    asal: ["hotel", "makkah"], tujuan: ["jurana"], via: [], khusus: "jurana", abaikanArah: true, abaikanCakupan: false,
  },
  {
    nomor: "18",
    label: { id: "Hotel → Qarn Al Manzil → kembali ke Hotel", en: "Hotel to Qarn Al Manzil to Back Hotel" },
    harga: { camry: "500", staria: "600", gmc: "750", hiace: "650", coaster: "850", bus: "1050" },
    asal: ["hotel", "makkah"], tujuan: ["qarn"], via: [], khusus: "qarn", abaikanArah: true, abaikanCakupan: false,
  },
  {
    nomor: "19",
    label: { id: "Hotel → Stasiun Kereta", en: "Hotel to Train Station" },
    harga: { camry: "250", staria: "300", gmc: "500", hiace: "400", coaster: "550", bus: "600" },
    asal: ["hotel", "makkah", "madinah"], tujuan: ["stasiun"], via: [], khusus: "stasiun", abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "20",
    label: { id: "Stasiun Kereta → Hotel", en: "Train Station to Hotel" },
    harga: { camry: "250", staria: "300", gmc: "500", hiace: "400", coaster: "550", bus: "600" },
    asal: ["stasiun"], tujuan: ["hotel", "makkah", "madinah"], via: [], khusus: "stasiun", abaikanArah: false, abaikanCakupan: false,
  },
  {
    nomor: "21",
    label: { id: "Ziarah Makkah", en: "Makkah Ziarat" },
    harga: { camry: "350", staria: "450", gmc: "600", hiace: "500", coaster: "700", bus: "850" },
    asal: ["makkah"], tujuan: ["makkah"], via: [], khusus: "ziarat", abaikanArah: true, abaikanCakupan: false,
  },
  {
    nomor: "22",
    label: { id: "Ziarah Madinah", en: "Madina Ziarat" },
    harga: { camry: "350", staria: "400", gmc: "550", hiace: "500", coaster: "650", bus: "750" },
    asal: ["madinah"], tujuan: ["madinah"], via: [], khusus: "ziarat", abaikanArah: true, abaikanCakupan: false,
  },
  {
    nomor: "23",
    label: { id: "Sewa Per Jam", en: "Per Hour Rate" },
    harga: { camry: "250", staria: "270", gmc: "350", hiace: "300", coaster: "350", bus: "350" },
    asal: [], tujuan: [], via: [], khusus: "perJam", abaikanArah: true, abaikanCakupan: true,
  },
];

// ---------------------------------------------------------------------------
// Deteksi lokasi, arah, penanda khusus, dan armada
// ---------------------------------------------------------------------------

interface PolaGrup {
  readonly grup: GrupLokasi;
  readonly pola: RegExp;
  /** Varian bandara bila kata bandara/airport muncul dekat sebutan kota. */
  readonly bandara: GrupLokasi | null;
}

const GRUP_KOTA: ReadonlySet<GrupLokasi> = new Set<GrupLokasi>([
  "jeddah",
  "jeddahBandara",
  "makkah",
  "madinah",
  "madinahBandara",
]);

/**
 * Grup tujuan khusus: kota dalam span yang sama adalah atribut, bukan ujung
 * ("stasiun Madinah" = stasiun di Madinah, bukan tujuan Madinah).
 */
const GRUP_TUJUAN_KHUSUS: ReadonlySet<GrupLokasi> = new Set<GrupLokasi>([
  "stasiun",
  "ayesha",
  "jurana",
  "qarn",
]);

const POLOK_GRUP: readonly PolaGrup[] = [
  { grup: "jeddah", pola: /\bjeddah\b/gi, bandara: "jeddahBandara" },
  { grup: "makkah", pola: /\b(makkah|mekah|mekkah)\b/gi, bandara: null },
  { grup: "madinah", pola: /\b(madinah|medinah)\b/gi, bandara: "madinahBandara" },
  { grup: "taif", pola: /\b(taif|thaif|toif)\b/gi, bandara: null },
  { grup: "badar", pola: /\b(badar|badr)\b/gi, bandara: null },
  {
    grup: "ayesha",
    pola: /\b(aisyah|ayesha|aishah|asyiah|tan[\s'\-]?im)\b/gi,
    bandara: null,
  },
  { grup: "jurana", pola: /\b(jurana|juranah)\b/gi, bandara: null },
  { grup: "qarn", pola: /\b(qarn|karn)\b/gi, bandara: null },
  {
    grup: "stasiun",
    pola: /\b(stasiun|stations?|kereta|har+am+[ai]{2}n|hhr)\b/gi,
    bandara: null,
  },
  { grup: "hotel", pola: /\b(hotels?|penginapan)\b/gi, bandara: null },
];

const KATA_BANDARA = /\b(bandara|airport|apt\.?)\b/i;
const KATA_HOTEL = /\b(hotels?|penginapan)\b/i;
const KATA_ZIARAT = /\b(ziarah|ziarat|ziaroh|city[\s-]?tour|tur kota|keliling)\b/i;
const KATA_PER_JAM = /\b(per[\s-]?jam|per[\s-]?hour|hourly|tiap jam|sewa jam)\b/i;

/** Jendela pencarian kata bandara di sekitar sebutan kota (dalam satu span). */
const JENDELA_BANDARA = 15;

const PRAPOSISI = /\b(dari|from|dr|ke|to|menuju|tujuan)\b/gi;
const PEMISAH_SPAN = /[,;!?.\n\r]+/;

interface Span {
  readonly teks: string;
  readonly sisi: "asal" | "tujuan" | null;
}

/**
 * Pecah pesan menjadi span arah ("dari X", "ke Y") dan span sisa. Pemisahan
 * ini membuat deteksi lokasi sadar-klausa: "hotel Jeddah ke bandara Jeddah"
 * tidak membuat sebutan "Jeddah" pertama terbaca sebagai bandara hanya karena
 * kata "bandara" muncul di klausa lain.
 */
function bagiSpan(pesan: string): Span[] {
  const hasil: Span[] = [];
  for (const segmen of pesan.split(PEMISAH_SPAN)) {
    const tanda: Array<{ kata: string; mulai: number; akhir: number }> = [];
    for (const m of segmen.matchAll(PRAPOSISI)) {
      const kata = (m[1] ?? m[0]).toLowerCase();
      tanda.push({ kata, mulai: m.index, akhir: m.index + m[0].length });
    }
    let posisi = 0;
    for (const [i, t] of tanda.entries()) {
      const berikutnya = tanda[i + 1];
      if (t.mulai > posisi) {
        hasil.push({ teks: segmen.slice(posisi, t.mulai), sisi: null });
      }
      const batas = berikutnya !== undefined ? berikutnya.mulai : segmen.length;
      const objek = segmen.slice(t.akhir, Math.min(batas, t.akhir + 40));
      const sisi = t.kata === "dari" || t.kata === "from" || t.kata === "dr" ? "asal" : "tujuan";
      hasil.push({ teks: objek, sisi });
      posisi = t.akhir + objek.length;
    }
    if (posisi < segmen.length) {
      hasil.push({ teks: segmen.slice(posisi), sisi: null });
    }
  }
  return hasil.filter((s) => s.teks.trim() !== "");
}

interface DeteksiSpan {
  readonly grup: ReadonlySet<GrupLokasi>;
  readonly bertandaHotel: boolean;
  readonly bertandaBandara: boolean;
}

/** Deteksi grup lokasi dalam satu span, dengan jendela kata bandara terbatas. */
function deteksiSpan(teks: string): DeteksiSpan {
  const grup = new Set<GrupLokasi>();
  for (const polaGrup of POLOK_GRUP) {
    for (const m of teks.matchAll(polaGrup.pola)) {
      const mulai = Math.max(0, m.index - JENDELA_BANDARA);
      const akhir = Math.min(teks.length, m.index + m[0].length + JENDELA_BANDARA);
      const jendela = teks.slice(mulai, akhir);
      if (polaGrup.bandara !== null && KATA_BANDARA.test(jendela)) {
        grup.add(polaGrup.bandara);
      } else {
        grup.add(polaGrup.grup);
      }
    }
  }
  return {
    grup,
    bertandaHotel: KATA_HOTEL.test(teks),
    bertandaBandara: KATA_BANDARA.test(teks),
  };
}

/** Sisi arah beserta penandanya; sisi tanpa grup kuat tidak membatasi rute. */
export interface SisiArah {
  readonly grup: ReadonlySet<GrupLokasi>;
  readonly bertandaHotel: boolean;
  readonly bertandaBandara: boolean;
}

export interface InfoPesanTransport {
  readonly grupDisebut: ReadonlySet<GrupLokasi>;
  readonly asal: SisiArah;
  readonly tujuan: SisiArah;
  readonly khususDisebut: ReadonlySet<TagKhusus>;
  readonly armadaDisebut: readonly Armada[];
}

/** Keluarga lokasi: varian bandara menyatu dengan kotanya. */
function famili(grup: GrupLokasi): GrupLokasi {
  if (grup === "jeddahBandara") return "jeddah";
  if (grup === "madinahBandara") return "madinah";
  return grup;
}

/**
 * Analisis pesan: grup lokasi yang disebut, arah dari kata "dari/ke" (dan
 * padanannya), penanda rute khusus, serta armada yang disebut.
 */
export function analisisPesanTransport(pesan: string): InfoPesanTransport {
  const grupDisebut = new Set<GrupLokasi>();
  const asal = new Set<GrupLokasi>();
  const tujuan = new Set<GrupLokasi>();
  let bertandaHotelAsal = false;
  let bertandaBandaraAsal = false;
  let bertandaHotelTujuan = false;
  let bertandaBandaraTujuan = false;

  for (const span of bagiSpan(pesan)) {
    const deteksi = deteksiSpan(span.teks);
    for (const g of deteksi.grup) grupDisebut.add(g);
    if (span.sisi === null) continue;

    // Atribut dalam span yang memuat tujuan khusus/kota bukan ujung rute:
    // "stasiun Madinah" = stasiun di Madinah, "Makkah lewat Badar" = tujuan
    // Makkah dengan singgah Badar (kecocokan rute dijaga lewat cakupan).
    const adaKota = [...deteksi.grup].some((g) => GRUP_KOTA.has(g));
    const adaTujuanKhusus = [...deteksi.grup].some((g) => GRUP_TUJUAN_KHUSUS.has(g));
    const grupSisi = [...deteksi.grup].filter((g) => {
      if (adaTujuanKhusus && GRUP_KOTA.has(g)) return false;
      if (adaKota && (g === "badar" || g === "taif")) return false;
      return true;
    });
    if (span.sisi === "asal") {
      for (const g of grupSisi) asal.add(g);
      bertandaHotelAsal ||= deteksi.bertandaHotel;
      bertandaBandaraAsal ||= deteksi.bertandaBandara;
    } else {
      for (const g of grupSisi) tujuan.add(g);
      bertandaHotelTujuan ||= deteksi.bertandaHotel;
      bertandaBandaraTujuan ||= deteksi.bertandaBandara;
    }
  }

  const khususDisebut = new Set<TagKhusus>();
  if (grupDisebut.has("taif")) khususDisebut.add("taif");
  if (grupDisebut.has("badar")) khususDisebut.add("badar");
  if (grupDisebut.has("ayesha")) khususDisebut.add("ayesha");
  if (grupDisebut.has("jurana")) khususDisebut.add("jurana");
  if (grupDisebut.has("qarn")) khususDisebut.add("qarn");
  if (grupDisebut.has("stasiun")) khususDisebut.add("stasiun");
  if (KATA_ZIARAT.test(pesan)) khususDisebut.add("ziarat");
  if (KATA_PER_JAM.test(pesan)) khususDisebut.add("perJam");

  return {
    grupDisebut,
    asal: { grup: asal, bertandaHotel: bertandaHotelAsal, bertandaBandara: bertandaBandaraAsal },
    tujuan: {
      grup: tujuan,
      bertandaHotel: bertandaHotelTujuan,
      bertandaBandara: bertandaBandaraTujuan,
    },
    khususDisebut,
    armadaDisebut: deteksiArmada(pesan),
  };
}

const KATA_ARMADA: ReadonlyArray<readonly [Armada, RegExp]> = [
  ["camry", /\b(camry|sonata)\b/i],
  ["staria", /\b(staria|h[\s-]?1)\b/i],
  ["gmc", /\bgmc\b/i],
  ["hiace", /\bhiace\b/i],
  ["coaster", /\bcoaster\b/i],
  ["bus", /\b(bus|bis)\b/i],
];

/** Armada yang disebut pada pesan, sesuai urutan kolom tabel. */
export function deteksiArmada(pesan: string): readonly Armada[] {
  return ARMADA_URUT.filter((armada) => {
    const pola = KATA_ARMADA.find(([nama]) => nama === armada);
    return pola !== undefined && pola[1].test(pesan);
  });
}

// ---------------------------------------------------------------------------
// Pencocokan rute
// ---------------------------------------------------------------------------

function cocokGrupSisi(kandidat: readonly GrupLokasi[], g: GrupLokasi, sisi: SisiArah): boolean {
  const f = famili(g);
  if (sisi.bertandaBandara && (f === "jeddah" || f === "madinah")) {
    // Penanda bandara menuntut ujung bandara, bukan hotel/kota.
    return kandidat.includes(f === "jeddah" ? "jeddahBandara" : "madinahBandara");
  }
  if (sisi.bertandaHotel) {
    // Penanda hotel menuntut ujung kota/hotel, bukan bandara.
    return kandidat.includes(f);
  }
  return kandidat.some((k) => famili(k) === f);
}

/**
 * Uji satu sisi arah terhadap ujung rute. Sisi yang hanya berisi "hotel"
 * ("ke hotel") tidak membatasi; selain itu minimal satu grup pada sisi harus
 * cocok dengan ujung rute (kecocokan grup lain dijaga aturan cakupan).
 */
function ujiSisi(kandidat: readonly GrupLokasi[], sisi: SisiArah): boolean {
  const grup = [...sisi.grup].filter((g) => g !== "hotel");
  if (grup.length === 0) return true;
  return grup.some((g) => cocokGrupSisi(kandidat, g, sisi));
}

function cakupanRute(rute: RuteTransport): ReadonlySet<GrupLokasi> {
  return new Set([...rute.asal, ...rute.tujuan, ...rute.via].map(famili));
}

function cocokRute(rute: RuteTransport, info: InfoPesanTransport): boolean {
  // Penanda khusus bersifat eksklusif: bila pesan menyebut salah satunya,
  // hanya rute khusus dengan penanda tersebut yang tampil; tanpa penanda,
  // hanya rute umum (transfer bandara/kota) yang tampil.
  if (info.khususDisebut.size > 0) {
    if (rute.khusus === null || !info.khususDisebut.has(rute.khusus)) return false;
  } else if (rute.khusus !== null) {
    return false;
  }
  // Cakupan: setiap lokasi kuat yang disebut harus menjadi bagian rute,
  // sehingga "Makkah Madinah" tidak menampilkan rute yang tidak melibatkan
  // salah satunya. "hotel" adalah penanda lemah dan tidak dihitung.
  if (!rute.abaikanCakupan) {
    const cakupan = cakupanRute(rute);
    for (const g of info.grupDisebut) {
      if (g === "hotel") continue;
      if (!cakupan.has(famili(g))) return false;
    }
  }
  if (rute.abaikanArah) return true;
  return ujiSisi(rute.asal, info.asal) && ujiSisi(rute.tujuan, info.tujuan);
}

/**
 * Rute yang cocok dengan kata kunci tujuan pada pesan, dalam urutan tabel.
 * Pesan tanpa tujuan yang dikenali menghasilkan daftar kosong (menu rute).
 */
export function cocokkanRuteTransport(pesan: string): readonly RuteTransport[] {
  const info = analisisPesanTransport(pesan);
  // Pesan tanpa satu pun lokasi/tujuan yang dikenali (mis. "ongkos transport
  // selama disana berapa?") tidak menampilkan rute apa pun — jawabannya
  // adalah menu daftar rute, bukan seluruh tabel.
  const adaLokasi = [...info.grupDisebut].some((g) => g !== "hotel");
  if (!adaLokasi && info.khususDisebut.size === 0) return [];
  return RUTE_TRANSPORT.filter((rute) => cocokRute(rute, info));
}

// ---------------------------------------------------------------------------
// Render jawaban dan materi
// ---------------------------------------------------------------------------

const SATUAN_ID = "SAR per kendaraan (per grup)";
const SATUAN_EN = "SAR per vehicle (per group)";

const JUDUL_ID =
  `Harga Indikatif transportasi per rute — bukan penawaran final, satuan ${SATUAN_ID}:`;
const PENUTUP_ID =
  "Angka dapat berubah setelah diperiksa admin — mohon konfirmasi rute, armada, " +
  "dan harga terkini kepada tim kami.";
const MENU_ID =
  `Harga Indikatif transportasi per rute — bukan penawaran final, satuan ${SATUAN_ID}. ` +
  "Rute yang tersedia: dari/ke Bandara Jeddah (hotel Makkah, hotel Madinah, hotel Jeddah), " +
  "Makkah–Madinah (termasuk via Badar), ziarah Taif dari Jeddah atau Makkah, " +
  "ziarah kota Makkah dan Madinah, Masjid Ayesha, Masjid Jurana, Qarn Al Manzil (PP), " +
  "hotel–stasiun kereta, serta sewa per jam. " +
  "Silakan sebutkan rute atau tujuan Anda agar saya dapat menampilkan harga yang sesuai. " +
  PENUTUP_ID;

const JUDUL_EN =
  `Indicative Prices for transportation per route — not a final offer, ${SATUAN_EN}:`;
const PENUTUP_EN =
  "Figures may change after being reviewed by our admin — please confirm the " +
  "route, fleet, and current price with our team.";
const MENU_EN =
  `Indicative Prices for transportation per route — not a final offer, ${SATUAN_EN}. ` +
  "Available routes: to/from Jeddah Airport (Makkah hotel, Madina hotel, Jeddah hotel), " +
  "Makkah–Madinah (including via Badar), Taif ziarat from Jeddah or Makkah, " +
  "Makkah and Madina city ziarat, Masjid Ayesha, Masjid Jurana, Qarn Al Manzil (round trip), " +
  "hotel–train station, and hourly rental. " +
  "Please mention your route or destination so I can show the matching prices. " +
  PENUTUP_EN;

/**
 * Format angka untuk tampilan: pemisah ribuan titik (id) atau koma (en).
 * Nilai tersimpan verbatim; hanya format yang berubah.
 */
function formatNilai(nilai: string, bahasa: Language): string {
  return nilai.replace(/\B(?=(\d{3})+(?!\d))/g, bahasa === "id" ? "." : ",");
}

function teksHarga(rute: RuteTransport, armada: readonly Armada[], bahasa: Language): string {
  return armada
    .map((a) => `${ARMADA_LABEL[a][bahasa]} SAR ${formatNilai(rute.harga[a], bahasa)}`)
    .join("; ");
}

function barisRute(rute: RuteTransport, bahasa: Language, armada: readonly Armada[]): string {
  const kolom = armada.length > 0 ? armada : ARMADA_URUT;
  return `• ${rute.label[bahasa]}: ${teksHarga(rute, kolom, bahasa)}`;
}

/**
 * Materi lengkap topik `price-transport`: seluruh 23 rute sebagai acuan
 * grounding angka (`pengamanAngka`), sekaligus jawaban utuh bila diperlukan.
 */
export function susunMateriTransport(bahasa: Language): string {
  const baris = RUTE_TRANSPORT.map(
    (rute) => `${rute.nomor}. ${rute.label[bahasa]}: ${teksHarga(rute, ARMADA_URUT, bahasa)}`,
  );
  const judul = bahasa === "id" ? JUDUL_ID : JUDUL_EN;
  const penutup = bahasa === "id" ? PENUTUP_ID : PENUTUP_EN;
  return [judul, ...baris, penutup].join("\n");
}

/**
 * Jawaban Harga Indikatif transportasi untuk sebuah pesan: hanya baris rute
 * yang terpicu kata kunci tujuan (dan armada yang disebut bila ada). Pesan
 * tanpa rute yang cocok memperoleh menu daftar rute.
 */
export function susunJawabanTransport(pesan: string, bahasa: Language): string {
  const info = analisisPesanTransport(pesan);
  const rute = cocokkanRuteTransport(pesan);
  if (rute.length === 0) {
    return bahasa === "id" ? MENU_ID : MENU_EN;
  }
  const judul = bahasa === "id" ? JUDUL_ID : JUDUL_EN;
  const penutup = bahasa === "id" ? PENUTUP_ID : PENUTUP_EN;
  return [judul, ...rute.map((r) => barisRute(r, bahasa, info.armadaDisebut)), penutup].join("\n");
}
