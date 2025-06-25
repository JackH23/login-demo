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

interface BlogPost {
  _id: string;
  title: string;
  content: string;
  image?: string | null;
  author: string;
  likes: number;
  dislikes: number;
  likedBy?: string[];
  dislikedBy?: string[];
}

export default function PostsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      fetch("/api/users").then((res) => res.json()),
      fetch(`/api/posts?author=${encodeURIComponent(user.username)}`).then((res) => res.json()),
    ])
      .then(([usersData, postsData]) => {
        setUsers(usersData.users ?? []);
        setPosts(postsData.posts ?? []);
      })
      .catch(() => {
        setUsers([]);
        setPosts([]);
      })
      .finally(() => setIsFetching(false));
  }, [user]);

  if (loading || !user || isFetching) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return <div className="text-center mt-5">Loading user data...</div>;
  }

  return (
    <div className="container-fluid bg-light min-vh-100 py-4">
      <TopBar
        title="Posts"
        active="posts"
        currentUser={{ username: currentUserData.username, image: currentUserData.image }}
      />

      <div className="container mt-4">
        {posts.length === 0 ? (
          <div className="card text-center">
            <div className="card-body">
              <p className="text-muted mb-0">No posts found.</p>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {posts.map((post) => (
              <div key={post._id} className="col-12">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">{post.title}</h5>
                    <h6 className="card-subtitle mb-2 text-muted">by {post.author}</h6>

                    {post.image && (
                      <img
                        src={post.image}
                        alt={post.title}
                        className="img-fluid rounded mb-3"
                        style={{ maxHeight: "300px", objectFit: "cover" }}
                      />
                    )}

                    <p className="card-text">{post.content}</p>

                    <div className="d-flex gap-3 align-items-center mt-3">
                      <span className="badge bg-success">👍 {post.likes}</span>
                      <span className="badge bg-danger">👎 {post.dislikes}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}