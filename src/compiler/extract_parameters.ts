import type { NormalizedPatent, Parameter } from "./types";

const RANGE_REGEX =
  /(\d+(?:\.\d+)?)\s*(?:-|to|~)\s*(\d+(?:\.\d+)?)(?:\s*([a-zA-Z%/]+))?/gi;
const VALUE_REGEX = /(\d+(?:\.\d+)?)\s*([a-zA-Z%/]+)\b/gi;

const UNIT_NAME_MAP: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /^(c|f|k)$/i, name: "temperature" },
  { pattern: /s|sec|secs|second|seconds|min|mins|minute|minutes|h|hr|hrs|hour|hours/i, name: "time" },
  { pattern: /pa|kpa|mpa|bar|psi/i, name: "pressure" },
  { pattern: /v|mv|kv/i, name: "voltage" },
  { pattern: /a|ma/i, name: "current" },
  { pattern: /rpm|m\/s|cm\/s|m\/min|cm\/min/i, name: "speed" },
  { pattern: /%|wt%|ppm|ppb|\\bM\\b|mM|uM|mol|mmol/i, name: "concentration" },
  { pattern: /nm|um|mm|cm|m\\b/i, name: "length" },
  { pattern: /g|mg|kg|ug/i, name: "mass" },
  { pattern: /l|ml|ul/i, name: "volume" }
];

const CONTEXT_CHARS = 80;

export type ParameterExtractionResult = {
  parameters: Parameter[];
};

const inferName = (unit: string | undefined, context: string): string => {
  if (unit) {
    for (const entry of UNIT_NAME_MAP) {
      if (entry.pattern.test(unit)) {
        return entry.name;
      }
    }
  }
  const lower = context.toLowerCase();
  if (lower.includes("temperature") || lower.includes("heat")) return "temperature";
  if (lower.includes("time") || lower.includes("duration")) return "time";
  if (lower.includes("pressure")) return "pressure";
  if (lower.includes("voltage") || lower.includes("potential")) return "voltage";
  if (lower.includes("current")) return "current";
  if (lower.includes("speed") || lower.includes("rpm")) return "speed";
  if (lower.includes("concentration") || lower.includes("molar"))
    return "concentration";
  return "parameter";
};

const getContextWindow = (text: string, start: number, end: number): string => {
  const left = Math.max(0, start - CONTEXT_CHARS);
  const right = Math.min(text.length, end + CONTEXT_CHARS);
  return text.slice(left, right).replace(/\s+/g, " ").trim();
};

const findClosestStep = (
  paragraphIndex: number,
  offset: number,
  stepMeta?: Record<string, { paragraphIndex: number; start: number }>
): string | undefined => {
  if (!stepMeta) return undefined;
  let bestId: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  Object.entries(stepMeta).forEach(([stepId, meta]) => {
    if (meta.paragraphIndex !== paragraphIndex) return;
    const distance = Math.abs(meta.start - offset);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = stepId;
    }
  });
  return bestId;
};

export const extractParameters = (
  normalized: NormalizedPatent,
  stepMeta?: Record<string, { paragraphIndex: number; start: number }>
): ParameterExtractionResult => {
  const parameters: Parameter[] = [];

  normalized.paragraphs.forEach((paragraph, paragraphIndex) => {
    const ranges: Array<{ start: number; end: number }> = [];

    let match: RegExpExecArray | null;
    while ((match = RANGE_REGEX.exec(paragraph)) !== null) {
      const [full, startVal, endVal, unit] = match;
      const start = match.index;
      const end = start + full.length;
      ranges.push({ start, end });

      const context = getContextWindow(paragraph, start, end);
      const inferredName = inferName(unit, context);
      const stepId = findClosestStep(paragraphIndex, start, stepMeta);

      parameters.push({
        name: inferredName,
        valueOrRange: `${startVal}-${endVal}`,
        unit: unit?.trim(),
        context,
        stepId,
        evidenceSnippet: full.trim()
      });
    }

    RANGE_REGEX.lastIndex = 0;

    while ((match = VALUE_REGEX.exec(paragraph)) !== null) {
      const [full, value, unit] = match;
      const start = match.index;
      const end = start + full.length;
      const overlapsRange = ranges.some(
        (range) => start >= range.start && start <= range.end
      );
      if (overlapsRange) {
        continue;
      }
      const context = getContextWindow(paragraph, start, end);
      const inferredName = inferName(unit, context);
      const stepId = findClosestStep(paragraphIndex, start, stepMeta);

      parameters.push({
        name: inferredName,
        valueOrRange: value,
        unit: unit?.trim(),
        context,
        stepId,
        evidenceSnippet: full.trim()
      });
    }

    VALUE_REGEX.lastIndex = 0;
  });

  return { parameters };
};
