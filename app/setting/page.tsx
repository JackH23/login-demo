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
      alert("No changes to save.");
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
        alert("Failed to update profile");
      }
    } catch {
      alert("Failed to update profile");
    }
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
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Display Settings</h5>
          </div>
          <div className="card-body">
            <label className="form-label">Choose Theme</label>
            <select
              className="form-select"
              value={theme}
              onChange={(e) =>
                handleThemeChange(e.target.value as "brightness" | "night")
              }
            >
              <option value="brightness">Brightness (Light Mode)</option>
              <option value="night">Night (Dark Mode)</option>
            </select>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="card shadow-sm">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">Profile Settings</h5>
          </div>

          <div className="card-body">
            <div className="mb-3 text-center">
              <img
                src={image}
                alt="Profile"
                className="rounded-circle"
                style={{ width: "100px", height: "100px", objectFit: "cover" }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Age</label>
              <input
                type="number"
                className="form-control"
                value={age}
                onChange={(e) => setNewAge(Number(e.target.value))}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Profile Image</label>
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {profileImage && (
                <div className="text-center mt-2">
                  <img
                    src={profileImage}
                    alt="Preview"
                    className="rounded-circle mb-2"
                    style={{ width: "100px", height: "100px", objectFit: "cover" }}
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
              <button className="btn btn-success" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card shadow-sm mt-4 border-danger">
          <div className="card-body">
            <h6 className="text-danger">Danger Zone</h6>
            <p className="text-muted small">
              Deleting your account is permanent and cannot be undone.
            </p>
            <button
              className="btn btn-outline-danger w-100"
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
