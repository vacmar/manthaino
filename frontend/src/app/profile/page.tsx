"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Database, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Skill {
  name: string;
  weight: number;
  verified: boolean;
}

export default function ProfilePage() {
  const [skills, setSkills] = useState<Skill[] | null>(null);

  useEffect(() => {
    fetch("/api/mock/profile")
      .then(res => res.json())
      .then(setSkills);
  }, []);

  if (!skills) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-1/2"></div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-muted rounded-xl w-full"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-heading font-bold mb-4">Skill Evidence</h1>
        <p className="text-muted-foreground text-lg">
          Your immutable record of verified capabilities.
        </p>
      </motion.div>

      <div className="grid gap-6">
        {skills.map((skill, idx) => (
          <motion.div
            key={skill.name}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-card border border-border rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${skill.verified ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}`}>
                {skill.verified ? <ShieldCheck className="w-6 h-6" /> : <Database className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-lg">{skill.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={skill.verified ? "default" : "secondary"}>
                    Weight: {skill.weight}
                  </Badge>
                  {skill.verified && <span className="text-xs font-mono text-secondary">Verified</span>}
                </div>
              </div>
            </div>
            
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${skill.weight}%` }}
                transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                className={`h-full ${skill.verified ? 'bg-secondary' : 'bg-primary'}`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
