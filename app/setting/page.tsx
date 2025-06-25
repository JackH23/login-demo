"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import TopBar from "../components/TopBar";

interface User {
  username: string;
  position: string;
  age: number;
  image: string;
}

export default function SettingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newAge, setNewAge] = useState<number>(0);
  const [profileImage, setProfileImage] = useState("");
  const [theme, setTheme] = useState<"brightness" | "night">("brightness");

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

  // Load and apply theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "night") {
      setTheme("night");
      document.body.classList.add("bg-dark", "text-white");
    } else {
      setTheme("brightness");
      document.body.classList.remove("bg-dark", "text-white");
    }
  }, []);

  // Apply theme changes
  const handleThemeChange = (value: "brightness" | "night") => {
    setTheme(value);
    localStorage.setItem("theme", value);
    if (value === "night") {
      document.body.classList.add("bg-dark", "text-white");
    } else {
      document.body.classList.remove("bg-dark", "text-white");
    }
  };

  const currentUserData = users.find((u) => u.username === user?.username);
  const username = newUsername || currentUserData?.username || "";
  const age = newAge || currentUserData?.age || 0;
  const image = profileImage || currentUserData?.image || "";

  if (loading || isFetching || !user || !currentUserData) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const handleSave = () => {
    alert("Profile saved (functionality not yet implemented).");
    // TODO: Replace with real PATCH API call to /api/users
  };

  return (
    <div className="container-fluid min-vh-100 p-4">
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
              <label className="form-label">Profile Image URL</label>
              <input
                type="text"
                className="form-control"
                value={image}
                onChange={(e) => setProfileImage(e.target.value)}
              />
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
              onClick={() => alert("Delete feature not implemented")}
            >
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}