import React from "react";

interface UserData {
  username: string;
  image?: string;
}

interface TopBarProps {
  title: string;
  active: "home" | "posts" | "user" | "analysis" | "setting";
  currentUser: UserData;
}

export default function TopBar({ title, active, currentUser }: TopBarProps) {
  return (
    <div
      className="position-sticky top-0 z-3 bg-white"
      style={{ borderBottom: "1px solid #dee2e6" }}
    >
      <div className="d-flex justify-content-between align-items-center px-4 pt-3 pb-2">
        <h2 className="mb-0">{title}</h2>
        <div className="d-flex align-items-center gap-3">
          {currentUser.image && (
            <img
              src={currentUser.image}
              alt="Your Profile"
              className="rounded-circle"
              style={{ width: "40px", height: "40px", objectFit: "cover" }}
            />
          )}
          <span className="fw-semibold">{currentUser.username}</span>
          <a href="/logout" className="btn btn-sm btn-outline-danger">
            Log Out
          </a>
        </div>
      </div>

      <div className="px-4 pb-3">
        <ul className="nav nav-pills gap-2">
          <li className="nav-item">
            <a className={`nav-link ${active === "home" ? "active" : ""}`} href="/home">
              Home
            </a>
          </li>
          <li className="nav-item">
            <a className={`nav-link ${active === "posts" ? "active" : ""}`} href="/posts">
              All Posts
            </a>
          </li>
          <li className="nav-item">
            <a className={`nav-link ${active === "user" ? "active" : ""}`} href="/user">
              User
            </a>
          </li>
          <li className="nav-item">
            <a className={`nav-link ${active === "analysis" ? "active" : ""}`} href="/analysis">
              Analysis
            </a>
          </li>
          <li className="nav-item">
            <a className={`nav-link ${active === "setting" ? "active" : ""}`} href="/setting">
              Settings
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
