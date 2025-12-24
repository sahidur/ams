"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Search
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
    try {
      const res = await fetch(`/api/classes/${classInfo.id}/students`);
      const data = await res.json();
      setClassStudents(data);
      setSelectedStudents(data.map((s: Student) => s.id));
    } catch (error) {
      console.error("Error fetching class students:", error);
      setClassStudents([]);
      setSelectedStudents([]);
    }
    setIsStudentModalOpen(true);
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
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </Button>
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
      >
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
              {selectedStudents.length} students selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700"
                onClick={() => setSelectedStudents(allStudents.map((s) => s.id))}
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                className="text-gray-600 hover:text-gray-700"
                onClick={() => setSelectedStudents([])}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Student List */}
          <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-2">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No students found. Create students in the Users page first.
              </div>
            ) : (
              filteredStudents.map((student) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedStudents.includes(student.id)
                      ? "bg-blue-50 border border-blue-300"
                      : "bg-gray-50 border border-transparent hover:border-gray-200"
                  }`}
                  onClick={() => toggleStudent(student.id)}
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedStudents.includes(student.id)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedStudents.includes(student.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.email}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsStudentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveClassStudents} isLoading={isSavingStudents}>
              <Check className="w-4 h-4 mr-2" />
              Save ({selectedStudents.length} students)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
