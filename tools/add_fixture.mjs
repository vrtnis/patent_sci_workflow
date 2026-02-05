import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CLAIMS_ENDPOINT = "https://search.patentsview.org/api/v1/g_claim/";
const DESCRIPTION_ENDPOINT =
  "https://search.patentsview.org/api/v1/g_detail_desc_text/";

const buildUrl = (endpoint, params) => {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
};

const fetchJson = async (url, apiKey) => {
  const response = await fetch(url, {
    headers: {
      "X-Api-Key": apiKey
    }
  });
  if (!response.ok) {
    throw new Error(`PatentsView request failed: ${response.status}`);
  }
  return response.json();
};

const run = async () => {
  const patentNumber = process.argv[2];
  if (!patentNumber) {
    console.error("Usage: npm run add-fixture-from-patentsview -- <PATENT_NUMBER>");
    process.exit(1);
  }

  const apiKey = process.env.PATENTSVIEW_API_KEY;
  if (!apiKey) {
    console.error("PATENTSVIEW_API_KEY is not set");
    process.exit(1);
  }

  const query = JSON.stringify({ _eq: { patent_id: patentNumber } });
  const claimsFields = JSON.stringify([
    "patent_id",
    "claim_sequence",
    "claim_number",
    "claim_text",
    "claim_dependent"
  ]);
  const claimsSort = JSON.stringify([{ claim_sequence: "asc" }]);
  const descriptionFields = JSON.stringify(["patent_id", "description_text"]);

  const claimsUrl = buildUrl(CLAIMS_ENDPOINT, {
    q: query,
    f: claimsFields,
    s: claimsSort
  });
  const descriptionUrl = buildUrl(DESCRIPTION_ENDPOINT, {
    q: query,
    f: descriptionFields
  });

  const [claimsResponse, descriptionResponse] = await Promise.all([
    fetchJson(claimsUrl, apiKey),
    fetchJson(descriptionUrl, apiKey)
  ]);

  const payload = {
    patentNumber,
    source: "fixture",
    claims: claimsResponse.g_claims ?? [],
    description: descriptionResponse.g_detail_desc_texts ?? []
  };

  const fixturesDir = path.join(process.cwd(), "tests", "fixtures");
  await mkdir(fixturesDir, { recursive: true });
  const fixturePath = path.join(fixturesDir, `${patentNumber}.json`);
  await writeFile(fixturePath, JSON.stringify(payload, null, 2));

  const testPath = path.join(fixturesDir, `${patentNumber}.test.ts`);
  try {
    await readFile(testPath, "utf-8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const testBody = `import { readFile } from "node:fs/promises";\nimport { describe, expect, it } from "vitest";\nimport { normalizePatentPayload } from "@/compiler/normalize";\nimport { extractWorkflow } from "@/compiler/extract_workflow";\nimport { extractParameters } from "@/compiler/extract_parameters";\nimport { extractGaps } from "@/compiler/gaps";\nimport { WorkflowSchema, ParametersSchema, GapsSchema } from "@/compiler/types";\n\nconst loadFixture = async () => {\n  const raw = await readFile(new URL("./${patentNumber}.json", import.meta.url));\n  return JSON.parse(raw.toString());\n};\n\ndescribe(\"fixture ${patentNumber}\", () => {\n  it(\"produces stable, schema-valid outputs\", async () => {\n    const payload = await loadFixture();\n    const normalized = normalizePatentPayload(payload);\n    const { steps, stepMeta } = extractWorkflow(normalized);\n    const { parameters } = extractParameters(normalized, stepMeta);\n    const { gaps } = extractGaps(normalized, steps, parameters);\n\n    WorkflowSchema.parse(steps);\n    ParametersSchema.parse(parameters);\n    GapsSchema.parse(gaps);\n\n    const ids = steps.map((step) => step.stepId);\n    expect(new Set(ids).size).toBe(ids.length);\n    ids.forEach((id, index) => {\n      expect(id).toBe(\`step-\${index + 1}\`);\n    });\n  });\n});\n`;
    await writeFile(testPath, testBody);
  }

  console.log(`Fixture saved to ${fixturePath}`);
  console.log(`Test created at ${testPath}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
