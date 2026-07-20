"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { CubeTransparentIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface GraphNode { id: string; label: string; type: string; path?: string; language?: string; complexity: number; churn: number; size: number; }
interface GraphEdge { source: string; target: string; type: string; weight: number; label?: string; }
interface GraphSlice { nodes: GraphNode[]; edges: GraphEdge[]; total_nodes: number; total_edges: number; }

interface SimNode { id: string; label: string; type: string; path?: string; x: number; y: number; vx: number; vy: number; complexity: number; churn: number; size: number; }
interface SimEdge { source: string; target: string; type: string; }

function runForce(nodes: SimNode[], edges: SimEdge[], W: number, H: number, iterations: number = 200) {
  for (let i = 0; i < iterations; i++) {
    const alpha = 1 - i / iterations;
    // Repulsion
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const dx = nodes[b].x - nodes[a].x;
        const dy = nodes[b].y - nodes[a].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (80 * 80) / dist * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[a].vx -= fx; nodes[a].vy -= fy;
        nodes[b].vx += fx; nodes[b].vy += fy;
      }
    }
    // Attraction
    for (const e of edges) {
      const s = nodes.find(n => n.id === e.source);
      const t = nodes.find(n => n.id === e.target);
      if (!s || !t) continue;
      const dx = t.x - s.x, dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * 0.01 * alpha;
      s.vx += dx * force; s.vy += dy * force;
      t.vx -= dx * force; t.vy -= dy * force;
    }
    // Center gravity
    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * 0.001 * alpha;
      n.vy += (H / 2 - n.y) * 0.001 * alpha;
    }
    // Update
    for (const n of nodes) {
      n.vx *= 0.6; n.vy *= 0.6;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(20, Math.min(W - 20, n.x));
      n.y = Math.max(20, Math.min(H - 20, n.y));
    }
  }
}

