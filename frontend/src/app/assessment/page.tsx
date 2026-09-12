"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AssessmentPage() {
  const [details, setDetails] = useState<{ title: string, description: string, defaultCode: string } | null>(null);

  useEffect(() => {
    fetch("/api/mock/assessment")
      .then(res => res.json())
      .then(setDetails);
  }, []);

  if (!details) {
    return (
      <div className="min-h-full flex flex-col p-8 max-w-4xl mx-auto animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-64 mb-4"></div>
        <div className="h-6 bg-muted rounded-xl w-full mb-12"></div>
        <div className="flex-1 bg-muted rounded-xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col p-8 max-w-4xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex items-center gap-3 mb-4">
          <TerminalSquare className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-heading font-bold">Node Assessment</h1>
        </div>
        <h2 className="text-4xl font-heading font-bold text-foreground mb-4">
          {details.title}
        </h2>
        <p className="text-muted-foreground text-lg">
          {details.description}
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden"
      >
        <div className="bg-muted px-4 py-3 border-b border-border font-mono text-sm text-muted-foreground flex items-center justify-between">
          <span>solution.py</span>
          <span className="text-xs">Python 3.11</span>
        </div>
        <div className="flex-1 p-4 bg-background font-mono text-sm relative">
          <div className="absolute top-4 left-4 text-muted-foreground opacity-50 select-none">
            1<br/>2<br/>3<br/>4<br/>5
          </div>
          <textarea 
            className="w-full h-full bg-transparent resize-none outline-none pl-8 text-foreground"
            defaultValue={details.defaultCode}
            spellCheck={false}
          />
        </div>
        <div className="p-4 bg-muted border-t border-border flex justify-end">
          <Button className="gap-2">
            Submit Evidence
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
