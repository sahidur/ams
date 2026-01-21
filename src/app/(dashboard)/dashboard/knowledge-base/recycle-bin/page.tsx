"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Trash2,
  RefreshCw,
  AlertTriangle,
  Loader2,
  FileText,
  Download,
  RotateCcw,
  Trash,
  ArrowLeft,
  FileArchive,
  History,
  MoreHorizontal,
  Calendar,
  User,
} from "lucide-react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Modal, DataTable, Badge } from "@/components/ui";
import { format } from "date-fns";

interface DeletedFile {
  id: string;
  fileName: string;
  fileDescription: string;
  fileUrl: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  deletedAt: string;
  createdAt: string;
  department: { id: string; name: string } | null;
  fileType: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string; email: string };
  deletedBy: { id: string; name: string; email: string } | null;
  projects: { id: string; name: string }[];
  cohorts: { id: string; cohortId: string; name: string }[];
}

interface LogEntry {
  id: string;
  action: string;
  knowledgeFileId: string;
  fileName: string;
  details: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

type TabType = "recycle-bin" | "logs";

export default function RecycleBinPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("recycle-bin");
  const [deletedFiles, setDeletedFiles] = useState<DeletedFile[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Action menu
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  
  // Modals
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DeletedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recycleBinCount, setRecycleBinCount] = useState(0);
  const [logsCount, setLogsCount] = useState(0);

