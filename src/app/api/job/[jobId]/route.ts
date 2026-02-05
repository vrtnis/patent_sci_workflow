import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const readJson = async (filePath: string) => {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
};

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  const jobDir = path.join(process.cwd(), "artifacts", jobId);

  try {
    const [workflow, parameters, gaps, reportMd, diagram, sourceMeta] =
      await Promise.all([
        readJson(path.join(jobDir, "workflow.json")),
        readJson(path.join(jobDir, "parameters.json")),
        readJson(path.join(jobDir, "gaps.json")),
        readFile(path.join(jobDir, "report.md"), "utf-8"),
        readFile(path.join(jobDir, "diagram.mmd"), "utf-8"),
        readJson(path.join(jobDir, "source.json")).catch(() => null)
      ]);

    return NextResponse.json({
      jobId,
      reportMd,
      workflow,
      parameters,
      gaps,
      sourceMeta,
      diagram
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Job not found" },
      { status: 404 }
    );
  }
}
