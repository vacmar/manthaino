"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, ListTodo, Bot, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface ProjectTask {
  id: number;
  title: string;
  completed: boolean;
}

export default function ProjectsPage() {
  const [data, setData] = useState<{ title: string, description: string, tasks: ProjectTask[] } | null>(null);

  useEffect(() => {
    fetch("/api/mock/projects")
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 animate-pulse">
        <div className="flex-1 space-y-8">
          <div className="h-32 bg-muted rounded-xl w-full"></div>
          <div className="h-96 bg-muted rounded-xl w-full"></div>
        </div>
        <div className="w-full lg:w-96 h-[600px] bg-muted rounded-xl"></div>
      </div>
    );
  }

  const completedCount = data.tasks.filter(t => t.completed).length;
  const progressPercent = (completedCount / data.tasks.length) * 100;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Main Project Area */}
      <div className="flex-1 space-y-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 text-primary mb-4">
            <Briefcase className="w-6 h-6" />
            <span className="font-bold tracking-widest uppercase text-sm">Capstone Project</span>
          </div>
          <h1 className="text-4xl font-heading font-bold mb-4">{data.title}</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {data.description}
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-card border border-border rounded-xl shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 font-bold text-lg">
              <ListTodo className="w-5 h-5 text-primary" />
              Project Requirements
            </div>
            <span className="font-mono text-sm text-muted-foreground">{progressPercent}%</span>
          </div>
          
          <Progress value={progressPercent} className="h-2 mb-6" />

          <div className="space-y-3">
            {data.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={task.completed} 
                  readOnly
                  className="w-5 h-5 accent-primary rounded border-border"
                />
                <span className={task.completed ? "line-through text-muted-foreground" : "font-medium"}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button size="lg" className="gap-2">
            <FileCode className="w-5 h-5" />
            Submit Final Repository URL
          </Button>
        </motion.div>
      </div>

      {/* AI Mentor Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full lg:w-96 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden h-[600px]"
      >
        <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2 font-bold text-primary">
          <Bot className="w-5 h-5" />
          Project AI Mentor
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/10">
          <div className="bg-background border border-border p-3 rounded-lg rounded-tl-none shadow-sm mr-4">
            <p className="text-sm">
              I noticed you're stuck on the **Redis Caching** implementation. A common pitfall is forgetting to establish the connection pool on app startup. Have you checked the `@app.on_event("startup")` hook in FastAPI?
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-background">
          <input 
            type="text" 
            placeholder="Ask the mentor for help..." 
            className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
      </motion.div>
    </div>
  );
}
