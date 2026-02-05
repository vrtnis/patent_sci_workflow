import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizePatentPayload } from "@/compiler/normalize";
import { extractWorkflow } from "@/compiler/extract_workflow";
import { extractParameters } from "@/compiler/extract_parameters";
import { ParametersSchema } from "@/compiler/types";

const loadFixture = async (name: string) => {
  const raw = await readFile(new URL(`./fixtures/${name}.json`, import.meta.url));
  return JSON.parse(raw.toString());
};

describe("extractParameters", () => {
  it("extracts parameters with schema validation", async () => {
    const payload = await loadFixture("fix-range-002");
    const normalized = normalizePatentPayload(payload);
    const { stepMeta } = extractWorkflow(normalized);
    const { parameters } = extractParameters(normalized, stepMeta);
    ParametersSchema.parse(parameters);
    expect(parameters.length).toBeGreaterThan(0);
  });

  it("matches snapshot for range-heavy fixture", async () => {
    const payload = await loadFixture("fix-range-002");
    const normalized = normalizePatentPayload(payload);
    const { stepMeta } = extractWorkflow(normalized);
    const { parameters } = extractParameters(normalized, stepMeta);
    expect(parameters).toMatchSnapshot();
  });
});
