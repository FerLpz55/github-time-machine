"use client";

import { useEffect, useState } from "react";

interface FileHealthScore {
  file_path: string;
  complexity_score: number;
  churn_score: number;
  debt_score: number;
  health_status: string;
}

export default function FileHealthBadge({ repoId, path, showLabel }: { repoId: string; path: string; showLabel?: boolean }) {
  const [score, setScore] = useState<FileHealthScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) return;
    (async () => {
      setLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${API_URL}/repositories/${repoId}/file_health?path=${encodeURIComponent(path)}`);
        if (res.ok) setScore(await res.json());
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [repoId, path]);

  if (loading) return <span className="text-[9px] text-white/10 font-mono">···</span>;
  if (!score) return null;

  const color = score.health_status === "poor" ? "text-red-400/60" : score.health_status === "moderate" ? "text-amber-400/50" : "text-emerald-400/50";
  const bg = score.health_status === "poor" ? "bg-red-400/10 border-red-400/20" : score.health_status === "moderate" ? "bg-amber-400/10 border-amber-400/20" : "bg-emerald-400/10 border-emerald-400/20";

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono ${bg} ${color}`}>
      {showLabel && <span>HEALTH</span>}
      <span>{score.health_status.toUpperCase()}</span>
      {showLabel && <span>{(score.debt_score * 100).toFixed(0)}%</span>}
    </span>
  );
}
