# Next.js Mermaid Renderer (App Router)

## Install
```bash
npm install mermaid
```

## Client component example
Create `/Users/user947388/Desktop/pat1/patent_sci_workflow/src/components/MermaidDiagram.tsx`:

```tsx
"use client";

import { useEffect, useId, useState } from "react";

type MermaidDiagramProps = {
  chart: string;
};

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    let active = true;
    setError(null);

    if (!chart || !chart.trim()) {
      setSvg("");
      return undefined;
    }

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (active) {
          setSvg(svg);
        }
      } catch (err) {
        if (active) {
          setError("Failed to render Mermaid diagram.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [chart, id]);

  if (error) {
    return <pre>{chart}</pre>;
  }

  if (!svg) {
    return <div />;
  }

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

## Wiring into the UI
In `/Users/user947388/Desktop/pat1/patent_sci_workflow/src/app/page.tsx`:

```tsx
import MermaidDiagram from "@/components/MermaidDiagram";

// ...inside the results panel
<MermaidDiagram chart={job.diagram ?? ""} />
```

## Fallback UX
Keep the existing `<pre>` panel so users can see raw Mermaid text when rendering fails.
