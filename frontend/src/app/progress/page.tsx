"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, AlertTriangle, History, CircleDashed } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api, PathNode } from "@/lib/api";

interface MasteryRow {
  skill_id: string;
  claimed: number;
  verified: number;
}

interface WeakConcept {
  concept: string;
  error_count: number;
  latest_description: string;
  node_id: string;
}

type LessonNode = PathNode & { course_title?: string };

export default function ProgressPage() {
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [weakConcepts, setWeakConcepts] = useState<WeakConcept[]>([]);
  const [completedNodes, setCompletedNodes] = useState<LessonNode[]>([]);
  const [activeNode, setActiveNode] = useState<LessonNode | null>(null);
  const [history, setHistory] = useState<{ label: string; detail: string }[]>([]);
  const [pathProgress, setPathProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalNodes, setTotalNodes] = useState(0);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [me, path, verification] = await Promise.all([
          api.getMe(),
          api.getActivePath().catch(() => api.ensureActivePath()),
          api.getVerification().catch(() => null),
        ]);

        const nodes = (path.nodes || []) as LessonNode[];
        const completed = nodes
          .filter((n) => n.status === "COMPLETED")
          .sort((a, b) => a.sequence_order - b.sequence_order);
        setCompletedNodes(completed);
        setCompletedCount(completed.length);
        setTotalNodes(nodes.length);
        setPathProgress(
          nodes.length > 0 ? Math.round((completed.length / nodes.length) * 100) : 0
        );
        setGoal(path.goal || "");

        const active =
          nodes.find((n) => n.status === "IN_PROGRESS" || n.status === "UNLOCKED") || null;
        setActiveNode(active);

        const verifiedBySkill = new Map<string, number>();
        verification?.discrepancies?.forEach((d) => {
          verifiedBySkill.set(d.skill_id, d.verified_proficiency);
        });

        const skillIds = new Set<string>([
          ...Object.keys(me.self_reported_proficiency ?? {}),
          ...(me.known_skills ?? []),
          ...Array.from(verifiedBySkill.keys()),
        ]);

        const rows: MasteryRow[] = Array.from(skillIds).map((skill_id) => ({
          skill_id,
          claimed:
            me.self_reported_proficiency?.[skill_id] ??
            (me.known_skills?.includes(skill_id) ? 0.5 : 0),
          verified: verifiedBySkill.get(skill_id) ?? 0,
        }));
        setMastery(rows.sort((a, b) => b.claimed - a.claimed));

        const weak: WeakConcept[] = [];
        for (const node of nodes
          .filter((n) => n.status === "IN_PROGRESS" || n.status === "UNLOCKED")
          .slice(0, 3)) {
          try {
            const res = await api.getWeakConcepts(node.node_id, me.learner_id);
            for (const w of res.weak_concepts ?? []) {
              weak.push({
                concept: w.concept,
                error_count: w.error_count,
                latest_description: w.latest_description,
                node_id: node.node_id,
              });
            }
          } catch {
            /* no mistakes */
          }
        }
        setWeakConcepts(weak);

        const hist = completed.map((n) => ({
          label: n.course_title || n.course_id.replace(/^c_/, "").replace(/_/g, " "),
          detail: `Completed · step ${n.sequence_order}`,
        }));
        if (path.goal) {
          hist.unshift({ label: "Active goal", detail: path.goal });
        }
        if (active) {
          hist.push({
            label: active.course_title || active.course_id,
            detail: `In progress · step ${active.sequence_order}`,
          });
        }
        setHistory(hist);
      } catch (err) {
        console.error("Failed to load progress", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="h-24 bg-muted rounded-xl w-2/3" />
        <div className="h-48 bg-muted rounded-xl w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 text-primary mb-4">
          <BarChart3 className="w-6 h-6" />
          <span className="font-bold tracking-widest uppercase text-sm">Progress</span>
        </div>
        <h1 className="text-4xl font-heading font-bold mb-2">Learning trajectory</h1>
        <p className="text-muted-foreground text-lg">
          {goal ? `${goal} · ` : ""}
          {completedCount} of {totalNodes} nodes completed
        </p>
        <div className="mt-6 max-w-md">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Path completion</span>
            <span className="font-mono">{pathProgress}%</span>
          </div>
          <Progress value={pathProgress} className="h-2" />
        </div>
      </motion.header>

      {activeNode && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CircleDashed className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">
                Current node
              </p>
              <p className="font-medium text-white">
                {activeNode.course_title || activeNode.course_id}
              </p>
              <p className="text-sm text-muted-foreground">
                Finish the AI lesson and confirm mastery to update this page.
              </p>
            </div>
          </div>
          <Link
            href={`/lesson/${activeNode.node_id}`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"
          >
            Resume lesson
          </Link>
        </div>
      )}

      <section className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-card/40">
          <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Mastery signals
          </h2>
          {mastery.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Skills from onboarding will appear here. Completing nodes strengthens verified
              signals.
            </p>
          ) : (
            <ul className="space-y-4">
              {mastery.map((m) => (
                <li key={m.skill_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{m.skill_id.replace(/^skill_/, "")}</span>
                    <span className="font-mono text-muted-foreground">
                      claim {Math.round(m.claimed * 100)}% · verified {Math.round(m.verified * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.max(m.claimed, m.verified) * 100)}
                    className="h-1.5"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card/40">
          <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Weak concepts
          </h2>
          {weakConcepts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recorded mistakes yet — keep learning in the AI lesson.
            </p>
          ) : (
            <ul className="space-y-3">
              {weakConcepts.map((w) => (
                <li
                  key={`${w.node_id}-${w.concept}`}
                  className="p-3 rounded-lg bg-muted/40 border border-border"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{w.concept}</span>
                    <Badge variant="secondary">{w.error_count} errors</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{w.latest_description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="p-6 rounded-2xl border border-border bg-card/40">
        <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-secondary" />
          Completed nodes
        </h2>
        {completedNodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            When the AI marks a node ready and you confirm mastery, it shows up here and unlocks
            the next step.
          </p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {completedNodes.map((n) => (
              <li key={n.node_id}>
                <Link
                  href={`/lesson/${n.node_id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                  <div>
                    <p className="font-medium">
                      {n.course_title || n.course_id.replace(/^c_/, "").replace(/_/g, " ")}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">#{n.sequence_order}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-6 rounded-2xl border border-border bg-card/40">
        <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Complete a node to build history.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-4">
            {history.map((h, i) => (
              <li key={i} className="ml-6">
                <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary/80 border-2 border-background" />
                <p className="font-medium">{h.label}</p>
                <p className="text-sm text-muted-foreground">{h.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
