"use client";

import { useState } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

interface AffectedFile { path: string; relationship: string; risk_level: string; reason: string; }
interface ImpactResult { target: string; change_type: string; risk_score: number; affected_files: AffectedFile[]; suggested_tests: string[]; }

export default function ImpactPanel({ repoId }: { repoId: string }) {
  const [target, setTarget] = useState("");
  const [changeType, setChangeType] = useState("modify");
  const [result, setResult] = useState<ImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runImpact = async () => {
    if (!target.trim() || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_URL}/repositories/${repoId}/impact`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), change_type: changeType }),
      });
      if (!res.ok) throw new Error("Impact analysis failed");
      setResult(await res.json());
    } catch (e: any) { setError(e.message || "Error"); }
    finally { setLoading(false); }
  };

  const riskColor = (result?.risk_score || 0) > 0.66 ? "text-red-400" : (result?.risk_score || 0) > 0.33 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] text-white/30 font-mono tracking-widest">
        <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400/60" />
        CHANGE IMPACT SIMULATOR
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input type="text" value={target} onChange={e => setTarget(e.target.value)}
          onKeyDown={e => e.key === "Enter" && runImpact()}
          placeholder="File path (e.g. src/auth.py)..."
          className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-md px-4 py-2 text-xs text-white/70 font-mono placeholder-white/15 focus:outline-none focus:border-emerald-400/30 transition-colors"
        />
        <select value={changeType} onChange={e => setChangeType(e.target.value)}
          className="bg-white/[0.02] border border-white/[0.06] rounded-md px-3 py-2 text-xs text-white/50 font-mono focus:outline-none focus:border-emerald-400/30">
          <option value="modify">MODIFY</option>
          <option value="remove">REMOVE</option>
          <option value="refactor">REFACTOR</option>
        </select>
        <button onClick={runImpact} disabled={loading || !target.trim()}
          className="px-4 py-2 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] text-[10px] text-emerald-400/80 font-mono tracking-wider hover:bg-emerald-400/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          ANALYZE
        </button>
      </div>

      {loading && <div className="text-center py-8 text-white/20 font-mono text-xs tracking-widest">SIMULATING IMPACT...</div>}
      {error && <div className="text-center text-[10px] text-red-400/60 font-mono">{error}</div>}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-lg border border-white/[0.06] bg-white/[0.01]">
            <div className={`text-2xl font-mono font-bold ${riskColor}`}>{(result.risk_score * 100).toFixed(0)}%</div>
            <div>
              <div className="text-xs text-white/70 font-mono">{result.target}</div>
              <div className="text-[10px] text-white/30 font-mono tracking-wider">{result.change_type.toUpperCase()} · RISK SCORE</div>
            </div>
          </div>

          {result.affected_files.length > 0 && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] p-4">
              <div className="text-[10px] text-white/20 font-mono tracking-widest mb-3">AFFECTED FILES</div>
              <div className="space-y-1.5">
                {result.affected_files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-white/50 truncate">{f.path}</span>
                    <span className={`ml-2 flex-shrink-0 ${f.risk_level === "high" ? "text-red-400/70" : f.risk_level === "medium" ? "text-amber-400/50" : "text-emerald-400/40"}`}>
                      {f.risk_level.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.suggested_tests.length > 0 && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] p-4">
              <div className="text-[10px] text-white/20 font-mono tracking-widest mb-3">SUGGESTED TESTS</div>
              {result.suggested_tests.map((t, i) => (
                <div key={i} className="text-[10px] text-white/40 font-mono mb-1">· {t}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
