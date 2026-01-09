"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  MoreVertical,
  ToggleLeft,
  ToggleRight,
  FileText,
} from "lucide-react";
import { Button, Card, Input, Modal, Badge, DataTable } from "@/components/ui";
import { ColumnDef } from "@tanstack/react-table";

interface EmploymentType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    users: number;
  };
}

export default function EmploymentTypesPage() {
  const [types, setTypes] = useState<EmploymentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EmploymentType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [formError, setFormError] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTypes();
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

  const fetchTypes = async () => {
    try {
      const res = await fetch("/api/employment-types");
      if (res.ok) {
        const data = await res.json();
        setTypes(data);
      }
    } catch (error) {
      console.error("Error fetching employment types:", error);
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
      const url = selectedType
        ? `/api/employment-types/${selectedType.id}`
        : "/api/employment-types";
      const method = selectedType ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchTypes();
        closeModal();
      } else {
        const error = await res.json();
        setFormError(error.error || "Failed to save employment type");
      }
    } catch (error) {
      console.error("Error saving employment type:", error);
      setFormError("An error occurred while saving");
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedType) return;

    try {
      const res = await fetch(`/api/employment-types/${selectedType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !selectedType.isActive }),
      });

      if (res.ok) {
        fetchTypes();
        setIsStatusModalOpen(false);
        setSelectedType(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const openEditModal = (type: EmploymentType) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
    });
    setIsModalOpen(true);
    setActionMenuOpen(null);
  };

  const openStatusModal = (type: EmploymentType) => {
    setSelectedType(type);
    setIsStatusModalOpen(true);
    setActionMenuOpen(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedType(null);
    setFormData({
      name: "",
      description: "",
    });
    setFormError("");
  };

  const columns: ColumnDef<EmploymentType>[] = [
    {
      accessorKey: "name",
      header: "Employment Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
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
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-b-lg"
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
          <h1 className="text-2xl font-bold text-gray-900">Employment Types</h1>
          <p className="text-gray-500 mt-1">Manage employment type options (Full Time, Part Time, Contractual, etc.)</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Type
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{types.length}</p>
              <p className="text-sm text-gray-500">Total Types</p>
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
                {types.filter((t) => t.isActive).length}
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
                {types.filter((t) => !t.isActive).length}
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
          data={types} 
          searchPlaceholder="Search employment types..."
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedType ? "Edit Employment Type" : "Add Employment Type"}
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
              placeholder="e.g., Full Time, Part Time, Contractual, Project Staff"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this employment type"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedType ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Change Confirmation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedType(null);
        }}
        title={selectedType?.isActive ? "Deactivate Employment Type" : "Activate Employment Type"}
      >
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            selectedType?.isActive ? "bg-orange-50" : "bg-green-50"
          }`}>
            {selectedType?.isActive ? (
              <ToggleLeft className="w-6 h-6 text-orange-600" />
            ) : (
              <ToggleRight className="w-6 h-6 text-green-600" />
            )}
            <div>
              <p className={`font-medium ${
                selectedType?.isActive ? "text-orange-900" : "text-green-900"
              }`}>
                {selectedType?.isActive
                  ? "Deactivate this employment type?"
                  : "Activate this employment type?"}
              </p>
              <p className={`text-sm ${
                selectedType?.isActive ? "text-orange-600" : "text-green-600"
              }`}>
                {selectedType?.isActive
                  ? "Inactive types won't appear in user dropdowns."
                  : "Active types will appear in user dropdowns."}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsStatusModalOpen(false);
                setSelectedType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={selectedType?.isActive ? "destructive" : "default"}
              onClick={handleToggleStatus}
            >
              {selectedType?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
