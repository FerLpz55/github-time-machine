"use client";

import { useEffect, useState, useMemo } from "react";
import { CubeTransparentIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface GraphNode { id: string; label: string; type: string; path?: string; language?: string; complexity: number; churn: number; size: number; }
interface GraphEdge { source: string; target: string; type: string; weight: number; label?: string; }
interface GraphSlice { nodes: GraphNode[]; edges: GraphEdge[]; total_nodes: number; total_edges: number; }

export default function GraphPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<GraphSlice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [depth, setDepth] = useState(2);

  const fetchGraph = async () => {
    try {
      setLoading(true); setError(null);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_URL}/repositories/${repoId}/graph?depth=${depth}`);
      if (!res.ok) throw new Error("Failed to load graph");
      const json = await res.json();
      setData(json);
      if (json.nodes?.length > 0) setSelectedNode(json.nodes[0]);
    } catch {
      setError("Graph endpoint unavailable");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchGraph(); }, [repoId, depth]);

  const layout = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    const W = 800, H = 450, cx = W / 2, cy = H / 2;
    const positions: Record<string, { x: number; y: number }> = {};
    const fileRadius = 180;
    data.nodes.filter(n => n.type !== "function").forEach((n, i) => {
      const a = (i / Math.max(1, data.nodes.filter(x => x.type !== "function").length)) * 2 * Math.PI;
      positions[n.id] = { x: cx + fileRadius * Math.cos(a), y: cy + fileRadius * Math.sin(a) };
    });
    const fnRadius = 90;
    data.nodes.filter(n => n.type === "function").forEach((n, i) => {
      const a = (i / Math.max(1, data.nodes.filter(x => x.type === "function").length)) * 2 * Math.PI;
      positions[n.id] = { x: cx + fnRadius * Math.cos(a), y: cy + fnRadius * Math.sin(a) };
    });
    const renderedNodes = data.nodes.map(n => ({ ...n, x: positions[n.id]?.x || cx, y: positions[n.id]?.y || cy }));
    const renderedEdges = data.edges.map(e => {
      const s = positions[e.source], t = positions[e.target];
      if (!s || !t) return null;
      return { ...e, x1: s.x, y1: s.y, x2: t.x, y2: t.y };
    }).filter(Boolean) as any[];
    return { nodes: renderedNodes, edges: renderedEdges };
  }, [data]);

  if (loading) return <div className="flex items-center justify-center h-64 text-white/20 font-mono text-xs tracking-widest">TRAVERSING DEPENDENCIES...</div>;
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-2 text-red-400/60 font-mono text-xs"><span>{error}</span><button onClick={fetchGraph} className="text-white/40 hover:text-white/70 underline">RETRY</button></div>;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-white/30 font-mono tracking-widest">
          <CubeTransparentIcon className="w-3.5 h-3.5 text-emerald-400/60" />
          {data?.total_nodes || 0} NODES · {data?.total_edges || 0} EDGES
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/20 font-mono tracking-widest">DEPTH</span>
          {[1, 2, 3].map(d => (
            <button key={d} onClick={() => setDepth(d)}
              className={`w-7 h-6 text-[10px] font-mono rounded border transition-all ${
                depth === d ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/[0.04]" : "border-white/[0.06] text-white/30 hover:border-white/20"
              }`}>{d}</button>
          ))}
          <button onClick={fetchGraph} className="ml-2 p-1.5 rounded border border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/20 transition-all">
            <ArrowPathIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Graph + Inspector */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.01] overflow-hidden">
          <svg viewBox="0 0 800 450" className="w-full h-auto">
            <defs>
              <marker id="arrowhead" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#1e293b" />
              </marker>
            </defs>
            {layout.edges.map((e: any, i: number) => {
              const isActive = selectedNode && (e.source === selectedNode.id || e.target === selectedNode.id);
              return (
                <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  stroke={isActive ? "#10b981" : "#1e293b"}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  markerEnd="url(#arrowhead)"
                  strokeDasharray={e.type === "CONTAINS" ? "3,3" : undefined}
                />
              );
            })}
            {layout.nodes.map((n: any) => {
              const isActive = selectedNode?.id === n.id;
              const r = n.type === "file" ? 6 + Math.min(8, n.size > 0 ? Math.log2(n.size / 100) : 0) : 5;
              const fill = isActive ? "#10b981" : n.type === "file" ? "#334155" : "#1e293b";
              return (
                <g key={n.id} onClick={() => setSelectedNode(n)} className="cursor-pointer">
                  <circle cx={n.x} cy={n.y} r={r} fill={fill} stroke={isActive ? "#34d399" : "#0f172a"} strokeWidth={0.5} />
                  <text x={n.x} y={n.y - r - 4} textAnchor="middle" fill={isActive ? "#6ee7b7" : "#475569"} fontSize="8" fontFamily="mono" style={{ userSelect: "none" }}>
                    {n.label?.length > 20 ? n.label.slice(0, 20) + "…" : n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {selectedNode && (
          <div className="w-56 flex-shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.01] p-4 space-y-3 text-[11px]">
            <div>
              <div className="text-[9px] text-white/20 font-mono tracking-widest">{selectedNode.type?.toUpperCase()}</div>
              <div className="text-xs text-white/80 mt-0.5 font-medium truncate">{selectedNode.label}</div>
            </div>
            {selectedNode.path && (
              <div className="text-[10px] text-white/30 font-mono truncate border-t border-white/[0.04] pt-2">
                {selectedNode.path}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <div><div className="text-[9px] text-white/20 font-mono">COMPLEXITY</div><div className="text-xs text-white/60">{selectedNode.complexity || 0}</div></div>
              {selectedNode.type !== "function" && <div><div className="text-[9px] text-white/20 font-mono">CHURN</div><div className="text-xs text-white/60">{selectedNode.churn || 0}</div></div>}
            </div>
            {layout.edges.filter((e: any) => e.source === selectedNode.id || e.target === selectedNode.id).length > 0 && (
              <div className="border-t border-white/[0.04] pt-2">
                <div className="text-[9px] text-white/20 font-mono tracking-widest mb-1">CONNECTIONS</div>
                {layout.edges.filter((e: any) => e.source === selectedNode.id || e.target === selectedNode.id).slice(0, 8).map((e: any, i: number) => {
                  const other = e.source === selectedNode.id ? e.target : e.source;
                  const name = layout.nodes.find((n: any) => n.id === other)?.label || other;
                  return (
                    <div key={i} className="text-[10px] text-white/40 font-mono truncate">
                      {e.source === selectedNode.id ? "→" : "←"} {name.slice(0, 20)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
