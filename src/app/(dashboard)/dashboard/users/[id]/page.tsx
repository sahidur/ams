"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  User, 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  Shield,
  Building,
  IdCard,
  CheckCircle,
  XCircle,
  Pencil,
  FolderKanban,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Modal } from "@/components/ui";
import { formatDate, getRoleDisplayName } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  userRoleId: string | null;
  userRole?: {
    id: string;
    name: string;
    displayName: string;
    isActive: boolean;
  };
  approvalStatus: string;
  isVerified: boolean;
  isActive: boolean;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  profileImage: string | null;
  designation: string | null;
  department: string | null;
  joiningDate: string | null;
  employeeId: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  isActive: boolean;
}

interface Cohort {
  id: string;
  cohortId: string;
  name: string;
  isActive: boolean;
}

interface ProjectAssignment {
  project: Project;
  cohorts: {
    assignmentId: string;
    cohort: Cohort;
  }[];
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
}

type TabType = "personal" | "job" | "projects" | "branches" | "comments";

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  
  // Project assignments state
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  // Add assignment modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [cohortsLoading, setCohortsLoading] = useState(false);
  
  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<{ id: string; projectName: string; cohortName: string } | null>(null);

  // Branch assignments state
  const [branchAssignments, setBranchAssignments] = useState<BranchAssignment[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [branchProjectId, setBranchProjectId] = useState("");
  const [branchCohortId, setBranchCohortId] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [branchCohorts, setBranchCohorts] = useState<Cohort[]>([]);
  const [isSavingBranches, setIsSavingBranches] = useState(false);

  // Admin comments state
  const [adminComments, setAdminComments] = useState<AdminComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [canEditComments, setCanEditComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [isDeleteCommentModalOpen, setIsDeleteCommentModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Check if current user is Super Admin
  const isSuperAdmin = session?.user?.userRoleName === "Super Admin" || 
    (session?.user as { userRole?: { name: string } })?.userRole?.name === "SUPER_ADMIN";

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        
        if (data.userRole?.name === "SUPER_ADMIN") {
          setCanEdit(isSuperAdmin);
        } else {
          setCanEdit(true);
        }
      } else {
        router.push("/dashboard/users");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      router.push("/dashboard/users");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/assignments`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.grouped || []);
        // Expand all projects by default
        setExpandedProjects(new Set(data.grouped?.map((a: ProjectAssignment) => a.project.id) || []));
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchCohorts = async (projectId: string) => {
    setCohortsLoading(true);
    setCohorts([]);
    setSelectedCohortId("");
    try {
      const res = await fetch(`/api/cohorts?projectId=${projectId}&activeOnly=true`);
      if (res.ok) {
        const data = await res.json();
        setCohorts(data);
      }
    } catch (error) {
      console.error("Error fetching cohorts:", error);
    } finally {
      setCohortsLoading(false);
    }
  };

  const fetchBranchAssignments = async () => {
    setBranchesLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/branch-assignments`);
      if (res.ok) {
        const data = await res.json();
        setBranchAssignments(data);
      }
    } catch (error) {
      console.error("Error fetching branch assignments:", error);
    } finally {
      setBranchesLoading(false);
    }
  };

  const fetchBranchesForCohort = async (cohortId: string) => {
    try {
      const res = await fetch(`/api/branches?cohortId=${cohortId}`);
      if (res.ok) {
        const data = await res.json();
        setAllBranches(data);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchBranchCohorts = async (projectId: string) => {
    try {
      const res = await fetch(`/api/cohorts?projectId=${projectId}&activeOnly=true`);
      if (res.ok) {
        const data = await res.json();
        setBranchCohorts(data);
      }
    } catch (error) {
      console.error("Error fetching cohorts:", error);
    }
  };

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setAdminComments(data.comments || []);
        setCanEditComments(data.canEdit || false);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsAddingComment(true);
    try {
      const res = await fetch(`/api/users/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      });
      if (res.ok) {
        setNewComment("");
        fetchComments();
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      const res = await fetch(`/api/users/${id}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: editCommentText }),
      });
      if (res.ok) {
        setEditingCommentId(null);
        setEditCommentText("");
        fetchComments();
      }
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      const res = await fetch(`/api/users/${id}/comments/${commentToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsDeleteCommentModalOpen(false);
        setCommentToDelete(null);
        fetchComments();
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleSaveBranchAssignments = async () => {
    if (!branchProjectId || !branchCohortId || selectedBranchIds.length === 0) return;
    setIsSavingBranches(true);
    try {
      const res = await fetch(`/api/users/${id}/branch-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: branchProjectId,
          cohortId: branchCohortId,
          branchIds: selectedBranchIds,
        }),
      });
      if (res.ok) {
        fetchBranchAssignments();
        setBranchProjectId("");
        setBranchCohortId("");
        setSelectedBranchIds([]);
        setAllBranches([]);
      }
    } catch (error) {
      console.error("Error saving branch assignments:", error);
    } finally {
      setIsSavingBranches(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUser();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (activeTab === "projects" && id) {
      fetchAssignments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab === "branches" && id) {
      fetchBranchAssignments();
      fetchProjects();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab === "comments" && id) {
      fetchComments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  useEffect(() => {
    if (branchProjectId) {
      fetchBranchCohorts(branchProjectId);
      setBranchCohortId("");
      setSelectedBranchIds([]);
      setAllBranches([]);
    }
  }, [branchProjectId]);

  useEffect(() => {
    if (branchCohortId) {
      fetchBranchesForCohort(branchCohortId);
      // Load existing selections for this project/cohort
      const existing = branchAssignments.filter(
        a => a.projectId === branchProjectId && a.cohortId === branchCohortId
      );
      setSelectedBranchIds(existing.map(a => a.branchId));
    }
  }, [branchCohortId, branchProjectId, branchAssignments]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchCohorts(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleAddAssignment = async () => {
    if (!selectedProjectId || !selectedCohortId) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          cohortId: selectedCohortId,
        }),
      });

      if (res.ok) {
        fetchAssignments();
        closeAddModal();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to add assignment");
      }
    } catch (error) {
      console.error("Error adding assignment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      const res = await fetch(`/api/users/${id}/assignments?assignmentId=${assignmentToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchAssignments();
        setIsDeleteModalOpen(false);
        setAssignmentToDelete(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete assignment");
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  const openAddModal = () => {
    setSelectedProjectId("");
    setSelectedCohortId("");
    setCohorts([]);
    fetchProjects();
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setSelectedProjectId("");
    setSelectedCohortId("");
    setCohorts([]);
  };

  const openDeleteModal = (assignmentId: string, projectName: string, cohortName: string) => {
    setAssignmentToDelete({ id: assignmentId, projectName, cohortName });
    setIsDeleteModalOpen(true);
  };

  const toggleProjectExpanded = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: "personal" as TabType, label: "Personal Details", icon: User },
    { id: "job" as TabType, label: "Job Information", icon: Briefcase },
    { id: "projects" as TabType, label: "Project Assignments", icon: FolderKanban },
    { id: "branches" as TabType, label: "Branch Assignment", icon: MapPin },
    { id: "comments" as TabType, label: "Admin Comments", icon: MessageSquare },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push("/dashboard/users")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
            <p className="text-gray-500 mt-1">View user details</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => router.push(`/dashboard/users?edit=${user.id}`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit User
          </Button>
        )}
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {user.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profileImage}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                {user.userRole?.name === "SUPER_ADMIN" && (
                  <Badge variant="warning">
                    <Shield className="w-3 h-3 mr-1" />
                    Super Admin
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Phone className="w-4 h-4" />
                  {user.phone}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant={user.userRole?.isActive ? "info" : "default"}>
                  {user.userRole?.displayName || getRoleDisplayName(user.role)}
                </Badge>
                <Badge variant={user.approvalStatus === "APPROVED" ? "success" : user.approvalStatus === "REJECTED" ? "danger" : "warning"}>
                  {user.approvalStatus}
                </Badge>
                <Badge variant={user.isActive ? "success" : "danger"}>
                  {user.isActive ? (
                    <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                  ) : (
                    <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
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
      <AnimatePresence mode="wait">
        {activeTab === "personal" && (
          <motion.div
            key="personal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Full Name</p>
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email Address</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                    <p className="font-medium">{user.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{user.dateOfBirth ? formatDate(user.dateOfBirth) : "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Gender</p>
                    <p className="font-medium capitalize">{user.gender || "-"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Address</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <p className="font-medium">{user.address || "-"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "job" && (
          <motion.div
            key="job"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Job Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Employee ID</p>
                    <div className="flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{user.employeeId || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Designation</p>
                    <p className="font-medium">{user.designation || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Department</p>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{user.department || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Joining Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{user.joiningDate ? formatDate(user.joiningDate) : "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Role</p>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{user.userRole?.displayName || getRoleDisplayName(user.role)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Account Created</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "projects" && (
          <motion.div
            key="projects"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="w-5 h-5" />
                    Project Assignments
                  </CardTitle>
                  {canEdit && (
                    <Button size="sm" onClick={openAddModal}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Assignment
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {assignmentsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No project assignments yet</p>
                    {canEdit && (
                      <Button variant="outline" size="sm" className="mt-4" onClick={openAddModal}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Assignment
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.project.id}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleProjectExpanded(assignment.project.id)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {expandedProjects.has(assignment.project.id) ? (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                            <FolderKanban className="w-5 h-5 text-blue-600" />
                            <span className="font-medium">{assignment.project.name}</span>
                            <Badge variant={assignment.project.isActive ? "success" : "default"}>
                              {assignment.project.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            {assignment.cohorts.length} cohort{assignment.cohorts.length !== 1 ? "s" : ""}
                          </span>
                        </button>
                        
                        <AnimatePresence>
                          {expandedProjects.has(assignment.project.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0 space-y-2">
                                {assignment.cohorts.map(({ assignmentId, cohort }) => (
                                  <div
                                    key={assignmentId}
                                    className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg ml-8"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Layers className="w-4 h-4 text-indigo-500" />
                                      <div>
                                        <span className="font-medium">{cohort.name}</span>
                                        <span className="text-gray-400 ml-2 text-sm">({cohort.cohortId})</span>
                                      </div>
                                      <Badge variant={cohort.isActive ? "success" : "default"} className="text-xs">
                                        {cohort.isActive ? "Active" : "Inactive"}
                                      </Badge>
                                    </div>
                                    {canEdit && (
                                      <button
                                        onClick={() => openDeleteModal(assignmentId, assignment.project.name, cohort.name)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove assignment"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "branches" && (
          <motion.div
            key="branches"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Branch Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {branchesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Current Assignments */}
                    {branchAssignments.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-700">Current Assignments</h4>
                        {Object.values(
                          branchAssignments.reduce((acc, assignment) => {
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
                          }, {} as Record<string, { project: { id: string; name: string }; cohort: { id: string; cohortId: string; name: string }; branches: Branch[] }>)
                        ).map((group) => (
                          <div 
                            key={`${group.project.id}-${group.cohort.id}`}
                            className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Building className="w-4 h-4 text-blue-500" />
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
                    )}

                    {branchAssignments.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>No branch assignments yet</p>
                      </div>
                    )}

                    {/* Add Assignment Form */}
                    {canEdit && (
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-4">Add Branch Assignment</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Project Selection */}
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Project</label>
                            <select
                              value={branchProjectId}
                              onChange={(e) => setBranchProjectId(e.target.value)}
                              className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
                            >
                              <option value="">Select project</option>
                              {projects.map(project => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Cohort Selection */}
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Cohort</label>
                            <select
                              value={branchCohortId}
                              onChange={(e) => setBranchCohortId(e.target.value)}
                              disabled={!branchProjectId}
                              className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:bg-gray-100"
                            >
                              <option value="">Select cohort</option>
                              {branchCohorts.map(cohort => (
                                <option key={cohort.id} value={cohort.id}>{cohort.name} ({cohort.cohortId})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Branch Selection */}
                        {branchCohortId && (
                          <div className="mt-4 space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Select Branches</label>
                            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                              {allBranches.length === 0 ? (
                                <p className="p-4 text-gray-500 text-sm">No branches available for this cohort</p>
                              ) : (
                                allBranches.map(branch => (
                                  <label 
                                    key={branch.id}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedBranchIds.includes(branch.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedBranchIds([...selectedBranchIds, branch.id]);
                                        } else {
                                          setSelectedBranchIds(selectedBranchIds.filter(id => id !== branch.id));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300"
                                    />
                                    <div>
                                      <span className="font-medium">{branch.branchName}</span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        {branch.division} → {branch.district} → {branch.upazila}
                                      </span>
                                    </div>
                                  </label>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {branchProjectId && branchCohortId && (
                          <Button 
                            onClick={handleSaveBranchAssignments} 
                            isLoading={isSavingBranches}
                            disabled={selectedBranchIds.length === 0}
                            className="mt-4"
                          >
                            Save Branch Assignments
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "comments" && (
          <motion.div
            key="comments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Admin Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Comment Form */}
                <div className="mb-6 pb-6 border-b">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Add a Comment</label>
                  <div className="flex gap-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment about this user..."
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm min-h-[80px] resize-none"
                    />
                  </div>
                  <Button 
                    onClick={handleAddComment} 
                    isLoading={isAddingComment}
                    disabled={!newComment.trim()}
                    className="mt-2"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Add Comment
                  </Button>
                </div>

                {/* Comments Timeline */}
                {commentsLoading ? (
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
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">
                                  {new Date(comment.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {canEditComments && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditCommentText(comment.comment);
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setCommentToDelete(comment.id);
                                        setIsDeleteCommentModalOpen(true);
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {editingCommentId === comment.id ? (
                              <div className="mt-3">
                                <textarea
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm min-h-[80px] resize-none"
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleUpdateComment(comment.id)}
                                  >
                                    Save
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditCommentText("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-3 text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                            )}
                            
                            {comment.updatedAt !== comment.createdAt && editingCommentId !== comment.id && (
                              <p className="mt-2 text-xs text-gray-400 italic">(edited)</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Assignment Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title="Add Project Assignment"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Assign <span className="font-medium">{user.name}</span> to a project and cohort.
          </p>
          
          {/* Project Selection */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Project</label>
            {projectsLoading ? (
              <div className="flex h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm items-center">
                <span className="text-gray-400">Loading projects...</span>
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cohort Selection */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Cohort</label>
            {!selectedProjectId ? (
              <div className="flex h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm items-center">
                <span className="text-gray-400">Select a project first</span>
              </div>
            ) : cohortsLoading ? (
              <div className="flex h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm items-center">
                <span className="text-gray-400">Loading cohorts...</span>
              </div>
            ) : cohorts.length === 0 ? (
              <div className="flex h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm items-center">
                <span className="text-gray-400">No active cohorts in this project</span>
              </div>
            ) : (
              <select
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a cohort</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name} ({cohort.cohortId})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeAddModal} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleAddAssignment} 
              isLoading={isSubmitting} 
              disabled={!selectedProjectId || !selectedCohortId}
              className="flex-1"
            >
              Add Assignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Assignment Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setAssignmentToDelete(null);
        }}
        title="Remove Assignment"
        size="sm"
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to remove <span className="font-semibold">{user.name}</span> from{" "}
            <span className="font-semibold">{assignmentToDelete?.cohortName}</span> in{" "}
            <span className="font-semibold">{assignmentToDelete?.projectName}</span>?
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setAssignmentToDelete(null);
              }} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAssignment} className="flex-1">
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Comment Confirmation Modal */}
      <Modal
        isOpen={isDeleteCommentModalOpen}
        onClose={() => {
          setIsDeleteCommentModalOpen(false);
          setCommentToDelete(null);
        }}
        title="Delete Comment"
        size="sm"
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this comment? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteCommentModalOpen(false);
                setCommentToDelete(null);
              }} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteComment} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
