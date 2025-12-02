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
  const profileMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const safeBottomSpace = 96;
    const previousPadding = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${safeBottomSpace}px`;

    return () => {
      document.body.style.paddingBottom = previousPadding;
    };
  }, []);

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

  const bottomBarStyle: React.CSSProperties = {
    background:
      theme === "night"
        ? "rgba(15, 23, 42, 0.9)"
        : "rgba(248, 250, 252, 0.95)",
    borderTop:
      theme === "night"
        ? "1px solid rgba(148, 163, 184, 0.15)"
        : "1px solid rgba(15, 23, 42, 0.08)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow:
      theme === "night"
        ? "0 -10px 30px -20px rgba(15, 23, 42, 0.9)"
        : "0 -10px 30px -20px rgba(100, 116, 139, 0.35)",
  };

  const fabStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "82px",
    right: "22px",
    zIndex: 1060,
    boxShadow:
      theme === "night"
        ? "0 15px 30px -10px rgba(59, 130, 246, 0.6)"
        : "0 15px 30px -10px rgba(14, 165, 233, 0.55)",
  };

  return (
    <>
      <div
        className={`position-sticky top-0 z-3 ${
          theme === "night" ? "text-white" : "text-dark"
        }`}
        style={containerStyle}
      >
        <div className="px-3 py-3">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-outline-primary rounded-circle p-2 d-flex align-items-center justify-content-center"
              onClick={() => setTheme(theme === "night" ? "brightness" : "night")}
              aria-label={themeToggleLabel}
              title={themeToggleLabel}
            >
              {theme === "night" ? <SunMedium size={18} /> : <MoonStar size={18} />}
            </button>

            <div className="flex-grow-1 text-center">
              <p className="text-uppercase fw-semibold small mb-1 text-secondary-emphasis opacity-75">
                {greeting}, {currentUser.username}
              </p>
              <h2 className="h5 mb-0 text-truncate">{title}</h2>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Link
                href="/posts/create"
                className="btn btn-primary rounded-circle p-2 d-flex align-items-center justify-content-center"
                aria-label="Create a new post"
              >
                <Plus size={18} />
              </Link>

              <div className="position-relative" ref={profileMenuRef}>
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-circle p-1 d-flex align-items-center justify-content-center"
                  aria-label="Profile menu"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                >
                  {currentUser.image ? (
                    <img
                      src={currentUser.image}
                      alt="Your profile"
                      className="rounded-circle border border-2 border-primary-subtle shadow-sm"
                      style={{ width: "38px", height: "38px", objectFit: "cover" }}
                    />
                  ) : (
                    <UserCircle2 size={24} />
                  )}
                </button>

                {isProfileMenuOpen && (
                  <div
                    className={`position-absolute end-0 mt-2 rounded-4 shadow-lg py-2 ${
                      theme === "night" ? "bg-dark text-white" : "bg-white text-dark"
                    }`}
                    style={{ minWidth: "180px", zIndex: 1060 }}
                  >
                    <Link
                      href="/user"
                      className="dropdown-item d-flex align-items-center gap-2"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <UserCircle2 size={18} />
                      <span>View profile</span>
                    </Link>
                    <button
                      type="button"
                      className="dropdown-item d-flex align-items-center gap-2 text-danger"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut size={18} />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="position-fixed bottom-0 start-0 end-0 px-3 pb-3 z-3"
        style={bottomBarStyle}
      >
        <div className="d-flex justify-content-between align-items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = optimisticActive === item.key;
            const isPendingSelection =
              isNavigating && active !== item.key && optimisticActive === item.key;
            const visualState = isActive
              ? "bg-primary text-white"
              : theme === "night"
              ? "text-white-50"
              : "text-secondary";

            const itemStyle: React.CSSProperties = {
              flex: 1,
              borderRadius: "14px",
              padding: "10px 8px",
              transition: "all 0.2s ease",
              opacity: isPendingSelection && !isActive ? 0.8 : 1,
              background:
                isActive && theme === "night"
                  ? "linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(99, 102, 241, 0.4))"
                  : isActive
                  ? "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(14, 165, 233, 0.25))"
                  : "transparent",
            };

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`text-decoration-none text-center fw-semibold small d-flex flex-column align-items-center ${visualState}`}
                style={itemStyle}
                aria-current={isActive ? "page" : undefined}
                onPointerEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                onClick={(event) => handleNavClick(event, item)}
              >
                <Icon size={20} />
                <span className="mt-1 text-truncate" style={{ maxWidth: "80px" }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <Link
        href="/posts/create"
        className="btn btn-primary rounded-circle p-3 d-flex align-items-center justify-content-center"
        aria-label="Create a new post"
        style={fabStyle}
      >
        <Plus size={22} />
      </Link>
    </>
  );
}
