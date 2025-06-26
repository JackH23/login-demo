"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function CreateBlogPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        image,
        author: user.username,
      }),
    });

    if (res.ok) {
      router.push("/home");
    }
  };

  return (
    <div
      className={`container py-5 min-vh-100 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Create a New Blog Post 📝</h2>
          <p className="text-muted">Write your blog and share it with the world.</p>
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => router.push("/home")}
        >
          ⬅ Back to Home
        </button>
      </div>

      {/* Blog Form */}
      <form
        onSubmit={handleSubmit}
        className={`card shadow-sm p-4 ${
          theme === "night" ? "bg-dark text-white" : "bg-white"
        }`}
      >
        {/* Title Input */}
        <div className="mb-3">
          <label className="form-label fw-semibold">Title</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter post title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Content Input */}
        <div className="mb-3">
          <label className="form-label fw-semibold">Content</label>
          <textarea
            className="form-control"
            placeholder="Write your content here..."
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        {/* Image Upload */}
        <div className="mb-3">
          <label className="form-label fw-semibold">Upload Image</label>
          <input
            type="file"
            className="form-control"
            accept="image/*"
            onChange={handleImageUpload}
          />
          {image && (
            <div className="mt-3">
              <img
                src={image}
                alt="Preview"
                className="img-fluid rounded border mb-2"
                style={{ maxHeight: "300px" }}
              />
              <br />
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleRemoveImage}
              >
                🗑️ Remove Image
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="text-end">
          <button type="submit" className="btn btn-success">
            ✅ Publish Post
          </button>
        </div>
      </form>
    </div>
  );
}