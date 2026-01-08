"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  LayoutDashboard,
  Users,
  FolderKanban,
  Building2,
  GraduationCap,
  Calendar,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Settings,
  Camera,
  Shield,
  Layers,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  module: string; // SystemModule name for permission check
  alwaysShow?: boolean; // For items that should always show (Dashboard, Profile)
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    module: "DASHBOARD",
    alwaysShow: true,
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: Users,
    module: "USERS",
  },
  {
    title: "Roles",
    href: "/dashboard/roles",
    icon: Shield,
    module: "ROLES",
  },
  {
    title: "Projects",
    href: "/dashboard/projects",
    icon: FolderKanban,
    module: "PROJECTS",
  },
  {
    title: "Model Types",
    href: "/dashboard/model-types",
    icon: Layers,
    module: "PROJECTS",
  },
  {
    title: "Training Types",
    href: "/dashboard/training-types",
    icon: BookOpen,
    module: "PROJECTS",
  },
  {
    title: "Branches",
    href: "/dashboard/branches",
    icon: Building2,
    module: "BRANCHES",
  },
  {
    title: "Batches",
    href: "/dashboard/batches",
    icon: GraduationCap,
    module: "BATCHES",
  },
  {
    title: "Classes",
    href: "/dashboard/classes",
    icon: Calendar,
    module: "CLASSES",
  },
  {
    title: "Attendance",
    href: "/dashboard/attendance",
    icon: CalendarCheck,
    module: "ATTENDANCE",
  },
  {
    title: "Face Training",
    href: "/dashboard/face-training",
    icon: Camera,
    module: "FACE_TRAINING",
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: User,
    module: "PROFILE",
    alwaysShow: true,
  },
];

interface UserPermission {
  module: string;
  action: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [permissionsError, setPermissionsError] = useState(false);

  // Fetch user permissions with retry
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;
    
    const fetchPermissions = async () => {
      if (session?.user?.id) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const res = await fetch("/api/roles/modules?userPermissions=true", {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          if (res.ok && isMounted) {
            const data = await res.json();
            setUserPermissions(data.permissions || []);
            setPermissionsError(false);
          } else if (isMounted && retryCount < maxRetries) {
            retryCount++;
            setTimeout(fetchPermissions, 1000);
            return;
          }
        } catch (error) {
          console.error("Error fetching permissions:", error);
          if (isMounted) {
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(fetchPermissions, 1000);
              return;
            }
            setPermissionsError(true);
          }
        } finally {
          if (isMounted) {
            setPermissionsLoaded(true);
          }
        }
      }
    };

    if (status === "authenticated") {
      fetchPermissions();
    }
    
    return () => {
      isMounted = false;
    };
  }, [session?.user?.id, status]);

  // Check if user is Super Admin (should have access to everything)
  const isSuperAdmin = session?.user?.userRoleName === "Super Admin" || 
    (session?.user as { userRole?: { name: string } })?.userRole?.name === "SUPER_ADMIN";

  // Check if user has at least READ permission for a module
  const hasModuleAccess = (module: string): boolean => {
    // Super Admin has access to all modules
    if (isSuperAdmin) return true;
    // Check for READ or ALL permission
    return userPermissions.some(
      (p) => p.module === module && (p.action === "READ" || p.action === "ALL")
    );
  };

  // Check if role is deactivated
  if (session?.error === "RoleDeactivated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Role Deactivated</h2>
          <p className="text-gray-600 mb-6">
            Your role has been deactivated by the administrator. Please contact support for assistance.
          </p>
          <Button onClick={() => signOut({ callbackUrl: "/" })}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // Super Admin sees all menus, others wait for permissions to load
  const filteredNavItems = isSuperAdmin
    ? navItems // Super Admin sees all
    : permissionsLoaded
      ? navItems.filter((item) => item.alwaysShow || hasModuleAccess(item.module))
      : navItems.filter((item) => item.alwaysShow); // Show only always-visible items while loading

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <CalendarCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AMS
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1" />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-medium">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-500">{session?.user?.userRoleName || session?.user?.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1"
                >
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