  const fetchDeletedFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/knowledge-base/recycle-bin?page=${page}&limit=20`);
      
      if (res.status === 403) {
        setIsAccessDenied(true);
        return;
      }
      
      if (!res.ok) {
        throw new Error("Failed to fetch");
      }
      
      const data = await res.json();
      setDeletedFiles(data.files || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setRecycleBinCount(data.pagination?.totalCount || 0);
    } catch (err) {
      console.error("Error fetching deleted files:", err);
      setError("Failed to load recycle bin");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/knowledge-base/logs?page=${page}&limit=50`);
      
      if (res.status === 403) {
        setIsAccessDenied(true);
        return;
      }
      
      if (!res.ok) {
        throw new Error("Failed to fetch");
      }
      
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setLogsCount(data.pagination?.totalCount || 0);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to load activity logs");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  // Fetch counts for both tabs on mount
  const fetchCounts = useCallback(async () => {
    try {
      const [recycleBinRes, logsRes] = await Promise.all([
        fetch(`/api/knowledge-base/recycle-bin?page=1&limit=1`),
        fetch(`/api/knowledge-base/logs?page=1&limit=1`),
      ]);
      
      if (recycleBinRes.ok) {
        const recycleBinData = await recycleBinRes.json();
        setRecycleBinCount(recycleBinData.pagination?.totalCount || 0);
      }
      
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogsCount(logsData.pagination?.totalCount || 0);
      }
    } catch (err) {
      console.error("Error fetching counts:", err);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    if (activeTab === "recycle-bin") {
      fetchDeletedFiles();
    } else {
      fetchLogs();
    }
  }, [activeTab, fetchDeletedFiles, fetchLogs]);

  const handleRestore = async () => {
    if (!selectedFile) return;
    
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/knowledge-base/${selectedFile.id}`, {
        method: "PATCH",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to restore");
      }
      
      setSuccessMessage(`"${selectedFile.fileName}" has been restored successfully.`);
      setRestoreModalOpen(false);
      setSelectedFile(null);
      fetchDeletedFiles();
      fetchCounts();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error restoring file:", err);
      setError(err instanceof Error ? err.message : "Failed to restore file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedFile) return;
    
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/knowledge-base/${selectedFile.id}?permanent=true`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      
      setSuccessMessage(`"${selectedFile.fileName}" has been permanently deleted.`);
      setDeleteModalOpen(false);
      setSelectedFile(null);
      fetchDeletedFiles();
      fetchCounts();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error deleting file:", err);
      setError(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getActionBadge = (action: string) => {
    const badges: Record<string, { variant: "success" | "info" | "warning" | "danger" | "default"; label: string }> = {
      CREATE: { variant: "success", label: "Created" },
      UPDATE: { variant: "info", label: "Updated" },
      DELETE: { variant: "warning", label: "Deleted" },
      RESTORE: { variant: "info", label: "Restored" },
      PERMANENT_DELETE: { variant: "danger", label: "Permanently Deleted" },
    };
    return badges[action] || { variant: "default", label: action };
  };

  // DataTable columns for recycle bin
  const recycleBinColumns: ColumnDef<DeletedFile>[] = useMemo(() => [
    {
      accessorKey: "fileName",
      header: "File",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">{row.original.fileName}</p>
            <p className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-[300px]">{row.original.fileDescription}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "fileSize",
      header: "Size",
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">{formatFileSize(row.original.fileSize)}</span>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (
        <Badge variant={row.original.department ? "info" : "default"}>
          {row.original.department?.name || "None"}
        </Badge>
      ),
    },
    {
      accessorKey: "deletedAt",
      header: "Deleted",
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="text-gray-900">{format(new Date(row.original.deletedAt), "MMM d, yyyy")}</p>
          <p className="text-xs text-gray-500">{format(new Date(row.original.deletedAt), "h:mm a")}</p>
        </div>
      ),
    },
    {
      accessorKey: "deletedBy",
      header: "Deleted By",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs">
            {row.original.deletedBy?.name?.charAt(0) || "?"}
          </div>
          <span className="text-sm text-gray-600">{row.original.deletedBy?.name || "Unknown"}</span>
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
                    setSelectedFile(row.original);
                    setRestoreModalOpen(true);
                    setActionMenuOpen(null);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-teal-600 hover:bg-teal-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(row.original);
                    setDeleteModalOpen(true);
                    setActionMenuOpen(null);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash className="w-4 h-4" />
                  Delete Forever
                </button>
              </motion.div>
            </>
          )}
        </div>
      ),
    },
  ], [actionMenuOpen]);

  // DataTable columns for activity logs
  const logsColumns: ColumnDef<LogEntry>[] = useMemo(() => [
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const badge = getActionBadge(row.original.action);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      accessorKey: "fileName",
      header: "File Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white">
            <FileText className="w-4 h-4" />
          </div>
          <span className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">{row.original.fileName}</span>
        </div>
      ),
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs">
            {row.original.user.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{row.original.user.name}</p>
            <p className="text-xs text-gray-500">{row.original.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date & Time",
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="text-gray-900">{format(new Date(row.original.createdAt), "MMM d, yyyy")}</p>
          <p className="text-xs text-gray-500">{format(new Date(row.original.createdAt), "h:mm:ss a")}</p>
        </div>
      ),
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => (
        <span className="text-sm text-gray-500 truncate max-w-[150px]">
          {row.original.details || "-"}
        </span>
      ),
    },
  ], []);

  if (isAccessDenied) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              Only Super Administrators can access the Recycle Bin and Activity Logs.
            </p>
            <Link href="/dashboard/knowledge-base">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Knowledge Base
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/knowledge-base">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Recycle Bin & Logs</h1>
            <p className="text-gray-500 text-sm mt-1 hidden sm:block">
              Manage deleted files and view activity history
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700"
          >
            {successMessage}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex justify-between items-center"
          >
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto">
        <button
          onClick={() => { setActiveTab("recycle-bin"); setPage(1); }}
          className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "recycle-bin"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileArchive className="h-4 w-4" />
          <span className="hidden xs:inline">Recycle Bin</span>
          <span className="xs:hidden">Bin</span>
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
            {recycleBinCount}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab("logs"); setPage(1); }}
          className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "logs"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <History className="h-4 w-4" />
          <span className="hidden xs:inline">Activity Logs</span>
          <span className="xs:hidden">Logs</span>
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
            {logsCount}
          </span>
        </button>
      </div>

      {/* Recycle Bin Tab */}
      {activeTab === "recycle-bin" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileArchive className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">Recycle Bin</CardTitle>
                    <p className="text-red-100 text-sm mt-1 hidden sm:block">
                      Deleted files that can be restored or permanently removed
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 w-fit">
                  {recycleBinCount} {recycleBinCount === 1 ? "File" : "Files"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                </div>
              ) : deletedFiles.length === 0 ? (
                <div className="p-12 text-center">
                  <Trash2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Recycle Bin is Empty</h3>
                  <p className="text-gray-500">No deleted files found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable columns={recycleBinColumns} data={deletedFiles} searchKey="fileName" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <History className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">Activity Logs</CardTitle>
                    <p className="text-blue-100 text-sm mt-1 hidden sm:block">
                      Complete history of all knowledge base activities
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 w-fit">
                  {logsCount} {logsCount === 1 ? "Entry" : "Entries"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Activity Logs</h3>
                  <p className="text-gray-500">No activity has been recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable columns={logsColumns} data={logs} searchKey="fileName" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Restore Modal */}
      <Modal
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        title="Restore File"
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-teal-100 rounded-full">
              <RotateCcw className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Restore this file?</h3>
              <p className="text-sm text-gray-500">
                &quot;{selectedFile?.fileName}&quot; will be restored to the Knowledge Base.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setRestoreModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={isProcessing} className="w-full sm:w-auto">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Permanently Delete File"
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Delete this file forever?</h3>
              <p className="text-sm text-gray-500">
                &quot;{selectedFile?.fileName}&quot; will be permanently deleted and cannot be recovered.
              </p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> This action is irreversible. The file will be removed from storage and database.
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Forever
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
