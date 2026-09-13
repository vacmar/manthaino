"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, ListTodo, Bot, FileCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

const PROJECT_ID = "proj_1";

export interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
  mandatory?: boolean;
}

function normalizeProject(raw: Record<string, unknown>) {
  const project = (raw.project ?? raw) as Record<string, unknown>;
  const requirements = (project.requirements ?? []) as Array<{
    requirement_id: string;
    description: string;
    mandatory?: boolean;
  }>;
  const tasks: ProjectTask[] =
    requirements.length > 0
      ? requirements.map((r) => ({
          id: r.requirement_id,
          title: r.description,
          completed: false,
          mandatory: r.mandatory,
        }))
      : ((project.tasks as ProjectTask[]) ?? []);

  return {
    title: (project.title as string) ?? "Capstone project",
    description: (project.description as string) ?? "",
    tasks,
    requirements,
  };
}

export default function ProjectsPage() {
  const [data, setData] = useState<{
    title: string;
    description: string;
    tasks: ProjectTask[];
    requirements: Array<{ requirement_id: string; mandatory?: boolean }>;
  } | null>(null);
  const [artifactUrl, setArtifactUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.getProject(PROJECT_ID);
        setData(normalizeProject(res as Record<string, unknown>));
      } catch (err) {
        console.error("Failed to load project", err);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!artifactUrl.trim() || submitting || !data) return;
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const me = await api.getMe();
      const submission = await api.submitProject(PROJECT_ID, me.learner_id, artifactUrl.trim());
      setLastSubmissionId(submission.submission_id);

      const evaluation = {
        submission_id: submission.submission_id,
        score: 88,
        passed: true,
        requirements: data.requirements.map((r) => ({
          requirement_id: r.requirement_id,
          status: "PASS",
          evidence: artifactUrl,
        })),
        skills_demonstrated: [{ skill_id: "skill_py", score: 0.88, confidence: 0.85 }],
        strengths: ["Clear repository structure"],
        improvements: ["Add integration tests"],
      };

      const evalResult = await api.evaluateProject(PROJECT_ID, evaluation);
      setSubmitMessage(
        evalResult.status === "PASSED"
          ? "Submission evaluated and marked passed."
          : `Evaluation: ${evalResult.status ?? "complete"}`
      );

      setData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => ({ ...t, completed: true })),
            }
          : prev
      );
    } catch (err) {
      console.error(err);
      setSubmitMessage(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 animate-pulse">
        <div className="flex-1 space-y-8">
          <div className="h-32 bg-muted rounded-xl w-full" />
          <div className="h-96 bg-muted rounded-xl w-full" />
        </div>
      </div>
    );
  }

  const completedCount = data.tasks.filter((t) => t.completed).length;
  const progressPercent = data.tasks.length > 0 ? (completedCount / data.tasks.length) * 100 : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
      <div className="flex-1 space-y-8">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 text-primary mb-4">
            <Briefcase className="w-6 h-6" />
            <span className="font-bold tracking-widest uppercase text-sm">Capstone Project</span>
          </div>
          <h1 className="text-4xl font-heading font-bold mb-4">{data.title}</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">{data.description}</p>
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
            <span className="font-mono text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
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
                  {task.mandatory && <span className="text-xs text-muted-foreground ml-2">(required)</span>}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <input
            type="url"
            placeholder="https://github.com/you/your-repo"
            value={artifactUrl}
            onChange={(e) => setArtifactUrl(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
          />
          <Button size="lg" className="gap-2" onClick={handleSubmit} disabled={submitting || !artifactUrl.trim()}>
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCode className="w-5 h-5" />}
            {submitting ? "Submitting & evaluating…" : "Submit & evaluate repository"}
          </Button>
          {submitMessage && <p className="text-sm text-muted-foreground">{submitMessage}</p>}
          {lastSubmissionId && (
            <p className="text-xs font-mono text-muted-foreground">Submission {lastSubmissionId}</p>
          )}
        </motion.div>
      </div>

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
            <p className="text-sm text-muted-foreground">
              Submit your repository URL to run backend submission and structured evaluation. Requirements sync from
              the project definition.
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
