"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TerminalSquare, Send, Sparkles } from "lucide-react";

export default function WorkspacePage() {
  const [details, setDetails] = useState<{ title: string, defaultCode: string } | null>(null);
  const [chat, setChat] = useState<{ role: "ai" | "user", content: string }[] | null>(null);

  useEffect(() => {
    fetch("/api/mock/assessment").then(res => res.json()).then(setDetails);
    fetch("/api/mock/chat").then(res => res.json()).then(setChat);
  }, []);

  if (!details || !chat) {
    return (
      <div className="h-full max-h-screen flex flex-col md:flex-row overflow-hidden bg-background animate-pulse">
        <div className="flex-1 border-r border-border bg-muted"></div>
        <div className="w-full md:w-[400px] bg-muted/50"></div>
      </div>
    );
  }

  return (
    <div className="h-full max-h-screen flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Left Pane: Code Editor */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col border-r border-border"
      >
        <div className="p-4 border-b border-border bg-card flex items-center gap-3">
          <TerminalSquare className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">{details.title}</h2>
        </div>
        
        <div className="flex-1 bg-background font-mono text-sm relative p-4">
          <div className="absolute top-4 left-4 text-muted-foreground opacity-50 select-none">
            1<br/>2<br/>3<br/>4<br/>5
          </div>
          <textarea 
            className="w-full h-full bg-transparent resize-none outline-none pl-8 text-foreground"
            defaultValue={details.defaultCode}
            spellCheck={false}
          />
        </div>
      </motion.div>

      {/* Right Pane: AI Tutor Chat */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-[400px] flex flex-col bg-muted/30"
      >
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Sparkles className="w-4 h-4" />
            <span>AI Tutor</span>
          </div>
          <span className="text-xs font-mono text-secondary px-2 py-1 bg-secondary/10 rounded-full">
            Streaming
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chat.map((msg, idx) => (
            <div 
              key={idx} 
              className={msg.role === "ai" 
                ? "bg-card border border-border p-3 rounded-lg rounded-tl-none shadow-sm mr-8" 
                : "bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none shadow-sm ml-8"}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-card">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ask for a hint..." 
              className="w-full bg-background border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none focus:border-primary transition-colors"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
