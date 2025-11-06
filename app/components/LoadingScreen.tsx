"use client";

import { useMemo } from "react";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  showTip?: boolean;
}

const LOADING_TIPS = [
  "Pro tip: Draft bold ideas—refine them later.",
  "Need inspiration? Revisit your top-performing posts.",
  "Remember to check in on your friends’ latest updates.",
  "Try scheduling a post to keep your audience engaged.",
  "Personalize your profile so others recognize you instantly.",
];

export default function LoadingScreen({
  title = "Preparing your experience",
  subtitle = "We\'re gathering the freshest data for you.",
  showTip = true,
}: LoadingScreenProps) {
  const tip = useMemo(
    () => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)],
    []
  );

  return (
    <div className="relative flex min-h-[70vh] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-6 py-16 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.25),transparent_55%)]" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.2),transparent_60%)]" aria-hidden />
      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 px-10 py-12 shadow-[0_30px_60px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center">
          <span className="sr-only">Loading</span>
          <div className="relative h-full w-full">
            <div className="absolute inset-0 rounded-full border-4 border-white/30" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-white" />
            <div className="absolute inset-2 rounded-full bg-white/20 blur-md" aria-hidden />
          </div>
        </div>
        <div className="mt-8 space-y-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          <p className="text-sm text-white/80 sm:text-base">{subtitle}</p>
        </div>
        <div className="mt-8 flex flex-col gap-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="loading-bar h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200"
              aria-hidden
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.25em] text-white/60 sm:text-xs">
            <span className="font-medium text-white">Syncing</span>
            <span>Refreshing</span>
            <span>Finalizing</span>
          </div>
        </div>
        {showTip && (
          <div className="mt-10 rounded-2xl bg-black/25 px-6 py-5 text-left shadow-inner">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
              Quick tip
            </div>
            <p className="mt-2 text-sm text-white/80">{tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}
