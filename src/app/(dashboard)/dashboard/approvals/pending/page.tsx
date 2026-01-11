"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  FileText,
  User,
  Calendar,
  Building,
  Layers,
  ChevronRight,
  Loader2,
  AlertCircle,
  MessageSquare,
  Send
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

// Dynamic imports to avoid SSR issues
const PDFGenerator = dynamic(
  () => import("@/components/pdf-generator").then((mod) => mod.PDFGenerator),
  { ssr: false }
);

const ApprovalHistoryTimeline = dynamic(
  () => import("@/components/approval-history-timeline").then((mod) => mod.ApprovalHistoryTimeline),
  { ssr: false }
);

interface ApprovalAction {
  id: string;
  actionType: string;
  level: number;
  levelName?: string;
  comment: string | null;
  createdAt: string;
  actor: {
    name: string;
    email?: string;
    profileImage?: string | null;
  };
}

interface ApprovalRequest {
  id: string;
  requestNumber: string;
  status: string;
  currentLevel: number;
  totalLevels: number;
  submittedAt: string | null;
  slaDeadline: string | null;
  isOverdue: boolean;
  createdAt: string;
  formData: Record<string, unknown>;
  template: {
    id: string;
    name: string;
    displayName: string;
    icon: string | null;
    color: string | null;
    bodyTemplate?: string | null;
    formFields?: {
      fieldName: string;
      fieldLabel: string;
      fieldType: string;
    }[];
  };
  requester: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
  project: { id: string; name: string } | null;
  cohort: { id: string; name: string } | null;
  branch: { id: string; branchName: string; district: string } | null;
  actions?: ApprovalAction[];
  canApprove?: boolean;
}

