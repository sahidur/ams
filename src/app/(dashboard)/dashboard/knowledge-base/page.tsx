"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Download,
  FileText,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileArchive,
  Eye,
  Calendar,
  Building2,
  FolderOpen,
  User,
  X,
  Grid3X3,
  List,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit,
  AlertTriangle,
} from "lucide-react";
import { Button, Card, Input, Badge, Modal } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  donorName?: string;
}

interface Cohort {
  id: string;
  cohortId: string;
  name: string;
}

interface FileDepartment {
  id: string;
  name: string;
}

interface FileType {
  id: string;
  name: string;
}

interface KnowledgeFile {
  id: string;
  fileName: string;
  fileDescription: string;
  fileUrl: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  department: FileDepartment | null;
  fileType: FileType | null;
  yearFrom: number | null;
  yearTo: number | null;
  donorNames: string[];
  vendorName: string | null;
  uploadedBy: { id: string; name: string; email: string };
  projects: Project[];
  cohorts: Cohort[];
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface UserPermission {
  module: string;
  action: string;
}

// Get file icon based on mime type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return FileSpreadsheet;
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("compressed")) return FileArchive;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Get file type color
function getFileTypeColor(mimeType: string): string {
  if (mimeType.includes("pdf")) return "bg-red-100 text-red-700";
  if (mimeType.startsWith("image/")) return "bg-purple-100 text-purple-700";
  if (mimeType.startsWith("video/")) return "bg-pink-100 text-pink-700";
  if (mimeType.startsWith("audio/")) return "bg-yellow-100 text-yellow-700";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "bg-green-100 text-green-700";
  if (mimeType.includes("word") || mimeType.includes("document")) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

export default function KnowledgeBasePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });
  
  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedFileType, setSelectedFileType] = useState<string>("");
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");
  const [selectedDonor, setSelectedDonor] = useState<string>("");
  const [vendorName, setVendorName] = useState<string>("");
  
  // Dropdown data
  const [projects, setProjects] = useState<Project[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [departments, setDepartments] = useState<FileDepartment[]>([]);
  const [fileTypes, setFileTypes] = useState<FileType[]>([]);
  const [allDonors, setAllDonors] = useState<string[]>([]);
  
  // Preview modal
  const [previewFile, setPreviewFile] = useState<KnowledgeFile | null>(null);
  
  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<KnowledgeFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Action menu
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  
  // Permissions
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const isSuperAdmin = session?.user?.userRoleName === "Super Admin" || 
    (session?.user as { userRole?: { name: string } })?.userRole?.name === "SUPER_ADMIN";
  
  const hasDeletePermission = isSuperAdmin || userPermissions.some(
    p => p.module === "KNOWLEDGE_BASE" && (p.action === "DELETE" || p.action === "ALL")
  );
  
  const hasWritePermission = isSuperAdmin || userPermissions.some(
    p => p.module === "KNOWLEDGE_BASE" && (p.action === "WRITE" || p.action === "ALL")
  );

  // Fetch user permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      if (session?.user?.id) {
        try {
          const res = await fetch("/api/roles/modules?userPermissions=true");
          if (res.ok) {
            const data = await res.json();
            setUserPermissions(data.permissions || []);
          }
        } catch (error) {
          console.error("Error fetching permissions:", error);
        }
      }
    };
    fetchPermissions();
  }, [session?.user?.id]);

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [projectsRes, cohortsRes, departmentsRes, fileTypesRes] = await Promise.all([
          fetch("/api/projects?activeOnly=true"),
          fetch("/api/cohorts?activeOnly=true"),
          fetch("/api/file-departments?activeOnly=true"),
          fetch("/api/file-types?activeOnly=true"),
        ]);

        if (projectsRes.ok) {
          const projectData = await projectsRes.json();
          setProjects(projectData);
          // Extract unique donors from projects
          const donors = [...new Set(projectData.map((p: Project) => p.donorName).filter(Boolean))] as string[];
          setAllDonors(donors);
        }
        if (cohortsRes.ok) setCohorts(await cohortsRes.json());
        if (departmentsRes.ok) setDepartments(await departmentsRes.json());
        if (fileTypesRes.ok) setFileTypes(await fileTypesRes.json());
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };
    fetchDropdownData();
  }, []);

  // Fetch files with filters
  const fetchFiles = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", pagination.limit.toString());
      
      if (search) params.set("search", search);
      if (selectedProjects.length > 0) params.set("projectIds", selectedProjects.join(","));
      if (selectedCohorts.length > 0) params.set("cohortIds", selectedCohorts.join(","));
      if (selectedDepartment) params.set("departmentId", selectedDepartment);
      if (selectedFileType) params.set("fileTypeId", selectedFileType);
      if (yearFrom) params.set("yearFrom", yearFrom);
      if (yearTo) params.set("yearTo", yearTo);
      if (selectedDonor) params.set("donorName", selectedDonor);
      if (vendorName) params.set("vendorName", vendorName);

      const res = await fetch(`/api/knowledge-base?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, selectedProjects, selectedCohorts, selectedDepartment, selectedFileType, yearFrom, yearTo, selectedDonor, vendorName]);

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters
  const applyFilters = () => {
    fetchFiles(1);
    setShowFilters(false);
  };

  // Clear filters
  const clearFilters = () => {
    setSearch("");
    setSelectedProjects([]);
    setSelectedCohorts([]);
    setSelectedDepartment("");
    setSelectedFileType("");
    setYearFrom("");
    setYearTo("");
    setSelectedDonor("");
    setVendorName("");
    fetchFiles(1);
    setShowFilters(false);
  };

  // Download file - using secure URL
  const downloadFile = (file: KnowledgeFile) => {
    // Use the secure file serving API
    const secureUrl = file.fileUrl.includes("/api/files/") 
      ? file.fileUrl 
      : `/api/files/knowledge-base/${file.fileUrl.split("/knowledge-base/").pop()}`;
    
    const link = document.createElement("a");
    link.href = secureUrl;
    link.download = file.originalFileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete file
  const handleDelete = async () => {
    if (!fileToDelete) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge-base/${fileToDelete.id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        fetchFiles(pagination.page);
        setDeleteModalOpen(false);
        setFileToDelete(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (file: KnowledgeFile) => {
    setFileToDelete(file);
    setDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const activeFiltersCount = [
    selectedProjects.length > 0,
    selectedCohorts.length > 0,
    selectedDepartment,
    selectedFileType,
    yearFrom,
    yearTo,
    selectedDonor,
    vendorName,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Knowledge Base
            </h1>
            <p className="text-gray-600 mt-1">
              Browse and download project documents and resources
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {hasWritePermission && (
              <Link href="/dashboard/knowledge-base/create">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  Upload Document
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by file name, description, vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                className="pl-10"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-50">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <Button onClick={applyFilters}>
              Search
            </Button>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Projects Multi-select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Projects</label>
                    <select
                      multiple
                      value={selectedProjects}
                      onChange={(e) => setSelectedProjects(Array.from(e.target.selectedOptions, opt => opt.value))}
                      className="w-full border rounded-lg p-2 text-sm h-24"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cohorts Multi-select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cohorts</label>
                    <select
                      multiple
                      value={selectedCohorts}
                      onChange={(e) => setSelectedCohorts(Array.from(e.target.selectedOptions, opt => opt.value))}
                      className="w-full border rounded-lg p-2 text-sm h-24"
                    >
                      {cohorts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.cohortId})</option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* File Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
                    <select
                      value={selectedFileType}
                      onChange={(e) => setSelectedFileType(e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm"
                    >
                      <option value="">All Types</option>
                      {fileTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year From */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year From</label>
                    <Input
                      type="number"
                      placeholder="e.g., 2020"
                      value={yearFrom}
                      onChange={(e) => setYearFrom(e.target.value)}
                      min="2000"
                      max="2100"
                    />
                  </div>

                  {/* Year To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year To</label>
                    <Input
                      type="number"
                      placeholder="e.g., 2025"
                      value={yearTo}
                      onChange={(e) => setYearTo(e.target.value)}
                      min="2000"
                      max="2100"
                    />
                  </div>

                  {/* Donor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Donor</label>
                    <select
                      value={selectedDonor}
                      onChange={(e) => setSelectedDonor(e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm"
                    >
                      <option value="">All Donors</option>
                      {allDonors.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vendor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <Input
                      placeholder="Vendor name..."
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <Button onClick={applyFilters}>
                    Apply Filters
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Showing {files.length} of {pagination.totalCount} documents
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Empty State */}
        {!loading && files.length === 0 && (
          <Card className="p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500 mb-4">
              {activeFiltersCount > 0
                ? "Try adjusting your filters to find what you're looking for."
                : "Start by uploading your first document."}
            </p>
            {activeFiltersCount > 0 ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : hasWritePermission && (
              <Link href="/dashboard/knowledge-base/create">
                <Button>Upload Document</Button>
              </Link>
            )}
          </Card>
        )}

        {/* Grid View */}
        {!loading && files.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file.mimeType);
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 hover:shadow-lg transition-all duration-300 group h-full flex flex-col relative">
                    {/* Actions Menu */}
                    {(hasWritePermission || hasDeletePermission) && (
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(actionMenuOpen === file.id ? null : file.id);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {actionMenuOpen === file.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                            >
                              {hasDeletePermission && (
                                <button
                                  onClick={() => openDeleteModal(file)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              )}
                            </motion.div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* File Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${getFileTypeColor(file.mimeType)}`}>
                      <FileIcon className="w-6 h-6" />
                    </div>

                    {/* File Name */}
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 flex-grow">
                      {file.fileName}
                    </h3>

                    {/* Metadata */}
                    <div className="space-y-2 text-sm text-gray-500">
                      {file.department && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{file.department.name}</span>
                        </div>
                      )}
                      {file.fileType && (
                        <Badge variant="secondary" className="text-xs">
                          {file.fileType.name}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>{formatDate(file.createdAt)}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatFileSize(file.fileSize)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewFile(file)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadFile(file)}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {!loading && files.length > 0 && viewMode === "list" && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Projects</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Uploaded</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {files.map((file) => {
                    const FileIcon = getFileIcon(file.mimeType);
                    return (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getFileTypeColor(file.mimeType)}`}>
                              <FileIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-[200px]">{file.fileName}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">{file.originalFileName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {file.department?.name || "-"}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {file.fileType ? (
                            <Badge variant="secondary" className="text-xs">
                              {file.fileType.name}
                            </Badge>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden xl:table-cell">
                          {file.projects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {file.projects.slice(0, 2).map((p) => (
                                <Badge key={p.id} variant="outline" className="text-xs">
                                  {p.name}
                                </Badge>
                              ))}
                              {file.projects.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{file.projects.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                          {formatFileSize(file.fileSize)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                          <div>
                            <p>{formatDate(file.createdAt)}</p>
                            <p className="text-xs text-gray-400">{file.uploadedBy.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => downloadFile(file)}
                              className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {hasDeletePermission && (
                              <button
                                onClick={() => openDeleteModal(file)}
                                className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => fetchFiles(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => fetchFiles(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Preview Modal */}
        <Modal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          title="Document Details"
        >
          {previewFile && (
            <div className="space-y-4">
              {/* File Icon and Name */}
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${getFileTypeColor(previewFile.mimeType)}`}>
                  {(() => {
                    const FileIcon = getFileIcon(previewFile.mimeType);
                    return <FileIcon className="w-8 h-8" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900 break-words">{previewFile.fileName}</h3>
                  <p className="text-sm text-gray-500 truncate">{previewFile.originalFileName}</p>
                  <p className="text-sm text-gray-400 mt-1">{formatFileSize(previewFile.fileSize)}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{previewFile.fileDescription}</p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {previewFile.department && (
                  <div>
                    <span className="text-gray-500">Department:</span>
                    <p className="font-medium">{previewFile.department.name}</p>
                  </div>
                )}
                {previewFile.fileType && (
                  <div>
                    <span className="text-gray-500">File Type:</span>
                    <p className="font-medium">{previewFile.fileType.name}</p>
                  </div>
                )}
                {(previewFile.yearFrom || previewFile.yearTo) && (
                  <div>
                    <span className="text-gray-500">Year Range:</span>
                    <p className="font-medium">
                      {previewFile.yearFrom} - {previewFile.yearTo}
                    </p>
                  </div>
                )}
                {previewFile.vendorName && (
                  <div>
                    <span className="text-gray-500">Vendor:</span>
                    <p className="font-medium">{previewFile.vendorName}</p>
                  </div>
                )}
              </div>

              {/* Donors */}
              {previewFile.donorNames.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Donors</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewFile.donorNames.map((donor, i) => (
                      <Badge key={i} variant="secondary">{donor}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {previewFile.projects.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Projects</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewFile.projects.map((p) => (
                      <Badge key={p.id} variant="outline">{p.name}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Cohorts */}
              {previewFile.cohorts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Cohorts</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewFile.cohorts.map((c) => (
                      <Badge key={c.id} variant="outline">{c.name}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploader Info */}
              <div className="pt-4 border-t flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {previewFile.uploadedBy.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{previewFile.uploadedBy.name}</p>
                  <p className="text-sm text-gray-500">Uploaded on {formatDate(previewFile.createdAt)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => downloadFile(previewFile)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPreviewFile(null)}
                  className="flex-1 sm:flex-none"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setFileToDelete(null);
          }}
          title="Delete Document"
          size="sm"
        >
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete
            </p>
            <p className="font-semibold text-gray-900 mb-4">
              &quot;{fileToDelete?.fileName}&quot;?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This file will be moved to the recycle bin and can be restored by an administrator.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setFileToDelete(null);
                }}
                disabled={deleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? (
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
