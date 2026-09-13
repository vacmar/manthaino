# Product flow

High-level learner journey (GOAL → learn → verify → replan):

1. **Sign up / log in** — session established via backend auth.
2. **Onboarding** — goal, profile, self-reported skills; backend seeds or regenerates an active path.
3. **Dashboard / path** — view nodes; locked nodes show prerequisite reasons; regenerate path when goals or proficiency change.
4. **Workspace / lesson** — consume node content; tutor chat via AI service; complete node when assessment + practical criteria met.
5. **Assessment & verification** — adaptive/practical signals fused into verified proficiency; discrepancies vs self-claim surfaced on profile/assessment.
6. **Projects** — submit artifact URL; structured evaluation updates evidence and may unlock downstream nodes.
7. **Progress** — mastery, weak concepts (mistakes), completed nodes, history timeline.
8. **Replan** — `POST /paths/{path_id}/regenerate` preserves completed work and explains node additions/removals.

Demo walkthrough: [demo-script.md](./demo-script.md).
