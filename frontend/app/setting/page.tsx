"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
import { useConfirmDialog } from "../components/useConfirmDialog";
import { useCachedApi } from "../hooks/useCachedApi";
import { apiUrl } from "@/app/lib/api";

interface User {
  username: string;
  image: string;
  online?: boolean;
}

export default function SettingPage() {
  const { user, loading, logout, updateUser } = useAuth();
  const router = useRouter();

  const {
    data: users,
    setData: setUsers,
    loading: loadingUsers,
  } = useCachedApi<User[]>(user ? "/api/users" : null, {
    fallback: [],
    transform: (payload) =>
      (payload as { users?: User[] | null })?.users ?? [],
  });

  const [newUsername, setNewUsername] = useState("");
  const [profileImage, setProfileImage] = useState<string>("");
  const { theme, setTheme } = useTheme();
  const isNight = theme === "night";
  const mutedTextClass = isNight ? "text-light opacity-75" : "text-muted";
  const inputClassName = `form-control ${
    isNight ? "bg-dark text-white border-secondary" : ""
  }`;
  const { confirm: showConfirm, dialog: confirmDialog } = useConfirmDialog();

  // Convert selected image file to base64 string
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfileImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => setProfileImage("");

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  const handleThemeChange = (value: "brightness" | "night") => {
    setTheme(value);
  };

  const currentUserData = users.find((u) => u.username === user?.username);
  const username = newUsername || currentUserData?.username || "";
  const image = profileImage || currentUserData?.image || "";

  if (loading || loadingUsers || !user || !currentUserData) {
    return (
      <LoadingState
        title="Loading your settings"
        subtitle="We’re preparing your preferences and syncing your profile information."
        skeletonCount={2}
      />
    );
  }

  const describeValue = (value: string | null | undefined): ReactNode => {
    if (value === undefined || value === null || value === "") {
      return <span className="text-muted fst-italic">Not set</span>;
    }
    return <span className="fw-semibold">{value}</span>;
  };

  const handleSave = async () => {
    if (!user) return;

    const updates: Partial<{ username: string; image: string }> = {};
    if (newUsername && newUsername !== currentUserData.username)
      updates.username = newUsername;
    if (profileImage && profileImage !== currentUserData.image)
      updates.image = profileImage;

    if (Object.keys(updates).length === 0) {
      await showConfirm({
        contextLabel: "Profile updates",
        title: "All caught up!",
        message: (
          <div className="text-start">
            <p className="mb-2">Your profile already matches these details.</p>
            <p className="mb-0 text-body-secondary">
              Update your username or add a fresh profile photo to save new
              changes.
            </p>
          </div>
        ),
        confirmText: "Sounds good",
        cancelText: "Keep editing",
        confirmVariant: "info",
        icon: <span aria-hidden="true">✨</span>,
      });
      return;
    }

    const changeSummary: { label: string; from: ReactNode; to: ReactNode }[] = [];
    if (updates.username)
      changeSummary.push({
        label: "Username",
        from: describeValue(currentUserData.username),
        to: describeValue(updates.username),
      });
    if (updates.image)
      changeSummary.push({
        label: "Profile photo",
        from: currentUserData.image ? (
          <span className="fw-semibold">Current photo</span>
        ) : (
          <span className="text-muted fst-italic">No photo</span>
        ),
        to: <span className="fw-semibold">New upload</span>,
      });

    const confirmed = await showConfirm({
      contextLabel: "Save changes",
      title: "Ready to save your profile?",
      message: (
        <>
          <p className="mb-2">
            We’ll apply the following updates to your profile settings.
          </p>
          <div className="confirm-dialog-summary">
            {changeSummary.map((change) => (
              <div key={change.label} className="confirm-dialog-summary-item">
                <div className="confirm-dialog-diff-label">{change.label}</div>
                <div className="confirm-dialog-diff-values">
                  <span>{change.from}</span>
                  <span className="confirm-dialog-diff-arrow" aria-hidden="true">
                    →
                  </span>
                  <span>{change.to}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ),
      confirmText: "Save changes",
      cancelText: "Keep editing",
      confirmVariant: "save",
      confirmIcon: <span aria-hidden="true">💾</span>,
    });
    if (!confirmed) return;

    const performUpdate = async (): Promise<void> => {
      try {
        const res = await fetch(apiUrl(`/api/users/${user.username}`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: user.username,
          },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const data = await res.json();
          setUsers((prev) =>
            prev.map((u) => (u.username === user.username ? data.user : u))
          );
          if (typeof updates.username === "string") {
            updateUser({ username: updates.username });
          }
          setNewUsername("");
          setProfileImage("");
        } else {
          const retry = await showConfirm({
            contextLabel: "Profile update",
            title: "We couldn&apos;t save your changes",
            message: (
              <div className="text-start">
                <p className="mb-2">
                  Something went wrong while saving your profile details.
                </p>
                <p className="mb-0 text-body-secondary">
                  Please check your connection and try again.
                </p>
              </div>
            ),
            confirmText: "Retry save",
            cancelText: "Dismiss",
            confirmVariant: "danger",
            icon: <span aria-hidden="true">😕</span>,
          });
          if (retry) {
            await performUpdate();
          }
        }
      } catch {
        const retry = await showConfirm({
          contextLabel: "Profile update",
          title: "Network hiccup",
          message: (
            <div className="text-start">
              <p className="mb-2">
                We hit a snag reaching the server, so your profile stayed the
                same.
              </p>
              <p className="mb-0 text-body-secondary">
                Give it another go once you&apos;re back online.
              </p>
            </div>
          ),
          confirmText: "Try again",
          cancelText: "Close",
          confirmVariant: "danger",
          icon: <span aria-hidden="true">📡</span>,
        });
        if (retry) {
          await performUpdate();
        }
        
      }
    };

    await performUpdate();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmed = await showConfirm({
      title: "Delete your account",
      message: (
        <div>
          <p className="mb-1">
            This will permanently erase your profile, posts, and connections.
          </p>
          <small className="text-muted">
            You will need to create a new account to rejoin the community.
          </small>
        </div>
      ),
      confirmText: "Yes, delete my account",
      cancelText: "Keep account",
      confirmVariant: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(apiUrl(`/api/users/${user.username}`), {
        method: "DELETE",
        headers: { Authorization: user.username },
      });
      if (res.ok) {
        logout();
        router.push("/signup");
      } else {
        alert("Failed to delete account.");
      }
    } catch {
      alert("Failed to delete account.");
    }
  };

  return (
    <div
      className={`container-fluid min-vh-100 p-3 p-md-4 pb-5 ${
        isNight ? "text-light" : "text-dark"
      }`}
      style={{
        background: isNight
          ? "radial-gradient(circle at top, rgba(30,64,175,0.35), rgba(15,23,42,0.95))"
          : "radial-gradient(circle at top, rgba(59,130,246,0.15), rgba(255,255,255,0.95))",
        transition: "background 0.4s ease-in-out, color 0.2s ease-in-out",
      }}
    >
      {confirmDialog}
      <TopBar
        title="Settings"
        active="setting"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
        }}
      />

      <div className="container mt-4" style={{ maxWidth: "680px" }}>
        {/* Theme Settings */}
        <div
          className={`card shadow-sm border-0 rounded-4 mb-4 ${
            isNight ? "bg-transparent text-light" : "bg-transparent"
          }`}
          style={{
            background: isNight
              ? "linear-gradient(135deg, rgba(17,24,39,0.95), rgba(30,64,175,0.75))"
              : "linear-gradient(135deg, #eef2ff, #ffffff)",
          }}
        >
          <div className="card-body p-4 position-relative">
            <span
              aria-hidden="true"
              className="position-absolute top-0 end-0 translate-middle mt-4 me-4 display-5"
            >
              {isNight ? "🌙" : "🌞"}
            </span>
            <h5 className="fw-semibold mb-2">Display Settings</h5>
            <p className={`mb-4 ${mutedTextClass}`}>
              Choose how the interface appears across the app.
            </p>
            <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3">
              <div className="btn-group" role="group" aria-label="Theme selection">
                <button
                  type="button"
                  className={`btn btn-sm ${
                    theme === "brightness"
                      ? "btn-primary fw-semibold shadow-sm"
                      : isNight
                      ? "btn-outline-light"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => handleThemeChange("brightness")}
                  aria-pressed={theme === "brightness"}
                >
                  <span aria-hidden="true" className="me-1">
                    🌞
                  </span>
                  Bright mode
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    theme === "night"
                      ? "btn-secondary fw-semibold shadow-sm"
                      : isNight
                      ? "btn-outline-light"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => handleThemeChange("night")}
                  aria-pressed={theme === "night"}
                >
                  <span aria-hidden="true" className="me-1">
                    🌙
                  </span>
                  Night mode
                </button>
              </div>
              <div className={`small ${mutedTextClass} ms-sm-3`}>
                Currently using
                <span className="fw-semibold ms-1 text-reset">
                  {theme === "night" ? "Night" : "Bright"} theme
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div
          className={`card shadow-sm border-0 rounded-4 ${
            isNight ? "bg-dark text-light" : "bg-white"
          }`}
        >
          <div
            className="px-4 py-3 border-bottom rounded-top-4"
            style={{
              background: isNight
                ? "linear-gradient(135deg, rgba(148,163,184,0.2), rgba(30,41,59,0.75))"
                : "linear-gradient(135deg, #f1f5ff, #ffffff)",
              borderColor: isNight ? "rgba(148,163,184,0.35)" : "rgba(99,102,241,0.2)",
            }}
          >
            <h5 className="fw-semibold mb-1 d-flex align-items-center gap-2">
              <span aria-hidden="true">🧩</span>Profile Settings
            </h5>
            <p className={`mb-0 ${mutedTextClass}`}>
              Personalise how your profile looks to everyone else.
            </p>
          </div>

          <div className="card-body p-4">
            <div className="d-flex flex-column flex-sm-row align-items-center gap-3 mb-4">
              <div
                className="rounded-circle border border-primary-subtle d-flex align-items-center justify-content-center"
                style={{
                  width: "96px",
                  height: "96px",
                  background: isNight ? "rgba(15,23,42,0.6)" : "rgba(59,130,246,0.08)",
                }}
              >
                <img
                  src={image}
                  alt="Profile"
                  className="rounded-circle"
                  style={{ width: "84px", height: "84px", objectFit: "cover" }}
                />
              </div>
              <div className={`${mutedTextClass} text-center text-sm-start`}>
                <div className="fw-semibold text-reset">Profile preview</div>
                <small>
                  Update your avatar and details to keep your profile fresh.
                </small>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-12">
                <label className="form-label fw-semibold">Username</label>
                <input
                  type="text"
                  className={inputClassName}
                  value={username}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">Profile image</label>
                <input
                  type="file"
                  className={inputClassName}
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                {profileImage && (
                  <div
                    className={`d-flex flex-column flex-sm-row align-items-center gap-3 mt-3 p-3 border rounded-3 ${
                      isNight ? "border-secondary" : "border-primary-subtle"
                    }`}
                    style={{
                      background: isNight
                        ? "rgba(30,41,59,0.55)"
                        : "rgba(59,130,246,0.05)",
                    }}
                  >
                    <img
                      src={profileImage}
                      alt="Preview"
                      className="rounded-circle"
                      style={{
                        width: "72px",
                        height: "72px",
                        objectFit: "cover",
                      }}
                    />
                    <div className="flex-grow-1 text-center text-sm-start">
                      <div className="fw-semibold text-reset">New image ready</div>
                      <small className={mutedTextClass}>
                        This preview will replace your current profile picture
                        after saving.
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleRemoveImage}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="d-grid mt-4">
              <button
                className="btn btn-primary btn-lg shadow-sm"
                style={{
                  background: isNight
                    ? "linear-gradient(135deg, #60a5fa, #2563eb)"
                    : "linear-gradient(135deg, #4f46e5, #2563eb)",
                  border: "none",
                }}
                onClick={handleSave}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div
          className={`card shadow-sm border-0 rounded-4 mt-4 ${
            isNight ? "text-light" : "text-dark"
          }`}
          style={{
            background: isNight
              ? "linear-gradient(135deg, rgba(88,28,28,0.75), rgba(127,29,29,0.85))"
              : "linear-gradient(135deg, #fff1f2, #ffe4e6)",
            border: isNight
              ? "1px solid rgba(248,113,113,0.45)"
              : "1px solid rgba(244,63,94,0.35)",
          }}
        >
          <div className="card-body p-4">
            <div className="d-flex align-items-start gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: "48px",
                  height: "48px",
                  background: isNight ? "rgba(239,68,68,0.35)" : "rgba(225,29,72,0.1)",
                }}
              >
                <span aria-hidden="true" className="fs-4">
                  ⚠️
                </span>
              </div>
              <div className="flex-grow-1">
                <h5 className="fw-semibold text-danger mb-1">Danger zone</h5>
                <p className={`mb-3 ${mutedTextClass}`}>
                  Deleting your account will permanently remove your profile,
                  posts, and connections. This action cannot be undone.
                </p>
                <button
                  className="btn btn-danger w-100 fw-semibold shadow-sm"
                  onClick={handleDeleteAccount}
                >
                  Delete my account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
