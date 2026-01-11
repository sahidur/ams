"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Send, 
  Save, 
  FileText, 
  Building,
  Layers,
  MapPin,
  CheckCircle,
  Loader2,
  AlertCircle,
  Upload,
  X
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Input,
  Badge
} from "@/components/ui";

interface FormField {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  placeholder: string | null;
  helpText: string | null;
  isRequired: boolean;
  options: string[];
  validation: string | null;
  defaultValue: string | null;
  sortOrder: number;
  dependsOnField: string | null;
  dependsOnValue: string | null;
}

interface ApprovalTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  defaultSlaHours: number | null;
  formFields: FormField[];
}

interface Project {
  id: string;
  name: string;
  cohorts: { id: string; name: string }[];
}

interface Cohort {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  branchName: string;
  district: string;
  upazila: string;
}

function NewRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");

  const [template, setTemplate] = useState<ApprovalTemplate | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [formData, setFormData] = useState<Record<string, string | boolean | string[]>>({});
  const [attachments, setAttachments] = useState<string[]>([]);

  // Fetch template and projects on mount
  useEffect(() => {
    if (!templateId) {
      router.push("/dashboard/approvals");
      return;
    }
    fetchTemplate();
    fetchProjects();
  }, [templateId]);

  // Fetch cohorts when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find((p) => p.id === selectedProjectId);
      setCohorts(project?.cohorts || []);
      setSelectedCohortId("");
      setSelectedBranchId("");
      setBranches([]);
    }
  }, [selectedProjectId, projects]);

  // Fetch branches when cohort changes
  useEffect(() => {
    if (selectedCohortId) {
      fetchBranches(selectedCohortId);
    }
  }, [selectedCohortId]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/approval-templates/${templateId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
        
        // Initialize form data with default values
        const initialData: Record<string, string> = {};
        data.formFields?.forEach((field: FormField) => {
          if (field.defaultValue) {
            initialData[field.fieldName] = field.defaultValue;
          }
        });
        setFormData(initialData);
      } else {
        router.push("/dashboard/approvals");
      }
    } catch (error) {
      console.error("Error fetching template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      // Fetch user's assigned projects
      const res = await fetch("/api/users/my-projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchBranches = async (cohortId: string) => {
    try {
      const res = await fetch(`/api/branches?cohortId=${cohortId}`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const handleFieldChange = (fieldName: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const validateForm = (): boolean => {
    if (!template) return false;

    for (const field of template.formFields) {
      if (field.isRequired && !formData[field.fieldName]) {
        setMessage({ type: "error", text: `${field.fieldLabel} is required` });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (asDraft = false) => {
    if (!asDraft && !validateForm()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/approval-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          projectId: selectedProjectId || null,
          cohortId: selectedCohortId || null,
          branchId: selectedBranchId || null,
          formData,
          attachments,
          submitNow: !asDraft,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({
          type: "success",
          text: asDraft ? "Draft saved successfully" : "Request submitted successfully",
        });
        setTimeout(() => {
          router.push("/dashboard/approvals");
        }, 1500);
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to submit request" });
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      setMessage({ type: "error", text: "Failed to submit request" });
    } finally {
      setIsSaving(false);
    }
  };

  const isFieldVisible = (field: FormField): boolean => {
    if (!field.dependsOnField) return true;
    return formData[field.dependsOnField] === field.dependsOnValue;
  };

  const renderField = (field: FormField) => {
    if (!isFieldVisible(field)) return null;

    switch (field.fieldType) {
      case "text":
      case "email":
      case "phone":
        return (
          <Input
            type={field.fieldType === "email" ? "email" : field.fieldType === "phone" ? "tel" : "text"}
            placeholder={field.placeholder || ""}
            value={(formData[field.fieldName] as string) || ""}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder || ""}
            value={(formData[field.fieldName] as string) || ""}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={(formData[field.fieldName] as string) || ""}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          />
        );

      case "textarea":
        return (
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={4}
            placeholder={field.placeholder || ""}
            value={(formData[field.fieldName] as string) || ""}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          />
        );

      case "select":
        return (
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={(formData[field.fieldName] as string) || ""}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          >
            <option value="">Select {field.fieldLabel}...</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.fieldName}
                  value={option}
                  checked={formData[field.fieldName] === option}
                  onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
                  className="w-4 h-4 text-indigo-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        if (field.options.length > 0) {
          return (
            <div className="space-y-2">
              {field.options.map((option) => (
                <label key={option} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={((formData[field.fieldName] as string[]) || []).includes(option)}
                    onChange={(e) => {
                      const current = (formData[field.fieldName] as string[]) || [];
                      const updated = e.target.checked
                        ? [...current, option]
                        : current.filter((v) => v !== option);
                      handleFieldChange(field.fieldName, updated);
                    }}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          );
        }
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!formData[field.fieldName]}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span>{field.fieldLabel}</span>
          </label>
        );

      case "file":
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Click to upload or drag and drop
            </p>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                // Handle file upload - would need actual upload implementation
                const file = e.target.files?.[0];
                if (file) {
                  handleFieldChange(field.fieldName, file.name);
                }
              }}
            />
          </div>
        );

      default:
        return (
          <Input
            placeholder={field.placeholder || ""}
            value={(formData[field.fieldName] as string) || ""}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Template not found</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard/approvals")}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Request</h1>
          <p className="text-gray-500">{template.displayName}</p>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </motion.div>
      )}

      {/* Context Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="w-4 h-4" />
            Request Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">Select Project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cohort
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
                disabled={!selectedProjectId}
              >
                <option value="">Select Cohort...</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={!selectedCohortId}
              >
                <option value="">Select Branch...</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branchName} ({branch.district})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Request Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {template.formFields.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No form fields configured for this application type
            </p>
          ) : (
            template.formFields.map((field) => {
              if (!isFieldVisible(field)) return null;

              return (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.fieldLabel}
                    {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                  {field.helpText && (
                    <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Submit Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(true)}
          isLoading={isSaving}
        >
          <Save className="w-4 h-4 mr-2" />
          Save as Draft
        </Button>
        <Button onClick={() => handleSubmit(false)} isLoading={isSaving}>
          <Send className="w-4 h-4 mr-2" />
          Submit Request
        </Button>
      </div>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <NewRequestContent />
    </Suspense>
  );
}
