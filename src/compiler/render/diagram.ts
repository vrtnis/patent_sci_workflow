import type { WorkflowStep } from "../types";

const sanitizeId = (id: string): string => id.replace(/[^a-zA-Z0-9_]/g, "_");
const sanitizeLabel = (label: string): string =>
  label.replace(/"/g, "'").replace(/\s+/g, " ").trim();

export const renderDiagram = (workflow: WorkflowStep[]): string => {
  if (workflow.length === 0) {
    return "flowchart TD\n  empty[\"No steps detected\"]";
  }
  const lines: string[] = ["flowchart TD"];
  workflow.forEach((step, index) => {
    const nodeId = sanitizeId(step.stepId);
    const label = sanitizeLabel(step.title || step.stepId);
    lines.push(`  ${nodeId}[\"${label}\"]`);
    if (index > 0) {
      const prevId = sanitizeId(workflow[index - 1].stepId);
      lines.push(`  ${prevId} --> ${nodeId}`);
    }
  });
  lines.push("");
  return lines.join("\n");
};
