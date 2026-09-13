"use client";

import Link from "next/link";
import { BookOpen, Compass, Code2, BarChart3, Briefcase } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{name: string, email: string} | null>(null);

  useEffect(() => {
    // If not on an auth page, ensure we are logged in
    if (!pathname.startsWith('/auth')) {
      api.getMe().then(setUser).catch(() => {
        router.push('/auth/login');
      });
    }
  }, [pathname, router]);

  // Hide sidebar on auth, onboarding, and focus lesson workspace
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/lesson")
  ) {
    return null;
  }

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
      <div className="p-6">
        <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
          <span className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            m
          </span>
          manthaino
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/10 rounded-xl transition-all font-medium">
          <BookOpen className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/path" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/10 rounded-xl transition-all font-medium">
          <Compass className="w-5 h-5" />
          My Path
        </Link>
        <Link href="/workspace" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/10 rounded-xl transition-all font-medium">
          <Code2 className="w-5 h-5" />
          Workspace
        </Link>
        <Link href="/projects" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/10 rounded-xl transition-all font-medium">
          <Briefcase className="w-5 h-5" />
          Projects
        </Link>
        <Link href="/progress" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/10 rounded-xl transition-all font-medium">
          <BarChart3 className="w-5 h-5" />
          Progress
        </Link>
      </nav>
      
      <div className="p-4 border-t border-border">
        {user ? (
          <Link href="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/10 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold font-heading">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">View Profile</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        )}
        <div className="mt-2">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
