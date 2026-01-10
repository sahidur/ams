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
  Wrench,
  MapPin,
  Briefcase,
  UserCheck,
  FileText,
  Building,
  FilePlus,
  FileSearch,
  FolderCog,
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

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  module?: string; // Optional module check for entire section
}

// Main navigation items (standalone, not in a section)
const mainNavItems: NavItem[] = [
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
    title: "My Profile",
    href: "/dashboard/profile",
    icon: User,
    module: "PROFILE",
    alwaysShow: true,
  },
];

// Projects section
const projectsSection: NavSection = {
  title: "Projects",
  icon: FolderKanban,
  items: [
    {
      title: "Projects",
      href: "/dashboard/projects",
      icon: FolderKanban,
      module: "PROJECTS",
    },
    {
      title: "Branches",
      href: "/dashboard/branches",
      icon: Building2,
      module: "BRANCHES",
    },
  ],
};

// Class Management section
const classManagementSection: NavSection = {
  title: "Class Management",
  icon: GraduationCap,
  items: [
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
  ],
};

// Knowledge Base section (new)
const knowledgeBaseSection: NavSection = {
  title: "Knowledge Base",
  icon: BookOpen,
  items: [
    {
      title: "Create Document",
      href: "/dashboard/knowledge-base/create",
      icon: FilePlus,
      module: "KNOWLEDGE_BASE",
    },
    {
      title: "View Documents",
      href: "/dashboard/knowledge-base",
      icon: FileSearch,
      module: "KNOWLEDGE_BASE",
    },
    {
      title: "Manage Documents",
      href: "/dashboard/knowledge-base/manage",
      icon: FolderCog,
      module: "KNOWLEDGE_BASE",
    },
  ],
};

// Admin Tools section
const adminToolsSection: NavSection = {
  title: "Admin Tools",
  icon: Wrench,
  items: [
    {
      title: "Roles",
      href: "/dashboard/roles",
      icon: Shield,
      module: "ROLES",
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
      title: "Geo Admin",
      href: "/dashboard/geo-admin",
      icon: MapPin,
      module: "BRANCHES",
    },
    {
      title: "Designations",
      href: "/dashboard/designations",
      icon: Briefcase,
      module: "USERS",
    },
    {
      title: "Employment Status",
      href: "/dashboard/employment-statuses",
      icon: UserCheck,
      module: "USERS",
    },
    {
      title: "Employment Types",
      href: "/dashboard/employment-types",
      icon: FileText,
      module: "USERS",
    },
    {
      title: "Departments",
      href: "/dashboard/departments",
      icon: Building,
      module: "USERS",
    },
  ],
};

// All sections for rendering
const navSections: NavSection[] = [
  projectsSection,
  classManagementSection,
  knowledgeBaseSection,
];

// Keep navItems for backward compatibility (flattened list)
const navItems: NavItem[] = [
  ...mainNavItems,
  ...projectsSection.items,
  ...classManagementSection.items,
  ...knowledgeBaseSection.items,
  ...adminToolsSection.items,
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
  const [adminToolsOpen, setAdminToolsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [classManagementOpen, setClassManagementOpen] = useState(false);
  const [knowledgeBaseOpen, setKnowledgeBaseOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [permissionsError, setPermissionsError] = useState(false);

  // Auto-expand sections if current page is within them
  useEffect(() => {
    const isInAdminTools = adminToolsSection.items.some(item => pathname === item.href);
    const isInProjects = projectsSection.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));
    const isInClassManagement = classManagementSection.items.some(item => pathname === item.href);
    const isInKnowledgeBase = knowledgeBaseSection.items.some(item => pathname === item.href || pathname.startsWith("/dashboard/knowledge-base"));
    
    if (isInAdminTools) setAdminToolsOpen(true);
    if (isInProjects) setProjectsOpen(true);
    if (isInClassManagement) setClassManagementOpen(true);
    if (isInKnowledgeBase) setKnowledgeBaseOpen(true);
  }, [pathname]);

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

  // Filter main nav items based on permissions
  const filteredMainNavItems = isSuperAdmin
    ? mainNavItems
    : permissionsLoaded
      ? mainNavItems.filter((item) => item.alwaysShow || hasModuleAccess(item.module))
      : mainNavItems.filter((item) => item.alwaysShow);

  // Admin Tools section is only visible to Super Admin
  const filteredAdminToolsItems = isSuperAdmin ? adminToolsSection.items : [];

  // Check if admin tools section should be visible (Super Admin only)
  const showAdminTools = isSuperAdmin;

  // For backward compatibility (used in permission checks)
  const filteredNavItems = isSuperAdmin
    ? navItems
    : permissionsLoaded
      ? navItems.filter((item) => item.alwaysShow || hasModuleAccess(item.module))
      : navItems.filter((item) => item.alwaysShow);

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
            Somadhanhobe
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {/* Main nav items */}
          {filteredMainNavItems.map((item) => {
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

          {/* Projects Section */}
          {(isSuperAdmin || projectsSection.items.some(item => hasModuleAccess(item.module))) && (
            <div className="pt-2 border-t border-gray-200 mt-2">
              <button
                onClick={() => setProjectsOpen(!projectsOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  projectsOpen || projectsSection.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"))
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-5 h-5" />
                  Projects
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  projectsOpen ? "rotate-180" : ""
                )} />
              </button>
              
              <AnimatePresence>
                {projectsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-1 space-y-1">
                      {projectsSection.items
                        .filter(item => isSuperAdmin || hasModuleAccess(item.module))
                        .map((item) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              )}
                            >
                              <item.icon className="w-4 h-4" />
                              {item.title}
                            </Link>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Class Management Section */}
          {(isSuperAdmin || classManagementSection.items.some(item => hasModuleAccess(item.module))) && (
            <div className="pt-2 border-t border-gray-200 mt-2">
              <button
                onClick={() => setClassManagementOpen(!classManagementOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  classManagementOpen || classManagementSection.items.some(item => pathname === item.href)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5" />
                  Class Management
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  classManagementOpen ? "rotate-180" : ""
                )} />
              </button>
              
              <AnimatePresence>
                {classManagementOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-1 space-y-1">
                      {classManagementSection.items
                        .filter(item => isSuperAdmin || hasModuleAccess(item.module))
                        .map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              )}
                            >
                              <item.icon className="w-4 h-4" />
                              {item.title}
                            </Link>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Knowledge Base Section */}
          {isSuperAdmin && (
            <div className="pt-2 border-t border-gray-200 mt-2">
              <button
                onClick={() => setKnowledgeBaseOpen(!knowledgeBaseOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  knowledgeBaseOpen || pathname.startsWith("/dashboard/knowledge-base")
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5" />
                  Knowledge Base
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  knowledgeBaseOpen ? "rotate-180" : ""
                )} />
              </button>
              
              <AnimatePresence>
                {knowledgeBaseOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-1 space-y-1">
                      {knowledgeBaseSection.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            )}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.title}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Admin Tools Section - at the end */}
          {showAdminTools && (
            <div className="pt-2 border-t border-gray-200 mt-2">
              <button
                onClick={() => setAdminToolsOpen(!adminToolsOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  adminToolsOpen || adminToolsSection.items.some(item => pathname === item.href)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5" />
                  Admin Tools
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  adminToolsOpen ? "rotate-180" : ""
                )} />
              </button>
              
              <AnimatePresence>
                {adminToolsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-1 space-y-1">
                      {filteredAdminToolsItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            )}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.title}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
