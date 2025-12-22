"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { User, Lock, Briefcase, Camera } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  designation: string;
  department: string;
  employeeId: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "job" | "password">("personal");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileData>();

  const passwordForm = useForm<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${session?.user?.id}`);
        const data = await res.json();
        reset({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          dateOfBirth: data.dateOfBirth?.split("T")[0] || "",
          gender: data.gender || "",
          address: data.address || "",
          designation: data.designation || "",
          department: data.department || "",
          employeeId: data.employeeId || "",
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session, reset]);

  const onSubmit = async (data: ProfileData) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSuccessMessage("Profile updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const onPasswordSubmit = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (data.newPassword !== data.confirmPassword) {
      return;
    }

    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (res.ok) {
        setSuccessMessage("Password updated successfully!");
        passwordForm.reset();
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error updating password:", error);
    }
  };

  const tabs = [
    { id: "personal" as const, label: "Personal Details", icon: User },
    { id: "job" as const, label: "Job Information", icon: Briefcase },
    { id: "password" as const, label: "Change Password", icon: Lock },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account settings</p>
      </div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-600"
        >
          {successMessage}
        </motion.div>
      )}

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50">
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{session?.user?.name}</h2>
              <p className="text-gray-500">{session?.user?.email}</p>
              <p className="text-sm text-blue-600 mt-1">{session?.user?.role}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tabs */}
          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "personal" && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="Full Name" {...register("name")} />
                  <Input label="Email" type="email" {...register("email")} disabled />
                  <Input label="Phone" {...register("phone")} />
                  <Input label="Date of Birth" type="date" {...register("dateOfBirth")} />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      {...register("gender")}
                      className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    {...register("address")}
                    className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm min-h-[80px]"
                    placeholder="Enter your address"
                  />
                </div>
                <Button type="submit" isLoading={isSubmitting}>
                  Save Changes
                </Button>
              </form>
            )}

            {activeTab === "job" && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="Employee ID" {...register("employeeId")} />
                  <Input label="Designation" {...register("designation")} />
                  <Input label="Department" {...register("department")} />
                </div>
                <Button type="submit" isLoading={isSubmitting}>
                  Save Changes
                </Button>
              </form>
            )}

            {activeTab === "password" && (
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                <Input
                  label="Current Password"
                  type="password"
                  {...passwordForm.register("currentPassword")}
                />
                <Input
                  label="New Password"
                  type="password"
                  {...passwordForm.register("newPassword")}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  {...passwordForm.register("confirmPassword")}
                />
                <Button type="submit" isLoading={passwordForm.formState.isSubmitting}>
                  Update Password
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
