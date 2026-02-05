import { z } from "zod";

export const EvidenceSchema = z.object({
  section: z.string(),
  snippet: z.string(),
  start: z.number().optional(),
  end: z.number().optional()
});

export const WorkflowStepSchema = z.object({
  stepId: z.string(),
  title: z.string(),
  text: z.string(),
  evidence: EvidenceSchema,
  cues: z.array(z.string())
});

export const WorkflowSchema = z.array(WorkflowStepSchema);

export const ParameterSchema = z.object({
  name: z.string(),
  valueOrRange: z.string(),
  unit: z.string().optional(),
  context: z.string(),
  stepId: z.string().optional(),
  evidenceSnippet: z.string()
});

export const ParametersSchema = z.array(ParameterSchema);

export const GapSchema = z.object({
  type: z.enum([
    "RANGE_WITHOUT_UNIT",
    "AMBIGUOUS_QUANTIFIER",
    "PARAM_WITHOUT_CONDITION",
    "NO_STEPS_FOUND"
  ]),
  message: z.string(),
  evidenceSnippet: z.string().optional()
});

export const GapsSchema = z.array(GapSchema);

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type Parameter = z.infer<typeof ParameterSchema>;
export type Parameters = z.infer<typeof ParametersSchema>;
export type Gap = z.infer<typeof GapSchema>;
export type Gaps = z.infer<typeof GapsSchema>;

export type PatentClaim = {
  patent_id: string;
  claim_sequence: number;
  claim_number?: string | number;
  claim_text: string;
  claim_dependent?: boolean | number;
};

export type PatentDescription = {
  patent_id: string;
  description_text: string;
};

export type PatentSourcePayload = {
  patentNumber: string;
  source: "patentsview" | "fixture";
  claims: PatentClaim[];
  description: PatentDescription[];
};

export type NormalizedPatent = {
  claimsText: string;
  specText: string;
  paragraphs: string[];
};
