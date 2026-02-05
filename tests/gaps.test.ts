import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizePatentPayload } from "@/compiler/normalize";
import { extractWorkflow } from "@/compiler/extract_workflow";
import { extractParameters } from "@/compiler/extract_parameters";
import { extractGaps } from "@/compiler/gaps";
import { GapsSchema } from "@/compiler/types";

const loadFixture = async (name: string) => {
  const raw = await readFile(new URL(`./fixtures/${name}.json`, import.meta.url));
  return JSON.parse(raw.toString());
};

describe("extractGaps", () => {
  it("detects gaps and enforces invariants", async () => {
    const fixtures = ["fix-enum-001", "fix-range-002", "fix-ambig-003"];
    for (const fixtureName of fixtures) {
      const payload = await loadFixture(fixtureName);
      const normalized = normalizePatentPayload(payload);
      const { steps, stepMeta } = extractWorkflow(normalized);
      const { parameters } = extractParameters(normalized, stepMeta);
      const { gaps } = extractGaps(normalized, steps, parameters);

      GapsSchema.parse(gaps);

      if (steps.length < 2) {
        expect(gaps.some((gap) => gap.type === "NO_STEPS_FOUND")).toBe(true);
      }

      const missingUnitRanges = parameters.filter(
        (param) => param.valueOrRange.includes("-") && !param.unit
      );
      if (missingUnitRanges.length > 0) {
        expect(
          gaps.some((gap) => gap.type === "RANGE_WITHOUT_UNIT")
        ).toBe(true);
      }
    }
  });

  it("matches snapshot for ambiguous fixture", async () => {
    const payload = await loadFixture("fix-ambig-003");
    const normalized = normalizePatentPayload(payload);
    const { steps, stepMeta } = extractWorkflow(normalized);
    const { parameters } = extractParameters(normalized, stepMeta);
    const { gaps } = extractGaps(normalized, steps, parameters);
    expect(gaps).toMatchSnapshot();
  });
});
