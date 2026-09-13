"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TerminalSquare,
  BookOpen,
  CheckCircle2,
  Circle,
  Loader2,
  RotateCcw,
  Lock,
  Play,
} from "lucide-react";
import { api, type LearningPath, type PathNode } from "@/lib/api";

type CheckId = "nonempty" | "structure" | "effort";

type SelfCheck = {
  id: CheckId;
  label: string;
  pass: boolean;
};

function storageKey(nodeId: string) {
  return `manthaino:workspace:draft:${nodeId}`;
}

function starterFor(title: string): string {
  const safe = title.replace(/[^\w\s-]/g, "").trim() || "practice";
  return `# Practice: ${safe}
# Click Run to execute this file on the backend (Python, 4s timeout).

def main():
    print("Hello from manthaino workspace")
    print("Edit this draft, then Run again to see stdout.")


if __name__ == "__main__":
    main()
`;
}

function runSelfChecks(code: string, starter: string): SelfCheck[] {
  const trimmed = code.trim();
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const hasDef =
    /\bdef\s+\w+\s*\(/.test(code) ||
    /\bfunction\s+\w+\s*\(/.test(code) ||
    /\bclass\s+\w+/.test(code) ||
    /\bfn\s+\w+/.test(code);
  // Any rewrite counts — shorter drafts are fine (old check required longer than starter)
  const changedFromStarter = norm(trimmed) !== norm(starter);

  return [
    {
      id: "nonempty",
      label: "Draft differs from the default starter template",
      pass: changedFromStarter,
    },
    {
      id: "structure",
      label: "Includes a function, class, or clear structure",
      pass: hasDef || lines.length >= 5,
    },
    {
      id: "effort",
      label: "At least a few substantive lines of work",
      pass: lines.length >= 3,
    },
  ];
}

function pickActiveNode(path: LearningPath | null): PathNode | null {
  if (!path?.nodes?.length) return null;
  const ordered = [...path.nodes].sort(
    (a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0),
  );
  return (
    ordered.find((n) => n.status === "IN_PROGRESS") ||
    ordered.find((n) => n.status === "UNLOCKED") ||
    ordered.find((n) => n.status === "COMPLETED") ||
    null
  );
}

export default function WorkspacePage() {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{
    stdout: string;
    stderr: string;
    ok: boolean;
    timed_out: boolean;
    exit_code: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const active = await api.getActivePath();
        if (cancelled) return;
        setPath(active);
        const activeNode = pickActiveNode(active);
        setSelectedId(activeNode?.node_id ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load path");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nodes = useMemo(() => {
    if (!path?.nodes) return [];
    return [...path.nodes].sort(
      (a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0),
    );
  }, [path]);

  const selected = useMemo(
    () => nodes.find((n) => n.node_id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const title =
    selected?.course_title ||
    selected?.course_id ||
    "Practice workspace";

  // Load draft when node changes
  useEffect(() => {
    if (!selected) {
      setCode("");
      return;
    }
    const key = storageKey(selected.node_id);
    const cached = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    setCode(cached ?? starterFor(title));
    setSavedAt(null);
    setOutput(null);
  }, [selected?.node_id, title]);

  const persist = useCallback(
    (next: string) => {
      setCode(next);
      if (!selected) return;
      localStorage.setItem(storageKey(selected.node_id), next);
      setSavedAt(new Date().toLocaleTimeString());
    },
    [selected],
  );

  const starter = useMemo(() => starterFor(title), [title]);
  const checks = useMemo(() => runSelfChecks(code, starter), [code, starter]);
  const passedCount = checks.filter((c) => c.pass).length;
  const canEdit = Boolean(
    selected &&
      (selected.status === "UNLOCKED" ||
        selected.status === "IN_PROGRESS" ||
        selected.status === "COMPLETED"),
  );

  const runCode = async () => {
    if (!selected || !canEdit || running) return;
    setRunning(true);
    try {
      const result = await api.executeWorkspaceCode(code, "python");
      setOutput({
        stdout: result.stdout,
        stderr: result.stderr,
        ok: result.ok,
        timed_out: result.timed_out,
        exit_code: result.exit_code,
      });
    } catch (err) {
      setOutput({
        stdout: "",
        stderr: err instanceof Error ? err.message : "Run failed",
        ok: false,
        timed_out: false,
        exit_code: null,
      });
    } finally {
      setRunning(false);
    }
  };

  const resetDraft = () => {
    if (!selected) return;
    const fresh = starterFor(title);
    localStorage.setItem(storageKey(selected.node_id), fresh);
    setCode(fresh);
    setSavedAt(new Date().toLocaleTimeString());
    setOutput(null);
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading workspace…
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-8">
        <h1 className="font-heading text-2xl font-bold">Practice workspace</h1>
        <p className="text-muted-foreground">
          {error || "No active learning path yet. Finish onboarding first."}
        </p>
        <Link
          href="/dashboard"
          className="text-primary underline-offset-4 hover:underline"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] max-h-screen flex-col overflow-hidden bg-background md:flex-row">
      {/* Brief + checklist */}
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex w-full shrink-0 flex-col border-b border-border md:w-[340px] md:border-b-0 md:border-r"
      >
        <div className="border-b border-border p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Practice pad
          </p>
          <h1 className="mt-1 font-heading text-xl font-bold leading-snug">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Draft code for the current path node. Teaching and mastery live in the
            focus lesson — this page is for scratch work judges can inspect.
          </p>
          {selected && (
            <p className="mt-3 text-xs text-muted-foreground">
              Status:{" "}
              <span className="font-medium text-foreground">
                {selected.status}
              </span>
              {path.goal ? ` · Goal: ${path.goal}` : null}
            </p>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Path nodes</h2>
            <ul className="space-y-1.5">
              {nodes.map((n) => {
                const label = n.course_title || n.course_id;
                const active = n.node_id === selectedId;
                const locked = n.status === "LOCKED";
                return (
                  <li key={n.node_id}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setSelectedId(n.node_id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "bg-primary/15 text-foreground"
                          : locked
                            ? "cursor-not-allowed text-muted-foreground/50"
                            : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
                      }`}
                    >
                      {locked ? (
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Circle
                          className={`h-3.5 w-3.5 shrink-0 ${active ? "fill-primary text-primary" : ""}`}
                        />
                      )}
                      <span className="line-clamp-2">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Self-check</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Structural hints. Use <span className="text-foreground">Run</span> for
              real stdout/stderr (Python, 4s timeout).
            </p>
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm">
                  {c.pass ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={
                      c.pass ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {passedCount}/{checks.length} checks passing
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border p-5">
          {selected && canEdit && (
            <Link
              href={`/lesson/${selected.node_id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <BookOpen className="h-4 w-4" />
              Open focus lesson
            </Link>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            Drafts save in this browser (localStorage).
          </p>
        </div>
      </motion.aside>

      {/* Editor */}
      <motion.section
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex min-w-0 flex-1 flex-col"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <TerminalSquare className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="truncate font-heading font-bold">
              {selected ? `Draft · ${title}` : "Select a node"}
            </h2>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {savedAt && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Saved {savedAt}
              </span>
            )}
            <button
              type="button"
              onClick={resetDraft}
              disabled={!selected || !canEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={runCode}
              disabled={!selected || !canEdit || running || !code.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-[#0d1117] font-mono text-sm">
          {!selected || !canEdit ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
              {selected?.status === "LOCKED"
                ? "This node is locked. Complete the previous lesson first."
                : "Pick an unlocked or completed node from the list."}
            </div>
          ) : (
            <textarea
              value={code}
              onChange={(e) => persist(e.target.value)}
              spellCheck={false}
              className="h-full w-full resize-none bg-transparent p-4 leading-6 text-[#e6edf3] outline-none"
              aria-label="Practice code editor"
            />
          )}
        </div>

        <div className="flex max-h-[40%] min-h-[140px] flex-col border-t border-border bg-[#010409]">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Output
            </span>
            {output && (
              <span
                className={`text-xs font-mono ${
                  output.ok ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {output.timed_out
                  ? "timed out"
                  : output.exit_code === null
                    ? "error"
                    : `exit ${output.exit_code}`}
              </span>
            )}
          </div>
          <pre className="flex-1 overflow-auto p-4 text-xs leading-5 text-[#e6edf3] whitespace-pre-wrap">
            {!output && (
              <span className="text-muted-foreground">
                Click Run to execute Python on the backend and see stdout/stderr here.
              </span>
            )}
            {output?.stdout ? (
              <>
                <span className="text-muted-foreground">stdout{"\n"}</span>
                {output.stdout}
              </>
            ) : null}
            {output?.stderr ? (
              <>
                {output.stdout ? "\n" : null}
                <span className="text-red-400">stderr{"\n"}</span>
                <span className="text-red-300">{output.stderr}</span>
              </>
            ) : null}
            {output && !output.stdout && !output.stderr ? (
              <span className="text-muted-foreground">(no output)</span>
            ) : null}
          </pre>
        </div>
      </motion.section>
    </div>
  );
}
