"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Users, 
  FolderKanban, 
  Building2, 
  GraduationCap, 
  Calendar, 
  CalendarCheck,
  TrendingUp,
  UserCheck,
  Map,
  Filter,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import BangladeshMap from "@/components/bangladesh-map";

interface DashboardStats {
  totalUsers: number;
  activeProjects: number;
  totalBranches: number;
  totalBatches: number;
  classesToday: number;
  attendanceRate: string;
}

interface Activity {
  id: string;
  action: string;
  details: string;
  time: string;
  type: string;
}

interface BranchLocation {
  id: string;
  branchName: string;
  branchCode: string | null;
  division: string;
  district: string;
  upazila: string;
  union: string | null;
  isActive: boolean;
  cohort: {
    id: string;
    name: string;
    cohortId: string;
    project: {
      id: string;
      name: string;
      modelType: { id: string; name: string } | null;
      trainingType: { id: string; name: string } | null;
    };
  } | null;
  _count: {
    batches: number;
  };
}

interface DistrictData {
  district: string;
  division: string;
  branches: BranchLocation[];
  count: number;
}

interface FilterOption {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user?.role || "BASIC_USER";
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [branchByDistrict, setBranchByDistrict] = useState<DistrictData[]>([]);
  
  // Filters
  const [projects, setProjects] = useState<FilterOption[]>([]);
  const [cohorts, setCohorts] = useState<FilterOption[]>([]);
  const [modelTypes, setModelTypes] = useState<FilterOption[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<FilterOption[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [selectedModelTypeId, setSelectedModelTypeId] = useState("");
  const [selectedTrainingTypeId, setSelectedTrainingTypeId] = useState("");

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [projectsRes, modelTypesRes, trainingTypesRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/model-types"),
          fetch("/api/training-types")
        ]);
        
        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
        }
        if (modelTypesRes.ok) {
          const data = await modelTypesRes.json();
          setModelTypes(data.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })));
        }
        if (trainingTypesRes.ok) {
          const data = await trainingTypesRes.json();
          setTrainingTypes(data.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
        }
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    };
    
    fetchFilterOptions();
  }, []);

  // Fetch cohorts when project changes
  useEffect(() => {
    const fetchCohorts = async () => {
      if (selectedProjectId) {
        try {
          const res = await fetch(`/api/cohorts?projectId=${selectedProjectId}`);
          if (res.ok) {
            const data = await res.json();
            setCohorts(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
          }
        } catch (error) {
          console.error("Failed to fetch cohorts:", error);
        }
      } else {
        setCohorts([]);
        setSelectedCohortId("");
      }
    };
    
    fetchCohorts();
  }, [selectedProjectId]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) params.append("projectId", selectedProjectId);
      if (selectedCohortId) params.append("cohortId", selectedCohortId);
      if (selectedModelTypeId) params.append("modelTypeId", selectedModelTypeId);
      if (selectedTrainingTypeId) params.append("trainingTypeId", selectedTrainingTypeId);
      
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setActivities(data.recentActivities);
        setBranchByDistrict(data.branchByDistrict);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, selectedCohortId, selectedModelTypeId, selectedTrainingTypeId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statsCards = [
    { title: "Total Users", value: stats?.totalUsers?.toString() || "0", icon: Users, color: "from-blue-500 to-blue-600", link: "/dashboard/users" },
    { title: "Active Projects", value: stats?.activeProjects?.toString() || "0", icon: FolderKanban, color: "from-purple-500 to-purple-600", link: "/dashboard/projects" },
    { title: "Branches", value: stats?.totalBranches?.toString() || "0", icon: Building2, color: "from-orange-500 to-orange-600", link: "/dashboard/branches" },
    { title: "Batches", value: stats?.totalBatches?.toString() || "0", icon: GraduationCap, color: "from-green-500 to-green-600", link: "/dashboard/batches" },
    { title: "Classes Today", value: stats?.classesToday?.toString() || "0", icon: Calendar, color: "from-pink-500 to-pink-600", link: "/dashboard/classes" },
    { title: "Attendance Rate", value: stats?.attendanceRate || "0%", icon: CalendarCheck, color: "from-teal-500 to-teal-600", link: "/dashboard/attendance" },
  ];

  const getRoleStats = () => {
    switch (role) {
      case "ADMIN":
        return statsCards;
      case "HO_USER":
        return statsCards.slice(1);
      case "TRAINER":
        return statsCards.filter(s => ["Batches", "Classes Today", "Attendance Rate"].includes(s.title));
      case "STUDENT":
        return statsCards.filter(s => ["Classes Today", "Attendance Rate"].includes(s.title));
      default:
        return statsCards.slice(0, 2);
    }
  };

  const handleQuickAction = (path: string) => {
    router.push(path);
  };

  const clearFilters = () => {
    setSelectedProjectId("");
    setSelectedCohortId("");
    setSelectedModelTypeId("");
    setSelectedTrainingTypeId("");
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900"
        >
          Welcome back, {session?.user?.name?.split(" ")[0]}! 👋
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-500"
        >
          Here&apos;s what&apos;s happening in your organization today.
        </motion.p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                      <div className="h-8 w-16 bg-gray-200 rounded" />
                    </div>
                    <div className="w-14 h-14 bg-gray-200 rounded-2xl" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          getRoleStats().map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(stat.link)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3" />
                        Live
                      </p>
                    </div>
                    <div className={cn(
                      "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                      stat.color
                    )}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Bangladesh Map Section */}
      {(role === "ADMIN" || role === "HO_USER") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-blue-600" />
                  Branch Locations Map
                </CardTitle>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  
                  <Select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedCohortId("");
                    }}
                    className="min-w-[140px]"
                  >
                    <option value="">All Projects</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                  
                  {selectedProjectId && cohorts.length > 0 && (
                    <Select
                      value={selectedCohortId}
                      onChange={(e) => setSelectedCohortId(e.target.value)}
                      className="min-w-[140px]"
                    >
                      <option value="">All Cohorts</option>
                      {cohorts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  )}
                  
                  <Select
                    value={selectedModelTypeId}
                    onChange={(e) => setSelectedModelTypeId(e.target.value)}
                    className="min-w-[140px]"
                  >
                    <option value="">All Model Types</option>
                    {modelTypes.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </Select>
                  
                  <Select
                    value={selectedTrainingTypeId}
                    onChange={(e) => setSelectedTrainingTypeId(e.target.value)}
                    className="min-w-[140px]"
                  >
                    <option value="">All Training Types</option>
                    {trainingTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                  
                  {(selectedProjectId || selectedCohortId || selectedModelTypeId || selectedTrainingTypeId) && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear
                    </button>
                  )}
                  
                  <button
                    onClick={fetchDashboardData}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <BangladeshMap 
                branchByDistrict={branchByDistrict}
                onDistrictClick={(district) => {
                  console.log("District clicked:", district);
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-200 rounded" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))
                ) : activities.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
                ) : (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.details}</p>
                      </div>
                      <span className="text-xs text-gray-400">{activity.time}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-purple-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {role === "ADMIN" && (
                  <>
                    <button 
                      onClick={() => handleQuickAction("/dashboard/users")}
                      className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-colors text-left"
                    >
                      <Users className="w-6 h-6 text-blue-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">Manage Users</p>
                    </button>
                    <button 
                      onClick={() => handleQuickAction("/dashboard/projects")}
                      className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-colors text-left"
                    >
                      <FolderKanban className="w-6 h-6 text-purple-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">Manage Projects</p>
                    </button>
                  </>
                )}
                {(role === "ADMIN" || role === "TRAINER") && (
                  <>
                    <button 
                      onClick={() => handleQuickAction("/dashboard/classes")}
                      className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-colors text-left"
                    >
                      <Calendar className="w-6 h-6 text-green-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">Manage Classes</p>
                    </button>
                    <button 
                      onClick={() => handleQuickAction("/dashboard/attendance")}
                      className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 transition-colors text-left"
                    >
                      <CalendarCheck className="w-6 h-6 text-orange-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">Take Attendance</p>
                    </button>
                  </>
                )}
                {role === "STUDENT" && (
                  <>
                    <button 
                      onClick={() => handleQuickAction("/dashboard/attendance")}
                      className="p-4 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 transition-colors text-left"
                    >
                      <CalendarCheck className="w-6 h-6 text-teal-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">My Attendance</p>
                    </button>
                    <button 
                      onClick={() => handleQuickAction("/dashboard/classes")}
                      className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 transition-colors text-left"
                    >
                      <Calendar className="w-6 h-6 text-pink-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">My Classes</p>
                    </button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
