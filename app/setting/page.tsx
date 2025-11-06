"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import { useConfirmDialog } from "../components/useConfirmDialog";

interface User {
  username: string;
  position: string;
  age: number;
  image: string;
  online?: boolean;
}

export default function SettingPage() {
  const { user, loading, logout, updateUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newAge, setNewAge] = useState<number>(0);
  const [profileImage, setProfileImage] = useState<string>("");
  const { theme, setTheme } = useTheme();
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

  // Load user data
  useEffect(() => {
    if (!user) return;
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setIsFetching(false));
  }, [user]);

  const handleThemeChange = (value: "brightness" | "night") => {
    setTheme(value);
  };

  const currentUserData = users.find((u) => u.username === user?.username);
  const username = newUsername || currentUserData?.username || "";
  const age = newAge || currentUserData?.age || 0;
  const image = profileImage || currentUserData?.image || "";

  if (loading || isFetching || !user || !currentUserData) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const describeValue = (value: unknown): ReactNode => {
    if (value === undefined || value === null || value === "") {
      return <span className="text-muted fst-italic">Not set</span>;
    }
    return <span className="fw-semibold">{value}</span>;
  };

  const handleSave = async () => {
    if (!user) return;

    const updates: Record<string, unknown> = {};
    if (newUsername && newUsername !== currentUserData.username)
      updates.username = newUsername;
    if (newAge && newAge !== currentUserData.age) updates.age = newAge;
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
              Update your username, age, or add a fresh profile photo to save
              new changes.
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
    if (updates.age)
      changeSummary.push({
        label: "Age",
        from: describeValue(currentUserData.age),
        to: describeValue(updates.age),
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
        const res = await fetch(`/api/users/${user.username}`, {
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
          setNewAge(0);
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
      const res = await fetch(`/api/users/${user.username}`, {
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
      className="container-fluid min-vh-100 py-5"
      style={{
        background: "linear-gradient(135deg, #f8f9ff 0%, #eef4ff 100%)",
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

      <div className="container mt-4" style={{ maxWidth: "720px" }}>
        {/* Theme Settings */}
        <div className="card shadow-sm mb-4 border-0 overflow-hidden">
          <div
            className="card-header border-0 text-white"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            }}
          >
            <div className="d-flex align-items-center">
              <span className="fs-3 me-2" aria-hidden="true">
                🎨
              </span>
              <div>
                <h5 className="mb-0">Display Settings</h5>
                <small className="text-white-50">
                  Personalize how the app looks and feels.
                </small>
              </div>
            </div>
          </div>
          <div className="card-body">
            <p className="text-muted mb-3">
              Switch between themes at any time—your preference is saved
              instantly.
            </p>
            <div className="btn-group w-100" role="group" aria-label="Theme selection">
              <button
                type="button"
                className={`btn ${
                  theme === "brightness" ? "btn-primary" : "btn-outline-primary"
                }`}
                onClick={() => handleThemeChange("brightness")}
              >
                <span className="me-2" aria-hidden="true">
                  🌞
                </span>
                Bright Mode
              </button>
              <button
                type="button"
                className={`btn ${
                  theme === "night" ? "btn-primary" : "btn-outline-primary"
                }`}
                onClick={() => handleThemeChange("night")}
              >
                <span className="me-2" aria-hidden="true">
                  🌙
                </span>
                Night Mode
              </button>
            </div>
            <div
              className={`rounded-4 mt-4 p-4 d-flex align-items-center justify-content-between shadow-sm ${
                theme === "night"
                  ? "bg-dark text-white border border-dark"
                  : "bg-white text-dark border border-light"
              }`}
              style={{ transition: "all 0.3s ease" }}
            >
              <div>
                <h6 className="mb-1">Live preview</h6>
                <p className="mb-0 small text-muted">
                  {theme === "night"
                    ? "High contrast details with deep midnight tones."
                    : "Crisp whites with gentle shadows for daytime focus."}
                </p>
              </div>
              <span className="display-6" aria-hidden="true">
                {theme === "night" ? "🌌" : "☀️"}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="card shadow-sm border-0 overflow-hidden">
          <div
            className="card-header border-0 text-white"
            style={{
              background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
            }}
          >
            <div className="d-flex align-items-center">
              <span className="fs-3 me-2" aria-hidden="true">
                🙋
              </span>
              <div>
                <h5 className="mb-0">Profile Settings</h5>
                <small className="text-white-50">
                  Keep your information fresh and welcoming.
                </small>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="row g-4 align-items-center">
              <div className="col-md-4 text-center">
                <div className="position-relative d-inline-block">
                  <img
                    src={image}
                    alt="Profile"
                    className="rounded-circle border border-3 border-white shadow"
                    style={{ width: "120px", height: "120px", objectFit: "cover" }}
                  />
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success"
                    aria-hidden="true"
                  >
                    ✨
                  </span>
                </div>
                <p className="small text-muted mt-3 mb-0">
                  Upload a smiling photo to boost your first impression.
                </p>
              </div>
              <div className="col-md-8">
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                  <div className="form-text">
                    This is how friends find you across the community.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-control"
                    value={age}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                  />
                  <div className="form-text">
                    We tailor suggestions so they match your vibe.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Profile Image</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <div className="form-text">JPG or PNG, at least 400 × 400 pixels.</div>
                  {profileImage && (
                    <div className="text-center mt-3">
                      <img
                        src={profileImage}
                        alt="Preview"
                        className="rounded-circle mb-2 shadow-sm"
                        style={{
                          width: "120px",
                          height: "120px",
                          objectFit: "cover",
                        }}
                      />
                      <br />
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={handleRemoveImage}
                      >
                        Remove Image
                      </button>
                    </div>
                  )}
                </div>

                <div className="d-grid">
                  <button className="btn btn-success btn-lg" onClick={handleSave}>
                    <span className="me-2" aria-hidden="true">
                      💾
                    </span>
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card shadow-sm mt-4 border-0">
          <div
            className="card-body border border-danger rounded-4 p-4"
            style={{ backgroundColor: "rgba(220, 53, 69, 0.08)" }}
          >
            <div className="d-flex align-items-start">
              <span className="fs-3 me-3 text-danger" aria-hidden="true">
                ⚠️
              </span>
              <div>
                <h6 className="text-danger mb-1">Danger Zone</h6>
                <p className="text-muted small mb-3">
                  Deleting your account is permanent—your posts, followers, and
                  conversations disappear instantly.
                </p>
                <p className="small text-muted mb-4">
                  Prefer a break? Consider logging out instead so you can return
                  anytime.
                </p>
                <button
                  type="button"
                  className="btn btn-danger w-100"
                  onClick={handleDeleteAccount}
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
