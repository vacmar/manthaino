"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, TerminalSquare, Database, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const IconMap: Record<string, any> = {
  BrainCircuit,
  TerminalSquare,
  Database
};

export default function OnboardingPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<{ id: string, title: string, description: string, icon: string }[] | null>(null);

  useEffect(() => {
    fetch("/api/mock/onboarding")
      .then(res => res.json())
      .then(setPaths);
  }, []);

  if (!paths) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center animate-pulse">
        <div className="w-16 h-16 bg-muted rounded-2xl mb-8"></div>
        <div className="h-10 bg-muted rounded-xl w-64 mb-4"></div>
        <div className="h-6 bg-muted rounded-xl w-96 mb-12"></div>
        <div className="grid gap-6 w-full max-w-4xl mx-auto md:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-xl w-full"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto mb-16"
      >
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8">
          <BrainCircuit className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-6">
          What is your ultimate goal?
        </h1>
        <p className="text-lg text-muted-foreground">
          Select a career trajectory. We will map the exact prerequisite graph and dynamically assess your current proficiency to build your custom path.
        </p>
      </motion.div>

      <div className="grid gap-6 w-full max-w-4xl mx-auto md:grid-cols-3">
        {paths.map((path, idx) => {
          const Icon = IconMap[path.icon] || BrainCircuit;
          return (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => router.push("/dashboard")}
              className="group relative p-8 bg-card border border-border hover:border-primary rounded-2xl cursor-pointer text-left transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="mb-6 p-4 inline-block rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-3">{path.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {path.description}
              </p>
              
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
