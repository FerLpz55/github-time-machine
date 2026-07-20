"use client";

import { useState } from "react";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

interface RefactorPlanResponse { plan: string; }

export default function RefactorPlanner({ repoId }: { repoId: string }) {
  const [sinceDays, setSinceDays] = useState(30);
  const [result, setResult] = useState<RefactorPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPlanner = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://github-time-machine-production.up.railway.app";
      const res = await fetch(`${API_URL}/repositories/${repoId}/refactor_plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ since_days: sinceDays }),
      });
      if (!res.ok) throw new Error("Refactor plan failed");
      setResult(await res.json());
    } catch (e: any) { setError(e.message || "Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] text-white/30 font-mono tracking-widest">
        <WrenchScrewdriverIcon className="w-3.5 h-3.5 text-emerald-400/60" />
        REFACTOR PLANNER
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/20 font-mono tracking-wider">LAST</span>
        <input type="number" value={sinceDays} onChange={e => setSinceDays(Number(e.target.value) || 30)}
          min={1} max={365}
          className="w-16 bg-white/[0.02] border border-white/[0.06] rounded-md px-2 py-1.5 text-xs text-white/50 font-mono text-center focus:outline-none focus:border-emerald-400/30" />
        <span className="text-[10px] text-white/20 font-mono tracking-wider">DAYS</span>
        <button onClick={runPlanner} disabled={loading}
          className="ml-2 px-4 py-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] text-[10px] text-emerald-400/80 font-mono tracking-wider hover:bg-emerald-400/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          GENERATE PLAN
        </button>
      </div>

      {loading && <div className="text-center py-8 text-white/20 font-mono text-xs tracking-widest">GENERATING REFACTOR PLAN...</div>}
      {error && <div className="text-center text-[10px] text-red-400/60 font-mono">{error}</div>}

      {result && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] p-5">
          <div className="text-xs text-white/60 font-mono whitespace-pre-wrap leading-relaxed">
            {result.plan}
          </div>
        </div>
      )}
    </div>
  );
}
