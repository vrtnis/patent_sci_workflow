---
name: patent-workflow-mermaid
description: "Render Mermaid flowcharts in the Patent Workflow Extractor MVP UI. Use when adding client-side Mermaid rendering for diagram.mmd or Mermaid text in this repo's Next.js App Router interface."
---

# Patent Workflow Mermaid

## Workflow
1. Ensure the `mermaid` dependency is installed.
2. Create a client component that renders Mermaid text to SVG (see `references/nextjs-mermaid.md`).
3. Wire the component into `/Users/user947388/Desktop/pat1/patent_sci_workflow/src/app/page.tsx` to render `job.diagram`.
4. Keep the raw Mermaid text in a `<pre>` as a fallback for debugging.

## Notes
- Use dynamic import in `useEffect` to avoid SSR issues.
- Initialize Mermaid with `startOnLoad: false` and a strict security level.
- Render with a stable unique id per component instance.
