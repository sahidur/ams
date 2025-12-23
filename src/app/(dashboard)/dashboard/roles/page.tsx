"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Modal } from "@/components/ui";

interface Permission {
  id: string;
  module: string;
  actions: string[];
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  permissions: Permission[];
  _count: {
    users: number;
  };
}

interface Module {
  id: string;
  name: string;
  description: string;
}

const ACTIONS = [
  { id: "READ", name: "Read", description: "View data" },
  { id: "WRITE", name: "Write", description: "Create and edit data" },
  { id: "DELETE", name: "Delete", description: "Remove data" },
  { id: "ALL", name: "All", description: "Full access" },
];

export default function RolesPage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    displayName: "",
    description: "",
    isActive: true,
    permissions: {} as Record<string, string[]>,
  });

  useEffect(() => {
    fetchRoles();
    fetchModules();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles?includePermissions=true");
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setErrorMessage("Failed to fetch roles");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await fetch("/api/roles/modules");
      const data = await res.json();
      setModules(data);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({
      displayName: "",
      description: "",
      isActive: true,
      permissions: {},
    });
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    const permissions: Record<string, string[]> = {};
    role.permissions.forEach((p) => {
      permissions[p.module] = p.actions;
    });
    setFormData({
      displayName: role.displayName,
      description: role.description || "",
      isActive: role.isActive,
      permissions,
    });
    setIsModalOpen(true);
  };

  const handlePermissionChange = (module: string, action: string) => {
    setFormData((prev) => {
      const currentActions = prev.permissions[module] || [];
      let newActions: string[];

      if (action === "ALL") {
        // If ALL is selected, toggle it
        if (currentActions.includes("ALL")) {
          newActions = [];
        } else {
          newActions = ["ALL"];
        }
      } else {
        // Remove ALL if selecting individual actions
        const withoutAll = currentActions.filter((a) => a !== "ALL");
        if (withoutAll.includes(action)) {
          newActions = withoutAll.filter((a) => a !== action);
        } else {
          newActions = [...withoutAll, action];
        }
      }

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: newActions,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    try {
      const permissions = Object.entries(formData.permissions)
        .filter(([, actions]) => actions.length > 0)
        .map(([module, actions]) => ({ module, actions }));

      const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles";
      const method = editingRole ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.displayName,
          displayName: formData.displayName,
          description: formData.description,
          isActive: formData.isActive,
          permissions,
        }),
      });

      if (res.ok) {
        setSuccessMessage(editingRole ? "Role updated successfully!" : "Role created successfully!");
        setIsModalOpen(false);
        fetchRoles();
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        setErrorMessage(error.error || "Failed to save role");
      }
    } catch (error) {
      console.error("Error saving role:", error);
      setErrorMessage("Failed to save role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (role: Role) => {
    if (role.isSystem && role.isActive) {
      setErrorMessage("Cannot deactivate system roles");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    if (role.isActive && role._count.users > 0) {
      setSelectedRole(role);
      setIsDeactivateModalOpen(true);
      return;
    }

    await toggleRoleStatus(role);
  };

  const toggleRoleStatus = async (role: Role) => {
    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !role.isActive }),
      });

      if (res.ok) {
        setSuccessMessage(`Role ${role.isActive ? "deactivated" : "activated"} successfully!`);
        fetchRoles();
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        setErrorMessage(error.error || "Failed to update role");
        setTimeout(() => setErrorMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error toggling role:", error);
      setErrorMessage("Failed to update role");
    }
    setIsDeactivateModalOpen(false);
    setSelectedRole(null);
  };

  const handleDelete = async () => {
    if (!selectedRole) return;

    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccessMessage("Role deleted successfully!");
        fetchRoles();
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        setErrorMessage(error.error || "Failed to delete role");
        setTimeout(() => setErrorMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      setErrorMessage("Failed to delete role");
    }
    setIsDeleteModalOpen(false);
    setSelectedRole(null);
  };

  const toggleRoleExpand = (roleId: string) => {
    setExpandedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const getModuleName = (moduleId: string) => {
    return modules.find((m) => m.id === moduleId)?.name || moduleId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-500 mt-1">Manage user roles and permissions</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-600"
          >
            {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roles List */}
      <div className="space-y-4">
        {roles.map((role) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={!role.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        role.isActive
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{role.displayName}</CardTitle>
                        {role.isSystem && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                            System
                          </span>
                        )}
                        {!role.isActive && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-500 mr-4">
                      <Users className="w-4 h-4" />
                      {role._count.users} users
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRoleExpand(role.id)}
                    >
                      {expandedRoles.has(role.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    {!role.isSystem && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(role)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={role.isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleActive(role)}
                        >
                          {role.isActive ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedRole(role);
                            setIsDeleteModalOpen(true);
                          }}
                          disabled={role._count.users > 0}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {role.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(role)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Expanded Permissions */}
              <AnimatePresence>
                {expandedRoles.has(role.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0">
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Permissions
                        </h4>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {role.permissions.map((perm) => (
                            <div
                              key={perm.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <span className="text-sm font-medium">
                                {getModuleName(perm.module)}
                              </span>
                              <div className="flex gap-1">
                                {perm.actions.map((action) => (
                                  <span
                                    key={action}
                                    className={`px-2 py-0.5 text-xs rounded ${
                                      action === "ALL"
                                        ? "bg-green-100 text-green-700"
                                        : action === "WRITE"
                                        ? "bg-blue-100 text-blue-700"
                                        : action === "DELETE"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {action}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? "Edit Role" : "Create New Role"}
        size="full"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Role Name"
              value={formData.displayName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, displayName: e.target.value }))
              }
              placeholder="e.g., Project Manager"
              required
              disabled={editingRole?.isSystem}
            />
            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={editingRole?.isSystem}
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Brief description of this role"
          />

          {/* Permissions Matrix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Module Permissions
            </label>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Module
                    </th>
                    {ACTIONS.map((action) => (
                      <th
                        key={action.id}
                        className="px-4 py-3 text-center text-sm font-medium text-gray-700"
                      >
                        {action.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {modules.map((module) => (
                    <tr key={module.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {module.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {module.description}
                          </p>
                        </div>
                      </td>
                      {ACTIONS.map((action) => (
                        <td key={action.id} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={
                              formData.permissions[module.id]?.includes(action.id) ||
                              false
                            }
                            onChange={() =>
                              handlePermissionChange(module.id, action.id)
                            }
                            disabled={
                              action.id !== "ALL" &&
                              formData.permissions[module.id]?.includes("ALL")
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingRole ? (
                "Update Role"
              ) : (
                "Create Role"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedRole(null);
        }}
        title="Delete Role"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the role{" "}
            <strong>{selectedRole?.displayName}</strong>?
          </p>
          {selectedRole && selectedRole._count.users > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
              This role is assigned to {selectedRole._count.users} user(s). Please
              reassign them before deleting.
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedRole(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!(selectedRole && selectedRole._count.users > 0)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setSelectedRole(null);
        }}
        title="Deactivate Role"
      >
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
            <p className="font-medium">Warning</p>
            <p className="text-sm mt-1">
              This role is assigned to {selectedRole?._count.users} user(s). If you
              deactivate this role, those users will not be able to log in to the
              system.
            </p>
          </div>
          <p className="text-gray-600">
            Are you sure you want to deactivate the role{" "}
            <strong>{selectedRole?.displayName}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeactivateModalOpen(false);
                setSelectedRole(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRole && toggleRoleStatus(selectedRole)}
            >
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
