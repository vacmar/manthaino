"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, PathNode } from "@/lib/api";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [node, setNode] = useState<PathNode | null>(null);

  useEffect(() => {
    async function loadNode() {
      try {
        const path = await api.getActivePath();
        const found = path.nodes.find(n => n.node_id === nodeId);
        if (found) setNode(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadNode();
  }, [nodeId]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const me = await api.getMe();
      await api.completeLesson(me.learner_id, nodeId);
      router.push("/");
    } catch (err) {
      console.error(err);
      setCompleting(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading lesson...</div>;
  if (!node) return <div className="p-8 text-red-400">Lesson not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
      
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-10">
        <div className="mb-8">
          <span className="text-primary text-sm font-bold tracking-widest uppercase mb-2 block">Interactive Lesson</span>
          <h1 className="text-4xl font-bold text-white mb-4">{node.course_id.toUpperCase()} Module</h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Welcome to the interactive module. Read the concepts below, then try applying them.
            Once you feel confident in your mastery, you can mark this lesson as completed to unlock the next steps in your pathway.
          </p>
        </div>

        <div className="prose prose-invert max-w-none mb-12">
          {/* Placeholder for real markdown content */}
          <h3>Core Concepts</h3>
          <p>
            Understanding the fundamentals of {node.course_id.replace('c_', '')} is crucial for building scalable data infrastructure. 
            In this module, you will learn how to design, implement, and orchestrate these systems efficiently.
          </p>
          
          <div className="bg-black/30 rounded-xl p-6 border border-white/5 my-8">
            <h4 className="text-white font-medium mb-2">Practice Exercise</h4>
            <p className="text-zinc-400 text-sm mb-4">Try writing a basic implementation using the principles discussed.</p>
            <div className="font-mono text-sm bg-black/50 p-4 rounded-lg text-zinc-300">
              {`// Write your solution here...\n`}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border/50 flex justify-between items-center">
          <p className="text-sm text-zinc-500">Node ID: {node.node_id}</p>
          <button 
            onClick={handleComplete}
            disabled={completing || node.status === "COMPLETED"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {completing ? 'Completing...' : node.status === 'COMPLETED' ? 'Already Completed' : (
              <>
                <CheckCircle className="w-5 h-5" /> Mark as Mastered
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
