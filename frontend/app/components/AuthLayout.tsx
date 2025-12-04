"use client";

import React from "react";
import { useTheme } from "../context/ThemeContext";

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  const { theme } = useTheme();
  const wrapperThemeClass = theme === "night" ? "bg-dark text-white" : "bg-light";

  return (
    <div
      className={`auth-wrapper d-flex align-items-center justify-content-center min-vh-100 ${wrapperThemeClass}`}
    >
      <div className="card shadow auth-card border-0 bg-body text-body">
        <div className="card-body p-4 p-md-5">
          <h2 className="card-title h3 text-center mb-4">{title}</h2>
          <div className="auth-content">{children}</div>
          {footer ? <div className="auth-footer text-center mt-4 mb-0">{footer}</div> : null}
        </div>
      </div>
      <style jsx>{`
        .auth-wrapper {
          width: 100%;
          padding: 2rem 1.25rem;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        @media (min-width: 576px) {
          .auth-wrapper {
            padding: 3rem 1.5rem;
          }
        }

        .auth-card {
          width: min(100%, 30rem);
          margin: 0 auto;
          border-radius: 0.75rem;
        }

        .card-title {
          letter-spacing: 0.01em;
        }

        .auth-content :global(.form-control) {
          min-height: 3rem;
        }

        .auth-content :global(.btn-primary) {
          min-height: 3rem;
          font-weight: 600;
        }

        .auth-footer {
          font-size: 0.9rem;
          color: var(--bs-secondary-color);
        }

        .animated-ellipsis {
          display: inline-flex;
          justify-content: space-between;
          align-items: flex-end;
          width: 1.5rem;
        }

        .animated-ellipsis .dot {
          display: inline-block;
          width: 0.25rem;
          height: 0.25rem;
          border-radius: 50%;
          background-color: currentColor;
          opacity: 0.35;
          animation: signing-ellipsis 0.9s infinite ease-in-out;
        }

        .animated-ellipsis .dot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .animated-ellipsis .dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes signing-ellipsis {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }

          40% {
            transform: translateY(-0.25rem);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
