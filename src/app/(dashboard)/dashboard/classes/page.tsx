"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock, 
  Users, 
  UserPlus,
  X,
  Check,
  Search,
  GraduationCap,
  ArrowRight,
  Upload,
  Scan,
  Fingerprint,
  Camera,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  Input, 
  Select, 
  Modal, 
  Badge,
  DataTable,
} from "@/components/ui";
import { classSchema, type ClassFormData } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

// Dynamic import for fingerprint training component
const FingerprintTraining = dynamic(
  () => import("@/components/fingerprint-training"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    )
  }
);

// Dynamic import for consent modal
const BiometricConsentModal = dynamic(
  () => import("@/components/biometric-consent-modal"),
  { ssr: false }
);

interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  batch: {
    id: string;
    name: string;
    branch?: {
      branchName: string;
      upazila: string;
      district: string;
    };
    trainer?: {
      id: string;
      name: string;
    };
  };
  _count: {
    attendance: number;
    students: number;
  };
}

interface Batch {
  id: string;
  name: string;
  branch: {
    branchName: string;
    upazila: string;
    district: string;
  };
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  hasFaceEncoding?: boolean;
}

interface FaceEncoding {
  id: string;
  studentId: string;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [isSavingStudents, setIsSavingStudents] = useState(false);
  
