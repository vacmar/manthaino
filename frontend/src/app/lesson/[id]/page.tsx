"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, PathNode } from "@/lib/api";
import { RichNotesEditor } from "@/components/RichNotesEditor";
import {
  ArrowLeft,
  Bot,
  CheckCircle,
  Lock,
  Send,
  User,
  Loader2,
  Save,
  NotebookPen,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
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

/** Never show raw JSON envelopes from the tutor model. */
function unwrapAssistantContent(raw: string): string {
  const text = (raw || "").trim();
  if (!(text.startsWith("{") && text.includes('"message"'))) return raw;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.message === "string") {
      return unwrapAssistantContent(parsed.message);
    }
  } catch {
    /* fall through */
  }
  const m =
    text.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"node_ready/) ||
    text.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"\s*}/);
  if (m?.[1]) {
    try {
      return JSON.parse(`"${m[1]}"`);
    } catch {
      return m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n");
    }
  }
  return raw;
}

function notesAreEmpty(html: string): boolean {
  const plain = html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return plain.length === 0;
}

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
  const [aiReady, setAiReady] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function persistMessages(next: ChatMsg[]) {
    const clean = next
      .map((m) =>
        m.role === "assistant"
          ? { ...m, content: unwrapAssistantContent(m.content) }
          : m
      )
      .filter((m) => m.content?.trim() && !PLACEHOLDER_MSGS.has(m.content.trim()));
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

  function scheduleNotesSave(html: string) {
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      void (async () => {
        try {
          await api.saveLessonNotes(nodeId, html);
          setNotesSavedAt(new Date().toLocaleTimeString());
        } catch (err) {
          console.error(err);
        }
      })();
    }, 900);
  }

  async function markAiReady(ready: boolean, reason?: string) {
    if (!ready) return;
    setAiReady(true);
    try {
      await api.saveLessonReady(nodeId, true, reason);
    } catch (err) {
      console.error(err);
    }
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
              content:
                m.role === "assistant"
                  ? unwrapAssistantContent(m.content)
                  : m.content,
            }))
            .filter((m) => m.content?.trim() && !PLACEHOLDER_MSGS.has(m.content.trim()));
          setMessages(restored);
          setPracticeNotes(session.practice_notes || "");
          setAiReady(Boolean(session.ai_ready) || found.status === "COMPLETED");
          if (restored.length > 0) setTutorBootstrapped(true);
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
      if (notesTimer.current) clearTimeout(notesTimer.current);
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
      `then ask if I understood or have any doubts. Do not teach upcoming topics. ` +
      `Keep node_ready_to_complete false on this first turn.`;

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
            .map((m) => ({
              role: m.role,
              content:
                m.role === "assistant"
                  ? unwrapAssistantContent(m.content)
                  : m.content,
            })),
          lesson_context: lessonContext,
        }),
      });
      if (!response.ok) throw new Error(`Tutor returned ${response.status}`);
      const data = await response.json();
      const content = unwrapAssistantContent(
        (typeof data.message === "string" && data.message) ||
          data.structured?.content ||
          "What would you like to go over in this lesson?"
      );
      const ready = Boolean(data.structured?.node_ready_to_complete);
      const reason = data.structured?.ready_reason as string | undefined;
      if (ready) void markAiReady(true, reason);

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

  const handleConfirmComplete = async () => {
    if (!node || node.status === "LOCKED" || node.status === "COMPLETED") return;
    if (!aiReady) {
      setError("Keep learning with the AI until it marks this node ready.");
      return;
    }
    setCompleting(true);
    setError("");
    try {
      if (!notesAreEmpty(practiceNotes)) {
        await api.saveLessonNotes(nodeId, practiceNotes);
      }
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-zinc-500">
        Loading lesson...
      </div>
    );
  }

  if (pathMissing || !node) {
    return (
      <div className="h-screen p-8 max-w-xl mx-auto space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="bg-card/40 border border-border/50 rounded-2xl p-8 space-y-4">
          <h1 className="text-2xl font-bold text-white">Lesson unavailable</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Your path was cleared after a backend restart. Restore it — no new account needed.
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
  const completed = node.status === "COMPLETED";

  return (
    <div className="h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/40 via-background to-background">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border/40 bg-black/20 backdrop-blur-md">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Pathway
        </Link>
        <div className="text-center min-w-0 flex-1 px-2">
          <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">
            {completed ? "Completed node" : "Focus lesson"}
          </p>
          <h1 className="text-base md:text-lg font-bold text-white leading-tight truncate">
            {title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5"
          title={notesOpen ? "Hide notes" : "Show notes"}
        >
          {notesOpen ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Notes</span>
        </button>
      </header>

      {error && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Chat — primary column */}
        <section className="flex-1 min-w-0 min-h-0 flex flex-col border-r border-border/30">
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-primary font-bold tracking-widest uppercase">
                AI Lesson
              </p>
              <p className="text-xs text-zinc-500 truncate">
                Chat + notes saved to the database · sidebar hidden for focus
              </p>
            </div>
          </div>

          {locked ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 p-8">
              <Lock className="w-4 h-4" /> Unlock this node to start the AI lesson.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 p-4 md:p-5">
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
                  <div className="flex gap-3 items-center text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Thinking…
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {aiReady && !completed && (
                <div className="mx-4 mb-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex items-start gap-2 text-sm text-zinc-200">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>
                      The AI thinks you’ve covered this node. Confirm to unlock the next
                      step and update Progress.
                    </span>
                  </div>
                  <button
                    onClick={handleConfirmComplete}
                    disabled={completing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 shrink-0"
                  >
                    {completing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Confirm mastery
                  </button>
                </div>
              )}

              {!aiReady && !completed && (
                <p className="px-4 pb-1 text-[11px] text-zinc-500">
                  Keep chatting until the tutor marks this node ready — there’s no free
                  Complete button.
                </p>
              )}

              {completed && (
                <p className="px-4 pb-2 text-xs text-emerald-400/90 inline-flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Node completed — you can still
                  review the chat.
                </p>
              )}

              <form
                onSubmit={handleChatSubmit}
                className="p-3 md:p-4 border-t border-border/50 relative shrink-0"
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
                  className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 p-2.5 bg-primary hover:bg-primary/90 text-white rounded-full disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </section>

        {/* Notes — right panel */}
        {notesOpen && (
          <aside className="w-full md:w-[380px] lg:w-[420px] shrink-0 min-h-[40vh] md:min-h-0 flex flex-col border-t md:border-t-0 border-border/40 bg-card/20">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between gap-2 shrink-0">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <NotebookPen className="w-4 h-4 text-primary" />
                Lesson notes
              </span>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes || locked}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs text-white hover:bg-muted/40 disabled:opacity-50"
              >
                {savingNotes ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
            <div className="flex-1 min-h-0 p-3 flex flex-col gap-2">
              <RichNotesEditor
                value={practiceNotes}
                disabled={locked}
                placeholder="Title, bullets, tables — notes auto-save to the DB…"
                onChange={(html) => {
                  setPracticeNotes(html);
                  setNotesSavedAt(null);
                  if (!locked) scheduleNotesSave(html);
                }}
              />
              <p className="text-[11px] text-zinc-500 px-1">
                {notesSavedAt
                  ? `Saved to database at ${notesSavedAt}`
                  : "Formatting: title, bold, italic, lists, tables · stored in Exasol/Redis"}
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
