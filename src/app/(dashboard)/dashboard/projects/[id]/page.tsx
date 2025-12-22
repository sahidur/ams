"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type ColumnDef } from "@tanstack/react-table";
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  MoreHorizontal,
  Calendar,
  Users,
  Target,
  Clock
} from "lucide-react";
import Link from "next/link";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  DataTable, 
  Modal, 
  Input, 
  Badge 
} from "@/components/ui";

const cohortSchema = z.object({
  cohortId: z.string().min(1, "Cohort ID is required"),
  name: z.string().min(1, "Cohort name is required"),
  duration: z.string().optional(),
  learnerTarget: z.string().optional(),
  jobPlacementTarget: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

type CohortInput = z.infer<typeof cohortSchema>;

interface Project {
  id: string;
  name: string;
  donorName: string;
  startDate: string;
  endDate: string;
  description: string | null;
  isActive: boolean;
}

interface Cohort {
  id: string;
  cohortId: string;
  name: string;
  duration: number | null;
  learnerTarget: number | null;
  jobPlacementTarget: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CohortInput>({
    resolver: zodResolver(cohortSchema),
  });

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    }
  };

  const fetchCohorts = async () => {
    try {
      const res = await fetch(`/api/cohorts?projectId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setCohorts(data);
      }
    } catch (error) {
      console.error("Error fetching cohorts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchCohorts();
  }, [id]);

  const onSubmit = async (data: CohortInput) => {
    try {
      const url = selectedCohort 
        ? `/api/cohorts/${selectedCohort.id}` 
        : "/api/cohorts";
      const method = selectedCohort ? "PUT" : "POST";

      const payload = {
        ...data,
        projectId: id,
        duration: data.duration ? parseInt(data.duration) : undefined,
        learnerTarget: data.learnerTarget ? parseInt(data.learnerTarget) : undefined,
        jobPlacementTarget: data.jobPlacementTarget ? parseInt(data.jobPlacementTarget) : undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchCohorts();
        closeModal();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save cohort");
      }
    } catch (error) {
      console.error("Error saving cohort:", error);
    }
  };

  const handleToggleStatus = async (cohort: Cohort) => {
    try {
      const res = await fetch(`/api/cohorts/${cohort.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId: cohort.cohortId,
          name: cohort.name,
          isActive: !cohort.isActive,
        }),
      });

      if (res.ok) {
        fetchCohorts();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
    setActionMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!selectedCohort) return;
    try {
      await fetch(`/api/cohorts/${selectedCohort.id}`, { method: "DELETE" });
      fetchCohorts();
      setIsDeleteModalOpen(false);
      setSelectedCohort(null);
    } catch (error) {
      console.error("Error deleting cohort:", error);
    }
  };

  const openEditModal = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    reset({
      cohortId: cohort.cohortId,
      name: cohort.name,
      duration: cohort.duration?.toString() || "",
      learnerTarget: cohort.learnerTarget?.toString() || "",
      jobPlacementTarget: cohort.jobPlacementTarget?.toString() || "",
      startDate: cohort.startDate ? cohort.startDate.split("T")[0] : "",
      endDate: cohort.endDate ? cohort.endDate.split("T")[0] : "",
      description: cohort.description || "",
    });
    setIsModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCohort(null);
    reset();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns: ColumnDef<Cohort>[] = [
    {
      accessorKey: "cohortId",
      header: "Cohort ID",
      cell: ({ row }) => (
        <Badge variant="info">{row.original.cohortId}</Badge>
      ),
    },
    {
      accessorKey: "name",
      header: "Cohort Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.name}</p>
          {row.original.description && (
            <p className="text-xs text-gray-500 truncate max-w-xs">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "dates",
      header: "Duration",
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDate(row.original.startDate)} - {formatDate(row.original.endDate)}</span>
          </div>
          {row.original.duration && (
            <p className="text-xs text-gray-500 mt-1">{row.original.duration} months</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "learnerTarget",
      header: "Targets",
      cell: ({ row }) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span>{row.original.learnerTarget?.toLocaleString() || "-"} learners</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-500" />
            <span>{row.original.jobPlacementTarget?.toLocaleString() || "-"} jobs</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "default"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="relative flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionMenuOpen(actionMenuOpen === row.original.id ? null : row.original.id);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {actionMenuOpen === row.original.id && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setActionMenuOpen(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(row.original);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(row.original);
                  }}
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${
                    row.original.isActive ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"
                  }`}
                >
                  {row.original.isActive ? (
                    <>
                      <Clock className="w-4 h-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteModal(row.original);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </motion.div>
            </>
          )}
        </div>
      ),
    },
  ];

  const formatProjectDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
        <Link href="/dashboard/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/projects">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-500">Manage cohorts for this project</p>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Donor</p>
                <p className="font-semibold">{project.donorName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-semibold">{formatProjectDate(project.startDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-semibold">{formatProjectDate(project.endDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cohorts</p>
                <p className="font-semibold">{cohorts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohorts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cohorts</CardTitle>
          <Button onClick={() => { reset(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Cohort
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={cohorts}
            searchPlaceholder="Search cohorts..."
          />
        </CardContent>
      </Card>

      {/* Add/Edit Cohort Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedCohort ? "Edit Cohort" : "Add Cohort"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cohort ID"
              placeholder="e.g., C001"
              {...register("cohortId")}
              error={errors.cohortId?.message}
            />
            <Input
              label="Cohort Name"
              placeholder="Enter cohort name"
              {...register("name")}
              error={errors.name?.message}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Duration (months)"
              type="number"
              placeholder="e.g., 6"
              {...register("duration")}
              error={errors.duration?.message}
            />
            <Input
              label="Learner Target"
              type="number"
              placeholder="e.g., 500"
              {...register("learnerTarget")}
              error={errors.learnerTarget?.message}
            />
            <Input
              label="Job Placement Target"
              type="number"
              placeholder="e.g., 300"
              {...register("jobPlacementTarget")}
              error={errors.jobPlacementTarget?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              {...register("startDate")}
              error={errors.startDate?.message}
            />
            <Input
              label="End Date"
              type="date"
              {...register("endDate")}
              error={errors.endDate?.message}
            />
          </div>
          <Input
            label="Description (Optional)"
            placeholder="Enter cohort description"
            {...register("description")}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : selectedCohort ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Cohort"
      >
        <p className="text-gray-600">
          Are you sure you want to delete cohort &quot;{selectedCohort?.name}&quot;? 
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
