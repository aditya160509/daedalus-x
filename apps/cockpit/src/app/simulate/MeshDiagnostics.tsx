"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScatterChart } from "echarts/charts";
import { VisualMapComponent } from "echarts/components";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { Button } from "@/components/ui/button";
import { Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import { getMeshDiagnostics } from "@/lib/api";

echarts.use([ScatterChart, VisualMapComponent]);
type Point = [number, number, number, number];

function MeshMap({ points, name }: { points: Point[]; name: string }) {
  const host = useECharts(() => {
    const t = chartTheme();
    const max = points.reduce((hi, [, , , value]) => Math.max(hi, value), 1);
    return {
      animation: false,
      grid: { left: 58, right: 20, top: 34, bottom: 48 },
      tooltip: { ...chartTooltip(t), trigger: "item" },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        name: "x (mm)",
        nameLocation: "middle",
        nameGap: 27,
        scale: true,
      },
      yAxis: { ...chartAxis(t), type: "value", name: "z (mm)", scale: true },
      visualMap: { dimension: 2, min: 0, max, show: false, inRange: { color: [t.brand, t.risk] } },
      series: [
        {
          type: "scatter",
          symbolSize: 5,
          dimensions: ["x (mm)", "z (mm)", name, "y (mm)"],
          encode: { x: 0, y: 1, tooltip: [0, 1, 3, 2] },
          data: points.map(([x, y, z, value]) => [x * 1000, z * 1000, value, y * 1000]),
        },
      ],
    };
  }, [points, name]);
  return <div ref={host} className="h-60 w-full" role="img" aria-label={name} />;
}

function Skewness({ edges, counts }: { edges: number[]; counts: number[] }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 58, right: 16, top: 34, bottom: 48 },
      tooltip: { ...chartTooltip(t), trigger: "axis" },
      xAxis: {
        ...chartAxis(t),
        type: "category",
        name: "Skewness bin start (1)",
        nameLocation: "middle",
        nameGap: 26,
        data: edges.slice(0, -1).map((edge) => edge.toPrecision(3)),
      },
      yAxis: { ...chartAxis(t), type: "value", name: "Cells" },
      series: [{ type: "bar", data: counts, itemStyle: { color: t.brand } }],
    };
  }, [edges, counts]);
  return <div ref={host} className="h-60 w-full" role="img" aria-label="Cell skewness histogram" />;
}

export function MeshDiagnostics({ runId }: { runId: string }) {
  const client = useQueryClient();
  const key = ["mesh-diagnostics", runId];
  const data = useQuery({
    queryKey: key,
    queryFn: () => getMeshDiagnostics(runId),
    retry: false,
    staleTime: Infinity,
  });
  const generate = useMutation({
    mutationFn: () => getMeshDiagnostics(runId, true),
    onSuccess: (result) => client.setQueryData(key, result),
  });
  const quality = data.data?.quality;
  return (
    <Panel
      title="Mesh diagnostics"
      actions={<ProvenanceBadge value="simulated" />}
      description="Latest reconstructed fields. Maps show sampled face or cell centres projected onto x–z."
      bodyClassName="space-y-3 p-3"
    >
      {data.isPending && <Skeleton className="h-28" />}
      {data.error && (
        <p role="alert" className="text-xs text-destructive">
          {data.error.message}
        </p>
      )}
      {data.data && (
        <>
          <h3 className="text-xs font-medium">Wall y+ (1)</h3>
          {data.data.wall_y_plus.length ? (
            <MeshMap points={data.data.wall_y_plus} name="Wall y+ (1)" />
          ) : (
            <p className="text-xs text-muted-foreground">This run has no saved wall y+ field.</p>
          )}
          {quality ? (
            <>
              <h3 className="text-xs font-medium">Cells outside mesh screening limits</h3>
              <p className="text-xs text-muted-foreground">
                {quality.flagged_count.toLocaleString()} of {quality.cell_count.toLocaleString()}{" "}
                cells exceed skewness 4 or non-orthogonality 65°. Colour shows the largest ratio to
                either limit.
              </p>
              {quality.bad_cells.length > 0 && (
                <MeshMap points={quality.bad_cells} name="Limit ratio (1)" />
              )}
              <h3 className="text-xs font-medium">Skewness histogram</h3>
              <Skewness edges={quality.edges} counts={quality.counts} />
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                No saved cell-quality fields. Generate them with OpenFOAM checkMesh from this mesh.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={generate.isPending}
                onClick={() => generate.mutate()}
              >
                {generate.isPending ? "Checking mesh…" : "Generate mesh quality fields"}
              </Button>
              {generate.error && (
                <p role="alert" className="text-xs text-destructive">
                  {generate.error.message}
                </p>
              )}
            </>
          )}
        </>
      )}
    </Panel>
  );
}
