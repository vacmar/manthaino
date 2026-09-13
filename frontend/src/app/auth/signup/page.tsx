"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AuthShell, authFieldClass, authLabelClass } from "@/components/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.signup({ name, email, password });
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="signup">
      <h2 className="font-heading text-2xl font-bold text-white">Create your account</h2>
      <p className="mt-1.5 mb-6 text-sm text-zinc-500">
        Start a path built for your role — not a generic syllabus.
      </p>
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/15 px-3 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className={authLabelClass}>Name</label>
          <input
            type="text"
            required
            autoComplete="name"
            className={authFieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className={authLabelClass}>Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            className={authFieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className={authLabelClass}>Password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            className={authFieldClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className={authLabelClass}>Confirm password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            className={authFieldClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-teal-700 py-6 text-base font-semibold hover:bg-teal-600"
        >
          {loading ? "Creating account…" : "Sign up"}
        </Button>
      </form>
    </AuthShell>
  );
}
