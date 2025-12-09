"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/app/lib/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function CreateBlogPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [contentTouched, setContentTouched] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previousImage, setPreviousImage] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isNight = theme === "night";

  const wordCount = useMemo(() => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  }, [content]);

  const readingTime = useMemo(() => {
    if (!wordCount) return 0;
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  const completion = useMemo(() => {
    const steps = [title.trim().length >= 5, wordCount >= 50, Boolean(image)];
    const completedSteps = steps.filter(Boolean).length;
    return Math.round((completedSteps / steps.length) * 100);
  }, [title, wordCount, image]);

  const titleError =
    titleTouched && title.trim().length < 5
      ? "Title needs at least 5 characters."
      : "";
  const contentError =
    contentTouched && wordCount < 50
      ? "Add a few more words for a fuller story (50+)."
      : "";

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (image) {
      setPreviousImage(image);
    }

    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (image) {
      setPreviousImage(image);
    }
    setImage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const res = await fetch(apiUrl("/api/posts"), {
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
      className={`min-vh-100 ${isNight ? "bg-dark text-light" : "bg-body-tertiary"}`}
      style={{ paddingTop: "2.5rem", paddingBottom: "2.5rem" }}
    >
      <div className="container px-3 px-md-4">
        {/* Hero */}
        <div
          className={`rounded-4 p-4 p-lg-5 mb-5 position-relative overflow-hidden ${
            isNight ? "bg-gradient" : "bg-white"
          }`}
          style={{
            background: isNight
              ? "linear-gradient(135deg, rgba(40,40,60,.9), rgba(12,12,30,.85))"
              : "linear-gradient(135deg, rgba(255,215,128,.35), rgba(120,200,255,.35))",
          }}
        >
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
            <div className="text-lg-start text-center">
              <span className="badge text-bg-warning text-dark mb-3 px-3 py-2 fs-6">
                ✨ Inspiration Hub
              </span>
              <h1 className="display-6 fw-bold mb-3">
                Create a New Blog Post <span aria-hidden>📝</span>
              </h1>
              <p className="lead mb-0">
                Craft stories that resonate, add captivating visuals, and preview your masterpiece before sharing it with the community.
              </p>
            </div>
            <div
              className={`rounded-4 px-4 py-3 shadow-sm ${
                isNight ? "bg-dark text-light border border-secondary" : "bg-white"
              }`}
              style={{ minWidth: "260px" }}
            >
              <p className="text-uppercase fw-semibold small mb-2 text-secondary">
                Publishing checklist
              </p>
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="display-5 fw-bold mb-0">{completion}%</div>
                <div className="flex-grow-1">
                  <div className="progress bg-secondary-subtle" style={{ height: "0.6rem" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${completion}%` }}
                      aria-valuenow={completion}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <small className="text-secondary">
                    Complete the essentials for a stellar post.
                  </small>
                </div>
              </div>
              <ul className="list-unstyled small mb-0 d-grid gap-2">
                <li className="d-flex align-items-center gap-2">
                  <span>{title.trim().length >= 5 ? "✅" : "⬜"}</span>
                  <span>Catchy title (5+ characters)</span>
                </li>
                <li className="d-flex align-items-center gap-2">
                  <span>{wordCount >= 50 ? "✅" : "⬜"}</span>
                  <span>At least 50 words of content</span>
                </li>
                <li className="d-flex align-items-center gap-2">
                  <span>{image ? "✅" : "⬜"}</span>
                  <span>Eye-catching cover image</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="row g-4 align-items-start">
          <div className="col-lg-8">
            <div
              className="position-sticky top-0 z-2 mb-3 py-3"
              style={{
                background: isNight
                  ? "linear-gradient(180deg, rgba(12,12,30,0.92), rgba(12,12,30,0.8))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.86))",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <p className="text-uppercase small fw-semibold text-secondary mb-1">
                    Form progress
                  </p>
                  <p className="mb-0 fw-semibold">{completion}% complete</p>
                </div>
                <div className="flex-grow-1">
                  <div className="progress" style={{ height: "0.65rem" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${completion}%` }}
                      aria-valuenow={completion}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Blog Form */}
            <form
              onSubmit={handleSubmit}
              className={`card border-0 shadow-lg rounded-4 p-4 p-lg-5 ${
                isNight ? "bg-dark text-light" : "bg-white"
              }`}
            >
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="h3 fw-bold mb-1">Your Storyboard</h2>
                  <p className="text-secondary mb-0">
                    Fill in the details below and watch your narrative come alive.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => router.push("/home")}
                >
                  ⬅ Back to Home
                </button>
              </div>

              <div className="d-grid gap-4">
                {/* Title Input */}
                <div className="d-grid gap-2">
                  <label className="form-label fw-semibold">Title *</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Give your post a standout headline..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setTitleTouched(true)}
                    style={{ lineHeight: 1.5, minHeight: "48px" }}
                    required
                  />
                  <div className="d-flex justify-content-between small text-secondary">
                    <span>{title.length} / 120 characters</span>
                    <span>
                      {title.trim().length >= 5 ? "Looks good!" : "Add a little more flair."}
                    </span>
                  </div>
                  {titleError && (
                    <div className="text-danger d-flex align-items-center gap-2 small" role="alert">
                      <span aria-hidden>⚠️</span>
                      <span>{titleError}</span>
                    </div>
                  )}
                </div>

                {/* Content Input */}
                <div className="d-grid gap-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label fw-semibold mb-0">Content *</label>
                    <span className="badge text-bg-secondary">1.5x line height</span>
                  </div>
                  <textarea
                    className="form-control"
                    placeholder="Share your insights, stories, or tutorials..."
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onBlur={() => setContentTouched(true)}
                    style={{ lineHeight: 1.6, minHeight: "48px" }}
                    required
                  />
                  <div className="d-flex justify-content-between small text-secondary">
                    <span>{wordCount} words</span>
                    <span>
                      {wordCount >= 50
                        ? "Great depth!"
                        : `Add ${Math.max(0, 50 - wordCount)} more words for a richer read.`}
                    </span>
                  </div>
                  {contentError && (
                    <div className="text-danger d-flex align-items-center gap-2 small" role="alert">
                      <span aria-hidden>⚠️</span>
                      <span>{contentError}</span>
                    </div>
                  )}
                </div>

                <div
                  className={`rounded-3 border ${
                    isNight ? "border-secondary bg-dark bg-opacity-50" : "border-light bg-body-tertiary"
                  } p-3 d-flex align-items-center gap-3 flex-wrap`}
                  aria-label="Formatting toolbar"
                >
                  <span className="fw-semibold">Quick formatting</span>
                  <div className="d-flex gap-2 flex-wrap">
                    {["Bold", "Italic", "Insert link", "List"].map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="btn btn-outline-secondary"
                        style={{ minWidth: "48px", minHeight: "44px" }}
                        aria-label={action}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Upload */}
                <div className="d-grid gap-2">
                  <label className="form-label fw-semibold">Upload Image</label>
                  <div
                    className={`border rounded-4 p-4 text-center ${
                      isNight
                        ? "bg-dark bg-opacity-50 border-secondary"
                        : "bg-body-tertiary border-2"
                    }`}
                    style={{ borderStyle: "dashed" }}
                  >
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ minHeight: "48px" }}
                    />
                    <small className="text-secondary d-block mt-2">
                      PNG, JPG or GIF (max 5MB) — visuals boost engagement by 94%!
                    </small>
                  </div>
                  {image && (
                    <div className="mt-3 d-grid gap-2">
                      <img
                        src={image}
                        alt="Preview"
                        className="img-fluid rounded-4 border"
                        style={{ maxHeight: "280px", objectFit: "cover" }}
                      />
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          style={{ minHeight: "44px" }}
                          onClick={handleRemoveImage}
                        >
                          🗑️ Remove Image
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          style={{ minHeight: "44px" }}
                          onClick={() => previousImage && setImage(previousImage)}
                          disabled={!previousImage}
                        >
                          Revert changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="rounded-3 border-top pt-3 d-grid gap-3">
                  <div className="text-secondary small d-flex align-items-start gap-2">
                    <span aria-hidden>💡</span>
                    <span>
                      <strong>Pro tip:</strong> Eye-catching introductions increase readership by 60%.
                    </span>
                  </div>
                  <div
                    className="position-sticky bottom-0 start-0 end-0"
                    style={{
                      zIndex: 5,
                      margin: "-1.25rem",
                      padding: "1.25rem",
                      paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
                      background: isNight
                        ? "rgba(12,12,20,0.92)"
                        : "rgba(255,255,255,0.96)",
                      backdropFilter: "blur(12px)",
                      borderRadius: "0 0 1rem 1rem",
                    }}
                  >
                    <div className="d-flex flex-column flex-md-row gap-3">
                      <button
                        type="submit"
                        className="btn btn-success btn-lg w-100"
                        style={{ minHeight: "52px" }}
                      >
                        ✅ Publish Post
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-lg w-100"
                        style={{ minHeight: "52px" }}
                      >
                        📝 Save Draft
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="col-lg-4">
            <div className="d-flex flex-column gap-4">
              {/* Insights Card */}
              <div
                className={`card border-0 shadow-lg rounded-4 p-4 ${
                  isNight ? "bg-dark text-light" : "bg-white"
                }`}
              >
                <h3 className="h5 fw-bold mb-3">Engagement insights</h3>
                <ul className="list-unstyled d-grid gap-3 mb-0">
                  <li className="d-flex gap-3">
                    <div className="badge rounded-pill text-bg-primary p-3">📈</div>
                    <div>
                      <p className="fw-semibold mb-1">Estimated read time</p>
                      <p className="text-secondary mb-0">
                        {readingTime ? `${readingTime} minute read` : "Add content to calculate."}
                      </p>
                    </div>
                  </li>
                  <li className="d-flex gap-3">
                    <div className="badge rounded-pill text-bg-success p-3">💡</div>
                    <div>
                      <p className="fw-semibold mb-1">Story momentum</p>
                      <p className="text-secondary mb-0">
                        {wordCount >= 120
                          ? "Your story is full of detail—amazing!"
                          : "Add examples or anecdotes to boost impact."}
                      </p>
                    </div>
                  </li>
                  <li className="d-flex gap-3">
                    <div className="badge rounded-pill text-bg-warning p-3">🖼️</div>
                    <div>
                      <p className="fw-semibold mb-1">Visual appeal</p>
                      <p className="text-secondary mb-0">
                        {image
                          ? "Great choice! A cover image boosts clicks."
                          : "Upload a cover image to stop the scroll."}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Live Preview */}
              <div
                className={`card border-0 shadow-lg rounded-4 overflow-hidden ${
                  isNight ? "bg-dark text-light" : "bg-white"
                }`}
              >
                {image ? (
                  <img
                    src={image}
                    alt="Post preview"
                    className="w-100"
                    style={{ maxHeight: "180px", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className={`d-flex flex-column justify-content-center align-items-center py-5 ${
                      isNight ? "bg-secondary bg-opacity-25" : "bg-body-tertiary"
                    }`}
                  >
                    <span className="display-6" aria-hidden>
                      🖼️
                    </span>
                    <p className="mb-0 mt-3 text-secondary">Preview image will appear here</p>
                  </div>
                )}
                <div className="p-4">
                  <h4 className="fw-bold mb-2">
                    {title.trim() ? title : "Your captivating title goes here"}
                  </h4>
                  <p className="text-secondary" style={{ lineHeight: 1.5 }}>
                    {content.trim()
                      ? content.slice(0, 140) + (content.length > 140 ? "…" : "")
                      : "Start typing to see a live preview of your post content."}
                  </p>
                  <button
                    type="button"
                    className={`btn w-100 ${showPreview ? "btn-primary" : "btn-outline-primary"}`}
                    style={{ minHeight: "48px" }}
                    onClick={() => setShowPreview((prev) => !prev)}
                  >
                    {showPreview ? "Hide Live Preview" : "Live Preview"}
                  </button>
                  {showPreview && (
                    <p className="small text-secondary mt-2 mb-0" style={{ lineHeight: 1.5 }}>
                      The preview mirrors published typography for confidence before posting.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
