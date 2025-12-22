"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Calendar, Clock, Users } from "lucide-react";
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
    trainer?: {
      id: string;
      name: string;
    };
  };
  _count: {
    attendance: number;
  };
}

interface Batch {
  id: string;
  name: string;
  branch: {
    branchName: string;
  };
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);

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

  useEffect(() => {
    fetchClasses();
    fetchBatches();
  }, [fetchClasses, fetchBatches]);

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
      header: "Batch",
      cell: ({ row }) => (
        <Badge variant="info">{row.original.batch.name}</Badge>
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
      accessorKey: "_count.attendance",
      header: "Attendance",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          {row.original._count.attendance} recorded
        </div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 mt-1">Manage class schedules</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="p-3 rounded-lg bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {classes.reduce((acc, c) => acc + c._count.attendance, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Attendance Records</p>
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

      {/* Add/Edit Modal */}
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
                {batch.name} - {batch.branch.branchName}
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
    </div>
  );
}
