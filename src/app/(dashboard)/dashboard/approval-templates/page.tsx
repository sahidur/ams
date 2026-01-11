"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Layers, 
  Settings,
  ChevronRight,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Copy,
  ToggleLeft,
  ToggleRight,
  Clock,
  Users,
  Loader2
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

interface ApprovalTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  defaultSlaHours: number | null;
  createdAt: string;
  _count: {
    requests: number;
    levels: number;
    formFields: number;
  };
}

interface FormField {
  id?: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  options: string[];
  validation?: string;
  defaultValue?: string;
  sortOrder: number;
  dependsOnField?: string;
  dependsOnValue?: string;
}

interface ApprovalLevel {
  id?: string;
  levelNumber: number;
  levelName: string;
  slaHours?: number;
  approvers: {
    userId?: string;
    userRoleId?: string;
    isRequesterSupervisor: boolean;
  }[];
}

const fieldTypes = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file", label: "File Upload" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
];

const iconOptions = [
  "FileText", "Briefcase", "Calendar", "Clock", "Users", "DollarSign", 
  "Package", "Truck", "ShoppingCart", "CreditCard", "Building", "Home"
];

const colorOptions = [
  "#4F46E5", "#7C3AED", "#EC4899", "#EF4444", "#F97316", 
  "#EAB308", "#22C55E", "#14B8A6", "#0EA5E9", "#6366F1"
];

