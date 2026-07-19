"use client";

import { useEffect, useState, useMemo } from "react";
import { ChartBarIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface TimelineEvent {
  id: string; sha: string; message: string; author: string;
  timestamp: string; files_changed: number; additions: number; deletions: number;
  is_significant: boolean; event_type: string; tags: string[];
}
interface TimelineResponse { repo_id: string; events: TimelineEvent[]; total_events: number; }

export default function TimelinePanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignificantOnly, setShowSignificantOnly] = useState(false);

  const fetchTimeline = async () => {
    try {
      setLoading(true); setError(null);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_URL}/repositories/${repoId}/timeline?limit=100`);
      if (!res.ok) throw new Error("Failed to load timeline");
      const json = await res.json();
      if (json && Array.isArray(json.events)) {
        json.events = json.events.map((e: any, i: number) => ({
          id: e.id || e.sha || String(i),
          sha: e.sha || "", message: e.message || "", author: e.author || "Unknown",
          timestamp: e.timestamp || e.date || new Date().toISOString(),
          files_changed: e.files_changed || 0, additions: e.additions || 0, deletions: e.deletions || 0,
          is_significant: e.is_fix || e.is_merge || false, event_type: e.is_fix ? "fix" : e.is_merge ? "merge" : "commit",
          tags: e.is_fix ? ["fix"] : e.is_merge ? ["merge"] : [],
        }));
        setData(json);
      }
    } catch { setError("Timeline endpoint unavailable"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTimeline(); }, [repoId]);

  const filtered = useMemo(() => {
    if (!data?.events) return [];
    return showSignificantOnly ? data.events.filter(e => e.is_significant) : data.events;
  }, [data, showSignificantOnly]);

  if (loading) return <div className="flex items-center justify-center h-64 text-white/20 font-mono text-xs tracking-widest">LOADING TIMELINE...</div>;
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-2 text-red-400/60 font-mono text-xs"><span>{error}</span><button onClick={fetchTimeline} className="text-white/40 hover:text-white/70 underline">RETRY</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-white/30 font-mono tracking-widest">
          <ChartBarIcon className="w-3.5 h-3.5 text-emerald-400/60" />
          {filtered.length} EVENT{filtered.length !== 1 ? "S" : ""}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[10px] text-white/30 font-mono tracking-wider cursor-pointer">
            <input type="checkbox" checked={showSignificantOnly} onChange={e => setShowSignificantOnly(e.target.checked)}
              className="w-3 h-3 rounded border-white/20 bg-transparent accent-emerald-400" />
            SIGNIFICANT ONLY
          </label>
          <button onClick={fetchTimeline} className="p-1.5 rounded border border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/20 transition-all">
            <ArrowPathIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-px">
        {filtered.slice(0, 50).map((event, i) => {
          const date = event.timestamp ? new Date(event.timestamp) : new Date();
          const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const isFix = event.event_type === "fix";
          const isMerge = event.event_type === "merge";
          const tagColor = isFix ? "text-amber-400/70 border-amber-400/20" : isMerge ? "text-purple-400/70 border-purple-400/20" : "text-white/20 border-white/[0.05]";
          return (
            <div key={event.id || i} className="flex items-start gap-4 px-3 py-2 rounded hover:bg-white/[0.02] transition-colors group border border-transparent hover:border-white/[0.04]">
              <div className="flex-shrink-0 w-28 pt-0.5">
                <div className="text-[10px] text-white/30 font-mono">{dateStr}</div>
                <div className={`text-[9px] font-mono mt-0.5 px-1.5 py-px rounded border inline-block ${tagColor}`}>
                  {event.event_type?.toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/70 font-mono group-hover:text-white/90 transition-colors line-clamp-2">
                  {event.message}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-white/20 font-mono">
                  <span>{event.author}</span>
                  <span className="text-white/[0.08]">·</span>
                  <span>{event.sha?.slice(0, 7)}</span>
                  {event.files_changed > 0 && <><span className="text-white/[0.08]">·</span><span>{event.files_changed} files</span></>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-8 text-white/20 font-mono text-xs tracking-widest">NO EVENTS FOUND</div>
      )}
    </div>
  );
}
