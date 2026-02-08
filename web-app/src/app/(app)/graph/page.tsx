"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Search, Filter } from "lucide-react";
import { getGraph } from "@/lib/api";
import type { GraphNode, GraphEdge } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const COMMUNITY_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#d946ef", "#a3e635",
  "#fb923c", "#2dd4bf", "#818cf8",
];

interface ForceNode extends GraphNode {
  x?: number;
  y?: number;
  fx?: number | undefined;
  fy?: number | undefined;
  [key: string]: any;
}

export default function GraphPage() {
  const [nodes, setNodes] = useState<ForceNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<ForceNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [edgeThreshold, setEdgeThreshold] = useState(0);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    getGraph().then((data) => {
      setNodes(data.nodes);
      setEdges(data.edges);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load graph:", err);
      setLoading(false);
    });
  }, []);

  const filteredEdges = edges.filter(e => e.weight >= edgeThreshold);
  const connectedNodeIds = new Set<string>();
  filteredEdges.forEach(e => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });
  const filteredNodes = nodes.filter(n => connectedNodeIds.has(n.id));

  const highlightedNodeId = searchQuery
    ? nodes.find(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()))?.id
    : null;

  const maxPagerank = Math.max(...nodes.map(n => n.pagerank), 0.001);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(3, 500);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6">
      {/* Graph */}
      <div className="flex-1 relative bg-gray-50">
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes: filteredNodes, links: filteredEdges }}
          nodeId="id"
          linkSource="source"
          linkTarget="target"
          nodeLabel={(node: any) => `${node.name} (PR: ${node.pagerank.toFixed(4)})`}
          nodeVal={(node: any) => Math.max(2, (node.pagerank / maxPagerank) * 20)}
          nodeColor={(node: any) => {
            if (highlightedNodeId === node.id) return "#000000";
            if (selectedNode?.id === node.id) return "#000000";
            return COMMUNITY_COLORS[node.community_id % COMMUNITY_COLORS.length] || "#6b7280";
          }}
          linkWidth={(link: any) => Math.max(0.3, link.weight * 3)}
          linkColor={(link: any) => {
            if (link.sentiment < -0.1) return "rgba(239,68,68,0.4)";
            if (link.sentiment > 0.2) return "rgba(34,197,94,0.3)";
            return "rgba(156,163,175,0.2)";
          }}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          backgroundColor="#f9fafb"
          width={typeof window !== "undefined" ? window.innerWidth - 240 - (selectedNode ? 320 : 0) : 800}
          height={typeof window !== "undefined" ? window.innerHeight - 56 : 600}
        />

        {/* Controls overlay */}
        <div className="absolute top-4 left-4 space-y-3">
          <div className="bg-white rounded-lg border border-[var(--card-border)] shadow-sm p-3 w-64">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm flex-1 outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--card-border)] shadow-sm p-3 w-64">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-xs text-[var(--muted)]">
                Edge threshold: {edgeThreshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.8}
              step={0.01}
              value={edgeThreshold}
              onChange={(e) => setEdgeThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
              <span>{filteredNodes.length} nodes</span>
              <span>{filteredEdges.length} edges</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div className="w-80 border-l border-[var(--card-border)] bg-white p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">{selectedNode.name}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
            >
              Close
            </button>
          </div>

          <p className="text-sm text-[var(--muted)] mb-4">{selectedNode.email}</p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="PageRank" value={selectedNode.pagerank.toFixed(5)} />
              <Stat label="Betweenness" value={selectedNode.betweenness.toFixed(5)} />
              <Stat label="Eigenvector" value={selectedNode.eigenvector.toFixed(5)} />
              <Stat label="Community" value={String(selectedNode.community_id)} />
              <Stat label="Sent" value={String(selectedNode.total_sent)} />
              <Stat label="Received" value={String(selectedNode.total_received)} />
              <Stat label="Sent Sentiment" value={selectedNode.avg_sent_sentiment.toFixed(3)} />
              <Stat label="Recv Sentiment" value={selectedNode.avg_received_sentiment.toFixed(3)} />
            </div>

            <a
              href={`/people/${encodeURIComponent(selectedNode.id)}`}
              className="block w-full text-center py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mt-4"
            >
              View Full Profile
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-sm font-mono font-medium">{value}</p>
    </div>
  );
}
