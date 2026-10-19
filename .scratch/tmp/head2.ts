import { classifyInbound as lama } from "./head/src/conversation/classifyInbound.ts";
for (const p of ["asuransi perjalanan coverage apa saja","insurance benefitnya apa","asuransi manfaatnya apa saja","asuransi perjalanan sertakan ga","asuransi perjalanan termasuk ga"]) {
  console.log("HEAD", JSON.stringify(p), "->", JSON.stringify(lama(p)));
}
