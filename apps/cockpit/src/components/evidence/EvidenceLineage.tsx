"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { graphlib, layout as dagreLayout } from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { getEvidenceLineage, type EvidenceRow } from "@/lib/api";
import { cn } from "@/lib/utils";

// Layout integration follows React Flow's official Dagre example (MIT).
type RecordNode = Node<{ record: EvidenceRow }, "record">;
function EvidenceNode({ data, selected }: NodeProps<RecordNode>) {
  const record = data.record;
  const provenance = typeof record.body.provenance === "string" ? record.body.provenance : null;
  return (
    <div
      className={cn(
        "w-60 rounded-lg border bg-card px-3 py-2.5 text-foreground",
        selected ? "border-ring" : !record.verified ? "border-destructive" : "border-border",
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{record.kind}</span>
        {record.verified ? (
          <ShieldCheck className="ml-auto size-3.5 text-muted-foreground" />
        ) : (
          <ShieldX className="ml-auto size-3.5 text-destructive" />
        )}
      </div>
      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground" title={record.id}>
        {record.id}
      </div>
      <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
        {provenance && <span>{provenance}</span>}
        <span>{record.verified ? "Hash verified" : "Hash mismatch"}</span>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
const NODE_TYPES = { record: EvidenceNode };

export default function EvidenceLineage({
  query,
  selected,
  onSelect,
}: {
  query: string;
  selected: string | undefined;
  onSelect: (record: EvidenceRow) => void;
}) {
  const graph = useQuery({
    queryKey: ["evidence-lineage"],
    queryFn: getEvidenceLineage,
    staleTime: 30_000,
  });
  const layout = useMemo(() => {
    if (!graph.data) return { nodes: [] as RecordNode[], edges: [] };
    const network = new graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    network.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 95, marginx: 25, marginy: 25 });
    for (const row of graph.data.nodes) network.setNode(row.id, { width: 240, height: 90 });
    for (const edge of graph.data.edges) network.setEdge(edge.source, edge.target);
    dagreLayout(network);
    const needle = query.trim().toLowerCase();
    const nodes: RecordNode[] = graph.data.nodes.map((record) => {
      const point = network.node(record.id);
      const match =
        !needle ||
        `${record.id} ${record.kind} ${JSON.stringify(record.body)}`.toLowerCase().includes(needle);
      return {
        id: record.id,
        type: "record",
        data: { record },
        position: { x: point.x - 120, y: point.y - 45 },
        selected: selected === record.id,
        style: { opacity: match ? 1 : 0.25 },
      };
    });
    return {
      nodes,
      edges: graph.data.edges.map((edge) => ({
        ...edge,
        type: "smoothstep",
        label: edge.field.replace(/_ids?$/, "").replaceAll("_", " "),
        style: { stroke: "#50505a", strokeWidth: 1 },
        labelStyle: { fill: "#8a8a93", fontSize: 9 },
        labelBgStyle: { fill: "#141416" },
      })),
    };
  }, [graph.data, query, selected]);
  if (graph.isError)
    return (
      <div role="alert" className="p-6 text-sm">
        Could not load lineage.{" "}
        <Button variant="link" onClick={() => void graph.refetch()}>
          Retry
        </Button>
      </div>
    );
  if (!graph.data) return <Skeleton className="m-4 h-96" />;
  if (graph.data.nodes.length === 0)
    return (
      <div className="grid h-full place-content-center p-6 text-center text-sm text-muted-foreground">
        No evidence records yet. Import a saved design to start its trace.
      </div>
    );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-[10px] text-muted-foreground">
        <span>
          {graph.data.nodes.length} records · {graph.data.edges.length} stored links
        </span>
        <span>Parent → dependent</span>
        {graph.data.truncated && <span>Newest 500 records shown</span>}
        {graph.data.outside_window > 0 && (
          <span>{graph.data.outside_window} parent records outside this view</span>
        )}
        {graph.data.missing_references.length > 0 && (
          <span className="text-destructive">
            {graph.data.missing_references.length} missing references
          </span>
        )}
        <Button size="xs" variant="ghost" className="ml-auto" onClick={() => void graph.refetch()}>
          Refresh
        </Button>
      </div>
      <div
        className="min-h-80 flex-1"
        style={
          {
            "--xy-background-color": "#0b0b0c",
            "--xy-controls-button-background-color-default": "#1c1c1f",
            "--xy-controls-button-color-default": "#ececee",
          } as React.CSSProperties
        }
      >
        <ReactFlow<RecordNode>
          nodes={layout.nodes}
          edges={layout.edges}
          nodeTypes={NODE_TYPES}
          colorMode="dark"
          fitView
          minZoom={0.08}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_event, node) => onSelect(node.data.record)}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} color="#242428" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
