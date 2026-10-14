/**
 * Deteksi balasan template materi untuk tes regresi (tiket 06).
 *
 * Tes regresi memakai detektor ini untuk memastikan tidak ada pesan calon
 * jemaah yang dijawab dengan template topik lain ("misfire"): sejak ADR-0009
 * satu-satunya jawaban template yang boleh keluar adalah Harga Indikatif untuk
 * pertanyaan harga yang angkanya tercantum materi.
 */
import { faqAnswer, type FaqTopic } from "../../src/knowledge/businessFaq.ts";

/** Seluruh topik materi yang punya jawaban template. */
export const TOPIK_MATERI: readonly FaqTopic[] = [
  "land-arrangement",
  "tour-guide",
  "mutawwif",
  "multi-language-support",
  "visa-documents",
  "hotel-accommodation",
  "transport-fleet",
  "airport-handling",
  "charity-program",
  "photographer-videographer",
  "custom-itinerary",
  "city-tour",
  "city-tour-makkah",
  "city-tour-madinah",
  "city-tour-thaif",
  "city-tour-alula",
  "price-mutawwif",
  "price-document-arrangement",
  "price-airport-handling",
  "price-transport",
  "price-city-tour",
  "price-photographer-videographer",
  "price-tasreh",
  "price-hotel",
  "tasreh",
];

/** Topik materi yang jawaban templatenya (ID/EN) terkandung dalam balasan. */
export function templateDalamBalasan(balasan: string): FaqTopic[] {
  const kena: FaqTopic[] = [];
  for (const topik of TOPIK_MATERI) {
    for (const bahasa of ["id", "en"] as const) {
      if (balasan.includes(faqAnswer(topik, bahasa))) {
        kena.push(topik);
        break;
      }
    }
  }
  return kena;
}
