"use client";

import { useState } from "react";
import MermaidDiagram from "@/components/MermaidDiagram";

type WorkflowStep = {
  stepId: string;
  title: string;
  text: string;
  evidence: { section: string; snippet: string };
  cues: string[];
};

type Parameter = {
  name: string;
  valueOrRange: string;
  unit?: string;
  context: string;
  stepId?: string;
  evidenceSnippet: string;
};

type Gap = {
  type: string;
  message: string;
  evidenceSnippet?: string;
};

type SourceMeta = {
  source: "PatentsView" | "Fixture";
  status: "cached" | "live" | "fixture";
  patentNumber?: string;
  fetchedAt?: string;
};

type JobResult = {
  jobId: string;
  reportMd: string;
  workflow: WorkflowStep[];
  parameters: Parameter[];
  gaps: Gap[];
  sourceMeta?: SourceMeta;
  diagram?: string;
};

const formatSource = (sourceMeta?: SourceMeta) => {
  if (!sourceMeta) return "Source: Unknown";
  if (sourceMeta.source === "Fixture") return "Source: Fixture";
  const statusLabel = sourceMeta.status === "cached" ? "cached" : "live";
  return `Source: PatentsView (${statusLabel})`;
};

export default function Home() {
  const [patentNumber, setPatentNumber] = useState("");
  const [fixtureName, setFixtureName] = useState("fix-enum-001");
  const [job, setJob] = useState<JobResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compile = async () => {
    setLoading(true);
    setError(null);
    setJob(null);

    try {
      const body = patentNumber
        ? { patentNumber }
        : { fixtureName: fixtureName || "fix-enum-001" };
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        throw new Error("Compile failed");
      }
      const { jobId } = await response.json();
      const jobResponse = await fetch(`/api/job/${jobId}`);
      if (!jobResponse.ok) {
        throw new Error("Failed to load job artifacts");
      }
      const result = (await jobResponse.json()) as JobResult;
      setJob(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Patent-to-Scientific Workflow Compiler</p>
          <h1>Turn patents into usable scientific experiment protocols.</h1>
          <p className="subtitle">
            For scientists: ordered steps, parameters with units and ranges,
            plus reproducibility gaps when patents leave things underspecified.
            For developers: healing-friendly fixtures that turn edge cases into
            permanent regression tests.
          </p>
        </div>
        <div className="callout">
          <p className="callout-title">What it does</p>
          <p className="callout-body">
            Export stable JSON and a readable report/diagram, built for rapid
            debugging and clean, reviewable fixes.
          </p>
        </div>
      </header>

      <section className="card">
        <div className="input-grid">
          <label>
            <span>Patent number</span>
            <input
              value={patentNumber}
              onChange={(event) => setPatentNumber(event.target.value)}
              placeholder="US-11012345-B2"
            />
          </label>
          <label>
            <span>Fixture (offline)</span>
            <input
              value={fixtureName}
              onChange={(event) => setFixtureName(event.target.value)}
              placeholder="fix-enum-001"
            />
          </label>
          <button onClick={compile} disabled={loading}>
            {loading ? "Compiling..." : "Compile"}
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {job ? (
        <section className="results">
          <div className="meta">
            <span>Job: {job.jobId}</span>
            <span>{formatSource(job.sourceMeta)}</span>
          </div>

          <div className="grid">
            <article className="panel">
              <h2>report.md</h2>
              <pre>{job.reportMd}</pre>
            </article>

            <article className="panel">
              <h2>Workflow Steps</h2>
              <div className="stack">
                {job.workflow.map((step) => (
                  <div key={step.stepId} className="item">
                    <div className="item-header">
                      <strong>{step.stepId}</strong>
                      <span>{step.title}</span>
                    </div>
                    <p>{step.text}</p>
                    <small>{step.evidence.snippet}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <h2>Parameters</h2>
              <div className="table">
                <div className="row header">
                  <span>Name</span>
                  <span>Value</span>
                  <span>Unit</span>
                  <span>Step</span>
                </div>
                {job.parameters.map((param, index) => (
                  <div className="row" key={`${param.name}-${index}`}>
                    <span>{param.name}</span>
                    <span>{param.valueOrRange}</span>
                    <span>{param.unit ?? ""}</span>
                    <span>{param.stepId ?? ""}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <h2>Gaps</h2>
              <div className="stack">
                {job.gaps.map((gap, index) => (
                  <div key={`${gap.type}-${index}`} className="item">
                    <strong>{gap.type}</strong>
                    <p>{gap.message}</p>
                    {gap.evidenceSnippet ? (
                      <small>{gap.evidenceSnippet}</small>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <h2>diagram.mmd</h2>
              <MermaidDiagram chart={job.diagram ?? ""} />
              <details className="mermaid-raw">
                <summary>View raw Mermaid text</summary>
                <pre>{job.diagram ?? "Mermaid diagram not generated."}</pre>
              </details>
            </article>
          </div>
        </section>
      ) : null}
    </main>
  );
}
