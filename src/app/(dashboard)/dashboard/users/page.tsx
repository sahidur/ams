"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, UserCheck, UserX, MoreHorizontal, Copy, Check, Key, Power, PowerOff, Eye, Shield } from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  DataTable, 
  Modal, 
  Input, 
  Select, 
  Badge 
} from "@/components/ui";
import { userSchema, type UserInput } from "@/lib/validations";
import { getRoleDisplayName, getStatusColor } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  userRoleId: string | null;
  userRole?: {
    id: string;
    name: string;
    displayName: string;
    isActive: boolean;
  };
  approvalStatus: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isToggleActiveModalOpen, setIsToggleActiveModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);

  // Check if current user is Super Admin
  const isSuperAdmin = session?.user?.userRoleName === "Super Admin" || 
    (session?.user as { userRole?: { name: string } })?.userRole?.name === "SUPER_ADMIN";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles?activeOnly=true");
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const onSubmit = async (data: UserInput) => {
    try {
      const url = selectedUser 
        ? `/api/users/${selectedUser.id}` 
        : "/api/users";
      const method = selectedUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          userRoleId: selectedRoleId || undefined,
          ...(selectedUser && resetPassword && { resetPassword: true }),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        fetchUsers();
        closeModal();
        
        // Show password modal if a new password was generated
        if (result.generatedPassword) {
          setGeneratedPassword(result.generatedPassword);
          setIsPasswordModalOpen(true);
        }
      }
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}/approve`, { method: "POST" });
      fetchUsers();
    } catch (error) {
      console.error("Error approving user:", error);
    }
    setActionMenuOpen(null);
  };

  const handleReject = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}/reject`, { method: "POST" });
      fetchUsers();
    } catch (error) {
      console.error("Error rejecting user:", error);
    }
    setActionMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to delete user");
        return;
      }
      fetchUsers();
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !selectedUser.isActive }),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to update user status");
        return;
      }
      fetchUsers();
      setIsToggleActiveModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  const openToggleActiveModal = (user: User) => {
    setSelectedUser(user);
    setIsToggleActiveModalOpen(true);
    setActionMenuOpen(null);
  };

  // Check if current user can edit a target user
  const canEditUser = (targetUser: User): boolean => {
    if (targetUser.userRole?.name === "SUPER_ADMIN") {
      return isSuperAdmin;
    }
    return true;
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRoleId(user.userRoleId || "");
    setResetPassword(false);
    reset({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role as UserInput["role"],
    });
    setIsModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setSelectedRoleId("");
    setResetPassword(false);
    reset();
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy password:", error);
    }
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setGeneratedPassword("");
    setPasswordCopied(false);
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push(`/dashboard/users/${row.original.id}`)}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
            {row.original.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 hover:text-blue-600">{row.original.name}</p>
              {row.original.userRole?.name === "SUPER_ADMIN" && (
                <span title="Super Admin">
                  <Shield className="w-4 h-4 text-amber-500" />
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const userRole = row.original.userRole;
        if (userRole) {
          return (
            <div className="flex items-center gap-2">
              <Badge variant={userRole.isActive ? "info" : "default"}>
                {userRole.displayName}
              </Badge>
              {!userRole.isActive && (
                <span className="text-xs text-red-500">(Inactive)</span>
              )}
            </div>
          );
        }
        return <Badge variant="default">{getRoleDisplayName(row.original.role)}</Badge>;
      },
    },
    {
      accessorKey: "isActive",
      header: "Account",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "danger"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "approvalStatus",
      header: "Approval",
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(row.original.approvalStatus)}`}>
          {row.original.approvalStatus}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const canEdit = canEditUser(row.original);
        return (
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
                      router.push(`/dashboard/users/${row.original.id}`);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Eye className="w-4 h-4" />
                    View Profile
                  </button>
                  {canEdit ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(row.original);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-400 cursor-not-allowed">
                      <Pencil className="w-4 h-4" />
                      Edit (Super Admin Only)
                    </div>
                  )}
                  {row.original.approvalStatus === "PENDING" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(row.original.id);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(row.original.id);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                      >
                        <UserX className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                  {canEdit && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openToggleActiveModal(row.original);
                        }}
                        className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${
                          row.original.isActive 
                            ? "text-orange-600 hover:bg-orange-50" 
                            : "text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {row.original.isActive ? (
                          <>
                            <PowerOff className="w-4 h-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4" />
                            Activate
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(row.original);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                  {!canEdit && (
                    <div className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-400 cursor-not-allowed">
                      <Shield className="w-4 h-4" />
                      Protected User
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage system users and approvals</p>
        </div>
        <Button onClick={() => { reset(); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={users} 
              searchPlaceholder="Search users..."
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedUser ? "Edit User" : "Add New User"}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Enter full name"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Email"
            type="email"
            placeholder="Enter email address"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Phone"
            placeholder="Enter phone number"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.displayName}
                </option>
              ))}
            </select>
          </div>
          {/* Hidden field for backwards compatibility */}
          <input type="hidden" {...register("role")} value="BASIC_USER" />
          
          {/* Reset Password option - only for Super Admin when editing */}
          {selectedUser && isSuperAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetPassword}
                  onChange={(e) => setResetPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    Reset password (generate new random password)
                  </span>
                </div>
              </label>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              {selectedUser ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
        size="sm"
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <span className="font-semibold">{selectedUser?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Display Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={closePasswordModal}
        title="User Password Generated"
        size="sm"
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-gray-600 mb-4">
            The password has been generated successfully. Please copy and share it with the user securely.
          </p>
          <div className="flex items-center gap-2 p-4 bg-gray-100 rounded-lg mb-4">
            <code className="flex-1 text-lg font-mono font-bold text-gray-900 tracking-wider">
              {generatedPassword}
            </code>
            <button
              onClick={copyPassword}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Copy password"
            >
              {passwordCopied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          {passwordCopied && (
            <p className="text-sm text-green-600 mb-4">Password copied to clipboard!</p>
          )}
          <p className="text-xs text-amber-600 mb-4">
            ⚠️ This password will not be shown again. Make sure to save it.
          </p>
          <Button onClick={closePasswordModal} className="w-full">
            Done
          </Button>
        </div>
      </Modal>

      {/* Toggle Active Confirmation Modal */}
      <Modal
        isOpen={isToggleActiveModalOpen}
        onClose={() => {
          setIsToggleActiveModalOpen(false);
          setSelectedUser(null);
        }}
        title={selectedUser?.isActive ? "Deactivate User" : "Activate User"}
        size="sm"
      >
        <div className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            selectedUser?.isActive ? "bg-orange-100" : "bg-green-100"
          }`}>
            {selectedUser?.isActive ? (
              <PowerOff className="w-6 h-6 text-orange-600" />
            ) : (
              <Power className="w-6 h-6 text-green-600" />
            )}
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to {selectedUser?.isActive ? "deactivate" : "activate"}{" "}
            <span className="font-semibold">{selectedUser?.name}</span>?
            {selectedUser?.isActive && (
              <span className="block mt-2 text-sm text-orange-600">
                This user will not be able to log in until reactivated.
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsToggleActiveModalOpen(false);
                setSelectedUser(null);
              }} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant={selectedUser?.isActive ? "destructive" : "default"}
              onClick={handleToggleActive} 
              className="flex-1"
            >
              {selectedUser?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
