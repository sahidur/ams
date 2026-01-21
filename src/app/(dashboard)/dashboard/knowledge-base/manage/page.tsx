"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  Building2,
  FileType2,
  ArrowLeft,
  Loader2,
  Power,
  PowerOff,
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  Input, 
  Modal, 
  Badge,
  DataTable 
} from "@/components/ui";
import { useRouter } from "next/navigation";

interface FileDepartment {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count: {
    knowledgeFiles: number;
    fileTypes: number;
  };
}

interface FileType {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count: {
    knowledgeFiles: number;
  };
}

type TabType = "departments" | "fileTypes";

export default function ManageKnowledgeBasePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("departments");
  
  // Departments state
  const [departments, setDepartments] = useState<FileDepartment[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  
  // File Types state
  const [fileTypes, setFileTypes] = useState<FileType[]>([]);
  const [loadingFileTypes, setLoadingFileTypes] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TabType>("departments");
  const [selectedDepartment, setSelectedDepartment] = useState<FileDepartment | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<FileType | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    departmentId: "",
    sortOrder: 0,
    isActive: true,
  });
  
  // Action menu
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Fetch departments
  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const res = await fetch("/api/file-departments");
      if (res.ok) {
        setDepartments(await res.json());
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Fetch file types
  const fetchFileTypes = async () => {
    setLoadingFileTypes(true);
    try {
      const res = await fetch("/api/file-types");
      if (res.ok) {
        setFileTypes(await res.json());
      }
    } catch (error) {
      console.error("Error fetching file types:", error);
    } finally {
      setLoadingFileTypes(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchFileTypes();
  }, []);

  // Open create/edit modal
  const openModal = (type: TabType, item?: FileDepartment | FileType) => {
    setModalType(type);
    setFormError("");
    
    if (type === "departments") {
      const dept = item as FileDepartment | undefined;
      setSelectedDepartment(dept || null);
      setSelectedFileType(null);
      setFormData({
        name: dept?.name || "",
        description: dept?.description || "",
        departmentId: "",
        sortOrder: dept?.sortOrder || 0,
        isActive: dept?.isActive !== false,
      });
    } else {
      const ft = item as FileType | undefined;
      setSelectedFileType(ft || null);
      setSelectedDepartment(null);
      setFormData({
        name: ft?.name || "",
        description: ft?.description || "",
        departmentId: ft?.departmentId || "",
        sortOrder: ft?.sortOrder || 0,
        isActive: ft?.isActive !== false,
      });
    }
    
    setIsModalOpen(true);
    setActionMenuOpen(null);
  };

  // Open delete modal
  const openDeleteModal = (type: TabType, item: FileDepartment | FileType) => {
    setModalType(type);
    if (type === "departments") {
      setSelectedDepartment(item as FileDepartment);
      setSelectedFileType(null);
    } else {
      setSelectedFileType(item as FileType);
      setSelectedDepartment(null);
    }
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  // Open toggle status confirmation modal
  const openToggleModal = (type: TabType, item: FileDepartment | FileType) => {
    setModalType(type);
    if (type === "departments") {
      setSelectedDepartment(item as FileDepartment);
      setSelectedFileType(null);
    } else {
      setSelectedFileType(item as FileType);
      setSelectedDepartment(null);
    }
    setIsToggleModalOpen(true);
    setActionMenuOpen(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    if (!formData.name.trim()) {
      setFormError("Name is required");
      setSubmitting(false);
      return;
    }

    try {
      const isEdit = modalType === "departments" ? !!selectedDepartment : !!selectedFileType;
      const id = modalType === "departments" ? selectedDepartment?.id : selectedFileType?.id;
      const url = modalType === "departments"
        ? isEdit ? `/api/file-departments/${id}` : "/api/file-departments"
        : isEdit ? `/api/file-types/${id}` : "/api/file-types";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        ...(modalType === "fileTypes" && { departmentId: formData.departmentId || null }),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (modalType === "departments") {
          fetchDepartments();
        } else {
          fetchFileTypes();
        }
        setIsModalOpen(false);
      } else {
        const error = await res.json();
        setFormError(error.error || "Failed to save");
      }
    } catch (error) {
      setFormError("An error occurred");
      console.error("Error saving:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const id = modalType === "departments" ? selectedDepartment?.id : selectedFileType?.id;
      const url = modalType === "departments"
        ? `/api/file-departments/${id}`
        : `/api/file-types/${id}`;

      const res = await fetch(url, { method: "DELETE" });

      if (res.ok) {
        if (modalType === "departments") {
          fetchDepartments();
        } else {
          fetchFileTypes();
        }
        setIsDeleteModalOpen(false);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status with confirmation
  const handleToggleStatus = async () => {
    setSubmitting(true);
    const item = modalType === "departments" ? selectedDepartment : selectedFileType;
    if (!item) return;

    try {
      const id = item.id;
      const url = modalType === "departments"
        ? `/api/file-departments/${id}`
        : `/api/file-types/${id}`;

      const payload = {
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder,
        isActive: !item.isActive,
        ...(modalType === "fileTypes" && { departmentId: (item as FileType).departmentId }),
      };

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (modalType === "departments") {
          fetchDepartments();
        } else {
          fetchFileTypes();
        }
        setIsToggleModalOpen(false);
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Department columns matching user table design
  const departmentColumns: ColumnDef<FileDepartment>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium flex-shrink-0">
            {row.original.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{row.original.name}</p>
            <p className="text-xs text-gray-500 truncate">{row.original.description || "No description"}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "_count.fileTypes",
      header: "File Types",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original._count.fileTypes}</Badge>
      ),
    },
    {
      accessorKey: "_count.knowledgeFiles",
      header: "Files",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original._count.knowledgeFiles}</Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "danger"}>
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
                  onClick={() => openModal("departments", row.original)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => openToggleModal("departments", row.original)}
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${
                    row.original.isActive 
                      ? "text-orange-600 hover:bg-orange-50" 
                      : "text-green-600 hover:bg-green-50"
                  }`}
                >
                  {row.original.isActive ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      Activate
                    </>
                  )}
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => openDeleteModal("departments", row.original)}
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

  // File type columns matching user table design
  const fileTypeColumns: ColumnDef<FileType>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-medium flex-shrink-0">
            {row.original.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{row.original.name}</p>
            <p className="text-xs text-gray-500 truncate">{row.original.description || "No description"}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.original.department ? (
        <Badge variant="outline">{row.original.department.name}</Badge>
      ) : (
        <span className="text-gray-400">-</span>
      ),
    },
    {
      accessorKey: "_count.knowledgeFiles",
      header: "Files",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original._count.knowledgeFiles}</Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "danger"}>
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
                  onClick={() => openModal("fileTypes", row.original)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => openToggleModal("fileTypes", row.original)}
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${
                    row.original.isActive 
                      ? "text-orange-600 hover:bg-orange-50" 
                      : "text-green-600 hover:bg-green-50"
                  }`}
                >
                  {row.original.isActive ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      Activate
                    </>
                  )}
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => openDeleteModal("fileTypes", row.original)}
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

  const toggleItem = modalType === "departments" ? selectedDepartment : selectedFileType;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/knowledge-base")}
            className="p-2 w-fit"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Manage Knowledge Base
            </h1>
            <p className="text-gray-600 mt-1">
              Configure file departments and types
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab("departments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "departments"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">File</span> Departments
          </button>
          <button
            onClick={() => setActiveTab("fileTypes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "fileTypes"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FileType2 className="w-4 h-4" />
            <span className="hidden sm:inline">File</span> Types
          </button>
        </div>

        {/* Departments Tab */}
        {activeTab === "departments" && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">File Departments</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Manage document categories</p>
                </div>
                <Button onClick={() => openModal("departments")}>
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add Department</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {loadingDepartments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <DataTable 
                  columns={departmentColumns} 
                  data={departments} 
                  searchPlaceholder="Search departments..."
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* File Types Tab */}
        {activeTab === "fileTypes" && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">File Types</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Define document classification types</p>
                </div>
                <Button onClick={() => openModal("fileTypes")}>
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add File Type</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {loadingFileTypes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <DataTable 
                  columns={fileTypeColumns} 
                  data={fileTypes} 
                  searchPlaceholder="Search file types..."
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            modalType === "departments"
              ? selectedDepartment ? "Edit Department" : "Create Department"
              : selectedFileType ? "Edit File Type" : "Create File Type"
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                rows={3}
                className="w-full border rounded-lg p-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {modalType === "fileTypes" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department (Optional)
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Department</option>
                  {departments.filter(d => d.isActive).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete"
          size="sm"
        >
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {modalType === "departments" ? selectedDepartment?.name : selectedFileType?.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Toggle Status Confirmation Modal */}
        <Modal
          isOpen={isToggleModalOpen}
          onClose={() => {
            setIsToggleModalOpen(false);
            setSelectedDepartment(null);
            setSelectedFileType(null);
          }}
          title={toggleItem?.isActive ? "Deactivate" : "Activate"}
          size="sm"
        >
          <div className="text-center">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              toggleItem?.isActive ? "bg-orange-100" : "bg-green-100"
            }`}>
              {toggleItem?.isActive ? (
                <PowerOff className="w-6 h-6 text-orange-600" />
              ) : (
                <Power className="w-6 h-6 text-green-600" />
              )}
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {toggleItem?.isActive ? "deactivate" : "activate"}{" "}
              <span className="font-semibold">{toggleItem?.name}</span>?
              {toggleItem?.isActive && (
                <span className="block mt-2 text-sm text-orange-600">
                  This will hide it from selection dropdowns.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsToggleModalOpen(false);
                  setSelectedDepartment(null);
                  setSelectedFileType(null);
                }} 
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                variant={toggleItem?.isActive ? "destructive" : "default"}
                onClick={handleToggleStatus} 
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  toggleItem?.isActive ? "Deactivate" : "Activate"
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}
