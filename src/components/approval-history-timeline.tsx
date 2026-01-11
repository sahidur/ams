"use client";

import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  FileText, 
  Send,
  Clock,
  User,
  MessageSquare
} from "lucide-react";

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

interface ApprovalHistoryTimelineProps {
  actions: ApprovalAction[];
  currentLevel: number;
  totalLevels: number;
  currentStatus: string;
  className?: string;
}

const actionConfig: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  label: string;
}> = {
  SUBMIT: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
    icon: Send,
    label: "Submitted",
  },
  APPROVE: {
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
    icon: CheckCircle2,
    label: "Approved",
  },
  DECLINE: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
    icon: XCircle,
    label: "Declined",
  },
  SEND_BACK: {
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-200",
    icon: RotateCcw,
    label: "Sent Back",
  },
  RESUBMIT: {
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-200",
    icon: Send,
    label: "Resubmitted",
  },
  CANCEL: {
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
    icon: XCircle,
    label: "Cancelled",
  },
};

const statusBadgeStyles: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse",
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
  SENT_BACK: "bg-orange-100 text-orange-700 border-orange-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

export function ApprovalHistoryTimeline({
  actions,
  currentLevel,
  totalLevels,
  currentStatus,
  className = "",
}: ApprovalHistoryTimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Status Banner */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Approval History</h3>
        <div
          className={`px-4 py-2 rounded-full border-2 font-semibold text-sm ${
            statusBadgeStyles[currentStatus] || statusBadgeStyles.DRAFT
          }`}
        >
          {currentStatus === "PENDING" && (
            <span className="inline-flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Awaiting Approval (Level {currentLevel}/{totalLevels})
            </span>
          )}
          {currentStatus === "APPROVED" && (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Fully Approved
            </span>
          )}
          {currentStatus === "DECLINED" && (
            <span className="inline-flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Request Declined
            </span>
          )}
          {currentStatus === "SENT_BACK" && (
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Returned for Revision
            </span>
          )}
          {currentStatus === "DRAFT" && (
            <span className="inline-flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Draft
            </span>
          )}
          {currentStatus === "CANCELLED" && (
            <span className="inline-flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Cancelled
            </span>
          )}
        </div>
      </div>

      {/* Timeline */}
      {actions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-gray-200 to-transparent" />

          {/* Timeline Items */}
          <div className="space-y-4">
            {actions.map((action, index) => {
              const config = actionConfig[action.actionType] || actionConfig.SUBMIT;
              const Icon = config.icon;
              const { date, time } = formatDate(action.createdAt);
              const isLatest = index === 0;

              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex gap-4"
                >
                  {/* Icon */}
                  <div
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                      isLatest
                        ? `${config.bgColor} ${config.borderColor} shadow-lg ring-2 ring-offset-2 ring-${config.color.replace("text-", "")}`
                        : `${config.bgColor} border-white`
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div
                    className={`flex-1 pb-4 ${
                      isLatest ? "opacity-100" : "opacity-80"
                    }`}
                  >
                    <div
                      className={`bg-white rounded-lg border p-4 ${
                        isLatest
                          ? `border-2 ${config.borderColor} shadow-sm`
                          : "border-gray-200"
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.bgColor} ${config.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </div>
                          {action.level > 0 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              Level {action.level}
                              {action.levelName && ` - ${action.levelName}`}
                            </span>
                          )}
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div className="font-medium">{date}</div>
                          <div>{time}</div>
                        </div>
                      </div>

                      {/* Actor */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          {action.actor.profileImage ? (
                            <img
                              src={action.actor.profileImage}
                              alt={action.actor.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">
                          {action.actor.name}
                        </span>
                        {action.actor.email && (
                          <span className="text-xs text-gray-400">
                            ({action.actor.email})
                          </span>
                        )}
                      </div>

                      {/* Comment */}
                      {action.comment && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {action.comment}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Indicator for Pending */}
      {currentStatus === "PENDING" && totalLevels > 0 && (
        <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-700">
              Approval Progress
            </span>
            <span className="text-sm text-indigo-600">
              {currentLevel - 1} of {totalLevels} approved
            </span>
          </div>
          <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentLevel - 1) / totalLevels) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {Array.from({ length: totalLevels }).map((_, i) => (
              <div
                key={i}
                className={`flex flex-col items-center ${
                  i + 1 < currentLevel
                    ? "text-green-600"
                    : i + 1 === currentLevel
                    ? "text-indigo-600"
                    : "text-gray-400"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i + 1 < currentLevel
                      ? "bg-green-100"
                      : i + 1 === currentLevel
                      ? "bg-indigo-100 ring-2 ring-indigo-300"
                      : "bg-gray-100"
                  }`}
                >
                  {i + 1 < currentLevel ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="text-xs mt-1">L{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalHistoryTimeline;
