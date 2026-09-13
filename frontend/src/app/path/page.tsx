"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Network, CheckCircle2, CircleDashed, Lock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, RegeneratePathResult, UnlockConditions } from "@/lib/api";

export interface Node {
  id: string;
  title: string;
  status: "completed" | "active" | "locked";
  tier: number;
  lockReasons?: UnlockConditions["reasons"];
}

export default function PathVisualizationPage() {
  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [pathId, setPathId] = useState<string | null>(null);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenResult, setRegenResult] = useState<RegeneratePathResult | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);

  const loadPath = useCallback(async () => {
    try {
      const [me, pathData] = await Promise.all([api.getMe(), api.getActivePath()]);
      setPathId(pathData.path_id);
      setLearnerId(me.learner_id);

      const mapped: Node[] = await Promise.all(
        pathData.nodes.map(async (n) => {
          let status: Node["status"] = "locked";
          if (n.status === "COMPLETED") status = "completed";
          if (n.status === "IN_PROGRESS" || n.status === "UNLOCKED") status = "active";

          let lockReasons: UnlockConditions["reasons"] | undefined;
          if (n.status === "LOCKED") {
            try {
              const cond = await api.getUnlockConditions(n.node_id, me.learner_id);
              if (cond.locked && cond.reasons.length > 0) {
                lockReasons = cond.reasons;
              }
            } catch {
              /* ignore per-node lock fetch errors */
            }
          }

          return {
            id: n.node_id,
            title:
              n.course_title ||
              n.course_id
                .replace(/^(c_|ai_)/i, "")
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
            status,
            tier: n.sequence_order,
            lockReasons,
          };
        })
      );

      setNodes(mapped.sort((a, b) => a.tier - b.tier));
    } catch (err) {
      console.error("Failed to load pathway", err);
    }
  }, []);

  useEffect(() => {
    loadPath();
  }, [loadPath]);

  const handleRegenerate = async () => {
    if (!pathId || !learnerId || regenerating) return;
    setRegenerating(true);
    setRegenError(null);
    setRegenResult(null);
    try {
      const res = await api.regeneratePath(pathId, learnerId);
      setRegenResult(res);
      await loadPath();
    } catch (e) {
      setRegenError(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-secondary/10",
          border: "border-secondary",
          icon: <CheckCircle2 className="w-6 h-6 text-secondary" />,
        };
      case "active":
        return {
          bg: "bg-primary/10",
          border: "border-primary",
          icon: <CircleDashed className="w-6 h-6 text-primary animate-[spin_3s_linear_infinite]" />,
        };
      default:
        return {
          bg: "bg-muted/50",
          border: "border-border",
          icon: <Lock className="w-6 h-6 text-muted-foreground opacity-50" />,
        };
    }
  };

  if (!nodes) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-12 animate-pulse">
        <div className="h-32 bg-muted rounded-xl w-3/4 mx-auto" />
        <div className="h-96 bg-muted rounded-xl w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
          <Network className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-heading font-bold mb-4">Curriculum Map</h1>
        <p className="text-muted-foreground text-lg">
          Topological view of your learning path with lock explanations.
        </p>
        <div className="mt-6 flex justify-center">
          <Button variant="outline" className="gap-2" onClick={handleRegenerate} disabled={regenerating || !pathId}>
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate path
          </Button>
        </div>
        {regenError && (
          <p className="mt-4 text-sm text-destructive">{regenError}</p>
        )}
        {regenResult?.changes && regenResult.changes.length > 0 && (
          <div className="mt-6 mx-auto max-w-lg text-left p-4 rounded-xl border border-border bg-card">
            <p className="text-sm font-medium mb-2">Path changes (v{regenResult.version})</p>
            <ul className="text-sm text-muted-foreground space-y-1 font-mono">
              {regenResult.changes.map((c, i) => (
                <li key={i}>
                  {c.type}: {c.course_id} — {c.reason.replace(/_/g, " ").toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.header>

      <div className="relative max-w-3xl mx-auto py-8">
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-border -translate-x-1/2 -z-10 rounded-full" />

        <div className="space-y-8">
          {nodes.map((node, idx) => {
            const config = getStatusConfig(node.status);
            const isEven = idx % 2 === 0;

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                className={`flex items-center ${isEven ? "flex-row" : "flex-row-reverse"} gap-8`}
              >
                <div className={`w-1/2 ${isEven ? "text-right" : "text-left"}`}>
                  <div
                    className={`inline-block p-4 rounded-xl border-2 shadow-sm ${config.bg} ${config.border} bg-card backdrop-blur-sm text-left`}
                  >
                    <h3 className="font-bold text-lg">{node.title}</h3>
                    <p className="text-xs font-mono opacity-70 uppercase tracking-widest mt-1">
                      Tier {node.tier} · {node.status}
                    </p>
                    {node.lockReasons && node.lockReasons.length > 0 && (
                      <ul className="mt-3 text-xs text-muted-foreground space-y-1.5 border-t border-border pt-2">
                        {node.lockReasons.map((r, ri) => (
                          <li key={ri} className="leading-snug">
                            {r.message ||
                              (r.status === "PRIOR_NODE_INCOMPLETE"
                                ? `Complete “${r.prerequisite_title || r.prerequisite_skill}” first`
                                : `Needs more mastery in ${
                                    r.prerequisite_title ||
                                    r.prerequisite_skill
                                      .replace(/^(skill_|c_|ai_)/i, "")
                                      .replace(/_/g, " ")
                                  }`)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-card shadow-sm z-10 ${config.border}`}
                >
                  {config.icon}
                </div>

                <div className="w-1/2" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
