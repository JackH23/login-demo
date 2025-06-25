"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import TopBar from "../components/TopBar";
import BlogCard from "../components/BlogCard";

interface User {
  username: string;
  position: string;
  age: number;
  image: string;
}

interface BlogPost {
  _id?: string;
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
          posts.map((post) => {
            const author = users.find((u) => u.username === post.author);
            return (
              <BlogCard
                key={post._id ?? post.title}
                blog={post}
                author={author}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
