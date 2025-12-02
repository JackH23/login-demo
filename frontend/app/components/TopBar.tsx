"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(() => {
    setProfileMenuOpen(false);
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
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    setOptimisticActive(active);
  }, [active]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <div className="px-3 px-sm-4 pt-2 pb-2">
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap topbar-compact">
          <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
            <button
              type="button"
              className="btn btn-icon topbar-icon"
              onClick={() => setTheme(theme === "night" ? "brightness" : "night")}
              aria-label={themeToggleLabel}
              title={themeToggleLabel}
            >
              {theme === "night" ? <SunMedium size={18} /> : <MoonStar size={18} />}
            </button>
            <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-1 w-100 min-w-0">
              <p className="text-uppercase fw-semibold small mb-0 text-secondary-emphasis opacity-75 d-none d-sm-inline">
                {greeting}
              </p>
              <h2 className="mb-0 d-flex align-items-center gap-2 fs-5 flex-grow-1 text-truncate">
                {title}
              </h2>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0 topbar-actions">
            <Link
              href="/posts/create"
              className="btn btn-icon topbar-icon"
              aria-label="Create new post"
            >
              <FileText size={18} />
            </Link>
            <div className="position-relative" ref={profileMenuRef}>
              <button
                type="button"
                className="btn p-1 d-flex align-items-center gap-2 rounded-pill topbar-profile"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-expanded={isProfileMenuOpen}
                aria-label="Open profile menu"
              >
                <div className="rounded-circle overflow-hidden topbar-avatar">
                  {currentUser.image ? (
                    <img
                      src={currentUser.image}
                      alt="Your profile"
                      className="w-100 h-100 object-fit-cover"
                    />
                  ) : (
                    <span className="fw-bold text-uppercase">
                      {currentUser.username.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="d-none d-md-inline fw-semibold small text-secondary-emphasis">
                  {currentUser.username}
                </span>
              </button>
              {isProfileMenuOpen && (
                <div
                  className={`dropdown-menu dropdown-menu-end show shadow-sm mt-2 ${
                    theme === "night" ? "bg-dark text-white" : "bg-white"
                  }`}
                >
                  <div className="px-3 py-2">
                    <p className="mb-0 fw-semibold">{currentUser.username}</p>
                    <small className="text-secondary-emphasis">{greeting}</small>
                  </div>
                  {currentUser.username === ADMIN_USERNAME && (
                    <>
                      <div className="dropdown-divider" />
                      <Link className="dropdown-item d-flex align-items-center gap-2" href="/admin">
                        <ShieldCheck size={16} /> Admin panel
                      </Link>
                    </>
                  )}
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item d-flex align-items-center gap-2 text-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 px-sm-4 pb-3 d-none d-md-block">
        <div className="d-flex gap-2 flex-nowrap flex-lg-wrap topbar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = optimisticActive === item.key;
            const isPendingSelection =
              isNavigating && active !== item.key && optimisticActive === item.key;
            const baseClass =
              "nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0 fw-semibold topbar-nav-link";
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

      <div className="mobile-bottom-nav d-md-none">
        {navItems
          .filter((item) =>
            ["home", "posts", "user", "friend", "setting"].includes(item.key),
          )
          .map((item) => {
            const Icon = item.icon;
            const isActive = optimisticActive === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`mobile-bottom-nav__item ${
                  isActive ? "is-active" : ""
                }`}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => handleNavClick(event, item)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </div>

      <Link
        href="/posts/create"
        className="btn btn-primary mobile-fab d-md-none"
        aria-label="Create a new post"
      >
        <span className="mobile-fab__icon">+</span>
      </Link>
    </div>
  );
}
