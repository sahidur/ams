"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Users, GraduationCap, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Button, 
  Card, 
  CardContent, 
  Input, 
  Select, 
  Modal, 
  Badge,
  DataTable,
} from "@/components/ui";
import { batchSchema, type BatchFormData } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

interface Batch {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  branch: {
    id: string;
    branchName: string;
    upazila: string;
    district: string;
  };
  cohort?: {
    id: string;
    name: string;
  };
  trainer?: {
    id: string;
    name: string;
  };
  _count: {
    students: number;
    classes: number;
  };
}

interface Branch {
  id: string;
  branchName: string;
  district: string;
  upazila: string;
}

interface Cohort {
  id: string;
  name: string;
}

interface Trainer {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
  });

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [branchRes, cohortRes, trainerRes, studentRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/cohorts"),
        fetch("/api/users?role=TRAINER"),
        fetch("/api/users?role=STUDENT"),
      ]);
      
      const [branchData, cohortData, trainerData, studentData] = await Promise.all([
        branchRes.json(),
        cohortRes.json(),
        trainerRes.json(),
        studentRes.json(),
      ]);

      setBranches(branchData);
      setCohorts(cohortData);
      setTrainers(trainerData);
      setStudents(studentData);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
    fetchOptions();
  }, [fetchBatches, fetchOptions]);

  const openModal = (batch?: Batch) => {
    if (batch) {
      setEditingBatch(batch);
      reset({
        name: batch.name,
        branchId: batch.branch.id,
        cohortId: batch.cohort?.id,
        trainerId: batch.trainer?.id,
        startDate: batch.startDate.split("T")[0],
        endDate: batch.endDate.split("T")[0],
      });
    } else {
      setEditingBatch(null);
      reset({
        name: "",
        branchId: "",
        cohortId: "",
        trainerId: "",
        startDate: "",
        endDate: "",
      });
    }
    setIsModalOpen(true);
  };

  const openStudentModal = async (batch: Batch) => {
    setSelectedBatch(batch);
    try {
      const res = await fetch(`/api/batches/${batch.id}/students`);
      const data = await res.json();
      setBatchStudents(data);
      setSelectedStudents(data.map((s: Student) => s.id));
    } catch (error) {
      console.error("Error fetching batch students:", error);
    }
    setIsStudentModalOpen(true);
  };

  const onSubmit = async (data: BatchFormData) => {
    try {
      const url = editingBatch
        ? `/api/batches/${editingBatch.id}`
        : "/api/batches";
      const method = editingBatch ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        fetchBatches();
        setIsModalOpen(false);
        reset();
      }
    } catch (error) {
      console.error("Error saving batch:", error);
    }
  };

  const deleteBatch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this batch?")) return;

    try {
      await fetch(`/api/batches/${id}`, { method: "DELETE" });
      fetchBatches();
    } catch (error) {
      console.error("Error deleting batch:", error);
    }
  };

  const updateBatchStudents = async () => {
    if (!selectedBatch) return;

    try {
      await fetch(`/api/batches/${selectedBatch.id}/students`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });
      fetchBatches();
      setIsStudentModalOpen(false);
    } catch (error) {
      console.error("Error updating students:", error);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const columns: ColumnDef<Batch>[] = [
    {
      accessorKey: "name",
      header: "Batch Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "branch.branchName",
      header: "Branch",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.branch.branchName}</p>
          <p className="text-xs text-gray-500">
            {row.original.branch.upazila}, {row.original.branch.district}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "cohort.name",
      header: "Cohort",
      cell: ({ row }) => row.original.cohort?.name || "-",
    },
    {
      accessorKey: "trainer.name",
      header: "Trainer",
      cell: ({ row }) => (
        row.original.trainer ? (
          <Badge variant="info">{row.original.trainer.name}</Badge>
        ) : "-"
      ),
    },
    {
      accessorKey: "startDate",
      header: "Duration",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{formatDate(row.original.startDate)}</p>
          <p className="text-gray-500">to {formatDate(row.original.endDate)}</p>
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
          onClick={() => openStudentModal(row.original)}
        >
          <Users className="w-4 h-4 mr-1" />
          {row.original._count.students}
        </Button>
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
            onClick={() => deleteBatch(row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Batches</h1>
          <p className="text-gray-500 mt-1">Manage training batches and students</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Batch
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{batches.length}</p>
                <p className="text-sm text-gray-500">Total Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {batches.reduce((acc, b) => acc + b._count.students, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{trainers.length}</p>
                <p className="text-sm text-gray-500">Active Trainers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              data={batches}
              searchPlaceholder="Search batches..."
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBatch ? "Edit Batch" : "Add Batch"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Batch Name"
            {...register("name")}
            error={errors.name?.message}
          />

          <Select
            label="Branch"
            {...register("branchId")}
            error={errors.branchId?.message}
          >
            <option value="">Select Branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.branchName} - {branch.upazila}, {branch.district}
              </option>
            ))}
          </Select>

          <Select
            label="Cohort (Optional)"
            {...register("cohortId")}
            error={errors.cohortId?.message}
          >
            <option value="">Select Cohort</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </Select>

          <Select
            label="Trainer"
            {...register("trainerId")}
            error={errors.trainerId?.message}
          >
            <option value="">Select Trainer</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name}
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

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingBatch ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Student Assignment Modal */}
      <AnimatePresence>
        {isStudentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsStudentModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">
                  Manage Students - {selectedBatch?.name}
                </h2>
                <button
                  onClick={() => setIsStudentModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <div className="space-y-2">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedStudents.includes(student.id)
                          ? "bg-blue-50 border-2 border-blue-300"
                          : "bg-gray-50 border border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => {}}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <p className="text-sm text-gray-500">
                  {selectedStudents.length} students selected
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsStudentModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={updateBatchStudents}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
