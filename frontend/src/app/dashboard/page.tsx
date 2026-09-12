"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, CheckCircle2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export interface Node {
  id: string;
  title: string;
  status: "completed" | "active" | "locked";
  tier: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<{ goal: string, progress: number, nodes: Node[] } | null>(null);

  useEffect(() => {
    fetch("/api/mock/path")
      .then(res => res.json())
      .then(setData);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
            Active Goal
          </Badge>
          <span>{data.goal}</span>
        </div>
        <h1 className="text-4xl font-heading font-bold">Your Pathway</h1>
        <p className="text-muted-foreground">{data.nodes.filter(n => n.status === "completed").length} of {data.nodes.length} nodes completed. Keep going.</p>
      </motion.header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:to-transparent"
      >
        {data.nodes.filter(n => n.status !== "locked").map((node, i) => (
          <motion.div key={node.id} variants={item} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${node.status === "completed" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
              {node.status === "completed" ? <CheckCircle2 className="w-5 h-5" /> : <CircleDashed className="w-5 h-5 animate-[spin_3s_linear_infinite]" />}
            </div>
            <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-2xl bg-card shadow-sm ${node.status === "active" ? "border-2 border-primary shadow-md" : "border border-border"}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl mb-1">{node.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {node.status === "completed" ? "Mastered" : "Recommended next step based on skill gaps."}
                  </p>
                </div>
              </div>
              {node.status === "active" && (
                <>
                  <Progress value={data.progress} className="h-2 mb-4" />
                  <Button className="w-full gap-2">
                    <Play className="w-4 h-4" />
                    Resume Learning
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
