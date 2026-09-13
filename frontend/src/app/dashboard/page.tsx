"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, CheckCircle2, CircleDashed, Lock } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export interface Node {
  id: string;
  title: string;
  status: "completed" | "active" | "locked";
  tier: number;
  lockReason?: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<{
    goal: string;
    progress: number;
    nodes: Node[];
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const pathData = await api.ensureActivePath();

        const mappedNodes = pathData.nodes
          .map((n: any) => {
            let status: Node["status"] = "locked";
            if (n.status === "COMPLETED") status = "completed";
            if (n.status === "IN_PROGRESS" || n.status === "UNLOCKED") status = "active";

            return {
              id: n.node_id,
              title: n.course_title || n.course_id.replace(/^c_/, "").replace(/_/g, " "),
              status,
              tier: n.sequence_order,
              lockReason:
                status === "locked"
                  ? "Complete the previous node to unlock this one."
                  : undefined,
            } as Node;
          })
          .sort((a: Node, b: Node) => a.tier - b.tier);

        const completed = mappedNodes.filter((n: Node) => n.status === "completed").length;
        const progress =
          mappedNodes.length > 0
            ? Math.round((completed / mappedNodes.length) * 100)
            : 0;

        setData({
          goal: (pathData as any).goal || "Personalized Pathway",
          progress,
          nodes: mappedNodes,
        });
      } catch (err) {
        console.error("Failed to load pathway", err);
      }
    }
    loadData();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (!data) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-12 animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-3/4"></div>
        <div className="h-32 bg-muted rounded-xl w-1/2 mx-auto"></div>
        <div className="h-32 bg-muted rounded-xl w-1/2 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2 text-sm text-primary font-medium mb-4">
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary hover:bg-primary/20"
          >
            Active Goal
          </Badge>
          <span>{data.goal}</span>
        </div>
        <h1 className="text-4xl font-heading font-bold">Your Pathway</h1>
        <p className="text-muted-foreground">
          {
            data.nodes.filter((n) => n.status === "completed").length
          } of {data.nodes.length} nodes completed. Nodes unlock one at a time.
        </p>
      </motion.header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:to-transparent"
      >
        {data.nodes.map((node) => (
          <motion.div
            key={node.id}
            variants={item}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                node.status === "completed"
                  ? "bg-secondary text-secondary-foreground"
                  : node.status === "locked"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground"
              }`}
            >
              {node.status === "completed" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : node.status === "locked" ? (
                <Lock className="w-5 h-5" />
              ) : (
                <CircleDashed className="w-5 h-5 animate-[spin_3s_linear_infinite]" />
              )}
            </div>
            <div
              className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-2xl bg-card shadow-sm ${
                node.status === "active"
                  ? "border-2 border-primary shadow-md"
                  : node.status === "locked"
                    ? "border border-border opacity-70"
                    : "border border-border"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl mb-1">{node.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {node.status === "completed"
                      ? "Mastered"
                      : node.status === "locked"
                        ? node.lockReason
                        : "Your current learning node."}
                  </p>
                </div>
              </div>
              {node.status === "active" && (
                <>
                  <Progress value={data.progress} className="h-2 mb-4" />
                  <Link
                    href={`/lesson/${node.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                  >
                    <Play className="w-4 h-4" />
                    Resume Learning
                  </Link>
                </>
              )}
              {node.status === "locked" && (
                <div className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  Locked
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
