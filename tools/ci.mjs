import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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

run("Typecheck", "npm run typecheck");
run("Tests", "npm test");

const reportLines = [
  "# CI Report",
  "",
  `Generated: ${new Date().toISOString()}`,
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
