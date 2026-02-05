import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizePatentPayload } from "@/compiler/normalize";
import { extractWorkflow } from "@/compiler/extract_workflow";
import { WorkflowSchema } from "@/compiler/types";

const loadFixture = async (name: string) => {
  const raw = await readFile(new URL(`./fixtures/${name}.json`, import.meta.url));
  return JSON.parse(raw.toString());
};

describe("extractWorkflow", () => {
  it("extracts ordered steps with unique ids", async () => {
    const fixtures = ["fix-enum-001", "fix-range-002", "fix-ambig-003"];
    for (const fixtureName of fixtures) {
      const payload = await loadFixture(fixtureName);
      const normalized = normalizePatentPayload(payload);
      const { steps } = extractWorkflow(normalized);
      WorkflowSchema.parse(steps);
      const ids = steps.map((step) => step.stepId);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id, index) => {
        expect(id).toBe(`step-${index + 1}`);
      });
    }
  });

  it("matches snapshot for enumerated workflow", async () => {
    const payload = await loadFixture("fix-enum-001");
    const normalized = normalizePatentPayload(payload);
    const { steps } = extractWorkflow(normalized);
    expect(steps).toMatchSnapshot();
  });
});
