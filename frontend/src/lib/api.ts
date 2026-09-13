
export interface PathNode {
  node_id: string;
  course_id: string;
  course_title?: string;
  status: "LOCKED" | "UNLOCKED" | "IN_PROGRESS" | "COMPLETED";
  sequence_order: number;
}

export interface LearningPath {
  path_id: string;
  learner_id: string;
  nodes: PathNode[];
  is_active: boolean;
  goal?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  structured?: any;
}

export interface UnlockConditions {
  locked: boolean;
  reasons: Array<{
    prerequisite_skill: string;
    required_proficiency: number;
    current_proficiency: number;
    status: string;
  }>;
}

export interface RegeneratePathResult {
  path_id: string;
  version: number;
  previous_path_id: string;
  changed: boolean;
  nodes: PathNode[];
  changes: Array<{ type: string; course_id: string; reason: string }>;
  proficiency_changes: unknown[];
}

export interface VerificationResult {
  learner_id: string;
  discrepancies: Array<{
    skill_id: string;
    claimed_proficiency: number;
    verified_proficiency: number;
    gap: number;
  }>;
  has_discrepancy: boolean;
}

export interface CompletionPayload {
  learner_id: string;
  assessment_score?: number;
  practical_pass?: boolean;
}

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8001";

const defaultFetchOpts: RequestInit = {
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  }
};

