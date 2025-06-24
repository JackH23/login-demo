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

  if (loading || !user || isFetching) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return <div className="text-center mt-5">Loading user data...</div>;
  }

  return (
    <div className="container-fluid min-vh-100 bg-light p-4">
      {/* Sticky Top Bar and Menu */}
      <TopBar
        title="Posts"
        active="posts"
        currentUser={{ username: currentUserData.username, image: currentUserData.image }}
      />

      {/* Content */}
      <div
        className="card shadow-sm w-100 mx-auto"
        style={{ maxWidth: "100%", top: "10px" }}
      >
        {posts.length === 0 ? (
          <div className="card-body">
            <h5 className="text-center text-muted">No posts found.</h5>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post._id} className="card-body border-bottom">
              <h5>{post.title}</h5>
              <p className="text-muted">by {post.author}</p>
              {post.image && (
                <img
                  src={post.image}
                  alt={post.title}
                  className="img-fluid mb-2"
                  style={{ maxHeight: "300px" }}
                />
              )}
              <p>{post.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
