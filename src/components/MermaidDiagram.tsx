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
      return () => {
        active = false;
      };
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
