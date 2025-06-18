"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function page() {

    const [username, setUsername] = useState("");
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = () => {
        if (username.trim() !== "") {
            login(username);
            router.push("/home");
        }
    };

  return (
    <div>
      <h1>Login</h1>
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={handleLogin}>Log In</button>
    </div>
  )
}
