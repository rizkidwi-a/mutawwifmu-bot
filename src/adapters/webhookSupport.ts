/**
 * Helper HTTP bersama antar adapter webhook: pembacaan header tunggal dan
 * badan JSON. Dipisah agar tiap adapter hanya sibuk dengan hal yang benar-benar
 * khas provider-nya.
 */

/** Ambil satu nilai header; header berulang diambil yang pertama. */
export function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/** Parse badan JSON, atau null bila bukan JSON yang sah. */
export function parseJsonBody(rawBody: Buffer): unknown | null {
  try {
    return JSON.parse(rawBody.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}
