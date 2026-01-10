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
  Building,
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
  Shield,
  Award,
  AlertTriangle,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  IdCard,
  Users,
  History,
  Fingerprint,
  Smartphone,
  Key,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import for consent modal
const BiometricConsentModal = dynamic(
  () => import("@/components/biometric-consent-modal"),
  { ssr: false }
);
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, Modal } from "@/components/ui";
import { formatDate, getRoleDisplayName } from "@/lib/utils";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  designation: string;
  department: string;
  employeeId: string;
  profileImage?: string;
}

interface FullUserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  profileImage: string | null;
  employeeId: string | null;
  designation: string | null;
  designationId: string | null;
  designationRef: { id: string; name: string } | null;
  department: string | null;
  departmentId: string | null;
  departmentRef: { id: string; name: string } | null;
  joiningDate: string | null;
  joiningDateBrac: string | null;
  joiningDateCurrentBase: string | null;
  joiningDateCurrentPosition: string | null;
  contractEndDate: string | null;
  employmentStatusId: string | null;
  employmentStatus: { id: string; name: string } | null;
  employmentTypeId: string | null;
  employmentType: { id: string; name: string } | null;
  firstSupervisorId: string | null;
  firstSupervisor: { 
    id: string; 
    name: string; 
    email: string;
    firstSupervisorId: string | null;
    firstSupervisor: { id: string; name: string; email: string } | null;
  } | null;
  jobGrade: string | null;
  yearsOfExperience: number | null;
  salary: number | null;
  role: string;
  userRoleId: string | null;
  userRole: { id: string; name: string; displayName: string; isActive: boolean } | null;
  approvalStatus: string;
  isActive: boolean;
  isVerified: boolean;
  slab: string | null;
  lastSlabChange: string | null;
  secondLastSlabChange: string | null;
  lastGradeChange: string | null;
  secondLastGradeChange: string | null;
  lastOneOffBonus: string | null;
  secondLastOneOffBonus: string | null;
  pmsMarkLastYear: number | null;
  pmsMarkSecondLastYear: number | null;
  pmsMarkThirdLastYear: number | null;
  lastWarningDate: string | null;
  secondLastWarningDate: string | null;
  thirdLastWarningDate: string | null;
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
  const [activeTab, setActiveTab] = useState<"personal" | "job" | "projects" | "branches" | "timeline" | "comments" | "security" | "password">("personal");
  
  // Fingerprint/Passkey state
  const [hasPasskey, setHasPasskey] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isDeletingPasskey, setIsDeletingPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const [showConsentModal, setShowConsentModal] = useState(false);
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
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Full user data for display
  const [userData, setUserData] = useState<FullUserData | null>(null);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    // Personal details only - users can only edit these
    name: "",
    phone: "",
    whatsappNumber: "",
    dateOfBirth: "",
    gender: "",
    address: "",
  });

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
        setUserData(data);
        reset({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          whatsappNumber: data.whatsappNumber || "",
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

  // Fetch activity logs when timeline tab is active
  useEffect(() => {
    const fetchActivityLogs = async () => {
      if (!session?.user?.id || activeTab !== "timeline") return;
      setIsLoadingActivity(true);
      try {
        const categoryParam = activityFilter !== "all" ? `&category=${activityFilter}` : "";
        const res = await fetch(`/api/users/${session.user.id}/activity?limit=100${categoryParam}`);
        const data = await res.json();
        setActivityLogs(data.logs || []);
      } catch (error) {
        console.error("Error fetching activity logs:", error);
      } finally {
        setIsLoadingActivity(false);
      }
    };
    fetchActivityLogs();
  }, [session?.user?.id, activeTab, activityFilter]);

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
        // Refresh user data
        const refreshRes = await fetch(`/api/users/${session?.user?.id}`);
        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json();
          setUserData(refreshedData);
        }
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  // Open edit modal with current data
  const openEditModal = () => {
    if (!userData) return;
    setEditFormData({
      name: userData.name || "",
      phone: userData.phone || "",
      whatsappNumber: userData.whatsappNumber || "",
      dateOfBirth: userData.dateOfBirth?.split("T")[0] || "",
      gender: userData.gender || "",
      address: userData.address || "",
    });
    setIsEditModalOpen(true);
  };

  // Save edit modal changes - only personal details
  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name,
          phone: editFormData.phone || null,
          whatsappNumber: editFormData.whatsappNumber || null,
          dateOfBirth: editFormData.dateOfBirth || null,
          gender: editFormData.gender || null,
          address: editFormData.address || null,
        }),
      });

      if (res.ok) {
        // Refresh user data
        const refreshRes = await fetch(`/api/users/${session?.user?.id}`);
        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json();
          setUserData(refreshedData);
          reset({
            name: refreshedData.name || "",
            email: refreshedData.email || "",
            phone: refreshedData.phone || "",
            whatsappNumber: refreshedData.whatsappNumber || "",
            dateOfBirth: refreshedData.dateOfBirth?.split("T")[0] || "",
            gender: refreshedData.gender || "",
            address: refreshedData.address || "",
            designation: refreshedData.designation || "",
            department: refreshedData.department || "",
            employeeId: refreshedData.employeeId || "",
          });
        }
        setIsEditModalOpen(false);
        setSuccessMessage("Profile updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setIsSavingEdit(false);
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
    { id: "timeline" as const, label: "Activity Timeline", icon: History },
    { id: "comments" as const, label: "Admin Comments", icon: MessageSquare },
    { id: "security" as const, label: "Security & Passkeys", icon: Fingerprint },
    { id: "password" as const, label: "Change Password", icon: Lock },
  ];
  
  // Fetch passkey status
  useEffect(() => {
    const fetchPasskeyStatus = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch(`/api/passkey?userId=${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          setHasPasskey(data.hasPasskey);
        }
      } catch (error) {
        console.error("Error fetching passkey status:", error);
      }
    };
    fetchPasskeyStatus();
  }, [session?.user?.id]);
  
  // Register passkey handler
  const handleRegisterPasskey = async () => {
    if (!session?.user) return;
    
    setIsRegisteringPasskey(true);
    setPasskeyError("");
    
    try {
      // Check WebAuthn support
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser");
      }
      
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error("No biometric sensor available on this device");
      }
      
      // Get registration options
      const optionsRes = await fetch("/api/passkey/register");
      if (!optionsRes.ok) throw new Error("Failed to get registration options");
      const { options } = await optionsRes.json();
      
      // Convert base64url to ArrayBuffer
      const challenge = Uint8Array.from(
        atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")),
        c => c.charCodeAt(0)
      );
      const userId = Uint8Array.from(
        atob(options.user.id.replace(/-/g, "+").replace(/_/g, "/")),
        c => c.charCodeAt(0)
      );
      
      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge,
          user: { ...options.user, id: userId },
        },
      }) as PublicKeyCredential;
      
      if (!credential) throw new Error("Failed to create credential");
      
      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Register with server
      const registerRes = await fetch("/api/passkey/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          publicKey: btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey()!))),
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(response.attestationObject))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
        }),
      });
      
      if (registerRes.ok) {
        setHasPasskey(true);
        setSuccessMessage("Passkey registered successfully! You can now use fingerprint to login.");
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        const error = await registerRes.json();
        throw new Error(error.error || "Failed to register passkey");
      }
    } catch (error) {
      console.error("Passkey registration error:", error);
      setPasskeyError(error instanceof Error ? error.message : "Failed to register passkey");
    } finally {
      setIsRegisteringPasskey(false);
    }
  };
  
  // Delete passkey handler
  const handleDeletePasskey = async () => {
    if (!session?.user?.id) return;
    
    setIsDeletingPasskey(true);
    try {
      const res = await fetch(`/api/passkey?userId=${session.user.id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setHasPasskey(false);
        setSuccessMessage("Passkey removed successfully");
        setTimeout(() => setSuccessMessage(""), 5000);
      }
    } catch (error) {
      console.error("Error deleting passkey:", error);
    } finally {
      setIsDeletingPasskey(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account settings</p>
        </div>
        <Button onClick={openEditModal} className="flex items-center gap-2">
          <Pencil className="w-4 h-4" />
          Edit Profile
        </Button>
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
          <div className="flex items-center justify-between">
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
                <div className="flex items-center gap-2 mt-2">
                  {/* Role Badge */}
                  <Badge variant="info" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {userData?.userRole?.displayName || session?.user?.userRoleName || session?.user?.role || "User"}
                  </Badge>
                  
                  {/* Approval Status Badge */}
                  {userData?.approvalStatus === "APPROVED" ? (
                    <Badge variant="success" className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Approved
                    </Badge>
                  ) : userData?.approvalStatus === "PENDING" ? (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pending
                    </Badge>
                  ) : userData?.approvalStatus === "REJECTED" ? (
                    <Badge variant="danger" className="flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Rejected
                    </Badge>
                  ) : null}
                  
                  {/* Active Status Badge */}
                  {userData?.isActive ? (
                    <Badge variant="success" className="flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="danger" className="flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-2 px-4 py-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap ${
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
              <div className="space-y-6">
                {/* Job Information */}
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
                          <p className="font-medium">{userData?.employeeId || "-"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Designation</p>
                        <p className="font-medium">{userData?.designationRef?.name || userData?.designation || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Department</p>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <p className="font-medium">{userData?.departmentRef?.name || userData?.department || "-"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Employment Status</p>
                        <p className="font-medium">{userData?.employmentStatus?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Employment Type</p>
                        <p className="font-medium">{userData?.employmentType?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Job Grade</p>
                        <p className="font-medium">{userData?.jobGrade ? `Grade ${userData.jobGrade}` : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Years of Experience</p>
                        <p className="font-medium">{userData?.yearsOfExperience ? `${userData.yearsOfExperience} years` : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Salary</p>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <p className="font-medium">{userData?.salary ? `৳${userData.salary.toLocaleString()}` : "-"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Role</p>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-gray-400" />
                          <p className="font-medium">{userData?.userRole?.displayName || getRoleDisplayName(userData?.role || "")}</p>
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
                        <p className="font-medium">{userData?.joiningDateBrac ? formatDate(userData.joiningDateBrac) : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Joining Date (Current Base)</p>
                        <p className="font-medium">{userData?.joiningDateCurrentBase ? formatDate(userData.joiningDateCurrentBase) : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Joining Date (Current Position)</p>
                        <p className="font-medium">{userData?.joiningDateCurrentPosition ? formatDate(userData.joiningDateCurrentPosition) : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Contract End Date</p>
                        <p className="font-medium">{userData?.contractEndDate ? formatDate(userData.contractEndDate) : "-"}</p>
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
                        {userData?.firstSupervisor ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                              {userData.firstSupervisor.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{userData.firstSupervisor.name}</p>
                              <p className="text-xs text-gray-500">{userData.firstSupervisor.email}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="font-medium">-</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">2nd Supervisor</p>
                        {userData?.firstSupervisor?.firstSupervisor ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-medium">
                              {userData.firstSupervisor.firstSupervisor.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{userData.firstSupervisor.firstSupervisor.name}</p>
                              <p className="text-xs text-gray-500">{userData.firstSupervisor.firstSupervisor.email}</p>
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
                          <p className="font-semibold text-lg">{userData?.slab || "-"}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Last Slab Change</p>
                          <p className="font-medium">{userData?.lastSlabChange ? formatDate(userData.lastSlabChange) : "-"}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Second Last Slab Change</p>
                          <p className="font-medium">{userData?.secondLastSlabChange ? formatDate(userData.secondLastSlabChange) : "-"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Grade Changes */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Grade Changes</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-600 mb-1">Last Grade Change</p>
                          <p className="font-medium">{userData?.lastGradeChange ? formatDate(userData.lastGradeChange) : "-"}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-600 mb-1">Second Last Grade Change</p>
                          <p className="font-medium">{userData?.secondLastGradeChange ? formatDate(userData.secondLastGradeChange) : "-"}</p>
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
                          <p className="font-medium">{userData?.lastOneOffBonus ? formatDate(userData.lastOneOffBonus) : "-"}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-green-600 mb-1">Second Last One-off Bonus</p>
                          <p className="font-medium">{userData?.secondLastOneOffBonus ? formatDate(userData.secondLastOneOffBonus) : "-"}</p>
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
                          <p className="font-semibold text-lg">{userData?.pmsMarkLastYear || "-"}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-600 mb-1">Second Last Year</p>
                          <p className="font-semibold text-lg">{userData?.pmsMarkSecondLastYear || "-"}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-purple-600 mb-1">Third Last Year</p>
                          <p className="font-semibold text-lg">{userData?.pmsMarkThirdLastYear || "-"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Warning Dates */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Warning Dates
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs text-red-600 mb-1">Last Warning</p>
                          <p className="font-medium">{userData?.lastWarningDate ? formatDate(userData.lastWarningDate) : "-"}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs text-red-600 mb-1">Second Last Warning</p>
                          <p className="font-medium">{userData?.secondLastWarningDate ? formatDate(userData.secondLastWarningDate) : "-"}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs text-red-600 mb-1">Third Last Warning</p>
                          <p className="font-medium">{userData?.thirdLastWarningDate ? formatDate(userData.thirdLastWarningDate) : "-"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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

            {activeTab === "timeline" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Activity Timeline</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Track all changes made to your profile
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
                </div>

                {isLoadingActivity ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No activity logs found.</p>
                    <p className="text-sm mt-1">Changes to your profile will appear here.</p>
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
                          
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
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

            {/* Security & Passkeys Tab */}
            {activeTab === "security" && (
              <div className="space-y-6 max-w-2xl">
                {/* Passkey Section */}
                <Card className="border-2 border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Fingerprint className="w-5 h-5 text-blue-600" />
                      </div>
                      Passkey / Fingerprint Login
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-gray-600">
                      Passkeys allow you to sign in securely using your device&apos;s biometric sensor 
                      (fingerprint or face recognition) instead of your password.
                    </p>
                    
                    {passkeyError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {passkeyError}
                      </motion.div>
                    )}
                    
                    {hasPasskey ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">Passkey Registered</p>
                            <p className="text-sm text-green-600">
                              You can sign in using your fingerprint or biometric sensor
                            </p>
                          </div>
                        </div>
                        
                        <Button
                          variant="destructive"
                          onClick={handleDeletePasskey}
                          isLoading={isDeletingPasskey}
                          className="w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Passkey
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3 mb-3">
                            <Smartphone className="w-6 h-6 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-800">No Passkey Registered</p>
                              <p className="text-sm text-gray-500">
                                Register a passkey to enable biometric login
                              </p>
                            </div>
                          </div>
                          
                          <ul className="text-sm text-gray-600 space-y-1 mb-4">
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500" />
                              Sign in faster with fingerprint or Face ID
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500" />
                              More secure than passwords
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500" />
                              Works on this device only
                            </li>
                          </ul>
                        </div>
                        
                        <Button
                          onClick={() => setShowConsentModal(true)}
                          isLoading={isRegisteringPasskey}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Register Passkey
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Security Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="w-5 h-5" />
                      Security Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 font-medium text-xs">1</span>
                        </div>
                        <span>Use a strong, unique password that you don&apos;t use on other sites</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 font-medium text-xs">2</span>
                        </div>
                        <span>Enable passkey login for faster and more secure authentication</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 font-medium text-xs">3</span>
                        </div>
                        <span>Never share your login credentials with anyone</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 font-medium text-xs">4</span>
                        </div>
                        <span>Log out from shared or public devices after use</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
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

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Personal Details"
        size="2xl"
      >
        {/* Personal Details Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
          />
          <Input
            label="Phone"
            value={editFormData.phone}
            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
          />
          <Input
            label="WhatsApp Number"
            value={editFormData.whatsappNumber}
            onChange={(e) => setEditFormData({ ...editFormData, whatsappNumber: e.target.value })}
          />
          <Input
            label="Date of Birth"
            type="date"
            value={editFormData.dateOfBirth}
            onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select
              value={editFormData.gender}
              onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
              className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-full space-y-1">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm min-h-[80px]"
              placeholder="Enter your address"
            />
          </div>
        </div>

        {/* Note about restricted fields */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> To update job-related information (Employee ID, Designation, Department, Employment Status, etc.), 
            please contact your administrator.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} isLoading={isSavingEdit}>
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* Biometric Consent Modal */}
      <BiometricConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsent={() => {
          setShowConsentModal(false);
          handleRegisterPasskey();
        }}
        biometricType="fingerprint"
        studentName={session?.user?.name || "User"}
      />
    </div>
  );
}
