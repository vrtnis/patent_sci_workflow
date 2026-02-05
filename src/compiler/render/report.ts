import type { Gap, Parameter, WorkflowStep } from "../types";

export type SourceMeta = {
  source: "PatentsView" | "Fixture";
  status: "cached" | "live" | "fixture";
  patentNumber?: string;
  fetchedAt?: string;
};

export type ReportInput = {
  workflow: WorkflowStep[];
  parameters: Parameter[];
  gaps: Gap[];
  sourceMeta?: SourceMeta;
};

const sanitize = (text: string): string =>
  text.replace(/\s+/g, " ").trim();

export const renderReport = ({
  workflow,
  parameters,
  gaps,
  sourceMeta
}: ReportInput): string => {
  const lines: string[] = [];

  lines.push("# Patent Workflow Extractor Report");
  lines.push("");
  lines.push("## Overview");
  lines.push(`- Steps: ${workflow.length}`);
  lines.push(`- Parameters: ${parameters.length}`);
  lines.push(`- Gaps: ${gaps.length}`);

  lines.push("");
  lines.push("## Workflow Steps");
  if (workflow.length === 0) {
    lines.push("- No steps detected.");
  } else {
    workflow.forEach((step) => {
      lines.push("");
      lines.push(`### ${step.stepId}: ${sanitize(step.title)}`);
      lines.push(`- Text: ${sanitize(step.text)}`);
      lines.push(`- Evidence: ${sanitize(step.evidence.snippet)}`);
      if (step.cues.length > 0) {
        lines.push(`- Cues: ${step.cues.join(", ")}`);
      }
    });
  }

  lines.push("");
  lines.push("## Parameters");
  if (parameters.length === 0) {
    lines.push("- No parameters detected.");
  } else {
    lines.push("| Name | Value/Range | Unit | Step | Evidence |");
    lines.push("| --- | --- | --- | --- | --- |");
    parameters.forEach((param) => {
      lines.push(
        `| ${sanitize(param.name)} | ${sanitize(param.valueOrRange)} | ${sanitize(
          param.unit ?? ""
        )} | ${sanitize(param.stepId ?? "")} | ${sanitize(
          param.evidenceSnippet
        )} |`
      );
    });
  }

  lines.push("");
  lines.push("## Gaps");
  if (gaps.length === 0) {
    lines.push("- No gaps detected.");
  } else {
    gaps.forEach((gap) => {
      lines.push(
        `- ${gap.type}: ${sanitize(gap.message)}${
          gap.evidenceSnippet ? ` (evidence: ${sanitize(gap.evidenceSnippet)})` : ""
        }`
      );
    });
  }

  lines.push("");
  lines.push("## Source");
  if (!sourceMeta) {
    lines.push("- Source metadata unavailable.");
  } else {
    const sourceParts = [
      `Source: ${sourceMeta.source}`,
      `Status: ${sourceMeta.status}`,
      sourceMeta.patentNumber ? `Patent: ${sourceMeta.patentNumber}` : undefined,
      sourceMeta.fetchedAt ? `Fetched: ${sourceMeta.fetchedAt}` : undefined
    ].filter(Boolean);
    lines.push(`- ${sourceParts.join(" | ")}`);
  }

  lines.push("");
  return lines.join("\n");
};
