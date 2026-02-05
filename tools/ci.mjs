import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const results = [];
let success = true;

const run = (label, command) => {
  try {
    execSync(command, { stdio: "inherit" });
    results.push({ label, status: "PASS" });
  } catch (error) {
    results.push({ label, status: "FAIL" });
    success = false;
  }
};

const findLatestFixturePack = () => {
  const packsRoot = path.join(process.cwd(), "tests", "fixtures", "synth");
  try {
    const entries = readdirSync(packsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    return entries.length ? path.join(packsRoot, entries[entries.length - 1]) : null;
  } catch (error) {
    return null;
  }
};

const runId = process.env.CI_RUN_ID ?? new Date().toISOString();
const fixturePack = process.env.CI_FIXTURE_PACK ?? findLatestFixturePack();

run("Tests", "npm test");

const reportLines = [
  "# CI Report",
  "",
  `Run ID: ${runId}`,
  `Fixture Pack: ${fixturePack ?? "none"}`,
  "",
  ...results.map((result) => `- ${result.label}: ${result.status}`),
  "",
  success ? "Overall: PASS" : "Overall: FAIL"
];

const artifactsDir = path.join(process.cwd(), "artifacts");
mkdirSync(artifactsDir, { recursive: true });
writeFileSync(
  path.join(artifactsDir, "build_report.md"),
  reportLines.join("\n")
);

process.exit(success ? 0 : 1);
