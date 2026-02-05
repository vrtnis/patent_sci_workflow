import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MODEL = "gpt-5.2";
const DEFAULT_COUNT = 5;
const DEFAULT_TEMPERATURE = 0.4;

const FIXTURE_TYPES = {
  "weird-claim-numbering":
    "Use non-sequential claim_number values (roman numerals, letter suffixes, duplicates). Keep claim_sequence numeric and ordered.",
  "abc-steps":
    "Include explicit procedural enumerations like (a)(b)(c) in description or claims.",
  "ranges-units":
    "Include multiple numeric ranges with units (e.g., 80-120 C, 2-5 bar, 0.5-1.0 M, 10-30 minutes).",
  "ambiguous-quantifiers":
    "Include ambiguous quantifiers such as substantially, about, approximately.",
  "missing-units":
    "Include at least one numeric range like 5-10 with no unit nearby.",
  "missing-conditions":
    "Include at least one numeric value or range without any nearby condition words (during, for, at, in, within, under, while).",
  "edge-mix":
    "Combine weird claim numbering, (a)(b)(c) steps, ranges with units, ambiguous quantifiers, and at least one missing unit or missing condition."
};

const usage = () => {
  console.log(`Usage: node tools/generate_fixtures.mjs --type <type> --count <n> [--model <model>] [--batch <tag>] [--temperature <n>]

Types: ${Object.keys(FIXTURE_TYPES).join(", ")} | all`);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.replace(/^--/, "");
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        options[key] = true;
      } else {
        options[key] = next;
        i += 1;
      }
    }
  }
  return options;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const buildPrompt = (type, patentNumber) => {
  const typeInstruction = FIXTURE_TYPES[type] ?? FIXTURE_TYPES["edge-mix"];

  return `Generate a synthetic patent fixture JSON.

Requirements:
- Output must match the tool schema exactly.
- Use plain ASCII only.
- Set patentNumber to "${patentNumber}".
- Set source to "fixture".
- Provide 3-6 claims with realistic method language.
- Ensure description has at least 2 paragraphs and includes procedural text.
- ${typeInstruction}
- Include at least one sentence that can be interpreted as a workflow step.
- If adding ranges without units or missing conditions, do not include condition words near those values.

Return ONLY a tool call.`;
};

const buildToolSchema = () => ({
  type: "function",
  function: {
    name: "create_fixture",
    description: "Create a synthetic patent fixture payload.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["patentNumber", "source", "claims", "description"],
      properties: {
        patentNumber: { type: "string" },
        source: { type: "string", enum: ["fixture"] },
        claims: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "patent_id",
              "claim_sequence",
              "claim_number",
              "claim_text",
              "claim_dependent"
            ],
            properties: {
              patent_id: { type: "string" },
              claim_sequence: { type: "number" },
              claim_number: {
                anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }]
              },
              claim_text: { type: "string" },
              claim_dependent: {
                anyOf: [{ type: "boolean" }, { type: "number" }, { type: "null" }]
              }
            }
          }
        },
        description: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["patent_id", "description_text"],
            properties: {
              patent_id: { type: "string" },
              description_text: { type: "string" }
            }
          }
        }
      }
    }
  }
});

const extractToolArguments = (response) => {
  const outputs = response.output ?? [];
  const inspect = (item) => {
    if (!item) return null;
    if (item.type === "tool_call" || item.type === "function_call") {
      const name = item.name ?? item.tool_name ?? item.function?.name;
      if (name === "create_fixture") {
        return item.arguments ?? item.function?.arguments ?? null;
      }
    }
    if (Array.isArray(item.content)) {
      for (const child of item.content) {
        const found = inspect(child);
        if (found) return found;
      }
    }
    return null;
  };

  for (const item of outputs) {
    const found = inspect(item);
    if (found) return found;
  }
  return null;
};

const normalizeFixture = (raw, patentNumber) => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid fixture payload");
  }

  if (!Array.isArray(raw.claims) || raw.claims.length === 0) {
    throw new Error("Fixture is missing claims");
  }

  if (!Array.isArray(raw.description) || raw.description.length === 0) {
    throw new Error("Fixture is missing description");
  }

  const claims = raw.claims.map((claim, index) => {
    if (!claim || typeof claim.claim_text !== "string") {
      throw new Error("Claim text missing");
    }
    return {
      patent_id: patentNumber,
      claim_sequence: index + 1,
      claim_number: claim.claim_number ?? null,
      claim_text: claim.claim_text.trim(),
      claim_dependent: claim.claim_dependent ?? null
    };
  });

  const description = raw.description
    .map((desc) => {
      if (!desc || typeof desc.description_text !== "string") {
        return null;
      }
      return {
        patent_id: patentNumber,
        description_text: desc.description_text.trim()
      };
    })
    .filter(Boolean);

  if (description.length === 0) {
    throw new Error("Description text missing");
  }

  return {
    patentNumber,
    source: "fixture",
    claims,
    description
  };
};

const callOpenAI = async ({ model, prompt, temperature }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You generate deterministic synthetic patent fixtures for testing. Only call the provided tool."
        },
        { role: "user", content: prompt }
      ],
      tools: [buildToolSchema()],
      tool_choice: { type: "function", name: "create_fixture" },
      temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  return response.json();
};

const main = async () => {
  const options = parseArgs();
  if (options.help) {
    usage();
    process.exit(0);
  }

  const type = options.type ?? "edge-mix";
  const count = Number(options.count ?? DEFAULT_COUNT);
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = Number(options.temperature ?? DEFAULT_TEMPERATURE);
  const batchTag = options.batch ?? new Date().toISOString().slice(0, 10);

  if (Number.isNaN(count) || count <= 0) {
    throw new Error("--count must be a positive number");
  }

  const types =
    type === "all"
      ? Object.keys(FIXTURE_TYPES)
      : [type].filter(Boolean);

  types.forEach((t) => {
    if (!FIXTURE_TYPES[t]) {
      throw new Error(`Unknown type: ${t}`);
    }
  });

  const fixturesDir = path.join(process.cwd(), "tests", "fixtures");
  await mkdir(fixturesDir, { recursive: true });

  const existing = new Set(
    (await readdir(fixturesDir)).filter((file) => file.endsWith(".json"))
  );

  for (let i = 0; i < count; i += 1) {
    const currentType = types[i % types.length];
    const slug = slugify(currentType);
    const patentNumber = `SYN-${slug}-${batchTag}-${String(i + 1).padStart(2, "0")}`;
    const filename = `${patentNumber}.json`;

    if (existing.has(filename)) {
      console.log(`Skipping existing fixture ${filename}`);
      continue;
    }

    const prompt = buildPrompt(currentType, patentNumber);

    let response;
    let parsed;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await callOpenAI({ model, prompt, temperature });
        const toolArgs = extractToolArguments(response);
        if (!toolArgs) {
          throw new Error("No tool call returned");
        }
        const raw =
          typeof toolArgs === "string" ? JSON.parse(toolArgs) : toolArgs;
        parsed = normalizeFixture(raw, patentNumber);
        break;
      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
      }
    }

    if (!parsed) {
      throw new Error("Failed to generate fixture");
    }

    const outputPath = path.join(fixturesDir, filename);
    await writeFile(outputPath, JSON.stringify(parsed, null, 2));
    console.log(`Wrote ${outputPath}`);
  }
};

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
