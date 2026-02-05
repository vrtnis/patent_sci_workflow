import type {
  NormalizedPatent,
  PatentClaim,
  PatentDescription,
  PatentSourcePayload
} from "./types";

export type PatentsViewClaimsResponse = {
  g_claims?: PatentClaim[];
};

export type PatentsViewDescriptionResponse = {
  g_detail_desc_texts?: PatentDescription[];
};

export type PatentsViewPayload = PatentsViewClaimsResponse &
  PatentsViewDescriptionResponse &
  Partial<PatentSourcePayload>;

const normalizeParagraphs = (text: string): string[] => {
  return text
    .split(/\r?\n{2,}/)
    .map((paragraph) =>
      paragraph.replace(/°/g, "").replace(/\s+/g, " ").trim()
    )
    .filter(Boolean);
};

const formatClaimsText = (claims: PatentClaim[]): string => {
  return claims
    .slice()
    .sort((a, b) => a.claim_sequence - b.claim_sequence)
    .map((claim) => {
      const number = claim.claim_number ?? claim.claim_sequence;
      return `Claim ${number}. ${claim.claim_text}`.replace(/°/g, "");
    })
    .join("\n");
};

const formatDescriptionText = (descriptions: PatentDescription[]): string => {
  return descriptions
    .map((desc) => desc.description_text.replace(/°/g, ""))
    .join("\n\n")
    .trim();
};

export const normalizePatentPayload = (
  payload: PatentsViewPayload
): NormalizedPatent => {
  const claims = payload.claims ?? payload.g_claims ?? [];
  const description =
    payload.description ?? payload.g_detail_desc_texts ?? [];

  const claimsText = formatClaimsText(claims);
  const specText = formatDescriptionText(description);

  const paragraphs = [
    ...normalizeParagraphs(specText),
    ...normalizeParagraphs(claimsText)
  ];

  return {
    claimsText,
    specText,
    paragraphs
  };
};
