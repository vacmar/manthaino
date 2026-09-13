"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function GoalPage() {
  const [goals, setGoals] = useState<{ title: string, active: boolean, progress: number }[] | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.getGoals();
        setGoals(res);
      } catch (err) {
        console.error("Failed to load goals", err);
        // Fallback for UI visualization if backend endpoint doesn't exist yet
        setGoals([
          { title: "Data Engineering Master", active: true, progress: 33 },
          { title: "AI/ML Specialist", active: false, progress: 0 }
        ]);
      }
    }
    loadData();
  }, []);

  if (!goals) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-12 animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-3/4"></div>
        <div className="space-y-6">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl w-full"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-heading font-bold mb-4">Learning Goals</h1>
        <p className="text-muted-foreground text-lg">
          Set the horizon. The orchestrator will dynamically pave the path to get you there.
        </p>
      </motion.header>

      <div className="grid gap-6">
        {goals.map((goal, idx) => (
          <motion.div
            key={goal.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
            className={`p-6 rounded-xl border flex items-center justify-between ${
              goal.active 
                ? 'bg-card border-primary shadow-sm' 
                : 'bg-transparent border-border hover:border-primary/50 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${goal.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {goal.active ? <Target className="w-6 h-6" /> : <Flag className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-lg">{goal.title}</h3>
                {goal.active && (
                  <p className="text-primary text-sm font-medium mt-1">Active Horizon</p>
                )}
              </div>
            </div>
            
            {goal.active ? (
              <Button variant="outline" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground">
                Manage
              </Button>
            ) : (
              <Button variant="secondary">Select Goal</Button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
