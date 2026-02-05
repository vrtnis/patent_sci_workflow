import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

export type PatentsViewPayload = {
  patentNumber: string;
  source: "patentsview";
  claims: PatentClaim[];
  description: PatentDescription[];
};

export type PatentsViewFetchResult = {
  payload: PatentsViewPayload;
  cacheStatus: "cached" | "live";
};

const CLAIMS_ENDPOINT = "https://search.patentsview.org/api/v1/g_claim/";
const DESCRIPTION_ENDPOINT =
  "https://search.patentsview.org/api/v1/g_detail_desc_text/";

const cacheDir = path.join(process.cwd(), "cache", "patentsview");

const buildUrl = (endpoint: string, params: Record<string, string>): string => {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
};

const fetchJson = async (url: string, apiKey: string) => {
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

export const fetchPatentFromPatentsView = async (
  patentNumber: string
): Promise<PatentsViewFetchResult> => {
  await mkdir(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, `${patentNumber}.json`);

  try {
    const cached = await readFile(cachePath, "utf-8");
    const payload = JSON.parse(cached) as PatentsViewPayload;
    return { payload, cacheStatus: "cached" };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const apiKey = process.env.PATENTSVIEW_API_KEY;
  if (!apiKey) {
    throw new Error("PATENTSVIEW_API_KEY is not set");
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

  const payload: PatentsViewPayload = {
    patentNumber,
    source: "patentsview",
    claims: claimsResponse.g_claims ?? [],
    description: descriptionResponse.g_detail_desc_texts ?? []
  };

  await writeFile(cachePath, JSON.stringify(payload, null, 2));

  return { payload, cacheStatus: "live" };
};
