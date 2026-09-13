"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, PathNode } from "@/lib/api";
import { ArrowLeft, Bot, CheckCircle, Lock, Send, User, Loader2 } from "lucide-react";
import Link from "next/link";

type LessonNode = PathNode & { course_title?: string };

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
};

const AI_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8001";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [node, setNode] = useState<LessonNode | null>(null);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [practiceNotes, setPracticeNotes] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [tutorBootstrapped, setTutorBootstrapped] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadNode() {
      try {
        const [path, me] = await Promise.all([api.getActivePath(), api.getMe()]);
        setLearnerId(me.learner_id);
        const found = path.nodes.find((n) => n.node_id === nodeId) as LessonNode | undefined;
        if (found) setNode(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadNode();
  }, [nodeId]);

  const title = node?.course_title || node?.course_id || "Lesson";

  // Kick off AI tutor for this node once unlocked
  useEffect(() => {
    if (!node || !learnerId || tutorBootstrapped) return;
    if (node.status === "LOCKED") return;

    const intro =
      `You are teaching the path node “${title}”. ` +
      `Give a short lesson opener (3–6 sentences): what to learn, why it matters for the learner's goal, ` +
      `and one concrete practice prompt. End with a check question.`;

    setTutorBootstrapped(true);
    setMessages([{ role: "assistant", content: "Preparing your AI lesson…" }]);
    void streamTutor(intro, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, learnerId, title, tutorBootstrapped]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  async function streamTutor(userMessage: string, replaceLastAssistant = false) {
    if (!learnerId) return;
    setChatLoading(true);
    try {
      const response = await fetch(`${AI_URL}/chat/tutor`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          learner_id: learnerId,
          node_id: nodeId,
        }),
      });
      if (!response.ok) throw new Error(`Tutor returned ${response.status}`);
      const data = await response.json();
      const content =
        (typeof data.message === "string" && data.message) ||
        data.structured?.content ||
        "Let's continue with this lesson.";

      setMessages((prev) => {
        if (replaceLastAssistant && prev.length > 0 && prev[prev.length - 1].role === "assistant") {
          return [...prev.slice(0, -1), { role: "assistant", content }];
        }
        return [...prev, { role: "assistant", content }];
      });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev.filter((m) => m.content !== "Preparing your AI lesson…"),
        {
          role: "assistant",
          content:
            "I couldn't reach the AI tutor just now. Try again in a moment, or jot practice notes below.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading || !learnerId || node?.status === "LOCKED") return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    await streamTutor(userMessage);
  };

  const handleComplete = async () => {
    if (!node || node.status === "LOCKED" || node.status === "COMPLETED") return;
    if (practiceNotes.trim().length < 8) {
      setError("Add a short practice note or solution sketch before completing this node.");
      return;
    }
    setCompleting(true);
    setError("");
    try {
      const me = await api.getMe();
      await api.completeLesson(me.learner_id, nodeId);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Could not complete lesson. Try again.");
      setCompleting(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading lesson...</div>;
  if (!node) return <div className="p-8 text-red-400">Lesson not found.</div>;

  const locked = node.status === "LOCKED";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-8 flex flex-col min-h-[640px]">
          <div className="mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-primary text-xs font-bold tracking-widest uppercase">
                Learn with AI
              </span>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
            </div>
          </div>

          {locked ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
              <Lock className="w-4 h-4" /> Unlock this node to start the AI lesson.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
                {messages.map((msg, idx) => (
                  <div
                    key={`${msg.role}-${idx}`}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                        msg.role === "user" ? "bg-primary" : "bg-primary/20"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-black/30 border border-white/10 text-zinc-300 rounded-tl-none"
                      }`}
                    >
                      {msg.content ||
                        (chatLoading && idx === messages.length - 1 ? (
                          <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                        ) : (
                          ""
                        ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask about ${title}…`}
                  disabled={chatLoading}
                  className="w-full bg-black/40 border border-white/10 rounded-full pl-5 pr-14 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chatLoading}
                  className="absolute right-1.5 top-1.5 p-2 bg-primary hover:bg-primary/90 text-white rounded-full disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>

        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Practice & complete</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Use the AI tutor to learn, then capture what you practiced. Completing this node
              unlocks the next step on your path.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
          )}

          <div className="bg-black/30 rounded-xl p-5 border border-white/5">
            <h3 className="text-white font-medium mb-2">Practice notes</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Sketch an approach, paste a snippet, or write what you learned (min 8 characters).
            </p>
            <textarea
              className="w-full min-h-[160px] font-mono text-sm bg-black/50 p-4 rounded-lg text-zinc-300 border border-white/10"
              placeholder="// Write your solution notes here..."
              value={practiceNotes}
              disabled={locked || node.status === "COMPLETED"}
              onChange={(e) => setPracticeNotes(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-border/50 flex justify-between items-center gap-4">
            <p className="text-sm text-zinc-500">Status: {node.status}</p>
            <button
              onClick={handleComplete}
              disabled={completing || locked || node.status === "COMPLETED"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completing ? (
                "Completing..."
              ) : node.status === "COMPLETED" ? (
                "Already Completed"
              ) : locked ? (
                <>
                  <Lock className="w-5 h-5" /> Locked
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" /> Complete node
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
