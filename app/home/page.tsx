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
  image: string | null;
  author: string;
  likes: number;
  dislikes: number;
}


export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setIsFetching(false));
  }, [user]);

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]));
  }, []);

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
        title="Home"
        active="home"
        currentUser={{ username: currentUserData.username, image: currentUserData.image }}
      />

      {/* Create Blog Button */}
      <div
        className="text-end bg-white py-3 px-4 position-sticky top-0 z-2"
        style={{ borderBottom: "1px solid #dee2e6" }}
      >
        <button
          className="btn btn-success"
          onClick={() => router.push("/create-blog")}
        >
          + Create Blog
        </button>
      </div>

      {/* Blog Section */}
      <div className="mt-4">
        {posts.length === 0 ? (
          <div className="card shadow-sm w-100 mx-auto">
            <div className="card-body text-center text-muted">
              <p>No blog post found. Create a new one!</p>
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
