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
    <div className="container-fluid min-vh-100 p-4">
      {confirmDialog}
      <TopBar
        title="Settings"
        active="setting"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
        }}
      />

      <div className="container mt-4" style={{ maxWidth: "600px" }}>
        {/* Theme Settings */}
        <div className="card shadow-sm border-0 overflow-hidden mb-4">
          <div className="card-header bg-gradient text-white py-4"
            style={{
              background: "linear-gradient(135deg, #0d6efd, #6610f2)",
            }}
          >
            <div className="d-flex align-items-start justify-content-between">
              <div>
                <p className="text-uppercase small mb-1 opacity-75">Display Settings</p>
                <h5 className="mb-0 fw-semibold">Choose how the app greets you</h5>
              </div>
              <span aria-hidden="true" className="fs-2">🎨</span>
            </div>
          </div>
          <div className="card-body bg-light-subtle">
            <p className="text-secondary mb-4">
              Switch between a crisp light experience and a sleek dark canvas.
              Your preference updates instantly across the app.
            </p>
            <label className="form-label fw-semibold text-primary">Theme</label>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <button
                  type="button"
                  className={`btn w-100 text-start border-2 shadow-sm ${
                    theme === "brightness"
                      ? "btn-primary"
                      : "btn-outline-primary bg-white"
                  }`}
                  onClick={() => handleThemeChange("brightness")}
                >
                  <div className="d-flex align-items-center">
                    <span aria-hidden="true" className="fs-3 me-3">🌞</span>
                    <div>
                      <div className="fw-semibold">Brightness</div>
                      <small className="opacity-75">Perfect for daytime focus</small>
                    </div>
                  </div>
                </button>
              </div>
              <div className="col-12 col-md-6">
                <button
                  type="button"
                  className={`btn w-100 text-start border-2 shadow-sm ${
                    theme === "night"
                      ? "btn-primary"
                      : "btn-outline-primary bg-white"
                  }`}
                  onClick={() => handleThemeChange("night")}
                >
                  <div className="d-flex align-items-center">
                    <span aria-hidden="true" className="fs-3 me-3">🌙</span>
                    <div>
                      <div className="fw-semibold">Night</div>
                      <small className="opacity-75">Relax your eyes after hours</small>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="card shadow-sm border-0 overflow-hidden">
          <div
            className="card-header bg-success text-white py-4 border-0"
            style={{
              background: "linear-gradient(135deg, #198754, #20c997)",
            }}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-uppercase small mb-1 opacity-75">Profile Settings</p>
                <h5 className="mb-0 fw-semibold">Keep your profile fresh</h5>
              </div>
              <span aria-hidden="true" className="fs-2">✨</span>
            </div>
          </div>

          <div className="card-body bg-white p-4">
            <p className="text-secondary mb-4">
              Update your details so friends can find and recognize you. We’ll
              save your changes securely the moment you hit the button below.
            </p>
            <div className="mb-4 text-center">
              <div className="position-relative d-inline-block">
                <img
                  src={image}
                  alt="Profile"
                  className="rounded-circle shadow-sm border border-4 border-white"
                  style={{ width: "108px", height: "108px", objectFit: "cover" }}
                />
                <span className="position-absolute bottom-0 end-0 translate-middle-y badge bg-success rounded-pill px-3 py-2">
                  <small>Live</small>
                </span>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label fw-semibold">Username</label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={username}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <small className="text-muted">This is how other members will tag you.</small>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">Age</label>
                <input
                  type="number"
                  className="form-control"
                  value={age}
                  onChange={(e) => setNewAge(Number(e.target.value))}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">Profile Image</label>
                <div className="input-group">
                  <span className="input-group-text" aria-hidden="true">
                    📷
                  </span>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
            </div>
            {profileImage && (
              <div className="text-center mt-3">
                <p className="small text-muted mb-2">Preview</p>
                <img
                  src={profileImage}
                  alt="Preview"
                  className="rounded-circle mb-3 border border-3 border-success-subtle"
                  style={{ width: "96px", height: "96px", objectFit: "cover" }}
                />
                <div className="d-inline-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleRemoveImage}
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            )}

            <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-3 mt-4">
              <div className="flex-grow-1 text-sm-start text-center">
                <h6 className="mb-1">Ready to share the new you?</h6>
                <p className="text-muted mb-0 small">
                  Saving will refresh your profile card and notify followers.
                </p>
              </div>
              <button className="btn btn-success btn-lg px-4" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card shadow-sm mt-4 border-danger border-2">
          <div className="card-body bg-danger-subtle border-danger-subtle rounded-3">
            <div className="d-flex align-items-center mb-3">
              <span aria-hidden="true" className="fs-3 me-2 text-danger">⚠️</span>
              <div>
                <h6 className="text-danger text-uppercase mb-1">Danger Zone</h6>
                <p className="text-muted small mb-0">
                  Once your account is gone, your stories disappear forever.
                </p>
              </div>
            </div>
            <div className="alert alert-danger mb-3" role="alert">
              <strong>Think twice!</strong> This action permanently removes all of your
              content, connections, and preferences.
            </div>
            <button
              className="btn btn-danger w-100 btn-lg"
              onClick={handleDeleteAccount}
            >
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
