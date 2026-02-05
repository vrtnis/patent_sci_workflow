import type { Gap, NormalizedPatent, Parameter, WorkflowStep } from "./types";

const AMBIGUOUS_TERMS = [
  "substantially",
  "about",
  "approximately",
  "roughly",
  "around",
  "near",
  "essentially",
  "generally"
];

const CONDITION_TERMS = ["during", "for", "at", "in", "within", "under", "while"];

export type GapExtractionResult = {
  gaps: Gap[];
};

const getContextSnippet = (text: string, index: number): string => {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + 60);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
};

const addGap = (gaps: Gap[], gap: Gap) => {
  const signature = `${gap.type}:${gap.message}:${gap.evidenceSnippet ?? ""}`;
  if (gaps.some((existing) => `${existing.type}:${existing.message}:${existing.evidenceSnippet ?? ""}` === signature)) {
    return;
  }
  gaps.push(gap);
};

export const extractGaps = (
  normalized: NormalizedPatent,
  workflow: WorkflowStep[],
  parameters: Parameter[]
): GapExtractionResult => {
  const gaps: Gap[] = [];

  if (workflow.length === 0) {
    addGap(gaps, {
      type: "NO_STEPS_FOUND",
      message: "No workflow steps were detected from the source text."
    });
  }

  parameters.forEach((param) => {
    if (param.valueOrRange.includes("-") && !param.unit) {
      addGap(gaps, {
        type: "RANGE_WITHOUT_UNIT",
        message: `Range \"${param.valueOrRange}\" is missing a unit.`,
        evidenceSnippet: param.evidenceSnippet
      });
    }

    const lowerContext = param.context.toLowerCase();
    const hasCondition = CONDITION_TERMS.some((term) => lowerContext.includes(term));
    if (!hasCondition) {
      addGap(gaps, {
        type: "PARAM_WITHOUT_CONDITION",
        message: `Parameter \"${param.valueOrRange}\" lacks an explicit condition.`,
        evidenceSnippet: param.evidenceSnippet
      });
    }
  });

  normalized.paragraphs.forEach((paragraph) => {
    const lower = paragraph.toLowerCase();
    AMBIGUOUS_TERMS.forEach((term) => {
      const index = lower.indexOf(term);
      if (index >= 0) {
        addGap(gaps, {
          type: "AMBIGUOUS_QUANTIFIER",
          message: `Ambiguous quantifier detected: \"${term}\".`,
          evidenceSnippet: getContextSnippet(paragraph, index)
        });
      }
    });
  });

  return { gaps };
};
