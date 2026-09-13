"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.login({ email, password });
      if (res.onboarding_completed) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message === "Invalid credentials"
            ? "Wrong email or password."
            : err.message
          : "Failed to login";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg">
        <h1 className="text-3xl font-heading font-bold mb-6 text-center">Welcome Back</h1>
        {error && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-md text-sm">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-3 rounded-md bg-background border border-border text-foreground"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-3 rounded-md bg-background border border-border text-foreground"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full mt-6">
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account? <a href="/auth/signup" className="text-primary hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