export const api = {
  // Auth
  async signup(data: any): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/auth/signup`, { ...defaultFetchOpts, method: "POST", body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async login(data: any): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/auth/login`, { ...defaultFetchOpts, method: "POST", body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async logout(): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/auth/logout`, { ...defaultFetchOpts, method: "POST" });
    return res.json();
  },
  async getMe(): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/auth/me`, { ...defaultFetchOpts });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  },

  // Paths & Lessons
  async getActivePath(): Promise<LearningPath> {
    const res = await fetch(`${BACKEND_URL}/paths/me/active`, { ...defaultFetchOpts, cache: "no-store" });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return res.json();
  },

  async ensureActivePath(): Promise<LearningPath & { regenerated?: boolean }> {
    const res = await fetch(`${BACKEND_URL}/paths/me/ensure`, {
      ...defaultFetchOpts,
      method: "POST",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return res.json();
  },

  async completeLesson(learnerId: string, nodeId: string, opts?: { assessment_score?: number; practical_pass?: boolean }): Promise<any> {
    const body: CompletionPayload = {
      learner_id: learnerId,
      assessment_score: opts?.assessment_score ?? 85,
      practical_pass: opts?.practical_pass ?? true,
    };
    const res = await fetch(`${BACKEND_URL}/nodes/${nodeId}/complete`, {
      ...defaultFetchOpts,
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to complete lesson: ${res.status}`);
    return res.json();
  },

  async startNode(nodeId: string): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/nodes/${nodeId}/start`, { ...defaultFetchOpts, method: "POST" });
    if (!res.ok) throw new Error(`Failed to start node: ${res.status}`);
    return res.json();
  },

  async getNodeProgress(nodeId: string): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/nodes/${nodeId}/progress`, { ...defaultFetchOpts, cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to get node progress: ${res.status}`);
    return res.json();
  },

  async getWeakConcepts(nodeId: string, learnerId: string): Promise<{ weak_concepts: Array<{ concept: string; error_count: number; latest_description: string }> }> {
    const res = await fetch(
      `${BACKEND_URL}/nodes/${nodeId}/mistakes?learner_id=${encodeURIComponent(learnerId)}`,
      { ...defaultFetchOpts, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`Failed to get weak concepts: ${res.status}`);
    return res.json();
  },

  async getUnlockConditions(nodeId: string, learnerId: string): Promise<UnlockConditions> {
    const res = await fetch(
      `${BACKEND_URL}/nodes/${nodeId}/unlock-conditions?learner_id=${encodeURIComponent(learnerId)}`,
      { ...defaultFetchOpts, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`Failed to get unlock conditions: ${res.status}`);
    return res.json();
  },

  async regeneratePath(pathId: string, learnerId: string): Promise<RegeneratePathResult> {
    const res = await fetch(`${BACKEND_URL}/paths/${pathId}/regenerate`, {
      ...defaultFetchOpts,
      method: "POST",
      body: JSON.stringify({ learner_id: learnerId }),
    });
    if (!res.ok) throw new Error(`Failed to regenerate path: ${res.status}`);
    return res.json();
  },

  async getVerification(): Promise<VerificationResult | null> {
    try {
      const me = await this.getMe();
      const skillIds = new Set<string>([
        ...(me.known_skills ?? []),
        ...Object.keys(me.self_reported_proficiency ?? {}),
      ]);
      if (skillIds.size === 0) return null;

      const discrepancies: VerificationResult["discrepancies"] = [];
      for (const skill_id of skillIds) {
        const res = await fetch(`${BACKEND_URL}/verification/skills/${encodeURIComponent(skill_id)}/result`, {
          ...defaultFetchOpts,
          cache: "no-store",
        });
        if (!res.ok) continue;
        const body = await res.json();
        const result = body.result ?? body;
        if (result.discrepancy) {
          discrepancies.push({
            skill_id,
            claimed_proficiency: result.claimed_proficiency,
            verified_proficiency: result.verified_proficiency,
            gap: result.discrepancy_delta ?? result.claimed_proficiency - result.verified_proficiency,
          });
        }
      }

      if (discrepancies.length === 0) return null;
      return {
        learner_id: me.learner_id,
        discrepancies,
        has_discrepancy: true,
      };
    } catch {
      return null;
    }
  },

  async startAssessment(assessmentId: string): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/assessments/start?assessment_id=${assessmentId}`, { ...defaultFetchOpts, method: "POST" });
    if (!res.ok) throw new Error(`Failed to start assessment: ${res.status}`);
    return res.json();
  },

  async submitAssessmentAnswer(assessmentId: string, questionId: string, answer: string): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/assessments/${assessmentId}/answer`, {
      ...defaultFetchOpts,
      method: "POST",
      body: JSON.stringify({ question_id: questionId, answer }),
    });
    if (!res.ok) throw new Error(`Failed to submit answer: ${res.status}`);
    return res.json();
  },

  async finalizeAssessment(assessmentId: string): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/assessments/${assessmentId}/finalize`, { ...defaultFetchOpts, method: "POST" });
    if (!res.ok) throw new Error(`Failed to finalize assessment: ${res.status}`);
    return res.json();
  },

  // Projects
  async getProject(projectId: string): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/projects/${projectId}`, { ...defaultFetchOpts });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return res.json();
  },

  async getRecommendedProject(): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/projects/me/recommended`, { ...defaultFetchOpts });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return res.json();
  },

  async submitProject(projectId: string, learnerId: string, artifact: string): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/projects/${projectId}/submit`, {
      ...defaultFetchOpts,
      method: "POST",
      body: JSON.stringify({ learner_id: learnerId, artifact }),
    });
    if (!res.ok) throw new Error(`Failed to submit project: ${res.status}`);
    return res.json();
  },

  async evaluateProject(projectId: string, evaluation: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/projects/${projectId}/evaluate`, {
      ...defaultFetchOpts,
      method: "POST",
      body: JSON.stringify(evaluation),
    });
    if (!res.ok) throw new Error(`Failed to evaluate project: ${res.status}`);
    return res.json();
  },

  // Profile & Goals
  async getProfile(): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/learners/me`, { ...defaultFetchOpts });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return res.json();
  },

  async getGoals(): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/goals/`, { ...defaultFetchOpts });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return res.json();
  },

  // Onboarding
  async getOnboarding(): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/onboarding/`, { ...defaultFetchOpts });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return res.json();
  },

  async saveOnboarding(data: any): Promise<any> {
    const res = await fetch(`${BACKEND_URL}/onboarding/`, { ...defaultFetchOpts, method: "POST", body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return res.json();
  },

  // AI Service Calls
  async chatTutor(message: string, learnerId: string, nodeId: string): Promise<ChatMessage> {
    const res = await fetch(`${AI_SERVICE_URL}/chat`, {
      ...defaultFetchOpts,
      method: "POST",
      body: JSON.stringify({ message, learner_id: learnerId, node_id: nodeId }),
    });
    if (!res.ok) throw new Error(`Failed to chat: ${res.status}`);
    return res.json();
  }
};
