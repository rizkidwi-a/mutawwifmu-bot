import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
for (const p of ["asuransi perjalanan coverage apa saja","insurance benefitnya apa","asuransi manfaatnya apa saja","asuransi perjalanan ketentuannya gimana","ada asuransi perjalanannya ga ya","asuransi perjalanan sertakan ga","asuransi perjalanan termasuk ga"]) {
  console.log(JSON.stringify(p), "->", JSON.stringify(classifyInbound(p)));
}
