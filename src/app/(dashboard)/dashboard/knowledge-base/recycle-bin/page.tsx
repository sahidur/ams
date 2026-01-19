"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  RefreshCw,
  AlertTriangle,
  Loader2,
  FileText,
  Download,
  RotateCcw,
  Trash,
  Calendar,
  User,
  Clock,
  ArrowLeft,
  FileArchive,
  History,
} from "lucide-react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Modal } from "@/components/ui";
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
  
  // Modals
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DeletedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
      setTotalCount(data.pagination?.totalCount || 0);
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
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to load activity logs");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

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
    const colors: Record<string, string> = {
      CREATE: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-orange-100 text-orange-800",
      RESTORE: "bg-purple-100 text-purple-800",
      PERMANENT_DELETE: "bg-red-100 text-red-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  if (isAccessDenied) {
    return (
      <div className="p-6">
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/knowledge-base">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recycle Bin & Logs</h1>
            <p className="text-gray-500 text-sm mt-1">
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
      <div className="flex gap-2 border-b">
        <button
          onClick={() => { setActiveTab("recycle-bin"); setPage(1); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "recycle-bin"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileArchive className="h-4 w-4 inline-block mr-2" />
          Recycle Bin ({totalCount})
        </button>
        <button
          onClick={() => { setActiveTab("logs"); setPage(1); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "logs"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <History className="h-4 w-4 inline-block mr-2" />
          Activity Logs
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
        </div>
      )}

      {/* Recycle Bin Tab */}
      {!isLoading && activeTab === "recycle-bin" && (
        <>
          {deletedFiles.length === 0 ? (
            <Card className="p-12 text-center">
              <Trash2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Recycle Bin is Empty</h3>
              <p className="text-gray-500">No deleted files found.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {deletedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-red-50 rounded-lg">
                            <FileText className="h-6 w-6 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{file.fileName}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                              {file.fileDescription}
                            </p>
                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Deleted: {format(new Date(file.deletedAt), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                              {file.deletedBy && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  By: {file.deletedBy.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {formatFileSize(file.fileSize)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(file);
                              setRestoreModalOpen(true);
                            }}
                            className="text-teal-600 border-teal-300 hover:bg-teal-50"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(file);
                              setDeleteModalOpen(true);
                            }}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Delete Forever
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Logs Tab */}
      {!isLoading && activeTab === "logs" && (
        <>
          {logs.length === 0 ? (
            <Card className="p-12 text-center">
              <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Activity Logs</h3>
              <p className="text-gray-500">No activity has been recorded yet.</p>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                              {log.action.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{log.fileName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{log.user.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
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
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setRestoreModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={isProcessing}>
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
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white"
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
