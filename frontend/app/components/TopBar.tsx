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
  Plus,
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

  return (
    <div
      className={`position-sticky top-0 z-3 ${
        theme === "night" ? "text-white" : "text-dark"
      }`}
      style={containerStyle}
    >
      <div className="px-3 py-2">
        <div className="d-flex flex-column gap-3">
          <div className="d-flex align-items-start justify-content-between gap-2">
            <div>
              <p className="text-uppercase fw-semibold small mb-1 text-secondary-emphasis opacity-75">
                {greeting}, {currentUser.username}
              </p>
              <h3 className="h5 mb-0 d-flex align-items-center gap-2">{title}</h3>
            </div>
            <div className="d-none d-md-flex align-items-center gap-2">
              <Link
                href="/posts/create"
                className="btn btn-sm btn-primary d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 42, height: 42 }}
                aria-label="Create a new post"
              >
                <Plus size={18} />
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 42, height: 42 }}
                onClick={() => setTheme(theme === "night" ? "brightness" : "night")}
                aria-label={themeToggleLabel}
                title={themeToggleLabel}
              >
                {theme === "night" ? <SunMedium size={18} /> : <MoonStar size={18} />}
              </button>
              <Link
                href="/user"
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center rounded-circle border-0"
                style={{ width: 42, height: 42 }}
                aria-label="Go to profile"
              >
                {currentUser.image ? (
                  <img
                    src={currentUser.image}
                    alt="Your profile"
                    className="rounded-circle border border-2 border-primary-subtle shadow-sm"
                    style={{ width: 36, height: 36, objectFit: "cover" }}
                  />
                ) : (
                  <UserCircle2 size={18} />
                )}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 42, height: 42 }}
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="d-md-none">
            <div
              className="d-grid gap-2"
              style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
            >
              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-center rounded-md"
                style={{ height: 44 }}
                onClick={() => setTheme(theme === "night" ? "brightness" : "night")}
                aria-label={themeToggleLabel}
                title={themeToggleLabel}
              >
                {theme === "night" ? <SunMedium size={18} /> : <MoonStar size={18} />}
              </button>
              <Link
                href="/user"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center rounded-md"
                style={{ height: 44 }}
                aria-label="Go to profile"
              >
                {currentUser.image ? (
                  <img
                    src={currentUser.image}
                    alt="Your profile"
                    className="rounded-circle border border-2 border-primary-subtle shadow-sm"
                    style={{ width: 32, height: 32, objectFit: "cover" }}
                  />
                ) : (
                  <UserCircle2 size={18} />
                )}
              </Link>
              <div className="d-grid" style={{ gridColumn: "1 / span 2" }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center gap-2 rounded-md"
                  style={{ height: 44 }}
                >
                  <LogOut size={18} />
                  <span className="small">Logout</span>
                </button>
              </div>
            </div>
          </div>

          <div className="d-none d-md-block">
            <div className="d-flex flex-wrap gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = optimisticActive === item.key;
                const isPendingSelection =
                  isNavigating && active !== item.key && optimisticActive === item.key;
                const baseClass =
                  "nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0 fw-semibold";
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
                    }
                  : {
                      background:
                        theme === "night"
                          ? "rgba(148, 163, 184, 0.12)"
                          : "rgba(226, 232, 240, 0.65)",
                      transition: "all 0.2s ease",
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
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="d-md-none px-2 pb-2">
        <div
          className="d-flex justify-content-between align-items-center rounded-4 px-2 py-2 shadow-sm"
          style={{
            background: theme === "night" ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.96)",
            border: theme === "night" ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(15,23,42,0.08)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            position: "fixed",
            bottom: 12,
            left: 12,
            right: 12,
            zIndex: 1030,
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = optimisticActive === item.key;
            const isPendingSelection =
              isNavigating && active !== item.key && optimisticActive === item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`d-flex flex-column align-items-center text-decoration-none small fw-semibold px-2 ${
                  isActive
                    ? "text-primary"
                    : theme === "night"
                    ? "text-white-50"
                    : "text-secondary"
                }`}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => handleNavClick(event, item)}
                onPointerEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                style={{ opacity: isPendingSelection ? 0.85 : 1 }}
              >
                <Icon size={20} />
                <span className="mt-1" style={{ fontSize: "0.75rem" }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <Link
        href="/posts/create"
        className="btn btn-primary rounded-circle d-md-none d-flex align-items-center justify-content-center shadow position-fixed"
        style={{ width: 54, height: 54, bottom: 80, right: 18 }}
        aria-label="Create a new post"
      >
        <Plus size={22} />
      </Link>
    </div>
  );
}
