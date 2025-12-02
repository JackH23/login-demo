"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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
    <>
      <div
        className={`position-sticky top-0 z-3 ${
          theme === "night" ? "text-white" : "text-dark"
        }`}
        style={containerStyle}
      >
        <div className="px-3 py-2 d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary rounded-circle d-flex align-items-center justify-content-center p-2"
              onClick={() => setTheme(theme === "night" ? "brightness" : "night")}
              aria-label={themeToggleLabel}
              title={themeToggleLabel}
              style={{ minWidth: 40, minHeight: 40 }}
            >
              {theme === "night" ? (
                <SunMedium size={18} />
              ) : (
                <MoonStar size={18} />
              )}
            </button>
            <div className="d-none d-sm-block">
              <p className="text-uppercase fw-semibold text-secondary-emphasis opacity-75 mb-0" style={{ fontSize: "0.7rem" }}>
                {greeting}
              </p>
              <h5 className="mb-0 lh-1">{title}</h5>
            </div>
            <div className="d-sm-none">
              <h6 className="mb-0">{title}</h6>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 position-relative">
            <Link
              href="/posts/create"
              className="btn btn-sm btn-primary rounded-circle d-flex align-items-center justify-content-center p-2"
              aria-label="Create new post"
              title="Create new post"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <FileText size={18} />
            </Link>
            <div className="dropdown">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-circle p-0 d-flex align-items-center justify-content-center"
                style={{ width: 40, height: 40 }}
                aria-expanded={isProfileMenuOpen}
                aria-label="Profile menu"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              >
                {currentUser.image ? (
                  <img
                    src={currentUser.image}
                    alt="Your profile"
                    className="rounded-circle"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <UserCircle2 size={22} />
                )}
              </button>
              {isProfileMenuOpen && (
                <div
                  className={`dropdown-menu dropdown-menu-end mt-2 show ${theme === "night" ? "bg-dark text-white" : ""}`}
                  style={{ minWidth: "12rem" }}
                >
                  <h6 className="dropdown-header text-muted text-uppercase" style={{ fontSize: "0.7rem" }}>
                    {currentUser.username}
                  </h6>
                  <Link
                    className="dropdown-item d-flex align-items-center gap-2"
                    style={{ fontSize: "0.9rem" }}
                    href="/user"
                  >
                    <UserCircle2 size={16} /> My Profile
                  </Link>
                  <Link
                    className="dropdown-item d-flex align-items-center gap-2"
                    style={{ fontSize: "0.9rem" }}
                    href="/setting"
                  >
                    <Settings2 size={16} /> Settings
                  </Link>
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

      <nav
        className={`fixed-bottom py-2 px-3 ${theme === "night" ? "bg-dark text-white border-top border-secondary" : "bg-white border-top"}`}
      >
        <div className="d-flex justify-content-around align-items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = optimisticActive === item.key;
            const isPendingSelection =
              isNavigating && active !== item.key && optimisticActive === item.key;
            const visualState = isActive
              ? theme === "night"
                ? "text-white"
                : "text-primary"
              : theme === "night"
                ? "text-white-50"
                : "text-secondary";

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`text-decoration-none d-flex flex-column align-items-center justify-content-center px-2 py-1 ${visualState}`}
                style={{ fontSize: "0.85rem", minWidth: 64 }}
                aria-current={isActive ? "page" : undefined}
                onPointerEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                onClick={(event) => handleNavClick(event, item)}
              >
                <Icon size={18} />
                <span className="mt-1" style={{ lineHeight: 1 }}>
                  {item.label.split(" ")[0]}
                </span>
                {isPendingSelection && !isActive && (
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    ...
                  </small>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
