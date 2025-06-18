"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function page() {

    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!user) {
          router.push("/login");
        }
    }, [user]);

    if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user.username}</h1>
      <a href="/logout">Logout</a>
    </div>
  )
}
