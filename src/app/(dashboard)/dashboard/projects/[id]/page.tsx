"use client";

import { useState, useEffect, use, useRef } from "react";
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
  Clock,
  Search,
  X,
  User,
  MapPin
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

interface FocalPerson {
  id: string;
  name: string;
  email: string;
  designation?: string;
}

interface Project {
  id: string;
  name: string;
  donorName: string;
  startDate: string;
  endDate: string;
  description: string | null;
  isActive: boolean;
  focalPerson: FocalPerson | null;
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
  focalPersonId: string | null;
  focalPerson: FocalPerson | null;
  description: string | null;
  createdAt: string;
  _count?: {
    directBranches: number;
    batches: number;
  };
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Focal person search
  const [users, setUsers] = useState<FocalPerson[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedFocalPerson, setSelectedFocalPerson] = useState<FocalPerson | null>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

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
    fetchUsers();
  }, [id]);

  const fetchUsers = async (search: string = "") => {
    try {
      const res = await fetch(`/api/users?minimal=true&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch) {
        fetchUsers(userSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        focalPersonId: selectedFocalPerson?.id || null,
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

  const handleToggleStatus = async () => {
    if (!selectedCohort) return;
    try {
      const res = await fetch(`/api/cohorts/${selectedCohort.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId: selectedCohort.cohortId,
          name: selectedCohort.name,
          isActive: !selectedCohort.isActive,
          focalPersonId: selectedCohort.focalPersonId,
        }),
      });

      if (res.ok) {
        fetchCohorts();
        setIsStatusModalOpen(false);
        setSelectedCohort(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
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
    setSelectedFocalPerson(cohort.focalPerson);
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

  const openStatusModal = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setIsStatusModalOpen(true);
    setActionMenuOpen(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCohort(null);
    setSelectedFocalPerson(null);
    setUserSearch("");
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
      accessorKey: "focalPerson",
      header: "Focal Person",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.focalPerson ? (
            <>
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{row.original.focalPerson.name}</p>
                <p className="text-xs text-gray-500">{row.original.focalPerson.email}</p>
              </div>
            </>
          ) : (
            <span className="text-gray-400 text-sm">Not assigned</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "branches",
      header: "Branches",
      cell: ({ row }) => (
        <Link
          href={`/dashboard/cohorts/${row.original.id}`}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
        >
          <MapPin className="w-4 h-4" />
          <span>{row.original._count?.directBranches || 0} branches</span>
        </Link>
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
                    openStatusModal(row.original);
                  }}
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${
                    row.original.isActive ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {row.original.isActive ? "Deactivate" : "Activate"}
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
          
          {/* Focal Person Searchable Dropdown */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Focal Person</label>
            <div className="relative" ref={userDropdownRef}>
              {selectedFocalPerson ? (
                <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedFocalPerson.name}</p>
                      <p className="text-xs text-gray-500">{selectedFocalPerson.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFocalPerson(null)}
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onFocus={() => setIsUserDropdownOpen(true)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  {isUserDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {users.length > 0 ? (
                        users.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedFocalPerson(user);
                              setIsUserDropdownOpen(false);
                              setUserSearch("");
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-gray-500">No users found</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
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

      {/* Status Change Confirmation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={selectedCohort?.isActive ? "Deactivate Cohort" : "Activate Cohort"}
      >
        <div className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            selectedCohort?.isActive ? "bg-orange-100" : "bg-green-100"
          }`}>
            <Clock className={`w-6 h-6 ${selectedCohort?.isActive ? "text-orange-600" : "text-green-600"}`} />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to {selectedCohort?.isActive ? "deactivate" : "activate"}{" "}
            cohort <span className="font-semibold">&quot;{selectedCohort?.name}&quot;</span>?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant={selectedCohort?.isActive ? "destructive" : "success"}
              onClick={handleToggleStatus} 
              className="flex-1"
            >
              {selectedCohort?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
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
