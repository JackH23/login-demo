"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSignup = async () => {
    if (!username || !email || !password) {
      setError("Username, email, and password are required.");
      return;
    }

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

    const result = await signup(username, email, password, Number(age), imageData);
    if (result.success) {
      router.push("/signin");
    } else {
      setError(result.message);
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
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Age</label>
            <input
              type="number"
              className="form-control"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter age"
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

          <button className="btn btn-primary w-100" onClick={handleSignup}>
            Create Account
          </button>

          <p className="text-center mt-3 mb-0">
            Already have an account? <a href="/signin">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
