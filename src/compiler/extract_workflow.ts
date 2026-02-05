import type { NormalizedPatent, WorkflowStep } from "./types";

const SEQUENCING_CUES = [
  "then",
  "next",
  "after",
  "prior to",
  "thereafter",
  "in one embodiment",
  "first",
  "second",
  "third",
  "subsequently",
  "before",
  "finally"
];

const ACTION_VERBS = [
  "mix",
  "mixing",
  "combine",
  "combining",
  "heat",
  "heating",
  "cool",
  "cooling",
  "apply",
  "applying",
  "treat",
  "treating",
  "expose",
  "exposing",
  "deliver",
  "delivering",
  "measure",
  "measuring",
  "detect",
  "detecting",
  "incubate",
  "incubating",
  "filter",
  "filtering",
  "separate",
  "separating",
  "wash",
  "washing",
  "dry",
  "drying",
  "assemble",
  "assembling",
  "deposit",
  "depositing",
  "etch",
  "etching",
  "polymerize",
  "polymerizing",
  "perform",
  "performing",
  "provide",
  "providing"
];

export type WorkflowExtractionResult = {
  steps: WorkflowStep[];
  stepMeta: Record<string, { paragraphIndex: number; start: number }>;
};

const normalizeWhitespace = (text: string): string =>
  text.replace(/\s+/g, " ").trim();

const detectSection = (normalized: NormalizedPatent, paragraph: string): string => {
  if (normalized.specText.includes(paragraph)) {
    return "description";
  }
  if (normalized.claimsText.includes(paragraph)) {
    return "claims";
  }
  return "unknown";
};

const collectCues = (text: string): string[] => {
  const lower = text.toLowerCase();
  const cues = SEQUENCING_CUES.filter((cue) => lower.includes(cue));
  return cues.length ? cues : [];
};

const hasActionVerb = (text: string): boolean => {
  const lower = text.toLowerCase();
  return ACTION_VERBS.some((verb) => lower.includes(verb));
};

const makeTitle = (text: string): string => {
  const cleaned = normalizeWhitespace(
    text.replace(/^(in one embodiment|then|next|after|thereafter|first|second|third)\b/i, "")
  );
  const words = cleaned.split(" ").filter(Boolean).slice(0, 8);
  return words.length ? words.join(" ") : "Workflow step";
};

const pushStep = (
  steps: WorkflowStep[],
  stepMeta: Record<string, { paragraphIndex: number; start: number }>,
  paragraph: string,
  paragraphIndex: number,
  section: string,
  text: string,
  start: number,
  cues: string[]
) => {
  const stepId = `step-${steps.length + 1}`;
  const cleanedText = normalizeWhitespace(text);
  const snippet = cleanedText.slice(0, 200);
  steps.push({
    stepId,
    title: makeTitle(cleanedText),
    text: cleanedText,
    evidence: {
      section,
      snippet,
      start: start >= 0 ? start : undefined,
      end: start >= 0 ? start + cleanedText.length : undefined
    },
    cues
  });
  stepMeta[stepId] = { paragraphIndex, start: start >= 0 ? start : 0 };
};

const splitEnumerations = (paragraph: string): Array<{ text: string; start: number }> => {
  const markerRegex = /(\([a-z]\)|\(\d+\))/gi;
  if (!markerRegex.test(paragraph)) {
    return [];
  }
  const parts = paragraph.split(markerRegex).filter(Boolean);
  if (parts.length < 3) {
    return [];
  }
  const results: Array<{ text: string; start: number }> = [];
  let cursor = 0;
  for (let index = 0; index < parts.length; index += 2) {
    const marker = parts[index];
    const segment = parts[index + 1];
    if (!segment) {
      continue;
    }
    const markerIndex = paragraph.indexOf(marker, cursor);
    if (markerIndex >= 0) {
      cursor = markerIndex + marker.length;
    }
    const segmentIndex = paragraph.indexOf(segment, cursor);
    const cleaned = segment.replace(/^[\s:;,-]+/, "");
    if (cleaned.trim().length > 0) {
      results.push({
        text: cleaned,
        start: segmentIndex >= 0 ? segmentIndex : cursor
      });
    }
    if (segmentIndex >= 0) {
      cursor = segmentIndex + segment.length;
    }
  }
  return results;
};

const splitStepNumbered = (paragraph: string): Array<{ text: string; start: number }> => {
  const markerRegex = /(step\s*\d+)/gi;
  if (!markerRegex.test(paragraph)) {
    return [];
  }
  const parts = paragraph.split(markerRegex).filter(Boolean);
  if (parts.length < 3) {
    return [];
  }
  const results: Array<{ text: string; start: number }> = [];
  let cursor = 0;
  for (let index = 0; index < parts.length; index += 2) {
    const marker = parts[index];
    const segment = parts[index + 1];
    if (!segment) {
      continue;
    }
    const markerIndex = paragraph.indexOf(marker, cursor);
    if (markerIndex >= 0) {
      cursor = markerIndex + marker.length;
    }
    const segmentIndex = paragraph.indexOf(segment, cursor);
    const cleaned = segment.replace(/^[\s:;,-]+/, "");
    if (cleaned.trim().length > 0) {
      results.push({
        text: cleaned,
        start: segmentIndex >= 0 ? segmentIndex : cursor
      });
    }
    if (segmentIndex >= 0) {
      cursor = segmentIndex + segment.length;
    }
  }
  return results;
};

export const extractWorkflow = (
  normalized: NormalizedPatent
): WorkflowExtractionResult => {
  const steps: WorkflowStep[] = [];
  const stepMeta: Record<string, { paragraphIndex: number; start: number }> = {};

  normalized.paragraphs.forEach((paragraph, paragraphIndex) => {
    const section = detectSection(normalized, paragraph);
    const enumerationSteps = splitEnumerations(paragraph);
    if (enumerationSteps.length >= 2) {
      enumerationSteps.forEach((segment) =>
        pushStep(
          steps,
          stepMeta,
          paragraph,
          paragraphIndex,
          section,
          segment.text,
          segment.start,
          ["enumeration"]
        )
      );
      return;
    }

    const numberedSteps = splitStepNumbered(paragraph);
    if (numberedSteps.length >= 2) {
      numberedSteps.forEach((segment) =>
        pushStep(
          steps,
          stepMeta,
          paragraph,
          paragraphIndex,
          section,
          segment.text,
          segment.start,
          ["step-number"]
        )
      );
      return;
    }

    const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean);
    sentences.forEach((sentence) => {
      const cues = collectCues(sentence);
      if (cues.length === 0 && !hasActionVerb(sentence)) {
        return;
      }
      const start = paragraph.indexOf(sentence);
      pushStep(
        steps,
        stepMeta,
        paragraph,
        paragraphIndex,
        section,
        sentence,
        start,
        cues
      );
    });
  });

  return { steps, stepMeta };
};
