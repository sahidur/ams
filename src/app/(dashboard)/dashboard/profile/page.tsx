"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { 
  User, 
  Lock, 
  Briefcase, 
  Camera, 
  Loader2, 
  MapPin, 
  Building2, 
  Layers, 
  Search, 
  ChevronDown,
  X,
  Check,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FolderKanban,
  ChevronRight,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, Input, Badge } from "@/components/ui";

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
  profileImage?: string;
}

interface Cohort {
  id: string;
  cohortId: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  cohorts: Cohort[];
}

interface Branch {
  id: string;
  branchName: string;
  branchCode: string | null;
  division: string;
  district: string;
  upazila: string;
}

interface BranchAssignment {
  id: string;
  projectId: string;
  cohortId: string;
  branchId: string;
  project: { id: string; name: string };
  cohort: { id: string; cohortId: string; name: string };
  branch: Branch;
}

interface CommentAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface AdminComment {
  id: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    profileImage: string | null;
    userRole: { displayName: string } | null;
  };
  attachments: CommentAttachment[];
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "job" | "projects" | "branches" | "comments" | "password">("personal");
  const [successMessage, setSuccessMessage] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project assignments state (view-only)
  const [projectAssignments, setProjectAssignments] = useState<{ project: { id: string; name: string; isActive: boolean }; cohorts: { cohort: { id: string; cohortId: string; name: string; isActive: boolean } }[] }[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Branch assignment state
  const [projects, setProjects] = useState<Project[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchAssignments, setBranchAssignments] = useState<BranchAssignment[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isCohortDropdownOpen, setIsCohortDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [cohortSearch, setCohortSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [isSavingBranches, setIsSavingBranches] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const cohortDropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Admin comments state
  const [adminComments, setAdminComments] = useState<AdminComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Helper functions for attachments
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    if (fileType.startsWith("video/")) return <Video className="w-4 h-4" />;
    if (fileType.startsWith("audio/")) return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get cohorts from selected project
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const filteredCohorts = selectedProject?.cohorts || [];

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
        setProfileImage(data.profileImage || null);
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

  // Fetch projects for branch assignment
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/users/my-projects?activeOnly=true");
        const data = await res.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);

  // Fetch branches when cohort changes
  useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedCohortId) {
        setBranches([]);
        return;
      }
      try {
        const res = await fetch(`/api/branches?cohortId=${selectedCohortId}`);
        const data = await res.json();
        setBranches(data);
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };
    fetchBranches();
  }, [selectedCohortId]);

  // Fetch existing branch assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch("/api/profile/branches");
        const data = await res.json();
        setBranchAssignments(data);
      } catch (error) {
        console.error("Error fetching branch assignments:", error);
      }
    };
    fetchAssignments();
  }, []);

  // Fetch project assignments for view-only display
  useEffect(() => {
    const fetchProjectAssignments = async () => {
      if (!session?.user?.id) return;
      setIsLoadingProjects(true);
      try {
        // Use explicitOnly=true to show only explicitly assigned projects (not all for Super Admin)
        const res = await fetch("/api/users/my-projects?explicitOnly=true");
        const data = await res.json();
        
        // Group by project
        const grouped = (data.projects || []).map((project: { id: string; name: string; isActive: boolean; cohorts: { id: string; cohortId: string; name: string; isActive: boolean }[] }) => ({
          project: { id: project.id, name: project.name, isActive: project.isActive },
          cohorts: project.cohorts.map((cohort: { id: string; cohortId: string; name: string; isActive: boolean }) => ({
            cohort: { id: cohort.id, cohortId: cohort.cohortId, name: cohort.name, isActive: cohort.isActive }
          }))
        }));
        
        setProjectAssignments(grouped);
      } catch (error) {
        console.error("Error fetching project assignments:", error);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchProjectAssignments();
  }, [session?.user?.id]);

  // Fetch admin comments for current user
  useEffect(() => {
    const fetchComments = async () => {
      if (!session?.user?.id) return;
      setIsLoadingComments(true);
      try {
        const res = await fetch(`/api/users/${session.user.id}/comments`);
        const data = await res.json();
        setAdminComments(data.comments || []);
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setIsLoadingComments(false);
      }
    };
    fetchComments();
  }, [session?.user?.id]);

  // Load existing branch selections when project/cohort changes
  useEffect(() => {
    if (selectedProjectId && selectedCohortId) {
      const existingAssignments = branchAssignments.filter(
        a => a.projectId === selectedProjectId && a.cohortId === selectedCohortId
      );
      setSelectedBranchIds(existingAssignments.map(a => a.branchId));
    } else {
      setSelectedBranchIds([]);
    }
  }, [selectedProjectId, selectedCohortId, branchAssignments]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (cohortDropdownRef.current && !cohortDropdownRef.current.contains(event.target as Node)) {
        setIsCohortDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "profile-image");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfileImage(data.url);
        setSuccessMessage("Profile image updated successfully!");
        await updateSession({ image: data.url });
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

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

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranchIds(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSaveBranches = async () => {
    if (!selectedProjectId || !selectedCohortId) return;
    
    setIsSavingBranches(true);
    try {
      const res = await fetch("/api/profile/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          cohortId: selectedCohortId,
          branchIds: selectedBranchIds
        }),
      });

      if (res.ok) {
        // Refresh assignments
        const assignmentsRes = await fetch("/api/profile/branches");
        const assignmentsData = await assignmentsRes.json();
        setBranchAssignments(assignmentsData);
        setSuccessMessage("Branch assignments saved successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save branch assignments");
      }
    } catch (error) {
      console.error("Error saving branch assignments:", error);
      alert("Failed to save branch assignments");
    } finally {
      setIsSavingBranches(false);
    }
  };

  // Filtered lists
  const filteredProjectsList = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredCohortsList = filteredCohorts.filter(c =>
    c.name.toLowerCase().includes(cohortSearch.toLowerCase()) ||
    c.cohortId.toLowerCase().includes(cohortSearch.toLowerCase())
  );

  const filteredBranchesList = branches.filter(b =>
    b.branchName.toLowerCase().includes(branchSearch.toLowerCase()) ||
    b.district.toLowerCase().includes(branchSearch.toLowerCase()) ||
    b.upazila.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // Group assignments by project/cohort for display
  const groupedAssignments = branchAssignments.reduce((acc, assignment) => {
    const key = `${assignment.projectId}-${assignment.cohortId}`;
    if (!acc[key]) {
      acc[key] = {
        project: assignment.project,
        cohort: assignment.cohort,
        branches: []
      };
    }
    acc[key].branches.push(assignment.branch);
    return acc;
  }, {} as Record<string, { project: { id: string; name: string }; cohort: { id: string; cohortId: string; name: string }; branches: Branch[] }>);

  const tabs = [
    { id: "personal" as const, label: "Personal Details", icon: User },
    { id: "job" as const, label: "Job Information", icon: Briefcase },
    { id: "projects" as const, label: "Project Assignments", icon: FolderKanban },
    { id: "branches" as const, label: "My Branches", icon: MapPin },
    { id: "comments" as const, label: "Admin Comments", icon: MessageSquare },
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
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                  onError={(e) => {
                    console.error("Image load error:", profileImage);
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {session?.user?.name?.charAt(0) || "U"}
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
              >
                {isUploadingImage ? (
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-gray-600" />
                )}
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
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 overflow-x-auto px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
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

            {activeTab === "projects" && (
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium text-gray-900">Project Assignments</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Your assigned projects and cohorts (view-only)
                  </p>
                </div>

                {isLoadingProjects ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : projectAssignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FolderKanban className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No project assignments found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectAssignments.map((assignment) => (
                      <div
                        key={assignment.project.id}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedProjects);
                            if (newExpanded.has(assignment.project.id)) {
                              newExpanded.delete(assignment.project.id);
                            } else {
                              newExpanded.add(assignment.project.id);
                            }
                            setExpandedProjects(newExpanded);
                          }}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-blue-500" />
                            <span className="font-medium text-gray-900">{assignment.project.name}</span>
                            {!assignment.project.isActive && (
                              <Badge variant="warning">Inactive</Badge>
                            )}
                            <Badge variant="info">{assignment.cohorts.length} cohort(s)</Badge>
                          </div>
                          <ChevronRight
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              expandedProjects.has(assignment.project.id) ? "rotate-90" : ""
                            }`}
                          />
                        </button>

                        {expandedProjects.has(assignment.project.id) && (
                          <div className="p-4 bg-white border-t border-gray-200">
                            <div className="space-y-2">
                              {assignment.cohorts.map((c) => (
                                <div
                                  key={c.cohort.id}
                                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                                >
                                  <Layers className="w-4 h-4 text-green-500" />
                                  <span className="text-sm font-medium">{c.cohort.name}</span>
                                  <Badge variant="default" className="text-xs">{c.cohort.cohortId}</Badge>
                                  {!c.cohort.isActive && (
                                    <Badge variant="warning" className="text-xs">Inactive</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "branches" && (
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium text-gray-900">My Branch Assignments</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Your assigned branches across projects and cohorts (view-only)
                  </p>
                </div>

                {Object.keys(groupedAssignments).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No branch assignments found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {Object.values(groupedAssignments).map((group) => (
                        <div 
                          key={`${group.project.id}-${group.cohort.id}`}
                          className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{group.project.name}</span>
                            <span className="text-gray-400">→</span>
                            <Layers className="w-4 h-4 text-green-500" />
                            <span>{group.cohort.name}</span>
                            <Badge variant="info" className="text-xs">{group.cohort.cohortId}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {group.branches.map(branch => (
                              <Badge key={branch.id} variant="default" className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {branch.branchName}
                                <span className="text-xs text-gray-400">({branch.district})</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium text-gray-900">Admin Comments</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Comments added by your supervisors and administrators
                  </p>
                </div>
                
                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : adminComments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No comments yet</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    
                    <div className="space-y-6">
                      {adminComments.map((comment) => (
                        <div key={comment.id} className="relative pl-10">
                          {/* Timeline dot */}
                          <div className="absolute left-2.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                          
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {comment.author.profileImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={comment.author.profileImage}
                                    alt={comment.author.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                                    {comment.author.name?.charAt(0) || "U"}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{comment.author.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {comment.author.userRole?.displayName || "User"}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">
                                {new Date(comment.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="mt-3 text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                            
                            {/* Attachments */}
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                                  <Paperclip className="w-3 h-3" />
                                  Attachments ({comment.attachments.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {comment.attachments.map((att) => (
                                    <a
                                      key={att.id}
                                      href={att.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download={att.fileName}
                                      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                    >
                                      {getFileIcon(att.fileType)}
                                      <span className="max-w-[150px] truncate">{att.fileName}</span>
                                      <span className="text-xs text-gray-400">({formatFileSize(att.fileSize)})</span>
                                      <Download className="w-3 h-3 text-blue-500" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {comment.updatedAt !== comment.createdAt && (
                              <p className="mt-2 text-xs text-gray-400 italic">
                                (edited)
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
