"use client";

import { useState, useEffect, useRef } from "react";
import { Card, Button, Input, Modal, Badge } from "@/components/ui";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  ToggleLeft,
  ToggleRight,
  GraduationCap,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TrainingType {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    projects: number;
  };
}

export default function TrainingTypesPage() {
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTrainingType, setSelectedTrainingType] = useState<TrainingType | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchTrainingTypes();
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTrainingTypes = async () => {
    try {
      const res = await fetch("/api/training-types");
      const data = await res.json();
      setTrainingTypes(data);
    } catch (error) {
      console.error("Error fetching training types:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Training type name is required");
      return;
    }

    try {
      const url = selectedTrainingType
        ? `/api/training-types/${selectedTrainingType.id}`
        : "/api/training-types";
      const method = selectedTrainingType ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchTrainingTypes();
        closeModal();
      } else {
        const error = await res.json();
        setFormError(error.error || "Failed to save training type");
      }
    } catch (error) {
      console.error("Error saving training type:", error);
      setFormError("An error occurred");
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedTrainingType) return;

    try {
      const res = await fetch(`/api/training-types/${selectedTrainingType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !selectedTrainingType.isActive,
        }),
      });

      if (res.ok) {
        fetchTrainingTypes();
        setIsStatusModalOpen(false);
        setSelectedTrainingType(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedTrainingType) return;

    try {
      const res = await fetch(`/api/training-types/${selectedTrainingType.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTrainingTypes();
        setIsDeleteModalOpen(false);
        setSelectedTrainingType(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete training type");
      }
    } catch (error) {
      console.error("Error deleting training type:", error);
    }
  };

  const openEditModal = (trainingType: TrainingType) => {
    setSelectedTrainingType(trainingType);
    setFormData({
      name: trainingType.name,
      description: trainingType.description || "",
      startDate: trainingType.startDate.split("T")[0],
    });
    setIsModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (trainingType: TrainingType) => {
    setSelectedTrainingType(trainingType);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const openStatusModal = (trainingType: TrainingType) => {
    setSelectedTrainingType(trainingType);
    setIsStatusModalOpen(true);
    setActionMenuOpen(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTrainingType(null);
    setFormData({
      name: "",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
    });
    setFormError("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns: ColumnDef<TrainingType>[] = [
    {
      accessorKey: "name",
      header: "Training Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.original.name}</p>
            {row.original.description && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                {row.original.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          {formatDate(row.original.startDate)}
        </div>
      ),
    },
    {
      accessorKey: "_count.projects",
      header: "Projects",
      cell: ({ row }) => (
        <Badge variant="info">
          {row.original._count.projects} project{row.original._count.projects !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "warning"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="relative" ref={actionMenuOpen === row.original.id ? actionMenuRef : null}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionMenuOpen(actionMenuOpen === row.original.id ? null : row.original.id)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          <AnimatePresence>
            {actionMenuOpen === row.original.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-50"
              >
                <button
                  onClick={() => openEditModal(row.original)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => openStatusModal(row.original)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  {row.original.isActive ? (
                    <>
                      <ToggleLeft className="w-4 h-4" /> Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleRight className="w-4 h-4" /> Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => openDeleteModal(row.original)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600 rounded-b-lg"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Types</h1>
          <p className="text-gray-500 mt-1">Manage training types for your projects</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Training Type
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{trainingTypes.length}</p>
              <p className="text-sm text-gray-500">Total Training Types</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ToggleRight className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {trainingTypes.filter((tt) => tt.isActive).length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <ToggleLeft className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {trainingTypes.filter((tt) => !tt.isActive).length}
              </p>
              <p className="text-sm text-gray-500">Inactive</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-6">
        <DataTable 
          columns={columns} 
          data={trainingTypes} 
          searchPlaceholder="Search training types..."
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedTrainingType ? "Edit Training Type" : "Add Training Type"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Online, Classroom, Apprenticeship"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this training type"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedTrainingType ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTrainingType(null);
        }}
        title="Delete Training Type"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-medium text-red-900">This action cannot be undone</p>
              <p className="text-sm text-red-600">
                Are you sure you want to delete &quot;{selectedTrainingType?.name}&quot;?
              </p>
            </div>
          </div>

          {selectedTrainingType && selectedTrainingType._count.projects > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
              <strong>Warning:</strong> This training type is used by{" "}
              {selectedTrainingType._count.projects} project(s). You cannot delete it.
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedTrainingType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!(selectedTrainingType && selectedTrainingType._count.projects > 0)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Change Confirmation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedTrainingType(null);
        }}
        title={selectedTrainingType?.isActive ? "Deactivate Training Type" : "Activate Training Type"}
      >
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            selectedTrainingType?.isActive ? "bg-orange-50" : "bg-green-50"
          }`}>
            {selectedTrainingType?.isActive ? (
              <ToggleLeft className="w-6 h-6 text-orange-600" />
            ) : (
              <ToggleRight className="w-6 h-6 text-green-600" />
            )}
            <div>
              <p className={`font-medium ${
                selectedTrainingType?.isActive ? "text-orange-900" : "text-green-900"
              }`}>
                {selectedTrainingType?.isActive
                  ? "Deactivate this training type?"
                  : "Activate this training type?"}
              </p>
              <p className={`text-sm ${
                selectedTrainingType?.isActive ? "text-orange-600" : "text-green-600"
              }`}>
                {selectedTrainingType?.isActive
                  ? "Inactive training types won't appear in project dropdowns."
                  : "Active training types will appear in project dropdowns."}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsStatusModalOpen(false);
                setSelectedTrainingType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={selectedTrainingType?.isActive ? "destructive" : "default"}
              onClick={handleToggleStatus}
            >
              {selectedTrainingType?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
