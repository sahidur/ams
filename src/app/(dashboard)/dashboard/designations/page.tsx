"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Briefcase,
} from "lucide-react";
import { Button, Card, Input, Modal, Badge, DataTable } from "@/components/ui";
import { ColumnDef } from "@tanstack/react-table";

interface Designation {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    users: number;
  };
}

export default function DesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [formError, setFormError] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDesignations();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDesignations = async () => {
    try {
      const res = await fetch("/api/designations");
      if (res.ok) {
        const data = await res.json();
        setDesignations(data);
      }
    } catch (error) {
      console.error("Error fetching designations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Name is required");
      return;
    }

    try {
      const url = selectedDesignation
        ? `/api/designations/${selectedDesignation.id}`
        : "/api/designations";
      const method = selectedDesignation ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchDesignations();
        closeModal();
      } else {
        const error = await res.json();
        setFormError(error.error || "Failed to save designation");
      }
    } catch (error) {
      console.error("Error saving designation:", error);
      setFormError("An error occurred while saving");
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedDesignation) return;

    try {
      const res = await fetch(`/api/designations/${selectedDesignation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !selectedDesignation.isActive }),
      });

      if (res.ok) {
        fetchDesignations();
        setIsStatusModalOpen(false);
        setSelectedDesignation(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedDesignation) return;

    try {
      const res = await fetch(`/api/designations/${selectedDesignation.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchDesignations();
        setIsDeleteModalOpen(false);
        setSelectedDesignation(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete designation");
      }
    } catch (error) {
      console.error("Error deleting designation:", error);
    }
  };

  const openEditModal = (designation: Designation) => {
    setSelectedDesignation(designation);
    setFormData({
      name: designation.name,
      description: designation.description || "",
    });
    setIsModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (designation: Designation) => {
    setSelectedDesignation(designation);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const openStatusModal = (designation: Designation) => {
    setSelectedDesignation(designation);
    setIsStatusModalOpen(true);
    setActionMenuOpen(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDesignation(null);
    setFormData({
      name: "",
      description: "",
    });
    setFormError("");
  };

  const columns: ColumnDef<Designation>[] = [
    {
      accessorKey: "name",
      header: "Designation",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
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
      accessorKey: "_count.users",
      header: "Users",
      cell: ({ row }) => (
        <Badge variant="info">
          {row.original._count.users} user{row.original._count.users !== 1 ? "s" : ""}
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designations</h1>
          <p className="text-gray-500 mt-1">Manage employee designations for your organization</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Designation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{designations.length}</p>
              <p className="text-sm text-gray-500">Total Designations</p>
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
                {designations.filter((d) => d.isActive).length}
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
                {designations.filter((d) => !d.isActive).length}
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
          data={designations} 
          searchPlaceholder="Search designations..."
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedDesignation ? "Edit Designation" : "Add Designation"}
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
              placeholder="e.g., Manager, Senior Officer, Program Officer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this designation"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedDesignation ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDesignation(null);
        }}
        title="Delete Designation"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-medium text-red-900">This action cannot be undone</p>
              <p className="text-sm text-red-600">
                Are you sure you want to delete &quot;{selectedDesignation?.name}&quot;?
              </p>
            </div>
          </div>

          {selectedDesignation && selectedDesignation._count.users > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
              <strong>Warning:</strong> This designation is assigned to{" "}
              {selectedDesignation._count.users} user(s). You cannot delete it.
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedDesignation(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!(selectedDesignation && selectedDesignation._count.users > 0)}
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
          setSelectedDesignation(null);
        }}
        title={selectedDesignation?.isActive ? "Deactivate Designation" : "Activate Designation"}
      >
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            selectedDesignation?.isActive ? "bg-orange-50" : "bg-green-50"
          }`}>
            {selectedDesignation?.isActive ? (
              <ToggleLeft className="w-6 h-6 text-orange-600" />
            ) : (
              <ToggleRight className="w-6 h-6 text-green-600" />
            )}
            <div>
              <p className={`font-medium ${
                selectedDesignation?.isActive ? "text-orange-900" : "text-green-900"
              }`}>
                {selectedDesignation?.isActive
                  ? "Deactivate this designation?"
                  : "Activate this designation?"}
              </p>
              <p className={`text-sm ${
                selectedDesignation?.isActive ? "text-orange-600" : "text-green-600"
              }`}>
                {selectedDesignation?.isActive
                  ? "Inactive designations won't appear in user dropdowns."
                  : "Active designations will appear in user dropdowns."}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsStatusModalOpen(false);
                setSelectedDesignation(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={selectedDesignation?.isActive ? "destructive" : "default"}
              onClick={handleToggleStatus}
            >
              {selectedDesignation?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
