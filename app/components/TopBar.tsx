"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo } from "react";
import {
  BarChart3,
  FileText,
  Home,
  LogOut,
  MoonStar,
  Settings2,
  ShieldCheck,
  SunMedium,
  UserCircle2,
  Users,
} from "lucide-react";
import { ADMIN_USERNAME } from "@/lib/constants";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface UserData {
  username: string;
  image?: string;
}

type ActivePage =
  | "home"
  | "posts"
  | "user"
  | "analysis"
  | "setting"
  | "friend"
  | "admin";

interface TopBarProps {
  title: string;
  active: ActivePage;
  currentUser: UserData;
}

function getGreeting() {
  const currentHour = new Date().getHours();
  if (currentHour < 12) {
    return "Good morning";
  }
  if (currentHour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

export default function TopBar({ title, active, currentUser }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const greeting = getGreeting();

  const handleLogout = useCallback(() => {
    logout();
    router.push("/signin");
  }, [logout, router]);

  const navItems = useMemo(() => {
    const baseItems: Array<{
      key: ActivePage;
      label: string;
      href: string;
      icon: React.ComponentType<{ size?: number; className?: string }>;
    }> = [
      { key: "home", label: "Home", href: "/home", icon: Home },
      { key: "posts", label: "All Posts", href: "/posts", icon: FileText },
      { key: "user", label: "Profile", href: "/user", icon: UserCircle2 },
      { key: "analysis", label: "Analysis", href: "/analysis", icon: BarChart3 },
      { key: "friend", label: "Friends", href: "/friend", icon: Users },
      { key: "setting", label: "Settings", href: "/setting", icon: Settings2 },
    ];

    if (currentUser.username === ADMIN_USERNAME) {
      baseItems.splice(5, 0, {
        key: "admin",
        label: "Admin",
        href: "/admin",
        icon: ShieldCheck,
      });
    }

    return baseItems;
  }, [currentUser.username]);

  const containerStyle: React.CSSProperties = {
    borderBottom:
      theme === "night"
        ? "1px solid rgba(148, 163, 184, 0.15)"
        : "1px solid rgba(15, 23, 42, 0.08)",
    background:
      theme === "night"
        ? "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.92) 100%)"
        : "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow:
      theme === "night"
        ? "0 18px 45px -20px rgba(15, 23, 42, 0.9)"
        : "0 18px 45px -20px rgba(100, 116, 139, 0.35)",
  };

  const themeToggleLabel =
    theme === "night" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <div
      className={`position-sticky top-0 z-3 ${
        theme === "night" ? "text-white" : "text-dark"
      }`}
      style={containerStyle}
    >
      <div className="px-4 pt-3 pb-2">
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-center">
          <div>
            <p className="text-uppercase fw-semibold small mb-1 text-secondary-emphasis opacity-75">
              {greeting}, {currentUser.username}
            </p>
            <h2 className="mb-0 d-flex align-items-center gap-2">
              {title}
              <span
                className="badge rounded-pill bg-primary bg-opacity-10 text-primary fw-semibold"
              >
                Dashboard
              </span>
            </h2>
          </div>
          <div className="d-flex align-items-center gap-3 flex-wrap justify-content-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
              onClick={() => setTheme(theme === "night" ? "brightness" : "night")}
              aria-label={themeToggleLabel}
              title={themeToggleLabel}
            >
              {theme === "night" ? (
                <SunMedium size={18} />
              ) : (
                <MoonStar size={18} />
              )}
              <span className="d-none d-sm-inline">
                {theme === "night" ? "Light mode" : "Dark mode"}
              </span>
            </button>
            <Link
              href="/create-blog"
              className="btn btn-sm btn-primary d-flex align-items-center gap-2"
            >
              <FileText size={18} />
              <span>New Post</span>
            </Link>
            <div className="d-flex align-items-center gap-2">
              {currentUser.image && (
                <img
                  src={currentUser.image}
                  alt="Your profile"
                  className="rounded-circle border border-2 border-primary-subtle shadow-sm"
                  style={{ width: "42px", height: "42px", objectFit: "cover" }}
                />
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2"
              >
                <LogOut size={18} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="d-flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            const baseClass =
              "nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0 fw-semibold";
            const visualState = isActive
              ? "active text-white shadow-sm"
              : theme === "night"
              ? "text-white-50 bg-transparent"
              : "text-secondary bg-white bg-opacity-75";

            const style: React.CSSProperties = isActive
              ? {
                  background:
                    theme === "night"
                      ? "linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.35))"
                      : "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(14, 165, 233, 0.3))",
                  color: "#fff",
                  boxShadow:
                    theme === "night"
                      ? "0 12px 30px -12px rgba(59, 130, 246, 0.55)"
                      : "0 12px 30px -12px rgba(14, 165, 233, 0.55)",
                }
              : {
                  background:
                    theme === "night"
                      ? "rgba(148, 163, 184, 0.12)"
                      : "rgba(226, 232, 240, 0.65)",
                  transition: "all 0.2s ease", 
                };

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`${baseClass} ${visualState}`}
                style={style}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
