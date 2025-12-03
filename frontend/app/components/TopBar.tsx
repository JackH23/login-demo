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
  Menu,
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

type TopBarLayoutVariant = "floating" | "segmented" | "toolbar";

interface TopBarProps {
  title: string;
  active: ActivePage;
  currentUser: UserData;
  /**
   * Change the presentation of the navigation chips to showcase different looks
   * that still match the rounded, blue-accent design language.
   */
  layoutVariant?: TopBarLayoutVariant;
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

export default function TopBar({
  title,
  active,
  currentUser,
  layoutVariant = "floating",
}: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const greeting = getGreeting();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const navVariantStyles = useMemo(() => {
    const sharedWrapper =
      "rounded-4 p-2 gap-2 w-100" +
      (theme === "night"
        ? " bg-dark border border-primary border-opacity-25"
        : " bg-light border border-primary-subtle");

    switch (layoutVariant) {
      case "segmented":
        return {
          wrapperClassName: `${sharedWrapper} shadow-sm`,
          inactiveStyle:
            theme === "night"
              ? {
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                }
              : {
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                },
        };
      case "toolbar":
        return {
          wrapperClassName: `${sharedWrapper} bg-transparent border-0 px-0`,
          inactiveStyle:
            theme === "night"
              ? { background: "rgba(255, 255, 255, 0.05)" }
              : { background: "rgba(148, 163, 184, 0.15)" },
        };
      default:
        return {
          wrapperClassName:
            `${sharedWrapper} shadow-lg` +
            (theme === "night"
              ? " bg-opacity-75"
              : " bg-white bg-opacity-75"),
          inactiveStyle:
            theme === "night"
              ? { background: "rgba(148, 163, 184, 0.12)" }
              : { background: "rgba(226, 232, 240, 0.65)" },
        };
    }
  }, [layoutVariant, theme]);

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
      <div className="px-4 pt-3 pb-2">
        <div className="d-none d-lg-flex justify-content-between gap-3 align-items-center">
          <div>
            <p className="text-uppercase fw-semibold small mb-1 text-secondary-emphasis opacity-75">
              {greeting}, {currentUser.username}
            </p>
            <h2 className="mb-0 d-flex align-items-center gap-2">{title}</h2>
          </div>
          <div className="d-flex align-items-center gap-3 flex-wrap justify-content-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
              onClick={() => setTheme(theme === "night" ? "brightness" : "night")}
              aria-label={themeToggleLabel}
              title={themeToggleLabel}
            >
              {theme === "night" ? <SunMedium size={18} /> : <MoonStar size={18} />}
              <span className="d-none d-sm-inline">
                {theme === "night" ? "Light mode" : "Dark mode"}
              </span>
            </button>
            <Link href="/posts/create" className="btn btn-sm btn-primary d-flex align-items-center gap-2">
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

        <div className="d-lg-none">
          <div className="d-flex align-items-center justify-content-between gap-3 rounded-4 px-3 py-2 border border-primary border-opacity-25 bg-dark bg-opacity-50">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2 rounded-pill"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <Menu size={18} />
            </button>
            <div className="flex-grow-1 text-center">
              <p className="text-uppercase fw-semibold small mb-0 text-secondary-emphasis opacity-75">
                {greeting}
              </p>
              <h6 className="mb-0 text-white">{title}</h6>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary rounded-circle p-2 d-flex align-items-center justify-content-center"
                onClick={() => setTheme(theme === "night" ? "brightness" : "night")}
                aria-label={themeToggleLabel}
                title={themeToggleLabel}
              >
                {theme === "night" ? <SunMedium size={16} /> : <MoonStar size={16} />}
              </button>
              <Link
                href="/posts/create"
                className="btn btn-sm btn-primary rounded-circle p-2 d-flex align-items-center justify-content-center"
                aria-label="Create new post"
              >
                <FileText size={16} />
              </Link>
              <div
                className="rounded-circle border border-primary-subtle bg-primary bg-opacity-25 d-flex align-items-center justify-content-center"
                style={{ width: "36px", height: "36px" }}
                aria-label="Profile"
              >
                {currentUser.image ? (
                  <img
                    src={currentUser.image}
                    alt="Your profile"
                    className="rounded-circle"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <UserCircle2 size={18} />
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 d-flex justify-content-between align-items-center gap-2">
            <span className="badge bg-primary bg-opacity-10 text-primary-emphasis px-3 py-2 rounded-pill">
              Minimal stack
            </span>
            <div className="d-flex gap-2">
              <span className="badge bg-primary bg-opacity-25 text-white rounded-pill">{layoutVariant}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Expand navigation"
              >
                Show links
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div
          className={`${navVariantStyles.wrapperClassName} d-${mobileNavOpen ? "flex" : "none"} d-lg-flex flex-wrap align-items-center`}
        >
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
                  ...navVariantStyles.inactiveStyle,
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
  );
}
