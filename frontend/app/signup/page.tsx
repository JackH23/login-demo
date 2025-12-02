"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password) {
      setError("Username, email, and password are required.");
      return;
    }

    setSubmitting(true);

    setError("");

    try {
      // Prepare optional base64 encoded image string
      let imageData: string | null = null;
      if (image) {
        imageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(image);
        });
      }

      const result = await signup(
        username.trim(),
        email.trim(),
        password,
        imageData
      );
      if (result.success) {
        router.push("/signin");
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`d-flex align-items-center justify-content-center min-vh-100 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <div className="card shadow" style={{ maxWidth: "28rem", width: "100%" }}>
        <div className="card-body">
          <h2 className="card-title h3 text-center mb-4">Sign Up</h2>

          {error && (
            <div className="alert alert-danger text-center py-2" role="alert">
              {error}
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Upload Image</label>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
          </div>

          <button
            className="btn btn-primary w-100"
            onClick={handleSignup}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="visually-hidden">Signing Up...</span>
                <span
                  aria-hidden="true"
                  className="d-inline-flex align-items-center gap-1"
                >
                  <span>Signing Up</span>
                  <span className="animated-ellipsis">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                </span>
              </>
            ) : (
              "Create Account"
            )}
          </button>

          <p className="text-center mt-3 mb-0">
            Already have an account? <a href="/signin">Sign in</a>
          </p>
        </div>
      </div>
      <style jsx>{`
        .animated-ellipsis {
          display: inline-flex;
          justify-content: space-between;
          align-items: flex-end;
          width: 1.5rem;
        }

        .animated-ellipsis .dot {
          display: inline-block;
          width: 0.25rem;
          height: 0.25rem;
          border-radius: 50%;
          background-color: currentColor;
          opacity: 0.35;
          animation: signing-ellipsis 0.9s infinite ease-in-out;
        }

        .animated-ellipsis .dot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .animated-ellipsis .dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes signing-ellipsis {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }

          40% {
            transform: translateY(-0.25rem);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
