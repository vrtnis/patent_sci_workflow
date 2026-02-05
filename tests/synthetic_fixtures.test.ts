import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizePatentPayload } from "@/compiler/normalize";
import { extractWorkflow } from "@/compiler/extract_workflow";
import { extractParameters } from "@/compiler/extract_parameters";
import { extractGaps } from "@/compiler/gaps";
import { WorkflowSchema, ParametersSchema, GapsSchema } from "@/compiler/types";

const loadSyntheticFixtures = async () => {
  const fixturesDir = path.join(process.cwd(), "tests", "fixtures");
  const files = (await readdir(fixturesDir))
    .filter((file) => file.startsWith("syn-") && file.endsWith(".json"))
    .map((file) => path.join(fixturesDir, file));

  const fixtures = [];
  for (const file of files) {
    const raw = await readFile(file, "utf-8");
    fixtures.push({ file, payload: JSON.parse(raw) });
  }
  return fixtures;
};

describe("synthetic fixtures", () => {
  it("produce schema-valid outputs when present", async () => {
    const fixtures = await loadSyntheticFixtures();
    if (fixtures.length === 0) {
      expect(true).toBe(true);
      return;
    }

    for (const fixture of fixtures) {
      const normalized = normalizePatentPayload(fixture.payload);
      const { steps, stepMeta } = extractWorkflow(normalized);
      const { parameters } = extractParameters(normalized, stepMeta);
      const { gaps } = extractGaps(normalized, steps, parameters);

      WorkflowSchema.parse(steps);
      ParametersSchema.parse(parameters);
      GapsSchema.parse(gaps);

      const ids = steps.map((step) => step.stepId);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id, index) => {
        expect(id).toBe(`step-${index + 1}`);
      });

      if (steps.length === 0) {
        expect(gaps.some((gap) => gap.type === "NO_STEPS_FOUND")).toBe(true);
      }

      const hasMissingUnitRange = parameters.some(
        (param) => param.valueOrRange.includes("-") && !param.unit
      );
      if (hasMissingUnitRange) {
        expect(gaps.some((gap) => gap.type === "RANGE_WITHOUT_UNIT")).toBe(true);
      }
    }
  });
});
