"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  FileText, 
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  Eye,
  ChevronRight,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  Building,
  Layers
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Input,
  Badge,
  Modal
} from "@/components/ui";

interface ApprovalRequest {
  id: string;
  requestNumber: string;
  status: string;
  currentLevel: number;
  totalLevels: number;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  formData: Record<string, unknown>;
  template: {
    id: string;
    name: string;
    displayName: string;
    icon: string | null;
    color: string | null;
  };
  requester: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
  currentApprover: {
    id: string;
    name: string;
    email: string;
  } | null;
  project: { id: string; name: string } | null;
  cohort: { id: string; name: string } | null;
  branch: { id: string; branchName: string; district: string } | null;
  _count: { actions: number };
}

interface ApprovalTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType }> = {
  DRAFT: { color: "text-gray-600", bgColor: "bg-gray-100", icon: FileText },
  PENDING: { color: "text-yellow-600", bgColor: "bg-yellow-100", icon: Clock },
  APPROVED: { color: "text-green-600", bgColor: "bg-green-100", icon: CheckCircle2 },
  DECLINED: { color: "text-red-600", bgColor: "bg-red-100", icon: XCircle },
  SENT_BACK: { color: "text-orange-600", bgColor: "bg-orange-100", icon: RotateCcw },
  CANCELLED: { color: "text-gray-500", bgColor: "bg-gray-100", icon: XCircle },
};

