"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();
  useEffect(() => {
    logout();
    router.push("/signin");
  }, [logout, router]);

  return <div>Logging out...</div>;
}