export default function GraphPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<GraphSlice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [depth, setDepth] = useState(2);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simEdges, setSimEdges] = useState<SimEdge[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const hoverRef = useRef<string | null>(null);

  const fetchGraph = async () => {
    try {
      setLoading(true); setError(null);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://github-time-machine-production.up.railway.app";
      const res = await fetch(`${API_URL}/repositories/${repoId}/graph?depth=${depth}`);
      if (!res.ok) throw new Error("Failed to load graph");
      const json = await res.json();
      setData(json);
    } catch { setError("Graph endpoint unavailable"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGraph(); }, [repoId, depth]);

  useEffect(() => {
    if (!data?.nodes?.length) return;
    const W = 900, H = 500;
    const nodes: SimNode[] = data.nodes.map((n, i) => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2 + (Math.random() - 0.5) * 200,
      vx: 0, vy: 0,
    }));
    const edges: SimEdge[] = data.edges.map(e => ({ source: e.source, target: e.target, type: e.type }));
    runForce(nodes, edges, W, H, 300);
    setSimNodes(nodes);
    setSimEdges(edges);
  }, [data]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simNodes.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width = canvas.clientWidth * 2;
    const H = canvas.height = canvas.clientHeight * 2;
    ctx.scale(2, 2);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    ctx.clearRect(0, 0, cw, ch);

    // Edges
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;
    for (const e of simEdges) {
      const s = simNodes.find(n => n.id === e.source);
      const t = simNodes.find(n => n.id === e.target);
      if (!s || !t) continue;
      const isActive = selectedNode && (e.source === selectedNode.id || e.target === selectedNode.id);
      ctx.strokeStyle = isActive ? "rgba(16,185,129,0.4)" : "rgba(30,41,59,0.5)";
      ctx.lineWidth = isActive ? 1 : 0.3;
      ctx.beginPath();
      ctx.moveTo(s.x / 900 * cw, s.y / 500 * ch);
      ctx.lineTo(t.x / 900 * cw, t.y / 500 * ch);
      ctx.stroke();
    }

    // Nodes
    for (const n of simNodes) {
      const x = n.x / 900 * cw, y = n.y / 500 * ch;
      const r = n.type === "file" ? 5 + Math.min(10, Math.log2(n.size / 50 + 1)) : 4;
      const isActive = selectedNode?.id === n.id;
      const isHovered = hoverRef.current === n.id;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive || isHovered ? "#10b981" : n.type === "file" ? "#1e293b" : "#0f172a";
      ctx.fill();
      ctx.strokeStyle = isActive ? "#34d399" : "#334155";
      ctx.lineWidth = isActive ? 1.5 : 0.5;
      ctx.stroke();

      // Label
      const label = n.label.length > 18 ? n.label.slice(-18) : n.label;
      ctx.fillStyle = isActive ? "#6ee7b7" : isHovered ? "#94a3b8" : "#475569";
      ctx.font = `${isActive ? "9" : "8"}px monospace`;
      ctx.fillText(label, x + r + 3, y + 3);
    }
  }, [simNodes, simEdges, selectedNode]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      // Gentle continued force
      for (let i = 0; i < 5; i++) {
        for (const n of simNodes) {
          n.vx *= 0.85; n.vy *= 0.85;
          n.x += n.vx; n.y += n.vy;
        }
      }
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [simNodes, draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    hoverRef.current = null;
    for (const n of simNodes) {
      const x = n.x / 900 * canvas.clientWidth, y = n.y / 500 * canvas.clientHeight;
      const r = 10;
      if (Math.hypot(mx - x, my - y) < r) { hoverRef.current = n.id; break; }
    }
  }, [simNodes]);

  if (loading) return <div className="flex items-center justify-center h-64 text-white/20 font-mono text-xs tracking-widest">TRAVERSING DEPENDENCIES...</div>;
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-2 text-red-400/60 font-mono text-xs"><span>{error}</span><button onClick={fetchGraph} className="text-white/40 hover:text-white/70 underline">RETRY</button></div>;

  return (
    <div className="space-y-4">
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

      <div className="flex gap-4">
        <div className="flex-1 rounded-lg border border-white/[0.06] bg-[#050508] overflow-hidden relative">
          <canvas
            ref={canvasRef}
            className="w-full h-[500px] cursor-crosshair"
            onMouseMove={handleMouseMove}
            onClick={(e) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const mx = e.clientX - rect.left, my = e.clientY - rect.top;
              for (const n of simNodes) {
                const x = n.x / 900 * canvas.clientWidth, y = n.y / 500 * canvas.clientHeight;
                if (Math.hypot(mx - x, my - y) < 12) {
                  setSelectedNode(data?.nodes.find(dn => dn.id === n.id) || null);
                  return;
                }
              }
              setSelectedNode(null);
            }}
          />
        </div>

        {selectedNode && (
          <div className="w-56 flex-shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.01] p-4 space-y-3 text-[11px]">
            <div>
              <div className="text-[9px] text-white/20 font-mono tracking-widest">{selectedNode.type?.toUpperCase()}</div>
              <div className="text-xs text-white/80 mt-0.5 font-medium break-all">{selectedNode.label}</div>
            </div>
            {selectedNode.path && (
              <div className="text-[10px] text-white/30 font-mono break-all border-t border-white/[0.04] pt-2">{selectedNode.path}</div>
            )}
            <div className="flex gap-3 pt-1">
              <div><div className="text-[9px] text-white/20 font-mono">COMPLEXITY</div><div className="text-xs text-white/60">{selectedNode.complexity || 0}</div></div>
              <div><div className="text-[9px] text-white/20 font-mono">CHURN</div><div className="text-xs text-white/60">{selectedNode.churn || 0}</div></div>
              <div><div className="text-[9px] text-white/20 font-mono">SIZE</div><div className="text-xs text-white/60">{selectedNode.size || 0}</div></div>
            </div>
            <div className="border-t border-white/[0.04] pt-2">
              <div className="text-[9px] text-white/20 font-mono tracking-widest mb-1">
                CONNECTIONS ({simEdges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length})
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {simEdges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).slice(0, 15).map((e, i) => {
                  const other = e.source === selectedNode.id ? e.target : e.source;
                  const name = simNodes.find(n => n.id === other)?.label || other;
                  return (
                    <div key={i} className="text-[10px] text-white/40 font-mono truncate flex items-center gap-1">
                      <span className="text-[8px] text-white/15">{e.type}</span>
                      {e.source === selectedNode.id ? "→" : "←"} {name.slice(0, 22)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
