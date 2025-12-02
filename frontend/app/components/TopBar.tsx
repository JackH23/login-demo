"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
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
  Plus,
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

type NavItem = {
  key: ActivePage;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

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
    const baseItems: NavItem[] = [
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

  const [optimisticActive, setOptimisticActive] = useState<ActivePage>(active);
  const [isNavigating, startTransition] = useTransition();

  useEffect(() => {
    setOptimisticActive(active);
  }, [active]);

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [navItems, router]);

  const prefetchRoute = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  const handleNavClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0 ||
        event.defaultPrevented
      ) {
        return;
      }

      event.preventDefault();
      if (optimisticActive !== item.key) {
        setOptimisticActive(item.key);
      }

      startTransition(() => {
        router.push(item.href);
      });
    },
    [optimisticActive, router, startTransition],
  );

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

  const buttonBaseStyle: React.CSSProperties = {
    minHeight: 42,
    minWidth: 42,
    padding: "0.35rem 0.65rem",
    borderRadius: 12,
  };

  return (
    <div
      className={`position-sticky top-0 z-3 ${
        theme === "night" ? "text-white" : "text-dark"
      }`}
      style={containerStyle}
    >
      <div className="px-3 py-2">
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-start align-items-lg-center">
          <div className="d-flex flex-column gap-1">
            <p className="text-uppercase fw-semibold small mb-0 text-secondary-emphasis opacity-75">
              {greeting}, {currentUser.username}
            </p>
            <h4 className="mb-0 d-flex align-items-center gap-2 fw-semibold" style={{ letterSpacing: "-0.01em" }}>
              {title}
            </h4>
          </div>
          <div
            className="d-grid d-lg-flex gap-2 flex-grow-1 flex-lg-grow-0 align-items-center justify-content-lg-end"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
          >
            <button
              type="button"
              className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2"
              style={buttonBaseStyle}
              onClick={() => setTheme(theme === "night" ? "brightness" : "night")}
              aria-label={themeToggleLabel}
              title={themeToggleLabel}
            >
              {theme === "night" ? (
                <SunMedium size={18} />
              ) : (
                <MoonStar size={18} />
              )}
              <span className="d-none d-md-inline fw-semibold small">
                {theme === "night" ? "Light" : "Dark"}
              </span>
            </button>

            <Link
              href="/posts/create"
              className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
              style={buttonBaseStyle}
            >
              <Plus size={18} />
              <span className="d-none d-md-inline fw-semibold small">New</span>
            </Link>

            <div className="d-flex align-items-center gap-2 justify-content-center">
              {currentUser.image && (
                <img
                  src={currentUser.image}
                  alt="Your profile"
                  className="rounded-3 border border-2 border-primary-subtle shadow-sm"
                  style={{ width: "42px", height: "42px", objectFit: "cover" }}
                />
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2"
              style={buttonBaseStyle}
            >
              <LogOut size={18} />
              <span className="d-none d-md-inline fw-semibold small">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 pb-2 d-none d-lg-block">
        <div className="d-flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = optimisticActive === item.key;
            const isPendingSelection =
              isNavigating && active !== item.key && optimisticActive === item.key;
            const baseClass =
              "nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-2 border-0 fw-semibold";
            const visualState = isActive
              ? "active text-white shadow-sm"
              : theme === "night"
              ? "text-white-50 bg-transparent"
              : "text-secondary bg-white bg-opacity-75";

            const baseStyle: React.CSSProperties = isActive
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
                  fontSize: "0.95rem",
                }
              : {
                  background:
                    theme === "night"
                      ? "rgba(148, 163, 184, 0.12)"
                      : "rgba(226, 232, 240, 0.65)",
                  transition: "all 0.2s ease",
                  fontSize: "0.95rem",
                };

            const style =
              isPendingSelection && !isActive
                ? { ...baseStyle, opacity: 0.8 }
                : baseStyle;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`${baseClass} ${visualState}`}
                style={style}
                aria-current={isActive ? "page" : undefined}
                onPointerEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                onClick={(event) => handleNavClick(event, item)}
              >
                <Icon size={18} />
                <span className="small fw-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div
        className="d-lg-none position-fixed bottom-0 start-0 end-0 px-3 pb-3"
        style={{ pointerEvents: "none" }}
      >
        <div
          className={`d-flex justify-content-between align-items-center rounded-3 shadow-sm px-3 py-2 ${
            theme === "night" ? "bg-dark bg-opacity-95" : "bg-white"
          }`}
          style={{ pointerEvents: "auto", border: "1px solid rgba(148, 163, 184, 0.18)" }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = optimisticActive === item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`d-flex flex-column align-items-center text-decoration-none gap-1 px-2 ${
                  isActive
                    ? "text-primary"
                    : theme === "night"
                    ? "text-white-50"
                    : "text-secondary"
                }`}
                onClick={(event) => handleNavClick(event, item)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} />
                <span className="small fw-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <Link
        href="/posts/create"
        className={`position-fixed d-flex align-items-center justify-content-center rounded-circle shadow-lg ${
          theme === "night" ? "bg-primary text-white" : "bg-primary text-white"
        }`}
        style={{
          width: 56,
          height: 56,
          bottom: 88,
          right: 20,
          zIndex: 1030,
        }}
        aria-label="Create a new post"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
