"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    target_role_id: "",
    target_domain: "",
    goals: [] as string[],
    experience_level: "",
    prior_experience: "",
    known_skills: [] as string[],
    self_reported_proficiency: {} as Record<string, number>,
    interests: [] as string[],
    learning_style: "",
    weekly_time: 10,
  });

  useEffect(() => {
    // Check if authenticated
    api.getMe().then((me) => {
      setFormData(prev => ({ ...prev, name: me.name }));
    }).catch(() => router.push("/auth/login"));

    api.getOnboarding().then(setOptions);
  }, []);

  const nextStep = () => {
    setError("");
    // Basic validation
    if (step === 2 && !formData.target_role_id) return setError("Please select a target role.");
    if (step === 3 && !formData.experience_level) return setError("Please select your experience level.");
    setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await api.saveOnboarding(formData);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to save onboarding data");
    } finally {
      setLoading(false);
    }
  };

  if (!options) return <div className="p-8 text-center animate-pulse">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-8 mt-12 bg-card border border-border rounded-xl shadow-lg">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Onboarding (Step {step}/7)</h1>
        <span className="text-sm text-muted-foreground">{Math.round((step/7)*100)}%</span>
      </div>

      <div className="w-full h-2 bg-muted rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step/7)*100}%` }}></div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-lg">{error}</div>}

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
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Career Goal</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Target Role</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {options.roles.map((role: any) => (
                  <div 
                    key={role.id} 
                    onClick={() => setFormData({...formData, target_role_id: role.id})}
                    className={`p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors ${formData.target_role_id === role.id ? 'border-primary bg-primary/10' : 'border-border'}`}
                  >
                    <div className="font-bold mb-1">{role.title}</div>
                    <div className="text-sm text-muted-foreground">{role.description}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 mt-6">Target Domain (optional)</label>
              <input 
                type="text" placeholder="e.g. Finance, Healthcare"
                className="w-full p-3 rounded-md bg-background border border-border text-foreground"
                value={formData.target_domain}
                onChange={e => setFormData({...formData, target_domain: e.target.value})}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Experience</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Experience Level</label>
              <div className="flex gap-4">
                {options.experience_levels.map((lvl: string) => (
                  <Button 
                    key={lvl} type="button" 
                    variant={formData.experience_level === lvl ? 'default' : 'outline'}
                    onClick={() => setFormData({...formData, experience_level: lvl})}
                  >
                    {lvl}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 mt-6">Prior Experience details (optional)</label>
              <textarea 
                className="w-full p-3 rounded-md bg-background border border-border text-foreground min-h-[100px]"
                value={formData.prior_experience}
                onChange={e => setFormData({...formData, prior_experience: e.target.value})}
              ></textarea>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Current Skills (Self-Reported)</h2>
            <p className="text-sm text-muted-foreground">List a few skills you already know (comma separated).</p>
            <input 
                type="text" placeholder="e.g. Python, SQL"
                className="w-full p-3 rounded-md bg-background border border-border text-foreground"
                value={formData.known_skills.join(", ")}
                onChange={e => setFormData({...formData, known_skills: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}
              />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Interests</h2>
            <p className="text-sm text-muted-foreground">What topics interest you? (comma separated)</p>
            <input 
                type="text" placeholder="e.g. AI, Distributed Systems"
                className="w-full p-3 rounded-md bg-background border border-border text-foreground"
                value={formData.interests.join(", ")}
                onChange={e => setFormData({...formData, interests: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}
              />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Learning Preferences</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Learning Style</label>
              <input 
                  type="text" placeholder="e.g. Visual, Hands-on"
                  className="w-full p-3 rounded-md bg-background border border-border text-foreground"
                  value={formData.learning_style}
                  onChange={e => setFormData({...formData, learning_style: e.target.value})}
                />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 mt-6">Weekly Available Time (hours)</label>
              <input 
                  type="number" min="1" max="168"
                  className="w-full p-3 rounded-md bg-background border border-border text-foreground"
                  value={formData.weekly_time}
                  onChange={e => setFormData({...formData, weekly_time: parseInt(e.target.value) || 0})}
                />
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Review & Submit</h2>
            <div className="p-6 bg-background rounded-lg border border-border text-sm space-y-4">
              <div><strong>Name:</strong> {formData.name}</div>
              <div><strong>Target Role:</strong> {formData.target_role_id}</div>
              <div><strong>Experience Level:</strong> {formData.experience_level}</div>
              <div><strong>Skills:</strong> {formData.known_skills.join(", ")}</div>
              <div><strong>Weekly Time:</strong> {formData.weekly_time} hrs</div>
            </div>
            <p className="text-muted-foreground text-sm">
              Please review your details. Your personalized learning path will be generated based on this information.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={step === 1}>Back</Button>
        {step < 7 ? (
          <Button onClick={nextStep}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Generate My Path"}</Button>
        )}
      </div>
    </div>
  );
}
