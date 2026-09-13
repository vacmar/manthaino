"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, AlertTriangle, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

export default function ProgressPage() {
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [weakConcepts, setWeakConcepts] = useState<WeakConcept[]>([]);
  const [completedNodes, setCompletedNodes] = useState<PathNode[]>([]);
  const [history, setHistory] = useState<{ label: string; detail: string }[]>([]);
  const [pathProgress, setPathProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [me, path, verification] = await Promise.all([
          api.getMe(),
          api.getActivePath(),
          api.getVerification(),
        ]);

        const completed = path.nodes
          .filter((n) => n.status === "COMPLETED")
          .sort((a, b) => a.sequence_order - b.sequence_order);
        setCompletedNodes(completed);
        setPathProgress(
          path.nodes.length > 0 ? Math.round((completed.length / path.nodes.length) * 100) : 0
        );

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
          claimed: me.self_reported_proficiency?.[skill_id] ?? (me.known_skills?.includes(skill_id) ? 0.5 : 0),
          verified: verifiedBySkill.get(skill_id) ?? 0,
        }));
        setMastery(rows.sort((a, b) => b.claimed - a.claimed));

        const activeNodes = path.nodes.filter(
          (n) => n.status === "IN_PROGRESS" || n.status === "UNLOCKED"
        );
        const weak: WeakConcept[] = [];
        for (const node of activeNodes.slice(0, 3)) {
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
            /* no mistakes recorded */
          }
        }
        setWeakConcepts(weak);

        const hist = completed.map((n) => ({
          label: n.course_id.replace(/^c_/, "").replace(/_/g, " "),
          detail: `Completed · sequence ${n.sequence_order}`,
        }));
        if (path.goal) {
          hist.unshift({ label: "Active goal", detail: path.goal });
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
        <p className="text-muted-foreground text-lg">Mastery, weak concepts, completed nodes, and history.</p>
        <div className="mt-6 max-w-md">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Path completion</span>
            <span className="font-mono">{pathProgress}%</span>
          </div>
          <Progress value={pathProgress} className="h-2" />
        </div>
      </motion.header>

      <section className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 border border-border bg-card">
          <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Mastery
          </h2>
          {mastery.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skill signals yet.</p>
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
                  <Progress value={Math.min(100, Math.max(m.claimed, m.verified) * 100)} className="h-1.5" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 border border-border bg-card">
          <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Weak concepts
          </h2>
          {weakConcepts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded mistakes yet.</p>
          ) : (
            <ul className="space-y-3">
              {weakConcepts.map((w) => (
                <li key={`${w.node_id}-${w.concept}`} className="p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{w.concept}</span>
                    <Badge variant="secondary">{w.error_count} errors</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{w.latest_description}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card className="p-6 border border-border bg-card">
        <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-secondary" />
          Completed nodes
        </h2>
        {completedNodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed nodes yet.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {completedNodes.map((n) => (
              <li key={n.node_id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                <div>
                  <p className="font-medium">{n.course_id.replace(/^c_/, "").replace(/_/g, " ")}</p>
                  <p className="text-xs font-mono text-muted-foreground">#{n.sequence_order}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6 border border-border bg-card">
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
      </Card>
    </div>
  );
}
