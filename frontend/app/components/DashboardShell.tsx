"use client";

import React from "react";
import Link from "next/link";
import {
  CubeTransparentIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CommandLineIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  CloudIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

interface Repository {
  id: string;
  name: string;
  full_name: string;
  description: string;
  default_branch: string;
  language: string;
  total_commits: number;
  total_files: number;
}

interface DashboardShellProps {
  repo: Repository | null;
  activeTab: "graph" | "timeline" | "heatmap" | "impact" | "chat" | "refactor";
  setActiveTab: (tab: "graph" | "timeline" | "heatmap" | "impact" | "chat" | "refactor") => void;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}

export default function DashboardShell({
  repo,
  activeTab,
  setActiveTab,
  loading,
  error,
  children,
}: DashboardShellProps) {
  const tabs = [
    { id: "chat", name: "Architect's Memory", icon: ChatBubbleLeftRightIcon, desc: "AI architectural assistant" },
    { id: "graph", name: "Software DNA", icon: CubeTransparentIcon, desc: "Visual dependency graph" },
    { id: "timeline", name: "Architecture Timeline", icon: ChartBarIcon, desc: "Commit evolution scrub" },
    { id: "heatmap", name: "Technical Debt", icon: CommandLineIcon, desc: "Complexity hotspot maps" },
    { id: "impact", name: "Change Intelligence", icon: ShieldCheckIcon, desc: "Blast radius simulator" },
    { id: "refactor", name: "Refactor Planner", icon: WrenchScrewdriverIcon, desc: "Actionable refactoring steps" },
  ] as const;

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-white/90 font-sans antialiased selection:bg-white selection:text-black">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0A0A0B]/80 backdrop-blur-sm">
        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex items-center justify-center w-7 h-7 border border-white/10 rounded text-base text-white/80 group-hover:border-white/30 transition-colors">
              ⌁
            </span>
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-white/70">
              GITHUB <span className="text-white/30 font-light">TIME MACHINE</span>
            </span>
          </Link>

          {/* Repo card */}
          <div className="mt-5 p-3 rounded-lg border border-white/[0.04] bg-white/[0.02]">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400/60 animate-pulse" />
                Scanning repository...
              </div>
            ) : repo ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-white/80 truncate">
                    {repo.full_name || repo.name}
                  </span>
                </div>
                <div className="flex gap-3 text-[10px] font-mono text-white/40">
                  <span>{repo.default_branch}</span>
                  <span>{repo.total_commits || 0} commits</span>
                  <span>{repo.total_files || 0} files</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-red-400/60">No repository loaded</div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-150 group ${
                  active
                    ? "bg-white/[0.06] text-white border border-white/[0.08]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.02] border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-emerald-400" : "text-white/20 group-hover:text-white/40"}`} />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{tab.name}</div>
                  <div className="text-[10px] text-white/20 mt-0.5 font-mono tracking-wider truncate">
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] space-y-2">
          <Link
            href="/login"
            className="flex items-center gap-2 text-[11px] text-white/40 hover:text-white/70 transition-colors font-mono tracking-wider"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            CONNECT NEW REPO
          </Link>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400/60 font-mono">
            <CloudIcon className="w-3 h-3" />
            AI BACKEND: ACTIVE
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-white/[0.06] bg-[#0A0A0B]/60 backdrop-blur-sm">
          <div>
            <h1 className="text-sm font-medium text-white/80 font-mono tracking-wider">
              {tabs.find((t) => t.id === activeTab)?.name}
            </h1>
            <p className="text-[10px] text-white/30 mt-0.5 font-mono tracking-widest">
              {tabs.find((t) => t.id === activeTab)?.desc}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/30 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
            live · {repo?.language || "—"}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <span className="text-2xl">⌁</span>
              <p className="text-sm text-red-400/60 font-mono">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-[11px] text-white/40 hover:text-white/70 font-mono tracking-wider underline underline-offset-4"
              >
                RELOAD
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