export default function ApprovalTemplatesPage() {
  const [templates, setTemplates] = useState<ApprovalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [showLevelsModal, setShowLevelsModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ApprovalTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    icon: "FileText",
    color: "#4F46E5",
    defaultSlaHours: 24,
  });
  
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [levels, setLevels] = useState<ApprovalLevel[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; displayName: string }[]>([]);

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/approval-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?approvalStatus=APPROVED&isActive=true");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles?active=true");
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.displayName) {
      setMessage({ type: "error", text: "Name and display name are required" });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/approval-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          formFields,
          levels,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Template created successfully" });
        fetchTemplates();
        resetForm();
        setShowCreateModal(false);
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to create template" });
      }
    } catch (error) {
      console.error("Error creating template:", error);
      setMessage({ type: "error", text: "Failed to create template" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/approval-templates/${selectedTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Template updated successfully" });
        fetchTemplates();
        setShowCreateModal(false);
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to update template" });
      }
    } catch (error) {
      console.error("Error updating template:", error);
      setMessage({ type: "error", text: "Failed to update template" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFields = async () => {
    if (!selectedTemplate) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/approval-templates/${selectedTemplate.id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formFields }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Form fields saved successfully" });
        fetchTemplates();
        setShowFieldsModal(false);
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to save fields" });
      }
    } catch (error) {
      console.error("Error saving fields:", error);
      setMessage({ type: "error", text: "Failed to save fields" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLevels = async () => {
    if (!selectedTemplate) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/approval-templates/${selectedTemplate.id}/levels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levels }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Approval levels saved successfully" });
        fetchTemplates();
        setShowLevelsModal(false);
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to save levels" });
      }
    } catch (error) {
      console.error("Error saving levels:", error);
      setMessage({ type: "error", text: "Failed to save levels" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (template: ApprovalTemplate) => {
    try {
      const res = await fetch(`/api/approval-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });

      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error toggling template:", error);
    }
  };

  const handleDeleteTemplate = async (template: ApprovalTemplate) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`/api/approval-templates/${template.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Template deleted" });
        fetchTemplates();
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to delete template" });
      }
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const openEditModal = (template: ApprovalTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      displayName: template.displayName,
      description: template.description || "",
      icon: template.icon || "FileText",
      color: template.color || "#4F46E5",
      defaultSlaHours: template.defaultSlaHours || 24,
    });
    setShowCreateModal(true);
  };

  const openFieldsModal = async (template: ApprovalTemplate) => {
    setSelectedTemplate(template);
    try {
      const res = await fetch(`/api/approval-templates/${template.id}/fields`);
      if (res.ok) {
        const fields = await res.json();
        setFormFields(fields);
      }
    } catch (error) {
      console.error("Error fetching fields:", error);
    }
    setShowFieldsModal(true);
  };

  const openLevelsModal = async (template: ApprovalTemplate) => {
    setSelectedTemplate(template);
    try {
      const res = await fetch(`/api/approval-templates/${template.id}/levels`);
      if (res.ok) {
        const levelData = await res.json();
        setLevels(levelData.map((l: ApprovalLevel & { approvers: { userId?: string; userRoleId?: string; isRequesterSupervisor: boolean }[] }) => ({
          levelNumber: l.levelNumber,
          levelName: l.levelName,
          slaHours: l.slaHours,
          approvers: l.approvers || [],
        })));
      }
    } catch (error) {
      console.error("Error fetching levels:", error);
    }
    setShowLevelsModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      icon: "FileText",
      color: "#4F46E5",
      defaultSlaHours: 24,
    });
    setFormFields([]);
    setLevels([]);
    setSelectedTemplate(null);
  };

  const addFormField = () => {
    setFormFields([
      ...formFields,
      {
        fieldName: `field_${formFields.length + 1}`,
        fieldLabel: `Field ${formFields.length + 1}`,
        fieldType: "text",
        isRequired: false,
        options: [],
        sortOrder: formFields.length,
      },
    ]);
  };

  const removeFormField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const updateFormField = (index: number, updates: Partial<FormField>) => {
    setFormFields(
      formFields.map((field, i) => (i === index ? { ...field, ...updates } : field))
    );
  };

  const addLevel = () => {
    setLevels([
      ...levels,
      {
        levelNumber: levels.length + 1,
        levelName: `Level ${levels.length + 1}`,
        approvers: [],
      },
    ]);
  };

  const removeLevel = (index: number) => {
    setLevels(
      levels
        .filter((_, i) => i !== index)
        .map((l, i) => ({ ...l, levelNumber: i + 1 }))
    );
  };

  const updateLevel = (index: number, updates: Partial<ApprovalLevel>) => {
    setLevels(levels.map((level, i) => (i === index ? { ...level, ...updates } : level)));
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Types</h1>
          <p className="text-gray-500 mt-1">
            Manage approval templates and their workflows
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Application Type
        </Button>
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
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No application types found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowCreateModal(true)}
            >
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`hover:shadow-lg transition-shadow ${!template.isActive ? "opacity-60" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${template.color}20` }}
                      >
                        <FileText
                          className="w-5 h-5"
                          style={{ color: template.color || "#4F46E5" }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.displayName}</CardTitle>
                        <p className="text-xs text-gray-500">{template.name}</p>
                      </div>
                    </div>
                    <Badge variant={template.isActive ? "success" : "default"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{template._count.formFields} fields</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      <span>{template._count.levels} levels</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{template._count.requests} requests</span>
                    </div>
                  </div>

                  {template.defaultSlaHours && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
                      <Clock className="w-4 h-4" />
                      <span>SLA: {template.defaultSlaHours}h</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditModal(template)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openFieldsModal(template)}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openLevelsModal(template)}
                    >
                      <Layers className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(template)}
                    >
                      {template.isActive ? (
                        <ToggleRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={selectedTemplate ? "Edit Application Type" : "New Application Type"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Name *
              </label>
              <Input
                placeholder="e.g., leave_request"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, "_") })
                }
                disabled={!!selectedTemplate}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name *
              </label>
              <Input
                placeholder="e.g., Leave Request"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              placeholder="Describe this application type..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-lg border-2 ${
                      formData.color === color ? "border-gray-800" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default SLA (hours)
              </label>
              <Input
                type="number"
                min="1"
                value={formData.defaultSlaHours}
                onChange={(e) =>
                  setFormData({ ...formData, defaultSlaHours: parseInt(e.target.value) || 24 })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}
              isLoading={isSaving}
            >
              {selectedTemplate ? "Update" : "Create"} Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Form Fields Modal */}
      <Modal
        isOpen={showFieldsModal}
        onClose={() => setShowFieldsModal(false)}
        title={`Form Fields - ${selectedTemplate?.displayName}`}
        size="full"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Design the form that users will fill when submitting this request
            </p>
            <Button onClick={addFormField} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Field
            </Button>
          </div>

          {formFields.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No fields added yet</p>
              <Button className="mt-4" onClick={addFormField}>
                Add First Field
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {formFields.map((field, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-white flex flex-col md:flex-row gap-4"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input
                      placeholder="Field Name"
                      value={field.fieldName}
                      onChange={(e) =>
                        updateFormField(index, {
                          fieldName: e.target.value.toLowerCase().replace(/\s/g, "_"),
                        })
                      }
                    />
                    <Input
                      placeholder="Label"
                      value={field.fieldLabel}
                      onChange={(e) => updateFormField(index, { fieldLabel: e.target.value })}
                    />
                    <select
                      className="px-3 py-2 border rounded-lg"
                      value={field.fieldType}
                      onChange={(e) => updateFormField(index, { fieldType: e.target.value })}
                    >
                      {fieldTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.isRequired}
                          onChange={(e) =>
                            updateFormField(index, { isRequired: e.target.checked })
                          }
                          className="rounded"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  {["select", "radio", "checkbox"].includes(field.fieldType) && (
                    <div className="flex-1">
                      <Input
                        placeholder="Options (comma separated)"
                        value={field.options.join(", ")}
                        onChange={(e) =>
                          updateFormField(index, {
                            options: e.target.value.split(",").map((o) => o.trim()),
                          })
                        }
                      />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFormField(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowFieldsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFields} isLoading={isSaving}>
              Save Fields
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approval Levels Modal */}
      <Modal
        isOpen={showLevelsModal}
        onClose={() => setShowLevelsModal(false)}
        title={`Approval Levels - ${selectedTemplate?.displayName}`}
        size="full"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Define the approval workflow levels and who approves at each level
            </p>
            <Button onClick={addLevel} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Level
            </Button>
          </div>

          {levels.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No approval levels defined</p>
              <Button className="mt-4" onClick={addLevel}>
                Add First Level
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {levels.map((level, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {level.levelNumber}
                      </div>
                      <Input
                        placeholder="Level Name"
                        value={level.levelName}
                        onChange={(e) => updateLevel(index, { levelName: e.target.value })}
                        className="w-64"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <Input
                          type="number"
                          placeholder="SLA (hrs)"
                          value={level.slaHours || ""}
                          onChange={(e) =>
                            updateLevel(index, {
                              slaHours: parseInt(e.target.value) || undefined,
                            })
                          }
                          className="w-24"
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => removeLevel(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="pl-11">
                    <p className="text-sm font-medium text-gray-700 mb-2">Approvers:</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={level.approvers.some((a) => a.isRequesterSupervisor)}
                          onChange={(e) => {
                            const newApprovers = e.target.checked
                              ? [{ isRequesterSupervisor: true }]
                              : level.approvers.filter((a) => !a.isRequesterSupervisor);
                            updateLevel(index, { approvers: newApprovers });
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">Requester&apos;s Supervisor</span>
                      </label>

                      <div className="flex gap-2 flex-wrap">
                        <select
                          className="px-3 py-2 border rounded-lg text-sm"
                          onChange={(e) => {
                            if (e.target.value) {
                              const newApprovers = [
                                ...level.approvers.filter((a) => !a.userId),
                                { userId: e.target.value, isRequesterSupervisor: false },
                              ];
                              updateLevel(index, { approvers: newApprovers });
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Add specific user...</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>

                        <select
                          className="px-3 py-2 border rounded-lg text-sm"
                          onChange={(e) => {
                            if (e.target.value) {
                              const newApprovers = [
                                ...level.approvers.filter((a) => !a.userRoleId),
                                { userRoleId: e.target.value, isRequesterSupervisor: false },
                              ];
                              updateLevel(index, { approvers: newApprovers });
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Add role...</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {level.approvers.map((approver, aIdx) => {
                          if (approver.isRequesterSupervisor) return null;
                          const user = users.find((u) => u.id === approver.userId);
                          const role = roles.find((r) => r.id === approver.userRoleId);
                          return (
                            <Badge key={aIdx} variant="info" className="flex items-center gap-1">
                              {user?.name || role?.displayName}
                              <button
                                type="button"
                                onClick={() => {
                                  updateLevel(index, {
                                    approvers: level.approvers.filter((_, i) => i !== aIdx),
                                  });
                                }}
                                className="ml-1 hover:text-red-500"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowLevelsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLevels} isLoading={isSaving}>
              Save Levels
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
