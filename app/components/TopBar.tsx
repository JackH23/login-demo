"use client";

import React, { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { ADMIN_USERNAME } from "@/lib/constants";

interface UserData {
  username: string;
  image?: string;
}

interface TopBarProps {
  title: string;
  active: "home" | "posts" | "user" | "analysis" | "setting" | "friend" | "admin";
  currentUser: UserData;
}

export default function TopBar({ title, active, currentUser }: TopBarProps) {
  const { theme } = useTheme();
  const isNight = theme === "night";

  const navLinks = useMemo(
    () =>
      [
        { key: "home" as const, href: "/home", label: "Home" },
        { key: "posts" as const, href: "/posts", label: "All Posts" },
        { key: "user" as const, href: "/user", label: "User" },
        { key: "analysis" as const, href: "/analysis", label: "Analysis" },
        { key: "friend" as const, href: "/friend", label: "Friends" },
        { key: "admin" as const, href: "/admin", label: "Admin" },
        { key: "setting" as const, href: "/setting", label: "Settings" },
      ].filter((link) =>
        link.key === "admin"
          ? currentUser.username === ADMIN_USERNAME
          : true,
      ),
    [currentUser.username],
  );

  const avatar = currentUser.image ? (
    <img
      src={currentUser.image}
      alt="Your Profile"
      className="rounded-circle shadow-sm"
      style={{
        width: "44px",
        height: "44px",
        objectFit: "cover",
      }}
    />
  ) : (
    <div
      aria-hidden
      className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm ${
        isNight ? "bg-secondary text-white" : "bg-primary text-white"
      }`}
      style={{ width: "44px", height: "44px", fontWeight: 600 }}
    >
      {currentUser.username.charAt(0).toUpperCase()}
    </div>
  );

  const welcomeMessage = `Welcome back${currentUser.username ? "," : ""}`;

  const backgroundStyle = {
    background: isNight
      ? "linear-gradient(135deg, rgba(36, 36, 36, 0.96), rgba(58, 58, 58, 0.94))"
      : "linear-gradient(135deg, rgba(248, 249, 255, 0.95), rgba(255, 255, 255, 0.9))",
    borderBottom: "1px solid rgba(222, 226, 230, 0.45)",
    boxShadow: isNight
      ? "0 18px 45px rgba(0, 0, 0, 0.35)"
      : "0 18px 45px rgba(31, 45, 61, 0.12)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  } as const;

  return (
    <div className={`position-sticky top-0 z-3 ${isNight ? "text-white" : "text-dark"}`} style={backgroundStyle}>
      <div className="d-flex justify-content-between align-items-center px-4 pt-3 pb-2 gap-3">
        <div>
          <p className="mb-1 small text-uppercase tracking-wide text-secondary fw-semibold">
            {welcomeMessage}
          </p>
          <h2 className="mb-0 fw-bold">{title}</h2>
        </div>
        <div className="d-flex align-items-center gap-3">
          {avatar}
          <div className="d-flex flex-column">
            <span className="fw-semibold">{currentUser.username}</span>
            <small className={`text-secondary ${isNight ? "text-white-50" : ""}`}>
              {isNight ? "Night mode" : "Light mode"}
            </small>
          </div>
          <a href="/logout" className="btn btn-sm btn-gradient">
            Log Out
          </a>
        </div>
      </div>

      <div className="px-4 pb-3">
        <nav aria-label="Primary navigation">
          <ul className="nav gap-2 flex-wrap">
            {navLinks.map((link) => {
              const isActive = active === link.key;
              return (
                <li className="nav-item" key={link.key}>
                  <a
                    className={`nav-link nav-link-elevated ${
                      isActive ? "active" : ""
                    } ${isNight ? "text-white" : "text-dark"}`}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span>{link.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <style jsx>{`
        .tracking-wide {
          letter-spacing: 0.08em;
        }

        .nav-link-elevated {
          border-radius: 999px;
          padding: 0.625rem 1.25rem;
          font-weight: 600;
          position: relative;
          background-color: transparent;
          transition: transform 0.2s ease, box-shadow 0.2s ease,
            background-color 0.2s ease;
        }

        .nav-link-elevated:hover,
        .nav-link-elevated:focus {
          transform: translateY(-2px);
          box-shadow: 0 10px 18px rgba(31, 45, 61, 0.18);
        }

        .nav-link-elevated.active {
          background-image: linear-gradient(
            135deg,
            #6366f1,
            #8b5cf6
          );
          color: #fff !important;
          box-shadow: 0 12px 30px rgba(99, 102, 241, 0.35);
        }

        .btn-gradient {
          background-image: linear-gradient(135deg, #ef4444, #f97316);
          border: none;
          color: #fff;
          padding-inline: 1.125rem;
          padding-block: 0.5rem;
          font-weight: 600;
          border-radius: 999px;
          box-shadow: 0 8px 18px rgba(249, 115, 22, 0.35);
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }

        .btn-gradient:hover,
        .btn-gradient:focus {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(249, 115, 22, 0.45);
          opacity: 0.95;
        }

        @media (max-width: 768px) {
          .nav-link-elevated {
            padding: 0.5rem 1rem;
          }

          .btn-gradient {
            padding-inline: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
