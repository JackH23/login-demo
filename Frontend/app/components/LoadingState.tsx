"use client";

import { useTheme } from "../context/ThemeContext";

interface LoadingStateProps {
  title?: string;
  subtitle?: string;
  skeletonCount?: number;
}

export default function LoadingState({
  title = "Loading your workspace",
  subtitle = "We’re preparing the latest content tailored for you.",
  skeletonCount = 3,
}: LoadingStateProps) {
  const { theme } = useTheme();
  const isNight = theme === "night";
  const count = Math.max(1, Math.floor(skeletonCount));

  return (
    <div
      className={`app-loading-screen ${
        isNight ? "app-loading-screen--night" : "app-loading-screen--day"
      }`}
    >
      <div className="app-loading-shell">
        <div className="app-loading-intro" role="status" aria-live="polite">
          <div className="app-loading-visual" aria-hidden="true">
            <span className="app-loading-glow" />
            <span className="app-loading-spinner" />
          </div>
          <div className="app-loading-copy">
            <p className="app-loading-kicker text-uppercase fw-semibold mb-2">
              Just a moment
            </p>
            <h1 className="app-loading-title fw-bold mb-2">{title}</h1>
            <p className="app-loading-subtitle mb-4">{subtitle}</p>
            <div className="app-loading-progress" aria-hidden="true" />
            <span className="visually-hidden">{title}</span>
          </div>
        </div>

        <div className="app-loading-skeleton-grid" aria-hidden="true">
          {Array.from({ length: count }, (_, index) => (
            <div
              key={index}
              className={`app-loading-card ${
                isNight ? "app-loading-card--night" : "app-loading-card--day"
              }`}
            >
              <div className="app-loading-card-header">
                <span className="app-loading-chip" />
                <span className="app-loading-chip app-loading-chip--muted" />
              </div>
              <div className="app-loading-bar app-loading-bar--lg" />
              <div className="app-loading-bar app-loading-bar--md" />
              <div className="app-loading-bar app-loading-bar--sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
