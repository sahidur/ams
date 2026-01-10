"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, MoreHorizontal, Calendar, Users, ExternalLink, Clock, Search, X, User, Layers, GraduationCap } from "lucide-react";
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

interface FocalPerson {
  id: string;
  name: string;
  email: string;
  designation?: string;
}

interface ModelType {
  id: string;
  name: string;
}

interface TrainingType {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  donorName: string;
  startDate: string;
  endDate: string;
  description: string | null;
  isActive: boolean;
  focalPersonId: string | null;
  focalPerson: FocalPerson | null;
  modelTypeId: string | null;
  modelType: ModelType | null;
  trainingTypeId: string | null;
  trainingType: TrainingType | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string } | null;
  updatedBy: { id: string; name: string } | null;
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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  
  // Focal person search
  const [users, setUsers] = useState<FocalPerson[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedFocalPerson, setSelectedFocalPerson] = useState<FocalPerson | null>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Model Type search
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [modelTypeSearch, setModelTypeSearch] = useState("");
  const [isModelTypeDropdownOpen, setIsModelTypeDropdownOpen] = useState(false);
  const [selectedModelType, setSelectedModelType] = useState<ModelType | null>(null);
  const modelTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Training Type search
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [trainingTypeSearch, setTrainingTypeSearch] = useState("");
  const [isTrainingTypeDropdownOpen, setIsTrainingTypeDropdownOpen] = useState(false);
  const [selectedTrainingType, setSelectedTrainingType] = useState<TrainingType | null>(null);
  const trainingTypeDropdownRef = useRef<HTMLDivElement>(null);

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

  const fetchModelTypes = async () => {
    try {
      const res = await fetch("/api/model-types?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setModelTypes(data);
      }
    } catch (error) {
      console.error("Error fetching model types:", error);
    }
  };

  const fetchTrainingTypes = async () => {
    try {
      const res = await fetch("/api/training-types?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setTrainingTypes(data);
      }
    } catch (error) {
      console.error("Error fetching training types:", error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchModelTypes();
    fetchTrainingTypes();
  }, []);

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
      if (modelTypeDropdownRef.current && !modelTypeDropdownRef.current.contains(event.target as Node)) {
        setIsModelTypeDropdownOpen(false);
      }
      if (trainingTypeDropdownRef.current && !trainingTypeDropdownRef.current.contains(event.target as Node)) {
        setIsTrainingTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSubmit = async (data: ProjectInput) => {
    try {
      const url = selectedProject 
        ? `/api/projects/${selectedProject.id}` 
        : "/api/projects";
      const method = selectedProject ? "PUT" : "POST";

      const payload = {
        ...data,
        focalPersonId: selectedFocalPerson?.id || null,
        modelTypeId: selectedModelType?.id || null,
        trainingTypeId: selectedTrainingType?.id || null,
        isActive: selectedProject?.isActive ?? true,
      };

      console.log("Submitting project with payload:", payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchProjects();
        closeModal();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save project");
      }
    } catch (error) {
      console.error("Error saving project:", error);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedProject.name,
          donorName: selectedProject.donorName,
          startDate: selectedProject.startDate,
          endDate: selectedProject.endDate,
          description: selectedProject.description,
          focalPersonId: selectedProject.focalPersonId,
          modelTypeId: selectedProject.modelTypeId,
          trainingTypeId: selectedProject.trainingTypeId,
          isActive: !selectedProject.isActive,
        }),
      });

      if (res.ok) {
        fetchProjects();
        setIsStatusModalOpen(false);
        setSelectedProject(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
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
    setSelectedFocalPerson(project.focalPerson);
    setSelectedModelType(project.modelType);
    setSelectedTrainingType(project.trainingType);
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

  const openStatusModal = (project: Project) => {
    setSelectedProject(project);
    setIsStatusModalOpen(true);
    setActionMenuOpen(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
    setSelectedFocalPerson(null);
    setSelectedModelType(null);
    setSelectedTrainingType(null);
    setUserSearch("");
    setModelTypeSearch("");
    setTrainingTypeSearch("");
    reset();
  };

  // Filter model types based on search
  const filteredModelTypes = modelTypes.filter((mt) =>
    mt.name.toLowerCase().includes(modelTypeSearch.toLowerCase())
  );

  // Filter training types based on search
  const filteredTrainingTypes = trainingTypes.filter((tt) =>
    tt.name.toLowerCase().includes(trainingTypeSearch.toLowerCase())
  );

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
      accessorKey: "modelType",
      header: "Model Type",
      cell: ({ row }) => (
        row.original.modelType ? (
          <Badge variant="default" className="bg-purple-100 text-purple-700">
            {row.original.modelType.name}
          </Badge>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
      ),
    },
    {
      accessorKey: "trainingType",
      header: "Training Type",
      cell: ({ row }) => (
        row.original.trainingType ? (
          <Badge variant="info" className="bg-blue-100 text-blue-700">
            {row.original.trainingType.name}
          </Badge>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
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
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "default"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="text-gray-900">{formatDate(row.original.createdAt)}</p>
          {row.original.createdBy && (
            <p className="text-gray-500">by {row.original.createdBy.name}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="text-gray-900">{formatDate(row.original.updatedAt)}</p>
          {row.original.updatedBy && (
            <p className="text-gray-500">by {row.original.updatedBy.name}</p>
          )}
        </div>
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

          {/* Model Type and Training Type Dropdowns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Model Type Dropdown */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Model Type</label>
              <div className="relative" ref={modelTypeDropdownRef}>
                {selectedModelType ? (
                  <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-purple-50">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">{selectedModelType.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedModelType(null)}
                      className="p-1 hover:bg-purple-100 rounded-full"
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
                        placeholder="Search model types..."
                        value={modelTypeSearch}
                        onChange={(e) => setModelTypeSearch(e.target.value)}
                        onFocus={() => setIsModelTypeDropdownOpen(true)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                    {isModelTypeDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {filteredModelTypes.length > 0 ? (
                          filteredModelTypes.map((mt) => (
                            <button
                              key={mt.id}
                              type="button"
                              onClick={() => {
                                setSelectedModelType(mt);
                                setIsModelTypeDropdownOpen(false);
                                setModelTypeSearch("");
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-purple-50 text-left"
                            >
                              <Layers className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-medium">{mt.name}</span>
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-3 text-sm text-gray-500">No model types found</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Training Type Dropdown */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Training Type</label>
              <div className="relative" ref={trainingTypeDropdownRef}>
                {selectedTrainingType ? (
                  <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">{selectedTrainingType.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTrainingType(null)}
                      className="p-1 hover:bg-blue-100 rounded-full"
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
                        placeholder="Search training types..."
                        value={trainingTypeSearch}
                        onChange={(e) => setTrainingTypeSearch(e.target.value)}
                        onFocus={() => setIsTrainingTypeDropdownOpen(true)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    {isTrainingTypeDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {filteredTrainingTypes.length > 0 ? (
                          filteredTrainingTypes.map((tt) => (
                            <button
                              key={tt.id}
                              type="button"
                              onClick={() => {
                                setSelectedTrainingType(tt);
                                setIsTrainingTypeDropdownOpen(false);
                                setTrainingTypeSearch("");
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-blue-50 text-left"
                            >
                              <GraduationCap className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium">{tt.name}</span>
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-3 text-sm text-gray-500">No training types found</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
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

      {/* Status Change Confirmation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={selectedProject?.isActive ? "Deactivate Project" : "Activate Project"}
        size="sm"
      >
        <div className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            selectedProject?.isActive ? "bg-orange-100" : "bg-green-100"
          }`}>
            <Clock className={`w-6 h-6 ${selectedProject?.isActive ? "text-orange-600" : "text-green-600"}`} />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to {selectedProject?.isActive ? "deactivate" : "activate"}{" "}
            <span className="font-semibold">{selectedProject?.name}</span>?
            {selectedProject?.isActive && (
              <span className="block mt-2 text-sm text-orange-600">
                Note: All cohorts must be deactivated first.
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant={selectedProject?.isActive ? "destructive" : "success"}
              onClick={handleToggleStatus} 
              className="flex-1"
            >
              {selectedProject?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
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
