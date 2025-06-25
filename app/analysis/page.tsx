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

interface Post {
  _id: string;
  author: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
}

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      fetch("/api/users").then((res) => res.json()),
      fetch("/api/posts").then((res) => res.json()),
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

  if (loading || isFetching || !user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return <div className="text-center mt-5">Loading user data...</div>;
  }

  const userPosts = posts.filter((p) => p.author === user.username);
  const postCount = userPosts.length;
  const commentCount = userPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
  const topLikedPost = userPosts.sort((a, b) => b.likes - a.likes)[0];

  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <TopBar
        title="My Analysis"
        active="analysis"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
        }}
      />

      <div className="container mt-4" style={{ maxWidth: "900px" }}>
        <h3 className="mb-4 text-center">📈 Your Blog Activity</h3>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card text-center shadow-sm">
              <div className="card-body">
                <h6>Your Total Posts</h6>
                <h2 className="text-primary">{postCount}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card text-center shadow-sm">
              <div className="card-body">
                <h6>Comments Received</h6>
                <h2 className="text-success">{commentCount}</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <h5 className="mb-3">🔥 Your Most Liked Post</h5>
            {topLikedPost ? (
              <div>
                <h6>{topLikedPost.title}</h6>
                <p className="text-muted small">
                  Likes: {topLikedPost.likes}, Comments: {topLikedPost.comments}
                </p>
                <p>{topLikedPost.content.slice(0, 100)}...</p>
                <span className="badge bg-success">👍 {topLikedPost.likes}</span>
              </div>
            ) : (
              <p className="text-muted">You haven't posted anything yet.</p>
            )}
          </div>
        </div>

        <div className="card shadow-sm mt-4">
          <div className="card-body text-center text-muted">
            <em>More personal insights coming soon...</em>
          </div>
        </div>
      </div>
    </div>
  );
}