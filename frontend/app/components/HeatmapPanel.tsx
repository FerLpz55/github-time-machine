"use client";

import { useEffect, useState } from "react";
import { CommandLineIcon } from "@heroicons/react/24/outline";

interface DebtScore { path: string; language: string; churn: number; complexity: number; age_days: number; line_count: number; debt_score: number; risk_level: string; }
interface HeatmapResponse { repo_id: string; scores: DebtScore[]; average_debt: number; hotspot_count: number; }

export default function HeatmapPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"debt_score" | "path" | "churn">("debt_score");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${API_URL}/repositories/${repoId}/heatmap`);
        if (!res.ok) throw new Error("Failed to load heatmap");
        setData(await res.json());
      } catch { setError("Heatmap endpoint unavailable"); }
      finally { setLoading(false); }
    })();
  }, [repoId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-white/20 font-mono text-xs tracking-widest">ANALYZING DEBT...</div>;
  if (error) return <div className="flex items-center justify-center h-64 text-red-400/60 font-mono text-xs">{error}</div>;

  const scores = data?.scores || [];
  const sorted = [...scores].sort((a, b) => {
    if (sortKey === "debt_score") return b.debt_score - a.debt_score;
    if (sortKey === "churn") return b.churn - a.churn;
    return a.path.localeCompare(b.path);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-white/30 font-mono tracking-widest">
          <CommandLineIcon className="w-3.5 h-3.5 text-emerald-400/60" />
          AVG DEBT: {(data?.average_debt || 0).toFixed(2)} · HOTSPOTS: {data?.hotspot_count || 0}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/20 font-mono tracking-widest">SORT</span>
          {([["debt_score", "DEBT"], ["churn", "CHURN"], ["path", "PATH"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setSortKey(k)}
              className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-all ${
                sortKey === k ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/[0.04]" : "border-white/[0.06] text-white/30 hover:border-white/20"
              }`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="space-y-px max-h-[60vh] overflow-y-auto">
        {sorted.slice(0, 100).map((s, i) => {
          const barWidth = Math.max(2, s.debt_score * 100);
          const color = s.risk_level === "high" ? "bg-red-400/40" : s.risk_level === "medium" ? "bg-amber-400/30" : "bg-emerald-400/20";
          return (
            <div key={s.path || i} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/[0.02] transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-white/50 font-mono truncate group-hover:text-white/70 transition-colors">
                  {s.path}
                </div>
              </div>
              <div className="flex-shrink-0 w-24 h-2 rounded-full bg-white/[0.03] overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${barWidth}%` }} />
              </div>
              <div className="flex-shrink-0 w-10 text-right text-[10px] text-white/30 font-mono">
                {(s.debt_score * 100).toFixed(0)}%
              </div>
              <div className="flex-shrink-0 w-16 text-right text-[9px] font-mono">
                <span className={s.risk_level === "high" ? "text-red-400/70" : s.risk_level === "medium" ? "text-amber-400/50" : "text-emerald-400/40"}>
                  {s.risk_level.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {sorted.length === 0 && (
        <div className="text-center py-8 text-white/20 font-mono text-xs tracking-widest">NO FILES ANALYZED</div>
      )}
    </div>
  );
}
