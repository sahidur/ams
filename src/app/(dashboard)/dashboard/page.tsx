"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { 
  Users, 
  FolderKanban, 
  Building2, 
  GraduationCap, 
  Calendar, 
  CalendarCheck,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

const statsCards = [
  { title: "Total Users", value: "124", icon: Users, color: "from-blue-500 to-blue-600", change: "+12%" },
  { title: "Active Projects", value: "8", icon: FolderKanban, color: "from-purple-500 to-purple-600", change: "+2" },
  { title: "Branches", value: "45", icon: Building2, color: "from-orange-500 to-orange-600", change: "+5" },
  { title: "Batches", value: "32", icon: GraduationCap, color: "from-green-500 to-green-600", change: "+8" },
  { title: "Classes Today", value: "12", icon: Calendar, color: "from-pink-500 to-pink-600", change: "Active" },
  { title: "Attendance Rate", value: "94%", icon: CalendarCheck, color: "from-teal-500 to-teal-600", change: "+3%" },
];

const recentActivities = [
  { id: 1, action: "New user registered", user: "John Doe", time: "5 mins ago" },
  { id: 2, action: "Attendance marked", user: "Batch A", time: "10 mins ago" },
  { id: 3, action: "Class created", user: "Trainer Smith", time: "1 hour ago" },
  { id: 4, action: "Project updated", user: "Admin", time: "2 hours ago" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role || "BASIC_USER";

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
        {getRoleStats().map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
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
        ))}
      </div>

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
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.user}</p>
                    </div>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                ))}
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
                    <button className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-colors text-left">
                      <Users className="w-6 h-6 text-blue-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">Add User</p>
                    </button>
                    <button className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-colors text-left">
                      <FolderKanban className="w-6 h-6 text-purple-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">New Project</p>
                    </button>
                  </>
                )}
                {(role === "ADMIN" || role === "TRAINER") && (
                  <>
                    <button className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-colors text-left">
                      <Calendar className="w-6 h-6 text-green-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">Create Class</p>
                    </button>
                    <button className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 transition-colors text-left">
                      <CalendarCheck className="w-6 h-6 text-orange-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">Take Attendance</p>
                    </button>
                  </>
                )}
                {role === "STUDENT" && (
                  <>
                    <button className="p-4 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 transition-colors text-left">
                      <CalendarCheck className="w-6 h-6 text-teal-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">My Attendance</p>
                    </button>
                    <button className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 transition-colors text-left">
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
