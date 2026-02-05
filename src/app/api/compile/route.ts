import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { normalizePatentPayload } from "@/compiler/normalize";
import { extractWorkflow } from "@/compiler/extract_workflow";
import { extractParameters } from "@/compiler/extract_parameters";
import { extractGaps } from "@/compiler/gaps";
import { renderReport } from "@/compiler/render/report";
import { renderDiagram } from "@/compiler/render/diagram";
import {
  GapsSchema,
  ParametersSchema,
  WorkflowSchema
} from "@/compiler/types";
import { fetchPatentFromPatentsView } from "../../../../tools/patentsview";

export const runtime = "nodejs";

const defaultFixture = "fix-enum-001";

const loadFixture = async (fixtureName: string) => {
  const normalized = fixtureName.endsWith(".json")
    ? fixtureName
    : `${fixtureName}.json`;
  const fixturePath = path.join(
    process.cwd(),
    "tests",
    "fixtures",
    normalized
  );
  const raw = await readFile(fixturePath, "utf-8");
  return JSON.parse(raw);
};

export async function POST(request: Request) {
  const body = await request.json();
  const patentNumber = body?.patentNumber?.trim();
  const fixtureName = body?.fixtureName?.trim();

  let payload: any;
  let sourceMeta = {
    source: "Fixture" as const,
    status: "fixture" as const,
    patentNumber: "",
    fetchedAt: new Date().toISOString()
  };

  if (patentNumber) {
    try {
      const { payload: fetched, cacheStatus } =
        await fetchPatentFromPatentsView(patentNumber);
      payload = fetched;
      sourceMeta = {
        source: "PatentsView",
        status: cacheStatus,
        patentNumber,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn("PatentsView fetch failed, falling back to fixture", error);
      const fixture = await loadFixture(fixtureName || defaultFixture);
      payload = fixture;
      sourceMeta = {
        source: "Fixture",
        status: "fixture",
        patentNumber: fixture.patentNumber ?? fixtureName ?? defaultFixture,
        fetchedAt: new Date().toISOString()
      };
    }
  } else {
    const fixture = await loadFixture(fixtureName || defaultFixture);
    payload = fixture;
    sourceMeta = {
      source: "Fixture",
      status: "fixture",
      patentNumber: fixture.patentNumber ?? fixtureName ?? defaultFixture,
      fetchedAt: new Date().toISOString()
    };
  }

  const normalized = normalizePatentPayload(payload);
  const { steps, stepMeta } = extractWorkflow(normalized);
  const { parameters } = extractParameters(normalized, stepMeta);
  const { gaps } = extractGaps(normalized, steps, parameters);

  WorkflowSchema.parse(steps);
  ParametersSchema.parse(parameters);
  GapsSchema.parse(gaps);

  const reportMd = renderReport({
    workflow: steps,
    parameters,
    gaps,
    sourceMeta
  });
  const diagram = renderDiagram(steps);

  const jobId = crypto.randomUUID();
  const jobDir = path.join(process.cwd(), "artifacts", jobId);
  await mkdir(jobDir, { recursive: true });

  await Promise.all([
    writeFile(path.join(jobDir, "workflow.json"), JSON.stringify(steps, null, 2)),
    writeFile(
      path.join(jobDir, "parameters.json"),
      JSON.stringify(parameters, null, 2)
    ),
    writeFile(path.join(jobDir, "gaps.json"), JSON.stringify(gaps, null, 2)),
    writeFile(path.join(jobDir, "report.md"), reportMd),
    writeFile(path.join(jobDir, "diagram.mmd"), diagram),
    writeFile(path.join(jobDir, "source.json"), JSON.stringify(sourceMeta, null, 2))
  ]);

  return NextResponse.json({ jobId });
}
