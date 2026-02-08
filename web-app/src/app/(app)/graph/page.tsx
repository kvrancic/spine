"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { getGraph } from "@/lib/api";
import type { GraphNode, GraphEdge } from "@/lib/types";
import PersonPanel from "@/components/graph/PersonPanel";

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
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  const [nodes, setNodes] = useState<ForceNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const graphRef = useRef<any>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getGraph()
      .then((data) => {
        setNodes(data.nodes);
        setEdges(data.edges);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load graph:", err);
        setLoading(false);
      });
  }, []);

  // Handle focus param from URL
  useEffect(() => {
    if (focusId && nodes.length > 0 && !selectedNodeId) {
      const node = nodes.find((n) => n.id === focusId);
      if (node) {
        setSelectedNodeId(node.id);
        setTimeout(() => {
          if (graphRef.current && node.x !== undefined) {
            graphRef.current.centerAt(node.x, node.y, 500);
            graphRef.current.zoom(1.5, 500);
          }
        }, 300);
      }
    }
  }, [focusId, nodes, selectedNodeId]);

  useEffect(() => {
    const updateDimensions = () => {
      const panelWidth = selectedNodeId ? 380 : 0;
      setDimensions({
        width: window.innerWidth - panelWidth,
        height: window.innerHeight - 56,
      });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [selectedNodeId]);

  // Debounced search: zoom to matched node
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery) return;

    searchDebounceRef.current = setTimeout(() => {
      const node = nodes.find((n) =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (node && graphRef.current && node.x !== undefined) {
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(1.5, 500);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, nodes]);

  const highlightedNodeId = searchQuery
    ? nodes.find((n) => n.name.toLowerCase().includes(searchQuery.toLowerCase()))?.id
    : null;

  const maxPagerank = Math.max(...nodes.map((n) => n.pagerank), 0.001);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNodeId(node.id);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(1.5, 500);
    }
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && highlightedNodeId) {
        setSelectedNodeId(highlightedNodeId);
      }
    },
    [highlightedNodeId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--foreground)]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Graph */}
      <div className="flex-1 relative bg-gray-50 transition-all duration-300">
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes, links: edges }}
          nodeId="id"
          linkSource="source"
          linkTarget="target"
          nodeLabel={(node: any) => node.name}
          nodeVal={(node: any) => Math.max(2, (node.pagerank / maxPagerank) * 20)}
          nodeColor={(node: any) => {
            if (highlightedNodeId === node.id) return "#000000";
            if (selectedNodeId === node.id) return "#000000";
            return COMMUNITY_COLORS[(node.community_id ?? 0) % COMMUNITY_COLORS.length] || "#6b7280";
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
          onBackgroundClick={handleBackgroundClick}
          backgroundColor="#f9fafb"
          width={dimensions.width}
          height={dimensions.height}
        />

        {/* Search overlay */}
        <div className="absolute top-4 left-4">
          <div className="bg-white rounded-lg border border-[var(--card-border)] shadow-sm p-3 w-64">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="text-sm flex-1 outline-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Person Panel */}
      {selectedNodeId && (
        <PersonPanel
          personId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
