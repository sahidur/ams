"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, MoreHorizontal, Calendar, Users, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { projectSchema, type ProjectInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  donorName: string;
  startDate: string;
  endDate: string;
  description: string | null;
  isActive: boolean;
  _count: {
    cohorts: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
  });

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const onSubmit = async (data: ProjectInput) => {
    try {
      const url = selectedProject 
        ? `/api/projects/${selectedProject.id}` 
        : "/api/projects";
      const method = selectedProject ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        fetchProjects();
        closeModal();
      }
    } catch (error) {
      console.error("Error saving project:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    try {
      await fetch(`/api/projects/${selectedProject.id}`, { method: "DELETE" });
      fetchProjects();
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    reset({
      name: project.name,
      donorName: project.donorName,
      startDate: project.startDate.split("T")[0],
      endDate: project.endDate.split("T")[0],
      description: project.description || "",
    });
    setIsModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
    reset();
  };

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "name",
      header: "Project",
      cell: ({ row }) => (
        <div 
          className="cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => router.push(`/dashboard/projects/${row.original.id}`)}
        >
          <p className="font-medium text-gray-900 hover:text-blue-600">{row.original.name}</p>
          <p className="text-xs text-gray-500">Donor: {row.original.donorName}</p>
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{formatDate(row.original.startDate)} - {formatDate(row.original.endDate)}</span>
        </div>
      ),
    },
    {
      accessorKey: "cohorts",
      header: "Cohorts",
      cell: ({ row }) => (
        <button 
          onClick={() => router.push(`/dashboard/projects/${row.original.id}`)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Users className="w-4 h-4" />
          <span>{row.original._count.cohorts} cohorts</span>
          <ExternalLink className="w-3 h-3" />
        </button>
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
                    router.push(`/dashboard/projects/${row.original.id}`);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Users className="w-4 h-4" />
                  View Cohorts
                </button>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your projects and cohorts</p>
        </div>
        <Button onClick={() => { reset(); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={projects} 
              searchPlaceholder="Search projects..."
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedProject ? "Edit Project" : "Add New Project"}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Project Name"
            placeholder="Enter project name"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Donor Name"
            placeholder="Enter donor name"
            error={errors.donorName?.message}
            {...register("donorName")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              error={errors.startDate?.message}
              {...register("startDate")}
            />
            <Input
              label="End Date"
              type="date"
              error={errors.endDate?.message}
              {...register("endDate")}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-all duration-200 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[100px]"
              placeholder="Project description (optional)"
              {...register("description")}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              {selectedProject ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Project"
        size="sm"
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <span className="font-semibold">{selectedProject?.name}</span>? This will also delete all associated cohorts.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
