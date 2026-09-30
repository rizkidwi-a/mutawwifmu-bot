/**
 * Pembantu tes untuk menjalankan percakapan multi-giliran pada seam
 * `handleInbound`. Riwayat bertambah setiap pesan seperti yang dilakukan
 * runtime, sehingga tes dapat mensimulasikan alur nyata tanpa menyentuh
 * detail implementasi.
 */

import { handleInbound } from "../../src/conversation/handleInbound.ts";
import type { BotTurn, ConversationContext, ConversationTurn } from "../../src/conversation/types.ts";

export class Percakapan {
  private riwayat: readonly ConversationTurn[] = [];

  /** Kirim pesan calon jemaah dan kembalikan giliran bot untuk pesan tersebut. */
  kirim(text: string): BotTurn {
    const turn = handleInbound(
      {
        id: `wamid.test.${this.riwayat.length}`,
        from: "628123456789",
        timestamp: "1727000000",
        text,
      },
      { history: this.riwayat },
    );
    const berikut: ConversationTurn[] = [...this.riwayat, { role: "calon-jemaah", text }];
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
