"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, PathNode } from "@/lib/api";
import {
  ArrowLeft,
  Bot,
  CheckCircle,
  Lock,
  Send,
  User,
  Loader2,
  Save,
} from "lucide-react";
import Link from "next/link";

type LessonNode = PathNode & { course_title?: string };

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
};

const AI_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8001";

const PLACEHOLDER_MSGS = new Set([
  "Starting your AI lesson…",
  "Preparing your AI lesson…",
]);

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [pathMissing, setPathMissing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [node, setNode] = useState<LessonNode | null>(null);
  const [pathNodes, setPathNodes] = useState<LessonNode[]>([]);
  const [goal, setGoal] = useState("Personalized Pathway");
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [practiceNotes, setPracticeNotes] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [tutorBootstrapped, setTutorBootstrapped] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function persistMessages(next: ChatMsg[]) {
    const clean = next.filter(
      (m) => m.content?.trim() && !PLACEHOLDER_MSGS.has(m.content.trim())
    );
    if (clean.length === 0) return;
    try {
      await api.saveLessonMessages(nodeId, clean, true);
    } catch (err) {
      console.error("Failed to persist lesson chat", err);
    }
  }

  function schedulePersist(next: ChatMsg[]) {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void persistMessages(next);
    }, 300);
  }

  async function loadPath(preferEnsure = false) {
    setLoading(true);
    setError("");
    setSessionReady(false);
    setTutorBootstrapped(false);
    try {
      const me = await api.getMe();
      setLearnerId(me.learner_id);
      const path = preferEnsure
        ? await api.ensureActivePath()
        : await api.getActivePath().catch(async () => api.ensureActivePath());
      setGoal(path.goal || "Personalized Pathway");
      const nodes = (path.nodes || []) as LessonNode[];
      setPathNodes(nodes);
      const found = nodes.find((n) => n.node_id === nodeId);
      if (found) {
        setNode(found);
        setPathMissing(false);
        try {
          const session = await api.getLessonSession(nodeId);
          const restored = (session.messages || [])
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
            .filter((m) => m.content?.trim() && !PLACEHOLDER_MSGS.has(m.content.trim()));
          setMessages(restored);
          setPracticeNotes(session.practice_notes || "");
          if (restored.length > 0) {
            setTutorBootstrapped(true);
          }
        } catch (err) {
          console.error(err);
          setMessages([]);
        }
        setSessionReady(true);
      } else if (nodes.length > 0) {
        const next =
          nodes.find((n) => n.status === "UNLOCKED" || n.status === "IN_PROGRESS") ||
          nodes[0];
        router.replace(`/lesson/${next.node_id}`);
        return;
      } else {
        setNode(null);
        setPathMissing(true);
      }
    } catch (err) {
      console.error(err);
      setPathMissing(true);
      setNode(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPath(false);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const title = node?.course_title || node?.course_id || "Lesson";

  const lessonContext = useMemo(() => {
    const ordered = [...pathNodes].sort(
      (a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)
    );
    const idx = ordered.findIndex((n) => n.node_id === nodeId);
    const current = idx >= 0 ? ordered[idx] : null;
    return {
      goal,
      current_node_title: current?.course_title || title,
      upcoming_nodes: ordered
        .slice(idx + 1)
        .map((n) => n.course_title || n.course_id)
        .filter(Boolean),
      completed_nodes: ordered
        .filter((n) => n.status === "COMPLETED")
        .map((n) => n.course_title || n.course_id),
    };
  }, [pathNodes, nodeId, title, goal]);

  useEffect(() => {
    if (!sessionReady || !node || !learnerId || tutorBootstrapped) return;
    if (node.status === "LOCKED") return;
    if (messages.length > 0) {
      setTutorBootstrapped(true);
      return;
    }

    const opener =
      `Start the interactive lesson for “${lessonContext.current_node_title}”. ` +
      `Give a short friendly opener (3–5 sentences) covering one core idea only, ` +
      `then ask if I understood or have any doubts. Do not teach upcoming topics.`;

    setTutorBootstrapped(true);
    setMessages([{ role: "assistant", content: "Starting your AI lesson…" }]);
    void sendLessonChat(opener, [], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, node, learnerId, tutorBootstrapped, lessonContext.current_node_title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  async function sendLessonChat(
    userMessage: string,
    history: ChatMsg[],
    replaceLastAssistant = false
  ) {
    if (!learnerId) return;
    setChatLoading(true);
    try {
      const response = await fetch(`${AI_URL}/chat/lesson`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          learner_id: learnerId,
          node_id: nodeId,
          history: history
            .filter((m) => !PLACEHOLDER_MSGS.has(m.content))
            .map((m) => ({ role: m.role, content: m.content })),
          lesson_context: lessonContext,
        }),
      });
      if (!response.ok) throw new Error(`Tutor returned ${response.status}`);
      const data = await response.json();
      const content =
        (typeof data.message === "string" && data.message) ||
        data.structured?.content ||
        "What would you like to go over in this lesson?";

      setMessages((prev) => {
        let next: ChatMsg[];
        if (
          replaceLastAssistant &&
          prev.length > 0 &&
          prev[prev.length - 1].role === "assistant"
        ) {
          next = [...prev.slice(0, -1), { role: "assistant", content }];
        } else {
          next = [...prev, { role: "assistant", content }];
        }
        schedulePersist(next);
        return next;
      });
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const next = [
          ...prev.filter((m) => !PLACEHOLDER_MSGS.has(m.content)),
          {
            role: "assistant" as const,
            content:
              "I couldn't reach the AI tutor just now. Try again in a moment — or type your question once more.",
          },
        ];
        schedulePersist(next);
        return next;
      });
    } finally {
      setChatLoading(false);
    }
  }

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading || !learnerId || node?.status === "LOCKED") return;
    const userMessage = input.trim();
    setInput("");
    const nextHistory = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(nextHistory);
    schedulePersist(nextHistory);
    await sendLessonChat(userMessage, nextHistory);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setError("");
    try {
      await api.saveLessonNotes(nodeId, practiceNotes);
      setNotesSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      setError("Could not save notes. Try again.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRestorePath = async () => {
    setRestoring(true);
    setTutorBootstrapped(false);
    setMessages([]);
    await loadPath(true);
    setRestoring(false);
  };

  const handleComplete = async () => {
    if (!node || node.status === "LOCKED" || node.status === "COMPLETED") return;
    if (practiceNotes.trim().length < 8) {
      setError("Add a short practice note before completing this node.");
      return;
    }
    setCompleting(true);
    setError("");
    try {
      await api.saveLessonNotes(nodeId, practiceNotes);
      await persistMessages(messages);
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

  if (pathMissing || !node) {
    return (
      <div className="p-8 max-w-xl mx-auto space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="bg-card/40 border border-border/50 rounded-2xl p-8 space-y-4">
          <h1 className="text-2xl font-bold text-white">Lesson unavailable</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Your learning path was cleared when the backend restarted. You do not need a new
            account — restore the path and reopen the node.
          </p>
          <button
            onClick={handleRestorePath}
            disabled={restoring}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white disabled:opacity-50"
          >
            {restoring ? "Restoring with AI…" : "Restore my path"}
          </button>
        </div>
      </div>
    );
  }

  const locked = node.status === "LOCKED";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-6">
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl flex flex-col min-h-[70vh]">
          <div className="p-5 border-b border-border/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-primary text-xs font-bold tracking-widest uppercase">
                AI Lesson Chat
              </span>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              <p className="text-xs text-zinc-500">
                Chat is saved for this node — leave and come back anytime.
              </p>
            </div>
          </div>

          {locked ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 p-8">
              <Lock className="w-4 h-4" /> Unlock this node to start the AI lesson.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 p-5">
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
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                    <div className="text-sm text-zinc-500 self-center">Thinking…</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleChatSubmit}
                className="p-4 border-t border-border/50 relative"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a doubt, say you understood, or request an example…"
                  disabled={chatLoading}
                  className="w-full bg-black/40 border border-white/10 rounded-full pl-5 pr-14 py-3.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chatLoading}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-2.5 bg-primary hover:bg-primary/90 text-white rounded-full disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>

        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6 space-y-5 h-fit">
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Practice notes</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Capture what you learned. Use <strong className="text-zinc-200">Save</strong> so
              notes survive when you leave this page.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
          )}

          <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-3">
            <textarea
              className="w-full min-h-[160px] text-sm leading-relaxed bg-black/50 p-3 rounded-lg text-zinc-200 border border-white/10 whitespace-pre-wrap"
              placeholder={"What did you learn?\n\n• Key idea\n• Example you tried\n• Still unclear…"}
              value={practiceNotes}
              disabled={locked}
              onChange={(e) => {
                setPracticeNotes(e.target.value);
                setNotesSavedAt(null);
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                {notesSavedAt ? `Saved at ${notesSavedAt}` : "Unsaved changes stay local until Save"}
              </p>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes || locked}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/40 text-sm text-white hover:bg-muted disabled:opacity-50"
              >
                {savingNotes ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save notes
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center gap-3">
            <p className="text-xs text-zinc-500">Status: {node.status}</p>
            <button
              onClick={handleComplete}
              disabled={completing || locked || node.status === "COMPLETED"}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium disabled:opacity-50"
            >
              {completing ? (
                "Completing..."
              ) : node.status === "COMPLETED" ? (
                "Already Completed"
              ) : locked ? (
                <>
                  <Lock className="w-4 h-4" /> Locked
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Complete node
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
