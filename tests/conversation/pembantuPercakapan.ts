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
