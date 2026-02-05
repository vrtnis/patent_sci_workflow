import "./globals.css";

export const metadata = {
  title: "Patent-to-Scientific Workflow Compiler",
  description:
    "For scientists, it turns dense patent methods into a usable protocol: ordered steps, parameters with units/ranges, and reproducibility gaps flagged when patents leave things underspecified (missing units, conditions, or fuzzy words), exported as stable JSON plus a readable report/diagram. For developers, it makes healing easy to set up: each new failure can be captured as a fixture, replayed in CI, and fixed with trace-driven patches in isolated worktrees, so edge cases steadily become permanent regression tests. Built in the Codex app, parallel agents + worktrees speed up fixture generation, debugging, and clean, reviewable merges."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
