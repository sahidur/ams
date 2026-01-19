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
  Building2,
  FileType2,
  ArrowLeft,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button, Card, Input, Modal, Badge } from "@/components/ui";
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
  const actionMenuRef = useRef<HTMLDivElement>(null);

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

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // Toggle status
  const toggleStatus = async (type: TabType, item: FileDepartment | FileType) => {
    try {
      const id = item.id;
      const url = type === "departments"
        ? `/api/file-departments/${id}`
        : `/api/file-types/${id}`;

      const payload = {
        name: item.name,
        description: item.description,
        sortOrder: (item as FileDepartment | FileType).sortOrder,
        isActive: !item.isActive,
        ...(type === "fileTypes" && { departmentId: (item as FileType).departmentId }),
      };

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (type === "departments") {
          fetchDepartments();
        } else {
          fetchFileTypes();
        }
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
    setActionMenuOpen(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/knowledge-base")}
            className="p-2"
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
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab("departments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "departments"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            File Departments
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
            File Types
          </button>
        </div>

        {/* Departments Tab */}
        {activeTab === "departments" && (
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="font-semibold text-gray-900">File Departments</h2>
                <p className="text-sm text-gray-500">Manage document categories</p>
              </div>
              <Button onClick={() => openModal("departments")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </div>

            {/* Loading */}
            {loadingDepartments && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            )}

            {/* Table */}
            {!loadingDepartments && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">File Types</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Files</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{dept.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {dept.description || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{dept._count.fileTypes}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{dept._count.knowledgeFiles}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={dept.isActive ? "success" : "secondary"}>
                            {dept.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-block" ref={actionMenuOpen === dept.id ? actionMenuRef : null}>
                            <button
                              onClick={() => setActionMenuOpen(actionMenuOpen === dept.id ? null : dept.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <AnimatePresence>
                              {actionMenuOpen === dept.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10"
                                >
                                  <button
                                    onClick={() => openModal("departments", dept)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => toggleStatus("departments", dept)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    {dept.isActive ? (
                                      <>
                                        <ToggleLeft className="w-4 h-4" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <ToggleRight className="w-4 h-4" />
                                        Activate
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal("departments", dept)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {departments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          No departments found. Create your first one!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* File Types Tab */}
        {activeTab === "fileTypes" && (
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
              <div>
                <h2 className="font-semibold text-gray-900">File Types</h2>
                <p className="text-sm text-gray-500">Define document classification types</p>
              </div>
              <Button onClick={() => openModal("fileTypes")}>
                <Plus className="w-4 h-4 mr-2" />
                Add File Type
              </Button>
            </div>

            {/* Loading */}
            {loadingFileTypes && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            )}

            {/* Table */}
            {!loadingFileTypes && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Files</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fileTypes.map((ft) => (
                      <tr key={ft.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{ft.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {ft.description || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          {ft.department ? (
                            <Badge variant="outline">{ft.department.name}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{ft._count.knowledgeFiles}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={ft.isActive ? "success" : "secondary"}>
                            {ft.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-block" ref={actionMenuOpen === ft.id ? actionMenuRef : null}>
                            <button
                              onClick={() => setActionMenuOpen(actionMenuOpen === ft.id ? null : ft.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <AnimatePresence>
                              {actionMenuOpen === ft.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10"
                                >
                                  <button
                                    onClick={() => openModal("fileTypes", ft)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => toggleStatus("fileTypes", ft)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    {ft.isActive ? (
                                      <>
                                        <ToggleLeft className="w-4 h-4" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <ToggleRight className="w-4 h-4" />
                                        Activate
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal("fileTypes", ft)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {fileTypes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          No file types found. Create your first one!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
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
                <AlertTriangle className="w-4 h-4" />
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
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
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Delete {modalType === "departments" ? "Department" : "File Type"}?
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete &quot;{modalType === "departments" ? selectedDepartment?.name : selectedFileType?.name}&quot;? 
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting}
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
      </motion.div>
    </div>
  );
}
