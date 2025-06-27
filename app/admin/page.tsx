"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";

interface User {
  username: string;
  position: string;
  age: number;
  image: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || user.username !== "Smith") return;
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        const userList = data.users ?? [];
        setUsers(userList);
        const current = userList.find((u: User) => u.username === user.username);
        setCurrentUserData(current ?? null);
      })
      .catch(() => {
        setUsers([]);
        setCurrentUserData(null);
      })
      .finally(() => setIsFetching(false));
  }, [user]);

  if (loading || isFetching || !user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (user.username !== "Smith") {
    router.push("/home");
    return null;
  }

  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <TopBar
        title="Admin"
        active="admin"
        currentUser={{
          username: user.username,
          image: currentUserData?.image,
        }}
      />

      <div className="container mt-4" style={{ maxWidth: "600px" }}>
        <h3 className="mb-4 text-center">Admin Dashboard</h3>
        {users.length === 0 ? (
          <p className="text-muted text-center">No users found.</p>
        ) : (
          <ul className="list-group">
            {users.map((u) => (
              <li
                key={u.username}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>{u.username}</span>
                <span className="text-muted">{u.position}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
