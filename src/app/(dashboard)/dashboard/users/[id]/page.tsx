"use client";

import { useState, useEffect, use, useRef } from "react";
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
  DollarSign,
  Star,
  AlertTriangle,
  Award,
  TrendingUp,
  Users,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  X,
  Search,
  Check,
  History,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Modal } from "@/components/ui";
import { formatDate, getRoleDisplayName } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
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
  designationId: string | null;
  designationRef?: {
    id: string;
    name: string;
  } | null;
  department: string | null;
  departmentId: string | null;
  departmentRef?: {
    id: string;
    name: string;
  } | null;
  joiningDate: string | null;
  employeeId: string | null;
  // New job fields
  joiningDateBrac: string | null;
  joiningDateCurrentBase: string | null;
  joiningDateCurrentPosition: string | null;
  contractEndDate: string | null;
  employmentStatusId: string | null;
  employmentStatus?: {
    id: string;
    name: string;
  } | null;
  employmentTypeId: string | null;
  employmentType?: {
    id: string;
    name: string;
  } | null;
  firstSupervisorId: string | null;
  firstSupervisor?: {
    id: string;
    name: string;
    email: string;
    firstSupervisorId: string | null;
    firstSupervisor?: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  jobGrade: number | null;
  yearsOfExperience: number | null;
  salary: number | null;
  // Performance fields
  slab: number | null;
  lastSlabChange: string | null;
  secondLastSlabChange: string | null;
  lastGradeChange: string | null;
  secondLastGradeChange: string | null;
  lastOneOffBonus: string | null;
  secondLastOneOffBonus: string | null;
  pmsMarkLastYear: string | null;
  pmsMarkSecondLastYear: string | null;
  pmsMarkThirdLastYear: string | null;
  lastWarningDate: string | null;
  secondLastWarningDate: string | null;
  thirdLastWarningDate: string | null;
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

type TabType = "personal" | "job" | "projects" | "branches" | "timeline" | "comments";

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
  
  // Activity timeline state
  const [activityLogs, setActivityLogs] = useState<{
    id: string;
    action: string;
    category: string;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    description: string | null;
    createdAt: string;
    editor: {
      id: string;
      name: string;
      profileImage: string | null;
      userRole: { displayName: string } | null;
    };
  }[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  
  // Attachment state
  const [pendingAttachments, setPendingAttachments] = useState<{ fileName: string; fileUrl: string; fileType: string; fileSize: number }[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number; status: "uploading" | "success" | "error"; error?: string }[]>([]);
  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

  // Edit user modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<"personal" | "job" | "performance">("personal");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    employeeId: "",
    designationId: "",
    department: "",
    departmentId: "",
    userRoleId: "",
    employmentStatusId: "",
    employmentTypeId: "",
    joiningDateBrac: "",
    joiningDateCurrentBase: "",
    joiningDateCurrentPosition: "",
    contractEndDate: "",
    firstSupervisorId: "",
    jobGrade: "",
    yearsOfExperience: "",
    salary: "",
    // Performance fields
    slab: "",
    lastSlabChange: "",
    secondLastSlabChange: "",
    lastGradeChange: "",
    secondLastGradeChange: "",
    lastOneOffBonus: "",
    secondLastOneOffBonus: "",
    pmsMarkLastYear: "",
    pmsMarkSecondLastYear: "",
    pmsMarkThirdLastYear: "",
    lastWarningDate: "",
    secondLastWarningDate: "",
    thirdLastWarningDate: "",
  });
  const [roles, setRoles] = useState<{ id: string; name: string; displayName: string }[]>([]);
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [employmentStatuses, setEmploymentStatuses] = useState<{ id: string; name: string }[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<{ id: string; name: string }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string; isActive: boolean; approvalStatus: string }[]>([]);
  
  // Supervisor dropdown state
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false);
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const supervisorDropdownRef = useRef<HTMLDivElement>(null);

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

  const fetchActivityLogs = async () => {
    setActivityLoading(true);
    try {
      const categoryParam = activityFilter !== "all" ? `&category=${activityFilter}` : "";
      const res = await fetch(`/api/users/${id}/activity?limit=100${categoryParam}`);
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setActivityLoading(false);
    }
  };

  // Fetch activity logs when timeline tab is active
  useEffect(() => {
    if (activeTab === "timeline") {
      fetchActivityLogs();
    }
  }, [activeTab, activityFilter, id]);

  // Edit modal functions
  const fetchEditFormData = async () => {
    try {
      const [rolesRes, designationsRes, departmentsRes, statusesRes, typesRes, usersRes] = await Promise.all([
        fetch("/api/roles?activeOnly=true"),
        fetch("/api/designations?activeOnly=true"),
        fetch("/api/departments?activeOnly=true"),
        fetch("/api/employment-statuses?activeOnly=true"),
        fetch("/api/employment-types?activeOnly=true"),
        fetch("/api/users"),
      ]);

      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data);
      }
      if (designationsRes.ok) {
        const data = await designationsRes.json();
        setDesignations(data);
      }
      if (departmentsRes.ok) {
        const data = await departmentsRes.json();
        setDepartments(data);
      }
      if (statusesRes.ok) {
        const data = await statusesRes.json();
        setEmploymentStatuses(data);
      }
      if (typesRes.ok) {
        const data = await typesRes.json();
        setEmploymentTypes(data);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        // Filter out current user and keep only active, approved users for supervisor dropdown
        setAllUsers(data.filter((u: { id: string; isActive: boolean; approvalStatus: string }) => 
          u.id !== id && u.isActive && u.approvalStatus === "APPROVED"
        ));
      }
    } catch (error) {
      console.error("Error fetching edit form data:", error);
    }
  };

  const openEditModal = () => {
    if (!user) return;
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      whatsappNumber: user.whatsappNumber || "",
      dateOfBirth: user.dateOfBirth?.split("T")[0] || "",
      gender: user.gender || "",
      address: user.address || "",
      employeeId: user.employeeId || "",
      designationId: user.designationId || "",
      department: user.department || "",
      departmentId: user.departmentId || "",
      userRoleId: user.userRoleId || "",
      employmentStatusId: user.employmentStatusId || "",
      employmentTypeId: user.employmentTypeId || "",
      joiningDateBrac: user.joiningDateBrac?.split("T")[0] || "",
      joiningDateCurrentBase: user.joiningDateCurrentBase?.split("T")[0] || "",
      joiningDateCurrentPosition: user.joiningDateCurrentPosition?.split("T")[0] || "",
      contractEndDate: user.contractEndDate?.split("T")[0] || "",
      firstSupervisorId: user.firstSupervisorId || "",
      jobGrade: user.jobGrade?.toString() || "",
      yearsOfExperience: user.yearsOfExperience?.toString() || "",
      salary: user.salary?.toString() || "",
      // Performance fields
      slab: user.slab?.toString() || "",
      lastSlabChange: user.lastSlabChange?.split("T")[0] || "",
      secondLastSlabChange: user.secondLastSlabChange?.split("T")[0] || "",
      lastGradeChange: user.lastGradeChange?.split("T")[0] || "",
      secondLastGradeChange: user.secondLastGradeChange?.split("T")[0] || "",
      lastOneOffBonus: user.lastOneOffBonus?.split("T")[0] || "",
      secondLastOneOffBonus: user.secondLastOneOffBonus?.split("T")[0] || "",
      pmsMarkLastYear: user.pmsMarkLastYear || "",
      pmsMarkSecondLastYear: user.pmsMarkSecondLastYear || "",
      pmsMarkThirdLastYear: user.pmsMarkThirdLastYear || "",
      lastWarningDate: user.lastWarningDate?.split("T")[0] || "",
      secondLastWarningDate: user.secondLastWarningDate?.split("T")[0] || "",
      thirdLastWarningDate: user.thirdLastWarningDate?.split("T")[0] || "",
    });
    setEditModalTab("personal");
    fetchEditFormData();
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    setIsEditSubmitting(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        fetchUser();
        setIsEditModalOpen(false);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsAddingComment(true);
    try {
      const res = await fetch(`/api/users/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          comment: newComment,
          attachments: pendingAttachments,
        }),
      });
      if (res.ok) {
        setNewComment("");
        setPendingAttachments([]);
        fetchComments();
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingAttachment(true);
    
    // Initialize progress for all files
    const initialProgress = Array.from(files).map(file => ({
      fileName: file.name,
      progress: 0,
      status: "uploading" as const,
    }));
    setUploadProgress(initialProgress);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size before upload
        if (file.size > MAX_FILE_SIZE) {
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: "error" as const, error: `File too large. Maximum size: 2GB` } : p
          ));
          continue;
        }
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "comment-attachment");
        
        // Use XMLHttpRequest for progress tracking
        const result = await new Promise<{ success: boolean; data?: { url: string }; error?: string }>((resolve) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(prev => prev.map((p, idx) => 
                idx === i ? { ...p, progress: percentComplete } : p
              ));
            }
          });
          
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve({ success: true, data });
              } catch {
                resolve({ success: false, error: "Invalid response from server" });
              }
            } else {
              try {
                const error = JSON.parse(xhr.responseText);
                resolve({ success: false, error: error.error || "Upload failed" });
              } catch {
                resolve({ success: false, error: "Upload failed" });
              }
            }
          });
          
          xhr.addEventListener("error", () => {
            resolve({ success: false, error: "Network error occurred" });
          });
          
          xhr.addEventListener("abort", () => {
            resolve({ success: false, error: "Upload cancelled" });
          });
          
          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        });
        
        if (result.success && result.data) {
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, progress: 100, status: "success" as const } : p
          ));
          setPendingAttachments(prev => [...prev, {
            fileName: file.name,
            fileUrl: result.data!.url,
            fileType: file.type,
            fileSize: file.size,
          }]);
        } else {
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: "error" as const, error: result.error } : p
          ));
        }
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = "";
      // Clear upload progress after a delay
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

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

  // Click outside handler for supervisor dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supervisorDropdownRef.current && !supervisorDropdownRef.current.contains(event.target as Node)) {
        setIsSupervisorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    { id: "timeline" as TabType, label: "Activity Timeline", icon: History },
    { id: "comments" as TabType, label: "Admin Comments", icon: MessageSquare },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
          <Button onClick={openEditModal}>
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
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
                    <p className="text-sm text-gray-500 mb-1">WhatsApp Number</p>
                    <p className="font-medium">{user.whatsappNumber || "-"}</p>
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
            <div className="space-y-6">
              {/* Basic Job Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Job Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Employee ID</p>
                      <div className="flex items-center gap-2">
                        <IdCard className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{user.employeeId || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Designation</p>
                      <p className="font-medium">{user.designationRef?.name || user.designation || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Department</p>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{user.departmentRef?.name || user.department || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Employment Status</p>
                      <p className="font-medium">{user.employmentStatus?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Employment Type</p>
                      <p className="font-medium">{user.employmentType?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Job Grade</p>
                      <p className="font-medium">{user.jobGrade ? `Grade ${user.jobGrade}` : "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Years of Experience</p>
                      <p className="font-medium">{user.yearsOfExperience ? `${user.yearsOfExperience} years` : "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Salary</p>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{user.salary ? `৳${user.salary.toLocaleString()}` : "-"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Role</p>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{user.userRole?.displayName || getRoleDisplayName(user.role)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dates Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Important Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Joining Date (BRAC)</p>
                      <p className="font-medium">{user.joiningDateBrac ? formatDate(user.joiningDateBrac) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Joining Date (Current Base)</p>
                      <p className="font-medium">{user.joiningDateCurrentBase ? formatDate(user.joiningDateCurrentBase) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Joining Date (Current Position)</p>
                      <p className="font-medium">{user.joiningDateCurrentPosition ? formatDate(user.joiningDateCurrentPosition) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Contract End Date</p>
                      <p className="font-medium">{user.contractEndDate ? formatDate(user.contractEndDate) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Account Created</p>
                      <p className="font-medium">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Supervisors Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Supervisors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">1st Supervisor</p>
                      {user.firstSupervisor ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                            {user.firstSupervisor.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{user.firstSupervisor.name}</p>
                            <p className="text-xs text-gray-500">{user.firstSupervisor.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="font-medium">-</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">2nd Supervisor</p>
                      {user.firstSupervisor?.firstSupervisor ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-medium">
                            {user.firstSupervisor.firstSupervisor.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{user.firstSupervisor.firstSupervisor.name}</p>
                            <p className="text-xs text-gray-500">{user.firstSupervisor.firstSupervisor.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="font-medium text-gray-400 italic">Auto-populated from 1st supervisor</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Slab & Grade */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Slab & Grade</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Current Slab</p>
                        <p className="font-semibold text-lg">{user.slab || "-"}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Last Slab Change</p>
                        <p className="font-medium">{user.lastSlabChange ? formatDate(user.lastSlabChange) : "-"}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Second Last Slab Change</p>
                        <p className="font-medium">{user.secondLastSlabChange ? formatDate(user.secondLastSlabChange) : "-"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grade Changes */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Grade Changes</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">Last Grade Change</p>
                        <p className="font-medium">{user.lastGradeChange ? formatDate(user.lastGradeChange) : "-"}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">Second Last Grade Change</p>
                        <p className="font-medium">{user.secondLastGradeChange ? formatDate(user.secondLastGradeChange) : "-"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bonuses */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      One-off Bonuses
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600 mb-1">Last One-off Bonus</p>
                        <p className="font-medium">{user.lastOneOffBonus ? formatDate(user.lastOneOffBonus) : "-"}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600 mb-1">Second Last One-off Bonus</p>
                        <p className="font-medium">{user.secondLastOneOffBonus ? formatDate(user.secondLastOneOffBonus) : "-"}</p>
                      </div>
                    </div>
                  </div>

                  {/* PMS Marks */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      PMS Marks
                    </h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600 mb-1">Last Year</p>
                        <p className="font-semibold text-lg">{user.pmsMarkLastYear || "-"}</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600 mb-1">Second Last Year</p>
                        <p className="font-semibold text-lg">{user.pmsMarkSecondLastYear || "-"}</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600 mb-1">Third Last Year</p>
                        <p className="font-semibold text-lg">{user.pmsMarkThirdLastYear || "-"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Warning Dates
                    </h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600 mb-1">Last Warning</p>
                        <p className="font-medium">{user.lastWarningDate ? formatDate(user.lastWarningDate) : "-"}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600 mb-1">Second Last Warning</p>
                        <p className="font-medium">{user.secondLastWarningDate ? formatDate(user.secondLastWarningDate) : "-"}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600 mb-1">Third Last Warning</p>
                        <p className="font-medium">{user.thirdLastWarningDate ? formatDate(user.thirdLastWarningDate) : "-"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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

        {activeTab === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Activity Timeline
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Track all changes made to this user profile
                  </p>
                </div>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="PERSONAL">Personal Details</option>
                  <option value="JOB">Job Information</option>
                  <option value="PROJECT_ASSIGNMENT">Project Assignments</option>
                  <option value="BRANCH_ASSIGNMENT">Branch Assignments</option>
                </select>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No activity logs found.</p>
                    <p className="text-sm mt-1">Changes to this profile will appear here.</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    
                    <div className="space-y-4">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="relative pl-10">
                          {/* Timeline dot */}
                          <div className={`absolute left-2.5 w-3 h-3 rounded-full ring-4 ring-white ${
                            log.action === "CREATE" ? "bg-green-500" :
                            log.action === "UPDATE" ? "bg-blue-500" :
                            log.action === "DELETE" ? "bg-red-500" : "bg-gray-400"
                          }`} />
                          
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={
                                    log.category === "PERSONAL" ? "info" :
                                    log.category === "JOB" ? "warning" :
                                    log.category === "PROJECT_ASSIGNMENT" ? "success" :
                                    log.category === "BRANCH_ASSIGNMENT" ? "default" : "default"
                                  }>
                                    {log.category.replace(/_/g, " ")}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(log.createdAt).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                
                                <p className="text-sm text-gray-900 font-medium">
                                  {log.description || `${log.action} ${log.field || ""}`}
                                </p>
                                
                                {log.oldValue && log.newValue && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    <span className="line-through text-red-400">
                                      {JSON.parse(log.oldValue) ?? "-"}
                                    </span>
                                    <span className="mx-2">→</span>
                                    <span className="text-green-600 font-medium">
                                      {JSON.parse(log.newValue) ?? "-"}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {log.editor.profileImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={log.editor.profileImage}
                                    alt={log.editor.name}
                                    className="w-6 h-6 rounded-full"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-medium">
                                    {log.editor.name.charAt(0)}
                                  </div>
                                )}
                                <span>{log.editor.name}</span>
                              </div>
                            </div>
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
                  
                  {/* Pending Attachments */}
                  {pendingAttachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-500">Attachments:</p>
                      <div className="flex flex-wrap gap-2">
                        {pendingAttachments.map((att, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
                          >
                            {getFileIcon(att.fileType)}
                            <span className="max-w-[150px] truncate">{att.fileName}</span>
                            <span className="text-xs text-gray-400">({formatFileSize(att.fileSize)})</span>
                            <button
                              onClick={() => removePendingAttachment(index)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      {isUploadingAttachment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                      <span className="text-sm">Attach Files</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        disabled={isUploadingAttachment}
                      />
                    </label>
                    <span className="text-xs text-gray-400">PDF, images, video, audio (max 2GB each)</span>
                  </div>

                  {/* Upload Progress */}
                  {uploadProgress.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {uploadProgress.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="truncate max-w-[200px]">{item.fileName}</span>
                              <span className={`text-xs font-medium ${
                                item.status === "success" ? "text-green-600" : 
                                item.status === "error" ? "text-red-600" : "text-blue-600"
                              }`}>
                                {item.status === "success" ? "✓ Uploaded" : 
                                 item.status === "error" ? `✗ ${item.error}` : 
                                 `${item.progress}%`}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.status === "success" ? "bg-green-500" : 
                                  item.status === "error" ? "bg-red-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button 
                    onClick={handleAddComment} 
                    isLoading={isAddingComment}
                    disabled={!newComment.trim() || isUploadingAttachment}
                    className="mt-3"
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
                              <>
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
                              </>
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

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Information"
        size="3xl"
      >
        <div className="space-y-4">
          {/* Modal Tabs */}
          <div className="border-b border-gray-200 -mx-6 px-6">
            <nav className="flex flex-wrap gap-1">
              <button
                onClick={() => setEditModalTab("personal")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  editModalTab === "personal"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <User className="w-4 h-4" />
                Personal Details
              </button>
              <button
                onClick={() => setEditModalTab("job")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  editModalTab === "job"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Job Information
              </button>
              <button
                onClick={() => setEditModalTab("performance")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  editModalTab === "performance"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Performance Info
              </button>
            </nav>
          </div>

          {/* Personal Details Tab */}
          {editModalTab === "personal" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <input
                  type="text"
                  value={editFormData.whatsappNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, whatsappNumber: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  value={editFormData.dateOfBirth}
                  onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={editFormData.gender}
                  onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  rows={2}
                  className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Job Information Tab */}
          {editModalTab === "job" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto pr-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                <input
                  type="text"
                  value={editFormData.employeeId}
                  onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={editFormData.userRoleId}
                  onChange={(e) => setEditFormData({ ...editFormData, userRoleId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Designation</label>
                <select
                  value={editFormData.designationId}
                  onChange={(e) => setEditFormData({ ...editFormData, designationId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select designation</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select
                  value={editFormData.departmentId}
                  onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Employment Status</label>
                <select
                  value={editFormData.employmentStatusId}
                  onChange={(e) => setEditFormData({ ...editFormData, employmentStatusId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select status</option>
                  {employmentStatuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Employment Type</label>
                <select
                  value={editFormData.employmentTypeId}
                  onChange={(e) => setEditFormData({ ...editFormData, employmentTypeId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type</option>
                  {employmentTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">1st Supervisor</label>
                <div className="relative" ref={supervisorDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen)}
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className={editFormData.firstSupervisorId ? "" : "text-gray-400"}>
                      {editFormData.firstSupervisorId 
                        ? allUsers.find(u => u.id === editFormData.firstSupervisorId)?.name || "Select supervisor"
                        : "Select supervisor"}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isSupervisorDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isSupervisorDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search supervisors..."
                            value={supervisorSearch}
                            onChange={(e) => setSupervisorSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setEditFormData({ ...editFormData, firstSupervisorId: "" });
                            setIsSupervisorDropdownOpen(false);
                            setSupervisorSearch("");
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
                        >
                          No supervisor
                        </button>
                        {allUsers
                          .filter(u => 
                            u.name.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
                            u.email.toLowerCase().includes(supervisorSearch.toLowerCase())
                          )
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setEditFormData({ ...editFormData, firstSupervisorId: u.id });
                                setIsSupervisorDropdownOpen(false);
                                setSupervisorSearch("");
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between ${
                                editFormData.firstSupervisorId === u.id ? "bg-blue-50 text-blue-600" : ""
                              }`}
                            >
                              <div>
                                <p className="font-medium">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                              </div>
                              {editFormData.firstSupervisorId === u.id && (
                                <Check className="w-4 h-4 text-blue-600" />
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Job Grade</label>
                <input
                  type="number"
                  value={editFormData.jobGrade}
                  onChange={(e) => setEditFormData({ ...editFormData, jobGrade: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                <input
                  type="number"
                  step="0.5"
                  value={editFormData.yearsOfExperience}
                  onChange={(e) => setEditFormData({ ...editFormData, yearsOfExperience: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Salary (৳)</label>
                <input
                  type="number"
                  value={editFormData.salary}
                  onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Joining Date (BRAC)</label>
                <input
                  type="date"
                  value={editFormData.joiningDateBrac}
                  onChange={(e) => setEditFormData({ ...editFormData, joiningDateBrac: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Joining (Current Base)</label>
                <input
                  type="date"
                  value={editFormData.joiningDateCurrentBase}
                  onChange={(e) => setEditFormData({ ...editFormData, joiningDateCurrentBase: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Joining (Current Position)</label>
                <input
                  type="date"
                  value={editFormData.joiningDateCurrentPosition}
                  onChange={(e) => setEditFormData({ ...editFormData, joiningDateCurrentPosition: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Contract End Date</label>
                <input
                  type="date"
                  value={editFormData.contractEndDate}
                  onChange={(e) => setEditFormData({ ...editFormData, contractEndDate: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Performance Info Tab */}
          {editModalTab === "performance" && (
            <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2">
              {/* Slab & Grade */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Slab & Grade Changes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Current Slab</label>
                    <input
                      type="number"
                      value={editFormData.slab}
                      onChange={(e) => setEditFormData({ ...editFormData, slab: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Last Slab Change</label>
                    <input
                      type="date"
                      value={editFormData.lastSlabChange}
                      onChange={(e) => setEditFormData({ ...editFormData, lastSlabChange: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">2nd Last Slab Change</label>
                    <input
                      type="date"
                      value={editFormData.secondLastSlabChange}
                      onChange={(e) => setEditFormData({ ...editFormData, secondLastSlabChange: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Last Grade Change</label>
                    <input
                      type="date"
                      value={editFormData.lastGradeChange}
                      onChange={(e) => setEditFormData({ ...editFormData, lastGradeChange: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bonus */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-green-500" />
                  Bonus History
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">2nd Last Grade Change</label>
                    <input
                      type="date"
                      value={editFormData.secondLastGradeChange}
                      onChange={(e) => setEditFormData({ ...editFormData, secondLastGradeChange: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Last One-Off Bonus</label>
                    <input
                      type="date"
                      value={editFormData.lastOneOffBonus}
                      onChange={(e) => setEditFormData({ ...editFormData, lastOneOffBonus: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">2nd Last One-Off Bonus</label>
                    <input
                      type="date"
                      value={editFormData.secondLastOneOffBonus}
                      onChange={(e) => setEditFormData({ ...editFormData, secondLastOneOffBonus: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* PMS Marks */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  PMS Marks
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">PMS Mark (Last Year)</label>
                    <input
                      type="text"
                      value={editFormData.pmsMarkLastYear}
                      onChange={(e) => setEditFormData({ ...editFormData, pmsMarkLastYear: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">PMS Mark (2nd Last Year)</label>
                    <input
                      type="text"
                      value={editFormData.pmsMarkSecondLastYear}
                      onChange={(e) => setEditFormData({ ...editFormData, pmsMarkSecondLastYear: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">PMS Mark (3rd Last Year)</label>
                    <input
                      type="text"
                      value={editFormData.pmsMarkThirdLastYear}
                      onChange={(e) => setEditFormData({ ...editFormData, pmsMarkThirdLastYear: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Warnings */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Warning History
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Last Warning Date</label>
                    <input
                      type="date"
                      value={editFormData.lastWarningDate}
                      onChange={(e) => setEditFormData({ ...editFormData, lastWarningDate: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">2nd Last Warning Date</label>
                    <input
                      type="date"
                      value={editFormData.secondLastWarningDate}
                      onChange={(e) => setEditFormData({ ...editFormData, secondLastWarningDate: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">3rd Last Warning Date</label>
                    <input
                      type="date"
                      value={editFormData.thirdLastWarningDate}
                      onChange={(e) => setEditFormData({ ...editFormData, thirdLastWarningDate: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t -mx-6 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              isLoading={isEditSubmitting}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
