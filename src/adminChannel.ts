/**
 * Port kanal penerimaan admin untuk handoff (spec: "jangan mengasumsikan
 * adanya CRM atau shared inbox tertentu"). Keputusan pemilik (ADR-0006):
 * handoff dikirim sebagai pesan WhatsApp ke nomor admin yang dikonfigurasi
 * (`WHATSAPP_ADMIN_NUMBER`) melalui provider yang sama dengan bot.
 */

import type { MessageSender } from "./messageSender.ts";
import type { ConversationTurn, FollowUpRequest, HandOffReason } from "./conversation/types.ts";

/** Isi yang diteruskan ke admin: alasan, Ringkasan Kebutuhan, dan konteks percakapan. */
export interface AdminHandoff {
  /** Nomor calon jemaah (E.164 tanpa tanda '+'). */
  readonly from: string;
  readonly reason: HandOffReason;
  /** Permintaan Tindak Lanjut bila ada; selain itu null. */
  readonly request: FollowUpRequest | null;
  /**
   * Penanda pengiriman ulang (tiket 05): pesan ini revisi Ringkasan Kebutuhan
   * yang sudah dikirim sebelumnya, bukan prospek baru. Diberikan hanya untuk
   * pengiriman ulang yang disetujui calon jemaah.
   */
  readonly revision?: true;
  readonly history: readonly ConversationTurn[];
}

export interface AdminChannel {
  /**
   * Teruskan handoff ke kanal admin; lempar error bila penerusan gagal.
   * Boleh sinkron maupun asinkron (pengiriman provider) — pemanggil wajib
   * menunggu hasilnya sebelum mengklaim informasi telah diteruskan.
   */
  deliver(handoff: AdminHandoff): void | Promise<void>;
}

/**
 * Kanal handoff ke nomor admin WhatsApp (ADR-0006). Isi handoff selalu dicatat
 * ke log proses lebih dulu (jejak audit dan pemulihan bila pengiriman gagal),
 * lalu dikirim sebagai pesan teks ke nomor admin lewat port `MessageSender`.
 */
export class WhatsAppAdminChannel implements AdminChannel {
  private readonly sender: MessageSender;
  private readonly adminNumber: string;
  private readonly write: (text: string) => void;

  constructor(
    sender: MessageSender,
    adminNumber: string,
    write: (text: string) => void = (text) => console.log(text),
  ) {
    this.sender = sender;
    this.adminNumber = adminNumber;
    this.write = write;
  }

  async deliver(handoff: AdminHandoff): Promise<void> {
    const text = formatAdminHandoff(handoff);
    this.write(text);
    await this.sender.sendText(this.adminNumber, text);
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

/**
 * Ringkasan teks untuk admin (tiket 03): identitas pengirim, Ringkasan
 * Kebutuhan per bidang, sebutan lampiran bila ada, dan konteks percakapan.
 * Istilahnya mengikuti `CONTEXT.md`: Ringkasan Kebutuhan dari Permintaan
 * Tindak Lanjut.
 */
export function formatAdminHandoff(handoff: AdminHandoff): string {
  const lines: string[] = ["[Handoff ke admin]"];
  if (handoff.revision === true) {
    // Penanda "PEMBARUAN" (tiket 05): admin tahu ini revisi Ringkasan Kebutuhan
    // yang sudah dikirim sebelumnya, bukan prospek baru.
    lines.push("PEMBARUAN — revisi Ringkasan Kebutuhan yang sudah dikirim sebelumnya (bukan prospek baru)");
  }
  lines.push(
    `Alasan: ${REASON_LABELS[handoff.reason]} (${handoff.reason})`,
    `Nomor calon jemaah: ${handoff.from}`,
  );
  if (handoff.request !== null) {
    lines.push("", "Ringkasan Kebutuhan:");
    lines.push(...requestLines(handoff.request));
  }
  lines.push("", "Konteks percakapan:");
  for (const turn of handoff.history) {
    lines.push(`${turn.role}: ${turn.text}`);
  }
  return lines.join("\n");
}

function requestLines(request: FollowUpRequest): string[] {
  const lampiran =
    request.attachmentCount > 0
      ? [`- Lampiran: ${request.attachmentCount} pesan non-teks diterima (isinya tidak ditafsirkan)`]
      : [];
  return [
    `- Layanan yang diminati: ${request.interestedServices}`,
    `- Tanggal/periode: ${request.travelDateOrPeriod}`,
    `- Jumlah jemaah: ${request.travellerCount}`,
    `- Kebutuhan detail: ${request.detailedNeeds}`,
    `- Kisaran anggaran: ${request.budgetRange ?? "tidak disampaikan"}`,
    ...request.changeNotes.map((catatan) => `- Perubahan: ${catatan}`),
    ...lampiran,
    ...request.notedQuestions.map((q) => `- Pertanyaan yang dicatat: ${q}`),
  ];
}
