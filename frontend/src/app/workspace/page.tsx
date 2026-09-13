"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { TerminalSquare, Send, Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function WorkspacePage() {
  const [details, setDetails] = useState<{ title: string, defaultCode: string } | null>(null);
  const [chat, setChat] = useState<{ role: "ai" | "user", content: string }[] | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.startAssessment("eval_1");
        // Mapping backend response to frontend UI expectations
        // Assuming backend returns { title: ..., description: ... } 
        // We will fallback to a default structure if it doesn't match perfectly yet
        setDetails({
          title: res.title || "Interactive Workspace",
          defaultCode: res.defaultCode || "# Write your solution here\n"
        });
      } catch (err) {
        console.error("Failed to load workspace", err);
      }
    }
    loadData();
    
    // Initial chat
    setChat([
      { role: "ai", content: "I see you're working on the workspace! How can I assist you with this project?" }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setChat(prev => [...(prev || []), { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const me = await api.getMe();
      const response = await fetch(`${process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001'}/chat/tutor/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          learner_id: me.learner_id,
          node_id: 'n1', // We would pass actual node_id here
        })
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      
      setChat(prev => [...(prev || []), { role: "ai", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        let currentEvent = "";
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (currentEvent === 'token') {
              const textChunk = data.replace(/\\n/g, '\n');
              aiContent += textChunk;
              setChat(prev => {
                if (!prev) return prev;
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = aiContent;
                return newMsgs;
              });
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setChat(prev => [...(prev || []), { role: "ai", content: "Error connecting to AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

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
              <p className="text-sm whitespace-pre-wrap">{msg.content || (isLoading && idx === chat.length - 1 ? <Loader2 className="w-4 h-4 animate-spin opacity-50" /> : "")}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border bg-card">
          <form onSubmit={handleSubmit} className="relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for a hint..." 
              className="w-full bg-background border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