export default function MyRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [templates, setTemplates] = useState<ApprovalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Fetch requests
  useEffect(() => {
    fetchRequests();
    fetchTemplates();
  }, [statusFilter, pagination.page]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        view: "my",
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/approval-requests?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/approval-templates?active=true");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const viewRequestDetails = async (request: ApprovalRequest) => {
    try {
      const res = await fetch(`/api/approval-requests/${request.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error("Error fetching request details:", error);
    }
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.template.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-gray-500 mt-1">
            View and manage your approval requests
          </p>
        </div>
        <Button onClick={() => setShowNewRequestModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="px-4 py-2 border rounded-lg bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
          <option value="SENT_BACK">Sent Back</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No requests found</p>
            <Button
              className="mt-4"
              onClick={() => setShowNewRequestModal(true)}
            >
              Create New Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const status = statusConfig[request.status] || statusConfig.DRAFT;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => viewRequestDetails(request)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${request.template.color || "#4F46E5"}20`,
                          }}
                        >
                          <FileText
                            className="w-6 h-6"
                            style={{ color: request.template.color || "#4F46E5" }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {request.template.displayName}
                            </h3>
                            <span className="text-sm text-gray-500">
                              #{request.requestNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(request.submittedAt || request.createdAt)}
                            </span>
                            {request.project && (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {request.project.name}
                              </span>
                            )}
                            {request.branch && (
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {request.branch.branchName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {request.status === "PENDING" && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Current Approver</p>
                            <p className="text-sm font-medium">
                              {request.currentApprover?.name || "—"}
                            </p>
                            <p className="text-xs text-gray-400">
                              Level {request.currentLevel}/{request.totalLevels}
                            </p>
                          </div>
                        )}

                        <Badge className={`${status.bgColor} ${status.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {request.status.replace("_", " ")}
                        </Badge>

                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* New Request Modal - Template Selection */}
      <Modal
        isOpen={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
        title="Select Application Type"
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((template) => (
            <motion.div
              key={template.id}
              whileHover={{ scale: 1.02 }}
              className="p-4 border-2 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all"
              onClick={() => {
                setShowNewRequestModal(false);
                router.push(`/dashboard/approvals/new?templateId=${template.id}`);
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${template.color || "#4F46E5"}20` }}
                >
                  <FileText
                    className="w-5 h-5"
                    style={{ color: template.color || "#4F46E5" }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{template.displayName}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-500 line-clamp-1">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No application types available
            </div>
          )}
        </div>
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Request #${selectedRequest?.requestNumber}`}
        size="full"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div
              className={`p-4 rounded-lg flex items-center justify-between ${
                statusConfig[selectedRequest.status]?.bgColor || "bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-3">
                {(() => {
                  const StatusIcon = statusConfig[selectedRequest.status]?.icon || FileText;
                  return (
                    <StatusIcon
                      className={`w-6 h-6 ${statusConfig[selectedRequest.status]?.color}`}
                    />
                  );
                })()}
                <div>
                  <p
                    className={`font-semibold ${statusConfig[selectedRequest.status]?.color}`}
                  >
                    {selectedRequest.status.replace("_", " ")}
                  </p>
                  {selectedRequest.status === "PENDING" && selectedRequest.currentApprover && (
                    <p className="text-sm text-gray-600">
                      Waiting for {selectedRequest.currentApprover.name} (Level{" "}
                      {selectedRequest.currentLevel}/{selectedRequest.totalLevels})
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Submitted: {formatDate(selectedRequest.submittedAt)}</p>
                {selectedRequest.completedAt && (
                  <p>Completed: {formatDate(selectedRequest.completedAt)}</p>
                )}
              </div>
            </div>

            {/* Request Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Request Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium">
                      {selectedRequest.template.displayName}
                    </span>
                  </div>
                  {selectedRequest.project && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Project:</span>
                      <span className="font-medium">{selectedRequest.project.name}</span>
                    </div>
                  )}
                  {selectedRequest.cohort && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cohort:</span>
                      <span className="font-medium">{selectedRequest.cohort.name}</span>
                    </div>
                  )}
                  {selectedRequest.branch && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Branch:</span>
                      <span className="font-medium">
                        {selectedRequest.branch.branchName}, {selectedRequest.branch.district}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Form Data</h3>
                <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg max-h-60 overflow-auto">
                  {Object.entries(selectedRequest.formData || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500 capitalize">
                        {key.replace(/_/g, " ")}:
                      </span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action History */}
            {(selectedRequest as ApprovalRequest & { actions?: { id: string; actionType: string; level: number; comment: string | null; createdAt: string; actor: { name: string } }[] }).actions && (selectedRequest as ApprovalRequest & { actions?: { id: string; actionType: string; level: number; comment: string | null; createdAt: string; actor: { name: string } }[] }).actions!.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Activity Timeline</h3>
                <div className="space-y-4">
                  {(selectedRequest as ApprovalRequest & { actions: { id: string; actionType: string; level: number; comment: string | null; createdAt: string; actor: { name: string } }[] }).actions.map((action, index) => (
                    <div key={action.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            action.actionType === "APPROVE"
                              ? "bg-green-100"
                              : action.actionType === "DECLINE"
                              ? "bg-red-100"
                              : action.actionType === "SEND_BACK"
                              ? "bg-orange-100"
                              : "bg-blue-100"
                          }`}
                        >
                          {action.actionType === "APPROVE" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : action.actionType === "DECLINE" ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : action.actionType === "SEND_BACK" ? (
                            <RotateCcw className="w-4 h-4 text-orange-600" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        {index < (selectedRequest as ApprovalRequest & { actions: { id: string }[] }).actions.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">
                            {action.actor.name}{" "}
                            <span className="font-normal text-gray-500">
                              {action.actionType.toLowerCase().replace("_", " ")}
                            </span>
                          </p>
                          <span className="text-xs text-gray-400">
                            {formatDate(action.createdAt)}
                          </span>
                        </div>
                        {action.level > 0 && (
                          <p className="text-xs text-gray-500">Level {action.level}</p>
                        )}
                        {action.comment && (
                          <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                            {action.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions for Sent Back requests */}
            {selectedRequest.status === "SENT_BACK" && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailModal(false);
                    router.push(`/dashboard/approvals/edit/${selectedRequest.id}`);
                  }}
                >
                  Edit & Resubmit
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
