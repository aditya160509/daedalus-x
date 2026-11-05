"use client";

import { SankeyChart } from "echarts/charts";
import { ToolboxComponent } from "echarts/components";
import { chartTheme, chartTooltip, echarts, useECharts } from "@/components/charts/useECharts";
import type { EnergyAudit } from "@/lib/api";
import { energySankey } from "@/lib/energySankey";

echarts.use([SankeyChart, ToolboxComponent]);

export function EnergySankey({ data }: { data: EnergyAudit }) {
  const graph = energySankey(data);
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      tooltip: {
        ...chartTooltip(t),
        trigger: "item",
        valueFormatter: (v: unknown) => `${Number(v).toFixed(3)} J`,
      },
      toolbox: { feature: { saveAsImage: { type: "png", name: "race-energy-sankey" } } },
      series: graph
        ? [
            {
              type: "sankey",
              left: 8,
              right: 8,
              top: 36,
              bottom: 18,
              nodeAlign: "justify",
              nodeWidth: 14,
              nodeGap: 25,
              draggable: false,
              data: graph.nodes.map((node) => ({
                ...node,
                label: {
                  position: graph.links.some((link) => link.source === node.name)
                    ? "right"
                    : "left",
                },
              })),
              links: graph.links,
              layoutIterations: 0,
              label: { position: "inside", color: t.text, fontSize: 10, fontFamily: t.mono },
              itemStyle: { color: t.brand, borderWidth: 0 },
              lineStyle: { color: t.brand, opacity: 0.2, curveness: 0.5 },
              emphasis: { focus: "adjacency", lineStyle: { opacity: 0.45 } },
            },
          ]
        : [],
    };
  }, [data]);
  return (
    <figure className="min-w-0 rounded-lg border p-2">
      <div
        ref={host}
        hidden={!graph}
        className="h-72 w-full"
        role="img"
        aria-label="Predicted thrust work flowing to kinetic energy, drag, rolling and tether losses in joules"
      />
      {!graph && (
        <p className="p-4 text-sm text-muted-foreground">
          A positive thrust-work audit with nonnegative flows is needed for this diagram.
        </p>
      )}
      <figcaption className="px-2 pb-1 text-xs text-muted-foreground">
        Flow widths show calculated joules. Integration remainder/surplus stays visible rather than
        rescaling losses. Tether loss uses the entered constant M2 resistance while moving. Export
        the diagram with the chart toolbar.
      </figcaption>
    </figure>
  );
}
