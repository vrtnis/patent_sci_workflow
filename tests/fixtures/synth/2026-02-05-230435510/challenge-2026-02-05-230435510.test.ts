import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizePatentPayload } from "@/compiler/normalize";
import { extractWorkflow } from "@/compiler/extract_workflow";
import { extractParameters } from "@/compiler/extract_parameters";
import { extractGaps } from "@/compiler/gaps";

const loadFixture = async () => {
  const raw = await readFile(new URL("./SYN-CHALLENGE-2026-02-05-230435510.json", import.meta.url));
  return JSON.parse(raw.toString());
};

describe("challenge fixture 2026-02-05-230435510", () => {
  it("extracts range units or flags a missing-unit gap", async () => {
    const payload = await loadFixture();
    const normalized = normalizePatentPayload(payload);
    const { steps, stepMeta } = extractWorkflow(normalized);
    const { parameters } = extractParameters(normalized, stepMeta);
    const { gaps } = extractGaps(normalized, steps, parameters);

    const hasParamWithUnit = parameters.some((param) => Boolean(param.unit));
    const hasRangeGap = gaps.some((gap) => gap.type === "RANGE_WITHOUT_UNIT");

    expect(hasParamWithUnit || hasRangeGap).toBe(true);
  });
});
