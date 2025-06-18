"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function page() {

    const { logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        logout();
        router.push("/login");
    }, []);

  return (
    <div>Log out...</div>
  )
}
