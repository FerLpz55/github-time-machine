"use client";

import { useEffect, useState, useRef } from "react";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

interface Message { role: "user" | "assistant"; content: string; }

export default function ChatPanel({ repoId }: { repoId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://github-time-machine-production.up.railway.app";

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    setError(null);
    setMessages(prev => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${API_URL}/repositories/${repoId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository_id: repoId, question: text }),
      });
      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: data.answer || "No response." };
        return updated;
      });
    } catch (e: any) {
      setError(e.message || "Failed to connect");
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Error: AI service unavailable." };
        return updated;
      });
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-140px)]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-xs font-mono ${
              msg.role === "user"
                ? "bg-emerald-400/[0.08] border border-emerald-400/20 text-emerald-300/80"
                : "bg-white/[0.02] border border-white/[0.04] text-white/60"
            }`}>
              {msg.content || (loading && i === messages.length - 1 ? (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" style={{ animationDelay: "300ms" }} />
                </span>
              ) : msg.content)}
            </div>
          </div>
        ))}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-white/10 gap-2">
            <ChatBubbleLeftRightIcon className="w-12 h-12" />
            <span className="text-[10px] font-mono tracking-widest">ASK ABOUT THE CODEBASE</span>
          </div>
        )}
        {error && <div className="text-center text-[10px] text-red-400/60 font-mono">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask about this repository..."
          className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-md px-4 py-2 text-xs text-white/70 font-mono placeholder-white/15 focus:outline-none focus:border-emerald-400/30 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] text-[10px] text-emerald-400/80 font-mono tracking-wider hover:bg-emerald-400/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
