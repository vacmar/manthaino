"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Network, CheckCircle2, CircleDashed, Lock } from "lucide-react";

export interface Node {
  id: string;
  title: string;
  status: "completed" | "active" | "locked";
  tier: number;
}

export default function PathVisualizationPage() {
  const [nodes, setNodes] = useState<Node[] | null>(null);

  useEffect(() => {
    fetch("/api/mock/path")
      .then(res => res.json())
      .then((res) => setNodes(res.nodes));
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-secondary/10",
          border: "border-secondary",
          text: "text-secondary-foreground",
          icon: <CheckCircle2 className="w-6 h-6 text-secondary" />,
        };
      case "active":
        return {
          bg: "bg-primary/10",
          border: "border-primary",
          text: "text-primary-foreground",
          icon: <CircleDashed className="w-6 h-6 text-primary animate-[spin_3s_linear_infinite]" />,
        };
      default:
        return {
          bg: "bg-muted/50",
          border: "border-border",
          text: "text-muted-foreground",
          icon: <Lock className="w-6 h-6 text-muted-foreground opacity-50" />,
        };
    }
  };

  if (!nodes) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-12 animate-pulse">
        <div className="h-32 bg-muted rounded-xl w-3/4 mx-auto"></div>
        <div className="h-96 bg-muted rounded-xl w-full"></div>
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
          The orchestrator's topological sort of your learning goals.
        </p>
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
                className={`flex items-center ${isEven ? 'flex-row' : 'flex-row-reverse'} gap-8`}
              >
                <div className={`w-1/2 ${isEven ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-4 rounded-xl border-2 shadow-sm ${config.bg} ${config.border} bg-card backdrop-blur-sm`}>
                    <h3 className="font-bold text-lg">{node.title}</h3>
                    <p className="text-xs font-mono opacity-70 uppercase tracking-widest mt-1">Tier {node.tier} • {node.status}</p>
                  </div>
                </div>

                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-card shadow-sm z-10 ${config.border}`}>
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
