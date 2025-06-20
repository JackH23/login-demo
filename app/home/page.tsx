"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  interface User {
    username: string;
    position: string;
    age: number;
    image: string;
  }

  const [users, setUsers] = useState<User[]>([]);

  const handleDelete = async (username: string) => {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/users/${username}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.username !== username));
    }
  };

  const handleEdit = async (u: User) => {
    const username = prompt("Username", u.username);
    if (username === null) return;
    const position = prompt("Position", u.position || "");
    if (position === null) return;
    const ageInput = prompt("Age", u.age?.toString() || "");
    if (ageInput === null) return;
    const age = Number(ageInput);
    const changeImage = confirm("Change image?");
    let image = u.image;
    if (changeImage) {
      image = await new Promise<string | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }
    const res = await fetch(`/api/users/${u.username}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, position, age, image }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) =>
        prev.map((item) =>
          item.username === u.username ? data.user : item
        )
      );
    }
  };

  const handleImageChange = async (u: User) => {
    const newImage = await new Promise<string | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
    if (!newImage) return;
    const res = await fetch(`/api/users/${u.username}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: newImage }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) =>
        prev.map((item) =>
          item.username === u.username ? data.user : item
        )
      );
    }
  };

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/signin");
    } else {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => setUsers(data.users ?? []))
        .catch(() => setUsers([]));
    }
  }, [user, loading, router]);

  if (loading || !user)
    return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container-fluid min-vh-100 bg-light p-4">
      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          Welcome, <span className="text-primary">{user.username}</span> 👋
        </h2>
        <a href="/logout" className="btn btn-outline-danger">
          Log Out
        </a>
      </div>

      {/* Main content card */}
      <div className="card shadow-sm w-100 mx-auto" style={{ maxWidth: "100%" }}>
        <div className="card-body">
          <p className="text-muted text-center mb-4">
            You are now logged in to the system.
          </p>

          {users.length > 0 ? (
            <>
              <h5 className="mb-3">Registered Users:</h5>
              <ul className="list-group">
                {users.map((u) => (
                  <li
                    key={u.username}
                    className="list-group-item list-group-item-light"
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        {u.image && (
                          <img
                            src={u.image}
                            alt={`${u.username} profile`}
                            className="rounded-circle me-3"
                            style={{
                              width: "50px",
                              height: "50px",
                              objectFit: "cover",
                              cursor: "pointer",
                            }}
                            onClick={() => handleImageChange(u)}
                          />
                        )}
                        <div>
                          <div className="fw-bold">{u.username}</div>
                          {u.position && (
                            <div className="text-muted">Position: {u.position}</div>
                          )}
                          {typeof u.age === "number" && (
                            <div className="text-muted">Age: {u.age}</div>
                          )}
                        </div>
                      </div>

                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(u)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(u.username)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted text-center">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}