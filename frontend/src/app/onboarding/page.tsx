"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

type RoleOption = {
  id: string;
  title: string;
  description: string;
};

type LearningStyleOption = {
  id: string;
  label: string;
  description: string;
};

type OnboardingOptions = {
  roles: RoleOption[];
  experience_levels: string[];
  learning_styles: LearningStyleOption[];
  weekly_time_options: number[];
  role_titles: Record<string, string>;
};

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<OnboardingOptions | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    target_role_id: "",
    custom_role_title: "",
    target_domain: "",
    goals: [] as string[],
    experience_level: "",
    prior_experience: "",
    known_skills_text: "",
    interests_text: "",
    learning_style: "",
    weekly_time: 10,
  });

  useEffect(() => {
    api
      .getMe()
      .then((me) => setFormData((prev) => ({ ...prev, name: me.name || prev.name })))
      .catch(() => router.push("/auth/login"));

    api.getOnboarding().then(setOptions).catch(() => setError("Failed to load onboarding options"));
  }, [router]);

  const roleTitle = useMemo(() => {
    if (!options) return formData.target_role_id;
    if (formData.target_role_id === "role_other") {
      return formData.custom_role_title.trim() || "Other";
    }
    return options.role_titles[formData.target_role_id] || formData.target_role_id;
  }, [options, formData.target_role_id, formData.custom_role_title]);

  const learningStyleLabel = useMemo(() => {
    return (
      options?.learning_styles.find((s) => s.id === formData.learning_style)?.label ||
      formData.learning_style ||
      "—"
    );
  }, [options, formData.learning_style]);

  const nextStep = () => {
    setError("");
    if (step === 1 && !formData.name.trim()) {
      return setError("Please enter your name.");
    }
    if (step === 2) {
      if (!formData.target_role_id) return setError("Please select a target role.");
      if (formData.target_role_id === "role_other" && !formData.custom_role_title.trim()) {
        return setError("Please describe your custom role.");
      }
    }
    if (step === 3 && !formData.experience_level) {
      return setError("Please select your experience level.");
    }
    if (step === 6) {
      if (!formData.learning_style) return setError("Please choose a learning style.");
      if (!formData.weekly_time) return setError("Please choose weekly available time.");
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await api.saveOnboarding({
        name: formData.name.trim(),
        target_role_id: formData.target_role_id,
        custom_role_title:
          formData.target_role_id === "role_other"
            ? formData.custom_role_title.trim()
            : undefined,
        target_domain: formData.target_domain.trim() || undefined,
        goals: formData.goals,
        experience_level: formData.experience_level,
        prior_experience: formData.prior_experience.trim() || undefined,
        known_skills: parseList(formData.known_skills_text),
        interests: parseList(formData.interests_text),
        learning_style: formData.learning_style,
        weekly_time: formData.weekly_time,
        self_reported_proficiency: {},
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save onboarding data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!options) {
    return <div className="p-8 text-center animate-pulse">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-8 mt-12 bg-card border border-border rounded-xl shadow-lg">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Onboarding (Step {step}/7)</h1>
        <span className="text-sm text-muted-foreground">{Math.round((step / 7) * 100)}%</span>
      </div>

      <div className="w-full h-2 bg-muted rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(step / 7) * 100}%` }}
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-lg">{error}</div>
      )}

      <div className="min-h-[400px]">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">About You</h2>
            <div>
              <label className="block text-sm font-medium mb-2">What should we call you?</label>
              <input
                type="text"
                className="w-full p-3 rounded-md bg-background border border-border text-foreground"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Career Goal</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Target Role</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        target_role_id: role.id,
                        custom_role_title:
                          role.id === "role_other" ? formData.custom_role_title : "",
                      })
                    }
                    className={`p-4 border rounded-lg text-left cursor-pointer hover:border-primary transition-colors ${
                      formData.target_role_id === role.id
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                  >
                    <div className="font-bold mb-1">{role.title}</div>
                    <div className="text-sm text-muted-foreground">{role.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {formData.target_role_id === "role_other" && (
              <div>
                <label className="block text-sm font-medium mb-2">Describe your role</label>
                <input
                  type="text"
                  placeholder="e.g. Platform Engineer, Security Analyst"
                  className="w-full p-3 rounded-md bg-background border border-border text-foreground"
                  value={formData.custom_role_title}
                  onChange={(e) =>
                    setFormData({ ...formData, custom_role_title: e.target.value })
                  }
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Target domain (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Finance, Healthcare, FastAPI"
                className="w-full p-3 rounded-md bg-background border border-border text-foreground"
                value={formData.target_domain}
                onChange={(e) =>
                  setFormData({ ...formData, target_domain: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Experience</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Experience level</label>
              <div className="flex flex-wrap gap-3">
                {options.experience_levels.map((lvl) => (
                  <Button
                    key={lvl}
                    type="button"
                    variant={formData.experience_level === lvl ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, experience_level: lvl })}
                  >
                    {lvl}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 mt-2">
                Prior experience (optional)
              </label>
              <textarea
                className="w-full p-3 rounded-md bg-background border border-border text-foreground min-h-[100px]"
                value={formData.prior_experience}
                onChange={(e) =>
                  setFormData({ ...formData, prior_experience: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Current Skills (Self-Reported)</h2>
            <p className="text-sm text-muted-foreground">
              Type freely. Separate skills with commas when you are ready (parsed when you
              continue).
            </p>
            <input
              type="text"
              placeholder="e.g. Python, SQL, Git"
              className="w-full p-3 rounded-md bg-background border border-border text-foreground"
              value={formData.known_skills_text}
              onChange={(e) =>
                setFormData({ ...formData, known_skills_text: e.target.value })
              }
            />
            {parseList(formData.known_skills_text).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {parseList(formData.known_skills_text).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 text-xs rounded-md bg-primary/15 text-foreground border border-border"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Interests</h2>
            <p className="text-sm text-muted-foreground">
              Topics you care about. Commas are optional until you finish typing.
            </p>
            <input
              type="text"
              placeholder="e.g. AI, Distributed Systems, Product"
              className="w-full p-3 rounded-md bg-background border border-border text-foreground"
              value={formData.interests_text}
              onChange={(e) =>
                setFormData({ ...formData, interests_text: e.target.value })
              }
            />
            {parseList(formData.interests_text).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {parseList(formData.interests_text).map((interest) => (
                  <span
                    key={interest}
                    className="px-2 py-1 text-xs rounded-md bg-primary/15 text-foreground border border-border"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8">
            <h2 className="text-xl font-semibold">Learning Preferences</h2>
            <div>
              <label className="block text-sm font-medium mb-3">Learning style</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.learning_styles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, learning_style: style.id })
                    }
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      formData.learning_style === style.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/60"
                    }`}
                  >
                    <div className="font-semibold">{style.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {style.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Weekly available time
              </label>
              <div className="flex flex-wrap gap-3">
                {options.weekly_time_options.map((hours) => (
                  <Button
                    key={hours}
                    type="button"
                    variant={formData.weekly_time === hours ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, weekly_time: hours })}
                  >
                    {hours}+ hrs
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Selected: <strong>{formData.weekly_time} hours / week</strong>
              </p>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Review & Submit</h2>
            <div className="p-6 bg-background rounded-lg border border-border text-sm space-y-3">
              <div>
                <strong>Name:</strong> {formData.name || "—"}
              </div>
              <div>
                <strong>Target role:</strong> {roleTitle}
              </div>
              {formData.target_domain.trim() && (
                <div>
                  <strong>Domain:</strong> {formData.target_domain.trim()}
                </div>
              )}
              <div>
                <strong>Experience:</strong> {formData.experience_level || "—"}
              </div>
              <div>
                <strong>Skills:</strong>{" "}
                {parseList(formData.known_skills_text).join(", ") || "—"}
              </div>
              <div>
                <strong>Interests:</strong>{" "}
                {parseList(formData.interests_text).join(", ") || "—"}
              </div>
              <div>
                <strong>Learning style:</strong> {learningStyleLabel}
              </div>
              <div>
                <strong>Weekly time:</strong> {formData.weekly_time} hrs
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Your personalized learning path will be generated from this profile.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={step === 1}>
          Back
        </Button>
        {step < 7 ? (
          <Button onClick={nextStep}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Generate My Path"}
          </Button>
        )}
      </div>
    </div>
  );
}
