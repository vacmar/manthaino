"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  mode: "login" | "signup";
};

export function AuthShell({ children, mode }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0710] text-zinc-100">
      {/* Atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 15% 20%, rgba(15, 118, 110, 0.28), transparent 55%),
            radial-gradient(ellipse 70% 50% at 90% 80%, rgba(109, 40, 217, 0.22), transparent 50%),
            linear-gradient(165deg, #0a0710 0%, #120c1c 45%, #0d1520 100%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        {/* Brand / problem plane */}
        <section className="flex flex-1 flex-col justify-between px-8 py-10 md:px-12 lg:py-14">
          <Link href="/" className="inline-flex items-center gap-3 w-fit">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-lg font-bold text-white shadow-lg shadow-teal-900/40">
              m
            </span>
            <span className="font-heading text-2xl font-bold tracking-tight text-white">
              manthaino
            </span>
          </Link>

          <div className="my-12 max-w-lg lg:my-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-400/90">
              Learn on ur phase
            </p>
            <h1 className="font-heading text-4xl font-bold leading-[1.1] text-white md:text-5xl">
              Fixed courses ignore how you actually learn.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-zinc-400 md:text-lg">
              manthaino builds a path for <em className="text-zinc-200 not-italic">your</em> role
              on Exasol, then teaches node-by-node with an AI tutor — mastery unlocks the next
              step, not a checkbox.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-zinc-400">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                Any career goal — including free-text “Other”
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                Backend-owned unlocks (the model cannot cheat progress)
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                Identity on Exasol Personal · Local deploy
              </li>
            </ul>
          </div>

          <p className="text-xs text-zinc-600">
            Exasol Devjam · Adaptive learning platform
          </p>
        </section>

        {/* Form plane — glass so page atmosphere shows through (no solid “other color” slab) */}
        <section className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-10 lg:pb-0">
          <div
            className="w-full max-w-md rounded-2xl border border-white/[0.12] p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)] backdrop-blur-[18px]"
            style={{
              background:
                "linear-gradient(155deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 45%, rgba(10,7,16,0.25) 100%)",
            }}
          >
            {children}
            <p className="mt-6 text-center text-sm text-zinc-500">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/signup" className="font-medium text-teal-400 hover:text-teal-300">
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link href="/auth/login" className="font-medium text-teal-400 hover:text-teal-300">
                    Log in
                  </Link>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export const authFieldClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-teal-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-teal-600/30";

export const authLabelClass = "mb-2 block text-sm font-medium text-zinc-300";
