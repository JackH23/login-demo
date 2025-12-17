"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import BlogCard from "@/app/components/BlogCard";
import LoadingState from "@/app/components/LoadingState";
import TopBar from "@/app/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import { useCachedApi } from "@/app/hooks/useCachedApi";
import { normalizeUserResponse, normalizeUsersResponse } from "@/app/lib/users";

interface UserProfile {
  username: string;
  image?: string;
  friends?: string[];
  online?: boolean;
}

interface BlogPost {
  _id?: string;
  title: string;
  content: string;
  image?: string | null;
  imageEdits?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    grayscale?: number;
    rotation?: number;
    hue?: number;
    blur?: number;
    sepia?: number;
  } | null;
  author: string;
  likes: number;
  dislikes: number;
  likedBy?: string[];
  dislikedBy?: string[];
}

export default function UserProfilePage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const usernameParam = Array.isArray(params?.username)
    ? params?.username?.[0]
    : (params?.username as string | undefined);
  const profileUsername = usernameParam
    ? decodeURIComponent(usernameParam)
    : "";

  const { data: users, loading: loadingUsers } = useCachedApi<UserProfile[]>(
    user ? "/api/users" : null,
    {
      fallback: [],
      transform: normalizeUsersResponse,
    }
  );

  const { data: profileUser, loading: loadingProfile } =
    useCachedApi<UserProfile | null>(
      user && profileUsername
        ? `/api/users/${encodeURIComponent(profileUsername)}`
        : null,
      {
        fallback: null,
        transform: normalizeUserResponse,
      }
    );

  const { data: posts, loading: loadingPosts } = useCachedApi<BlogPost[]>(
    user && profileUsername
      ? `/api/posts?author=${encodeURIComponent(profileUsername)}`
      : null,
    {
      fallback: [],
      transform: (payload) =>
        (payload as { posts?: BlogPost[] | null })?.posts ?? [],
    }
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  const isLoading =
    loading ||
    !user ||
    loadingUsers ||
    loadingProfile ||
    loadingPosts ||
    !profileUsername;

  if (isLoading) {
    return (
      <LoadingState
        title="Loading profile"
        subtitle="Collecting the latest details about this user and their posts."
        skeletonCount={3}
      />
    );
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return (
      <LoadingState
        title="Fetching your profile"
        subtitle="We’re syncing your account details so everything looks just right."
        skeletonCount={1}
      />
    );
  }

  if (!profileUser) {
    return (
      <div
        className={`container-fluid min-vh-100 py-4 ${
          theme === "night" ? "bg-dark text-white" : "bg-light"
        }`}
      >
        <TopBar
          title="Profile"
          active="user"
          currentUser={{
            username: currentUserData.username,
            image: currentUserData.image,
          }}
        />
        <div className="container mt-5">
          <div className="card shadow-sm text-center">
            <div className="card-body py-5">
              <h2 className="h4 mb-2">User not found</h2>
              <p className="text-muted mb-4">
                The profile you are looking for does not exist.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => router.push("/user")}
              >
                Back to directory
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const presenceLabel = profileUser.online ? "Online" : "Offline";
  const presenceClass = profileUser.online ? "bg-success" : "bg-secondary";

  useEffect(() => {
    if (!isImageModalOpen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsImageModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isImageModalOpen]);

  const handleBackNavigation = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/user");
    }
  };

  const enableImageModal = () => {
    if (profileUser.image) {
      setIsImageModalOpen(true);
    }
  };

  const closeImageModal = () => setIsImageModalOpen(false);

  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <TopBar
        title="Profile"
        active="user"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
        }}
      />

      <div className="container mt-4">
        <div className="card border-0 shadow-lg mb-4 d-md-none">
          <div className="card-body d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="position-relative">
                {profileUser.image ? (
                  <img
                    src={profileUser.image}
                    alt={`${profileUser.username} profile`}
                    className="rounded-circle border"
                    role="button"
                    tabIndex={0}
                    onClick={enableImageModal}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        enableImageModal();
                      }
                    }}
                    style={{
                      width: "72px",
                      height: "72px",
                      objectFit: "cover",
                      cursor: profileUser.image ? "zoom-in" : "default",
                    }}
                  />
                ) : (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center border"
                    style={{
                      width: "72px",
                      height: "72px",
                      fontSize: "1.5rem",
                    }}
                  >
                    {profileUser.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className={`badge ${presenceClass} position-absolute end-0 bottom-0 translate-middle p-2 border border-light`}
                  title={presenceLabel}
                  aria-label={presenceLabel}
                >
                  <span className="visually-hidden">{presenceLabel}</span>
                </span>
              </div>

              <div className="flex-grow-1">
                <p className="text-uppercase text-muted small mb-1">
                  Public profile
                </p>
                <h1 className="h5 mb-1">{profileUser.username}</h1>
                <span
                  className={`badge ${presenceClass} bg-opacity-10 text-uppercase fw-semibold`}
                >
                  {presenceLabel}
                </span>
              </div>
            </div>

            <div className="row text-center g-3 small">
              <div className="col-4">
                <p className="text-muted text-uppercase mb-1">Friends</p>
                <p className="h6 mb-0">{(profileUser.friends ?? []).length}</p>
              </div>
              <div className="col-4">
                <p className="text-muted text-uppercase mb-1">Posts</p>
                <p className="h6 mb-0">{posts.length}</p>
              </div>
              <div className="col-4">
                <p className="text-muted text-uppercase mb-1">Status</p>
                <p className="h6 mb-0">{presenceLabel}</p>
              </div>
            </div>

            <div className="d-grid gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  router.push(
                    `/chat?user=${encodeURIComponent(profileUser.username)}`
                  )
                }
              >
                Message
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleBackNavigation}
              >
                Back to directory
              </button>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-lg mb-4 d-none d-md-block">
          <div className="card-body d-flex flex-column flex-md-row align-items-md-center gap-4">
            <div className="position-relative">
              {profileUser.image ? (
                <img
                  src={profileUser.image}
                  alt={`${profileUser.username} profile`}
                  className="rounded-circle border"
                  role="button"
                  tabIndex={0}
                  onClick={enableImageModal}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      enableImageModal();
                    }
                  }}
                  style={{
                    width: "96px",
                    height: "96px",
                    objectFit: "cover",
                    cursor: profileUser.image ? "zoom-in" : "default",
                  }}
                />
              ) : (
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center border"
                  style={{ width: "96px", height: "96px", fontSize: "2rem" }}
                >
                  {profileUser.username.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`badge ${presenceClass} position-absolute end-0 bottom-0 translate-middle p-2 border border-light`}
                title={presenceLabel}
                aria-label={presenceLabel}
              >
                <span className="visually-hidden">{presenceLabel}</span>
              </span>
            </div>

            <div className="flex-grow-1">
              <p className="text-uppercase text-muted small mb-1">
                Public profile
              </p>
              <h1 className="h4 mb-2">{profileUser.username}</h1>
              <div className="d-flex flex-wrap gap-3 text-muted small">
                <span className="d-inline-flex align-items-center gap-2">
                  <i className="bi bi-people" aria-hidden="true"></i>
                  {(profileUser.friends ?? []).length} friends
                </span>
                <span className="d-inline-flex align-items-center gap-2">
                  <i className="bi bi-journal-text" aria-hidden="true"></i>
                  {posts.length} posts
                </span>
                <span className="d-inline-flex align-items-center gap-2">
                  <i className="bi bi-circle-fill" aria-hidden="true"></i>
                  {presenceLabel}
                </span>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() =>
                  router.push(
                    `/chat?user=${encodeURIComponent(profileUser.username)}`
                  )
                }
              >
                Message
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleBackNavigation}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {posts.length === 0 ? (
          <div className="card shadow-sm w-100 mx-auto">
            <div className="card-body text-center py-5">
              <p className="text-muted mb-0">
                {profileUser.username} hasn’t shared any posts yet.
              </p>
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <BlogCard
              key={post._id ?? post.title}
              blog={post}
              author={profileUser}
            />
          ))
        )}
      </div>

      {isImageModalOpen && profileUser.image && (
        <div
          className="profile-image-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${profileUser.username}'s profile picture in full view`}
          onClick={closeImageModal}
        >
          <div
            className="profile-image-modal__content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-image-modal__header">
              <div className="d-flex align-items-center gap-3">
                <div className="profile-image-modal__avatar">
                  <img
                    src={profileUser.image}
                    alt={`${profileUser.username} avatar`}
                    className="profile-image-modal__avatar-img"
                  />
                </div>
                <div>
                  <p className="text-uppercase text-muted small mb-1">Profile photo</p>
                  <h2 className="h5 mb-0">{profileUser.username}</h2>
                </div>
              </div>

              <button
                type="button"
                className="profile-image-modal__close"
                onClick={closeImageModal}
                aria-label="Close profile photo"
              >
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>

            <div className="profile-image-modal__preview" role="presentation">
              <img
                src={profileUser.image}
                alt={`${profileUser.username} profile enlarged`}
                className="profile-image-modal__img"
              />
            </div>

            <div className="profile-image-modal__footer">
              <p className="small text-muted mb-0">
                Press Esc or click outside the frame to close the preview.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
