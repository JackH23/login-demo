"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

interface User {
  username: string;
  position: string;
  age: number;
  image: string;
}

interface BlogPost {
  title: string;
  content: string;
  image: string | null;
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  // Redirect if not signed in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  // Fetch user list
  useEffect(() => {
    if (!user) return;

    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setIsFetching(false));
  }, [user]);

  // Simulate fetch blog from localStorage
  useEffect(() => {
    const blogString = localStorage.getItem("latest_blog");
    if (blogString) {
      try {
        const post: BlogPost = JSON.parse(blogString);
        setBlog(post);
      } catch {
        setBlog(null);
      }
    }
  }, []);

  if (loading || !user || isFetching)
    return <div className="text-center mt-5">Loading...</div>;

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return <div className="text-center mt-5">Loading user data...</div>;
  }

  return (
    <div className="container-fluid min-vh-100 bg-light p-4">
      {/* Top Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Home</h2>
        <div className="d-flex align-items-center gap-3">
          {currentUserData.image && (
            <img
              src={currentUserData.image}
              alt="Your Profile"
              className="rounded-circle"
              style={{ width: "40px", height: "40px", objectFit: "cover" }}
            />
          )}
          <span className="fw-semibold">{currentUserData.username}</span>
          <a href="/logout" className="btn btn-sm btn-outline-danger">
            Log Out
          </a>
        </div>
      </div>

      {/* Menu Bar */}
      <div className="mb-4">
        <ul className="nav nav-pills gap-2">
          <li className="nav-item">
            <a className="nav-link active" href="/home">
              Home
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="/posts">
              All Post
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="/user">
              User
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="/analysis">
              Analysis
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="/setting">
              Setting
            </a>
          </li>
        </ul>
      </div>

      {/* Create Blog Button */}
      <div className="mb-4 text-end">
        <button
          className="btn btn-success"
          onClick={() => router.push("/create-blog")}
        >
          + Create Blog
        </button>
      </div>

      {/* Blog Section */}
      <div
        className="card shadow-sm w-100 mx-auto"
        style={{ maxWidth: "100%" }}
      >
        <div className="card-body">
          {blog ? (
            <>
              {blog.image && (
                <img
                  src={blog.image}
                  alt="Post Thumbnail"
                  className="img-fluid rounded mb-3"
                  style={{
                    maxHeight: "300px",
                    objectFit: "cover",
                    width: "100%",
                  }}
                />
              )}
              <h4 className="fw-bold mb-2">{blog.title}</h4>
              <p className="text-muted">
                {blog.content.length > 250
                  ? blog.content.slice(0, 250) + "..."
                  : blog.content}
              </p>
              <div className="text-end">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => alert("Expand to full blog (add logic here)")}
                >
                  Read More
                </button>
              </div>
            </>
          ) : (
            <p className="text-muted text-center">No blog posts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