export default function PendingApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"APPROVE" | "DECLINE" | "SEND_BACK" | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Fetch pending requests
  useEffect(() => {
    fetchPendingRequests();
  }, [pagination.page]);

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        view: "pending",
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

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

  const viewRequestDetails = async (request: ApprovalRequest) => {
    try {
      const res = await fetch(`/api/approval-requests/${request.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data);
        setShowActionModal(true);
      }
    } catch (error) {
      console.error("Error fetching request details:", error);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    if ((actionType === "DECLINE" || actionType === "SEND_BACK") && !actionComment) {
      setMessage({ type: "error", text: "Comment is required for this action" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/approval-requests/${selectedRequest.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          comment: actionComment,
        }),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: `Request ${actionType.toLowerCase().replace("_", " ")} successfully`,
        });
        setShowActionModal(false);
        setSelectedRequest(null);
        setActionType(null);
        setActionComment("");
        fetchPendingRequests();
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to process action" });
      }
    } catch (error) {
      console.error("Error processing action:", error);
      setMessage({ type: "error", text: "Failed to process action" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.template.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requester.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  const getTimeRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const due = new Date(deadline);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return { text: "Overdue", isOverdue: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return { text: `${days}d ${hours % 24}h remaining`, isOverdue: false };
    }
    
    return { text: `${hours}h ${minutes}m remaining`, isOverdue: hours < 4 };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-500 mt-1">
          Review and act on approval requests assigned to you
        </p>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by request #, type, or requester..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pending Requests */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending approvals</p>
            <p className="text-sm text-gray-400 mt-1">
              You&apos;re all caught up!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const slaInfo = getTimeRemaining(request.slaDeadline);

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    request.isOverdue || slaInfo?.isOverdue
                      ? "border-l-4 border-l-red-500"
                      : ""
                  }`}
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
                              <User className="w-3 h-3" />
                              {request.requester.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(request.submittedAt)}
                            </span>
                            {request.project && (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {request.project.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {slaInfo && (
                          <Badge
                            className={
                              slaInfo.isOverdue
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {slaInfo.text}
                          </Badge>
                        )}

                        <div className="text-right">
                          <p className="text-xs text-gray-500">Approval Level</p>
                          <p className="text-sm font-medium">
                            {request.currentLevel} of {request.totalLevels}
                          </p>
                        </div>

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

      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setSelectedRequest(null);
          setActionType(null);
          setActionComment("");
        }}
        title={`Review Request #${selectedRequest?.requestNumber}`}
        size="full"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Request Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: `${selectedRequest.template.color || "#4F46E5"}20`,
                  }}
                >
                  <FileText
                    className="w-6 h-6"
                    style={{ color: selectedRequest.template.color || "#4F46E5" }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedRequest.template.displayName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Submitted by {selectedRequest.requester.name}
                  </p>
                </div>
              </div>
              <Badge className="bg-yellow-100 text-yellow-700">
                Level {selectedRequest.currentLevel} of {selectedRequest.totalLevels}
              </Badge>
            </div>

            {/* Request Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedRequest.project && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Project</p>
                  <p className="font-medium">{selectedRequest.project.name}</p>
                </div>
              )}
              {selectedRequest.cohort && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Cohort</p>
                  <p className="font-medium">{selectedRequest.cohort.name}</p>
                </div>
              )}
              {selectedRequest.branch && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Branch</p>
                  <p className="font-medium">
                    {selectedRequest.branch.branchName}, {selectedRequest.branch.district}
                  </p>
                </div>
              )}
            </div>

            {/* Form Data */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Request Details</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {Object.entries(selectedRequest.formData || {}).map(([key, value]) => {
                  const field = selectedRequest.template.formFields?.find(
                    (f) => f.fieldName === key
                  );
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500">
                        {field?.fieldLabel || key.replace(/_/g, " ")}:
                      </span>
                      <span className="font-medium text-gray-900">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PDF Document Section */}
            {selectedRequest.template.bodyTemplate && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Generated Document</h4>
                <PDFGenerator
                  bodyTemplate={selectedRequest.template.bodyTemplate}
                  formData={selectedRequest.formData}
                  requestNumber={selectedRequest.requestNumber}
                  templateName={selectedRequest.template.displayName}
                  requesterName={selectedRequest.requester.name}
                  submittedAt={selectedRequest.submittedAt}
                  status={selectedRequest.status}
                />
              </div>
            )}

            {/* Approval History Timeline */}
            {selectedRequest.actions && selectedRequest.actions.length > 0 && (
              <ApprovalHistoryTimeline
                actions={selectedRequest.actions}
                currentLevel={selectedRequest.currentLevel}
                totalLevels={selectedRequest.totalLevels}
                currentStatus={selectedRequest.status}
              />
            )}

            {/* Action Buttons */}
            {selectedRequest.canApprove && !actionType && (
              <div className="flex justify-center gap-4 pt-4 border-t">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setActionType("APPROVE")}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Approve
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={() => setActionType("SEND_BACK")}
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Send Back
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                  onClick={() => setActionType("DECLINE")}
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Decline
                </Button>
              </div>
            )}

            {/* Comment Box for Action */}
            {actionType && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border-2 rounded-lg"
                style={{
                  borderColor:
                    actionType === "APPROVE"
                      ? "#22C55E"
                      : actionType === "DECLINE"
                      ? "#EF4444"
                      : "#F97316",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  {actionType === "APPROVE" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : actionType === "DECLINE" ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <RotateCcw className="w-5 h-5 text-orange-600" />
                  )}
                  <span className="font-medium capitalize">
                    {actionType.toLowerCase().replace("_", " ")} Request
                  </span>
                </div>

                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder={
                    actionType === "APPROVE"
                      ? "Add a comment (optional)..."
                      : "Please provide a reason (required)..."
                  }
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                />

                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActionType(null);
                      setActionComment("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAction}
                    isLoading={isSubmitting}
                    className={
                      actionType === "APPROVE"
                        ? "bg-green-600 hover:bg-green-700"
                        : actionType === "DECLINE"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-orange-600 hover:bg-orange-700"
                    }
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Confirm {actionType.replace("_", " ")}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