  // New student form state
  const [studentModalTab, setStudentModalTab] = useState<"existing" | "add" | "bulk">("existing");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [bulkUploadText, setBulkUploadText] = useState("");
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [faceEncodings, setFaceEncodings] = useState<Record<string, boolean>>({});
  const [fingerprintEncodings, setFingerprintEncodings] = useState<Record<string, boolean>>({});
  const [isDeletingStudent, setIsDeletingStudent] = useState<string | null>(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [selectedStudentForFingerprint, setSelectedStudentForFingerprint] = useState<Student | null>(null);
  
  // Consent modal state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [studentPendingConsent, setStudentPendingConsent] = useState<Student | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
  });

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      setClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  }, []);

  const fetchAllStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/users?role=STUDENT");
      const data = await res.json();
      setAllStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchBatches();
    fetchAllStudents();
  }, [fetchClasses, fetchBatches, fetchAllStudents]);

  const openModal = (classInfo?: ClassInfo) => {
    if (classInfo) {
      setEditingClass(classInfo);
      reset({
        name: classInfo.name,
        subject: classInfo.subject,
        batchId: classInfo.batch.id,
        startDate: classInfo.startDate.split("T")[0],
        endDate: classInfo.endDate.split("T")[0],
        startTime: classInfo.startTime,
        endTime: classInfo.endTime,
      });
    } else {
      setEditingClass(null);
      reset({
        name: "",
        subject: "",
        batchId: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
      });
    }
    setIsModalOpen(true);
  };

  const openStudentModal = async (classInfo: ClassInfo) => {
    setSelectedClass(classInfo);
    setStudentSearch("");
    setStudentModalTab("existing");
    setNewStudentName("");
    setNewStudentEmail("");
    setNewStudentPhone("");
    setBulkUploadText("");
    try {
      const res = await fetch(`/api/classes/${classInfo.id}/students`);
      const data = await res.json();
      setClassStudents(data);
      setSelectedStudents(data.map((s: Student) => s.id));
      
      // Fetch face encodings for enrolled students
      if (data.length > 0) {
        const studentIds = data.map((s: Student) => s.id);
        
        // Fetch face encodings
        const encodingsRes = await fetch(`/api/face-encodings/students?ids=${studentIds.join(",")}`);
        if (encodingsRes.ok) {
          const encodingsData = await encodingsRes.json();
          const encodingsMap: Record<string, boolean> = {};
          encodingsData.forEach((e: { userId: string }) => {
            encodingsMap[e.userId] = true;
          });
          setFaceEncodings(encodingsMap);
        }
        
        // Fetch fingerprint credentials
        const fingerprintRes = await fetch(`/api/fingerprint/students?ids=${studentIds.join(",")}`);
        if (fingerprintRes.ok) {
          const fingerprintData = await fingerprintRes.json();
          const fingerprintMap: Record<string, boolean> = {};
          fingerprintData.forEach((e: { userId: string }) => {
            fingerprintMap[e.userId] = true;
          });
          setFingerprintEncodings(fingerprintMap);
        }
      }
    } catch (error) {
      console.error("Error fetching class students:", error);
      setClassStudents([]);
      setSelectedStudents([]);
    }
    setIsStudentModalOpen(true);
  };

  // Add new student to class
  const handleAddStudent = async () => {
    if (!selectedClass || !newStudentName.trim() || !newStudentEmail.trim()) return;
    
    setIsAddingStudent(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/students/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentName,
          email: newStudentEmail,
          phone: newStudentPhone || null,
        }),
      });

      if (res.ok) {
        const student = await res.json();
        setClassStudents(prev => [...prev, student]);
        setSelectedStudents(prev => [...prev, student.id]);
        setAllStudents(prev => {
          if (prev.find(s => s.id === student.id)) return prev;
          return [...prev, student];
        });
        setNewStudentName("");
        setNewStudentEmail("");
        setNewStudentPhone("");
        setStudentModalTab("existing");
        fetchClasses();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to add student");
      }
    } catch (error) {
      console.error("Error adding student:", error);
      alert("Failed to add student");
    } finally {
      setIsAddingStudent(false);
    }
  };

  // Bulk upload students
  const handleBulkUpload = async () => {
    if (!selectedClass || !bulkUploadText.trim()) return;
    
    // Parse CSV format: name,email,phone (phone optional)
    const lines = bulkUploadText.trim().split("\n");
    const students = lines.map(line => {
      const parts = line.split(",").map(p => p.trim());
      return {
        name: parts[0] || "",
        email: parts[1] || "",
        phone: parts[2] || "",
      };
    }).filter(s => s.name && s.email);

    if (students.length === 0) {
      alert("No valid student data found. Format: name,email,phone (one per line)");
      return;
    }

    setIsUploadingBulk(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/students/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        setBulkUploadText("");
        setStudentModalTab("existing");
        // Refresh student lists
        const studentsRes = await fetch(`/api/classes/${selectedClass.id}/students`);
        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setClassStudents(data);
          setSelectedStudents(data.map((s: Student) => s.id));
        }
        fetchAllStudents();
        fetchClasses();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload students");
      }
    } catch (error) {
      console.error("Error uploading students:", error);
      alert("Failed to upload students");
    } finally {
      setIsUploadingBulk(false);
    }
  };

  // Delete student completely from database
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${studentName}" from the database? This will remove all their attendance records and cannot be undone.`)) {
      return;
    }

    setIsDeletingStudent(studentId);
    try {
      const res = await fetch(`/api/users/${studentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove from local state
        setClassStudents(prev => prev.filter(s => s.id !== studentId));
        setSelectedStudents(prev => prev.filter(id => id !== studentId));
        setAllStudents(prev => prev.filter(s => s.id !== studentId));
        fetchClasses();
        alert(`Student "${studentName}" has been permanently deleted.`);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete student");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student");
    } finally {
      setIsDeletingStudent(null);
    }
  };

  const onSubmit = async (data: ClassFormData) => {
    try {
      const url = editingClass
        ? `/api/classes/${editingClass.id}`
        : "/api/classes";
      const method = editingClass ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        fetchClasses();
        setIsModalOpen(false);
        reset();
      }
    } catch (error) {
      console.error("Error saving class:", error);
    }
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" });
      fetchClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const saveClassStudents = async () => {
    if (!selectedClass) return;

    setIsSavingStudents(true);
    try {
      await fetch(`/api/classes/${selectedClass.id}/students`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });
      fetchClasses();
      setIsStudentModalOpen(false);
    } catch (error) {
      console.error("Error updating students:", error);
    } finally {
      setIsSavingStudents(false);
    }
  };

  const filteredStudents = allStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const columns: ColumnDef<ClassInfo>[] = [
    {
      accessorKey: "name",
      header: "Class Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-gray-500">{row.original.subject}</p>
        </div>
      ),
    },
    {
      accessorKey: "batch.name",
      header: "Batch / Branch",
      cell: ({ row }) => (
        <div>
          <Badge variant="info">{row.original.batch.name}</Badge>
          {row.original.batch.branch && (
            <p className="text-xs text-gray-500 mt-1">
              {row.original.batch.branch.branchName}, {row.original.batch.branch.upazila}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          {formatDate(row.original.startDate)}
        </div>
      ),
    },
    {
      accessorKey: "startTime",
      header: "Time",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          {row.original.startTime} - {row.original.endTime}
        </div>
      ),
    },
    {
      accessorKey: "_count.students",
      header: "Students",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => openStudentModal(row.original)}
        >
          <Users className="w-4 h-4 text-blue-500" />
          <span className="font-medium">{row.original._count?.students ?? 0}</span>
          <UserPlus className="w-3 h-3 text-gray-400" />
        </Button>
      ),
    },
    {
      accessorKey: "_count.attendance",
      header: "Attendance",
      cell: ({ row }) => (
        <Badge variant={row.original._count?.attendance > 0 ? "success" : "default"}>
          {row.original._count?.attendance ?? 0} recorded
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal(row.original)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => deleteClass(row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Calculate total students across all classes
  const totalStudents = classes.reduce((acc, c) => acc + (c._count?.students ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 mt-1">Manage classes and assign students</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/batches">
            <Button variant="outline">
              <GraduationCap className="w-4 h-4 mr-2" />
              Manage Batches
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Class
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{classes.length}</p>
                <p className="text-sm text-gray-500">Total Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-indigo-100">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-sm text-gray-500">Students Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {classes.reduce((acc, c) => acc + (c._count?.attendance ?? 0), 0)}
                </p>
                <p className="text-sm text-gray-500">Attendance Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{batches.length}</p>
                <p className="text-sm text-gray-500">Active Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Student Management</p>
              <p className="text-sm text-blue-600">
                Click on the student count in any class row to add or remove students. 
                Students must be assigned to classes for face training and attendance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={classes}
              searchPlaceholder="Search classes..."
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? "Edit Class" : "Add Class"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Class Name"
            {...register("name")}
            error={errors.name?.message}
          />

          <Input
            label="Subject"
            {...register("subject")}
            error={errors.subject?.message}
          />

          <Select
            label="Batch"
            {...register("batchId")}
            error={errors.batchId?.message}
          >
            <option value="">Select Batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name} - {batch.branch.branchName}, {batch.branch.upazila}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Start Date"
              {...register("startDate")}
              error={errors.startDate?.message}
            />
            <Input
              type="date"
              label="End Date"
              {...register("endDate")}
              error={errors.endDate?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label="Start Time"
              {...register("startTime")}
              error={errors.startTime?.message}
            />
            <Input
              type="time"
              label="End Time"
              {...register("endTime")}
              error={errors.endTime?.message}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingClass ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Student Management Modal */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title={`Manage Students - ${selectedClass?.name || ""}`}
        size="full"
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setStudentModalTab("existing")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                studentModalTab === "existing"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Enrolled Students
            </button>
            <button
              onClick={() => setStudentModalTab("add")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                studentModalTab === "add"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Add Student
            </button>
            <button
              onClick={() => setStudentModalTab("bulk")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                studentModalTab === "bulk"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Bulk Upload
            </button>
          </div>

          {/* Existing Students Tab */}
          {studentModalTab === "existing" && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Selected count */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {classStudents.length} students enrolled
                </span>
              </div>

              {/* Enrolled Student List with Biometric Options */}
              <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-2">
                {classStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No students enrolled yet.</p>
                    <p className="text-sm mt-1">Use the &quot;Add Student&quot; or &quot;Bulk Upload&quot; tab to add students.</p>
                  </div>
                ) : (
                  classStudents.filter(s => 
                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.email.toLowerCase().includes(studentSearch.toLowerCase())
                  ).map((student) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Biometric Status */}
                        {faceEncodings[student.id] && (
                          <Badge variant="success" className="text-xs">
                            <Camera className="w-3 h-3 mr-1" />
                            Face
                          </Badge>
                        )}
                        {fingerprintEncodings[student.id] && (
                          <Badge variant="success" className="text-xs">
                            <Fingerprint className="w-3 h-3 mr-1" />
                            Fingerprint
                          </Badge>
                        )}
                        {!faceEncodings[student.id] && !fingerprintEncodings[student.id] && (
                          <Badge variant="warning" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            No Biometric
                          </Badge>
                        )}
                        {/* Biometric Training Buttons */}
                        <Link href={`/dashboard/face-training?studentId=${student.id}&classId=${selectedClass?.id}`}>
                          <Button variant="outline" size="sm" title="Train Face">
                            <Camera className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="Train Fingerprint"
                          onClick={() => {
                            // If student doesn't have fingerprint yet, show consent modal
                            if (!fingerprintEncodings[student.id]) {
                              setStudentPendingConsent(student);
                              setShowConsentModal(true);
                            } else {
                              // Re-training, proceed directly
                              setSelectedStudentForFingerprint(student);
                              setShowFingerprintModal(true);
                            }
                          }}
                        >
                          <Fingerprint className="w-4 h-4" />
                        </Button>
                        {/* Remove from class */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => {
                            setSelectedStudents(prev => prev.filter(id => id !== student.id));
                            setClassStudents(prev => prev.filter(s => s.id !== student.id));
                          }}
                          title="Remove from class"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {/* Delete student permanently */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          disabled={isDeletingStudent === student.id}
                          title="Delete student permanently"
                        >
                          {isDeletingStudent === student.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Add from Existing Students */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Add existing students:</p>
                <div className="max-h-[150px] overflow-y-auto space-y-1 border rounded-lg p-2">
                  {allStudents.filter(s => !classStudents.find(cs => cs.id === s.id)).map(student => (
                    <label
                      key={student.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(prev => [...prev, student.id]);
                          } else {
                            setSelectedStudents(prev => prev.filter(id => id !== student.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{student.name}</span>
                      <span className="text-xs text-gray-500">{student.email}</span>
                    </label>
                  ))}
                  {allStudents.filter(s => !classStudents.find(cs => cs.id === s.id)).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">No other students available</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsStudentModalOpen(false)}
                >
                  Close
                </Button>
                <Button onClick={saveClassStudents} isLoading={isSavingStudents}>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {/* Add Student Tab */}
          {studentModalTab === "add" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Create a new student and automatically add them to this class.
                </p>
              </div>

              <Input
                label="Student Name *"
                placeholder="Enter full name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
              />
              
              <Input
                label="Email Address *"
                type="email"
                placeholder="student@example.com"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
              />
              
              <Input
                label="Phone Number"
                placeholder="Optional"
                value={newStudentPhone}
                onChange={(e) => setNewStudentPhone(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setStudentModalTab("existing")}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddStudent} 
                  isLoading={isAddingStudent}
                  disabled={!newStudentName.trim() || !newStudentEmail.trim()}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Upload Tab */}
          {studentModalTab === "bulk" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Bulk Upload Students
                </p>
                <p className="text-sm text-blue-700">
                  Enter student data in CSV format: <code className="bg-blue-100 px-1 rounded">name,email,phone</code> (one per line)
                </p>
                <p className="text-xs text-blue-600 mt-1">Phone is optional</p>
              </div>

              <textarea
                value={bulkUploadText}
                onChange={(e) => setBulkUploadText(e.target.value)}
                placeholder="John Doe,john@example.com,01712345678&#10;Jane Smith,jane@example.com&#10;..."
                className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <div className="text-sm text-gray-500">
                {bulkUploadText.trim().split("\n").filter(l => l.trim()).length} lines entered
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setStudentModalTab("existing")}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkUpload} 
                  isLoading={isUploadingBulk}
                  disabled={!bulkUploadText.trim()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Students
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Fingerprint Training Modal */}
      <Modal
        isOpen={showFingerprintModal}
        onClose={() => {
          setShowFingerprintModal(false);
          setSelectedStudentForFingerprint(null);
        }}
        title="Fingerprint Registration"
        size="md"
      >
        {selectedStudentForFingerprint && (
          <FingerprintTraining
            studentId={selectedStudentForFingerprint.id}
            studentName={selectedStudentForFingerprint.name}
            onSuccess={() => {
              setFingerprintEncodings(prev => ({
                ...prev,
                [selectedStudentForFingerprint.id]: true,
              }));
              setTimeout(() => {
                setShowFingerprintModal(false);
                setSelectedStudentForFingerprint(null);
              }, 2000);
            }}
          />
        )}
      </Modal>

      {/* Biometric Consent Modal */}
      <BiometricConsentModal
        isOpen={showConsentModal}
        onClose={() => {
          setShowConsentModal(false);
          setStudentPendingConsent(null);
        }}
        onConsent={() => {
          if (studentPendingConsent) {
            setSelectedStudentForFingerprint(studentPendingConsent);
            setShowFingerprintModal(true);
          }
          setShowConsentModal(false);
          setStudentPendingConsent(null);
        }}
        biometricType="fingerprint"
        studentName={studentPendingConsent?.name || ""}
      />
    </div>
  );
}
