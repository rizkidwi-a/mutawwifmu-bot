/**
 * Port kanal penerimaan admin untuk handoff (spec: "jangan mengasumsikan
 * adanya CRM atau shared inbox tertentu"). Implementasi `LoggingAdminChannel`
 * bersifat sementara; kanal final adalah keputusan pemilik dan dicatat sebagai
 * ADR sebelum handoff dipakai di produksi (gate pra-produksi, lihat tiket 06).
 */

import type { ConversationTurn, FollowUpRequest, HandOffReason } from "./conversation/types.ts";

/** Isi yang diteruskan ke admin: alasan, ringkasan permintaan, dan konteks percakapan. */
export interface AdminHandoff {
  /** Nomor calon jemaah (E.164 tanpa tanda '+'). */
  readonly from: string;
  readonly reason: HandOffReason;
  /** Permintaan Tindak Lanjut bila ada; selain itu null. */
  readonly request: FollowUpRequest | null;
  readonly history: readonly ConversationTurn[];
}

export interface AdminChannel {
  /** Teruskan handoff ke kanal admin; lempar error bila penerusan gagal. */
  deliver(handoff: AdminHandoff): void;
}

/**
 * Implementasi sementara: mencatat handoff lewat penulis teks (default stdout).
 * Penerima nyata (mis. WhatsApp admin, email, dsb.) menggantikan implementasi
 * ini tanpa mengubah perilaku percakapan.
 */
export class LoggingAdminChannel implements AdminChannel {
  private readonly write: (text: string) => void;

  constructor(write: (text: string) => void = (text) => console.log(text)) {
    this.write = write;
  }

  deliver(handoff: AdminHandoff): void {
    this.write(formatAdminHandoff(handoff));
  }
}

const REASON_LABELS: Record<HandOffReason, string> = {
  "follow-up-request": "Permintaan Tindak Lanjut",
  "human-request": "Permintaan berbicara dengan manusia",
  "unsupported-question": "Pertanyaan yang tidak didukung/tidak pasti",
  "custom-quote-or-availability": "Permintaan penawaran khusus / konfirmasi harga atau ketersediaan",
  "agency-or-corporate": "Pertanyaan agen/korporasi",
  "booking-or-payment": "Pertanyaan booking/pembayaran",
  "active-trip": "Perjalanan yang sedang berlangsung",
  emergency: "Keadaan darurat",
};

/** Ringkasan teks untuk admin: alasan, Permintaan Tindak Lanjut, konteks percakapan. */
export function formatAdminHandoff(handoff: AdminHandoff): string {
  const lines: string[] = [
    "[Handoff ke admin]",
    `Alasan: ${REASON_LABELS[handoff.reason]} (${handoff.reason})`,
    `Nomor calon jemaah: ${handoff.from}`,
  ];
  if (handoff.request !== null) {
    lines.push("", "Ringkasan Permintaan Tindak Lanjut:");
    lines.push(...requestLines(handoff.request));
  }
  lines.push("", "Konteks percakapan:");
  for (const turn of handoff.history) {
    lines.push(`${turn.role}: ${turn.text}`);
  }
  return lines.join("\n");
}

function requestLines(request: FollowUpRequest): string[] {
  return [
    `- Layanan/tujuan: ${request.serviceOrDestination}`,
    `- Tanggal/periode: ${request.travelDateOrPeriod}`,
    `- Jumlah jemaah: ${request.travellerCount}`,
    `- Kebutuhan utama: ${request.mainNeeds}`,
    `- Kisaran anggaran: ${request.budgetRange ?? "tidak disampaikan"}`,
  ];
}
