/**
 * Pembantu tes untuk menjalankan percakapan multi-giliran pada seam
 * `handleInbound`. Riwayat bertambah setiap pesan seperti yang dilakukan
 * runtime, sehingga tes dapat mensimulasikan alur nyata tanpa menyentuh
 * detail implementasi.
 */

import { handleInbound, turnForInbound } from "../../src/conversation/handleInbound.ts";
import type {
  BotTurn,
  ConversationContext,
  ConversationTurn,
  FollowUpRequest,
  InboundMessage,
} from "../../src/conversation/types.ts";

export class Percakapan {
  private riwayat: readonly ConversationTurn[] = [];

  /** Kirim pesan calon jemaah dan kembalikan giliran bot untuk pesan tersebut. */
  kirim(text: string): BotTurn {
    return this.kirimPesan({
      id: `wamid.test.${this.riwayat.length}`,
      from: "628123456789",
      timestamp: "1727000000",
      text,
    });
  }

  /** Kirim pesan non-teks (lampiran) dan kembalikan giliran bot untuk pesan tersebut. */
  kirimLampiran(): BotTurn {
    return this.kirimPesan({
      id: `wamid.test.${this.riwayat.length}`,
      from: "628123456789",
      timestamp: "1727000000",
      text: null,
    });
  }

  private kirimPesan(pesan: InboundMessage): BotTurn {
    const turn = handleInbound(pesan, { history: this.riwayat });
    const berikut: ConversationTurn[] = [
      ...this.riwayat,
      turnForInbound(pesan),
    ];
    if (turn.reply) {
      berikut.push({ role: "asisten", text: turn.reply.text });
    }
    this.riwayat = berikut;
    return turn;
  }

  get konteks(): ConversationContext {
    return { history: this.riwayat };
  }
}

export function teksBalasan(turn: BotTurn): string {
  if (!turn.reply) {
    throw new Error("pesan teks harus menghasilkan balasan");
  }
  return turn.reply.text;
}

/**
 * Lengkapi bidang Permintaan Tindak Lanjut setelah sebuah pertanyaan menjadi
 * pesan pertama percakapan (pertanyaannya sudah dicatat pada draft), lalu
 * kirim persetujuan dan kembalikan Ringkasan Kebutuhan yang tercatat. Dipakai
 * tes tiket 10: pertanyaan non-urgent dari awal tidak langsung meminta
 * persetujuan handoff tanpa isi, melainkan masuk alur intake lebih dahulu.
 */
export function lengkapiPermintaanLaluSetujui(percakapan: Percakapan): FollowUpRequest {
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  percakapan.kirim("tidak usah");
  const turn = percakapan.kirim("Ya, setuju");
  const catat = turn.actions.find((aksi) => aksi.kind === "record-follow-up-request");
  if (catat === undefined || catat.kind !== "record-follow-up-request") {
    throw new Error("Ringkasan Kebutuhan tidak tercatat setelah persetujuan");
  }
  return catat.request;
}
