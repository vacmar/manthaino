"use client";

import { LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    try {
      await api.logout();
      router.push("/auth/login");
    } catch(e) {
      console.error(e);
    }
  };
  return (
    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/10 rounded-xl transition-all font-medium">
      <LogOut className="w-5 h-5" />
      Logout
    </button>
  );
}
