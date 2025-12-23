"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  User, 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  Shield,
  Building,
  IdCard,
  CheckCircle,
  XCircle,
  Pencil,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { formatDate, getRoleDisplayName } from "@/lib/utils";

interface UserProfile {
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
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  profileImage: string | null;
  designation: string | null;
  department: string | null;
  joiningDate: string | null;
  employeeId: string | null;
  createdAt: string;
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  // Check if current user is Super Admin
  const isSuperAdmin = session?.user?.userRoleName === "Super Admin" || 
    (session?.user as { userRole?: { name: string } })?.userRole?.name === "SUPER_ADMIN";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users/${id}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          
          // Determine if current user can edit this user
          // Super Admin users can only be edited by other Super Admins
          if (data.userRole?.name === "SUPER_ADMIN") {
            setCanEdit(isSuperAdmin);
          } else {
            setCanEdit(true); // Non-Super Admin users can be edited by anyone with permission
          }
        } else {
          router.push("/dashboard/users");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/dashboard/users");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id, router, isSuperAdmin]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push("/dashboard/users")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
            <p className="text-gray-500 mt-1">View user details</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => router.push(`/dashboard/users?edit=${user.id}`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit User
          </Button>
        )}
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {user.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profileImage}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                {user.userRole?.name === "SUPER_ADMIN" && (
                  <Badge variant="warning">
                    <Shield className="w-3 h-3 mr-1" />
                    Super Admin
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Phone className="w-4 h-4" />
                  {user.phone}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant={user.userRole?.isActive ? "info" : "default"}>
                  {user.userRole?.displayName || getRoleDisplayName(user.role)}
                </Badge>
                <Badge variant={user.approvalStatus === "APPROVED" ? "success" : user.approvalStatus === "REJECTED" ? "danger" : "warning"}>
                  {user.approvalStatus}
                </Badge>
                <Badge variant={user.isActive ? "success" : "danger"}>
                  {user.isActive ? (
                    <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                  ) : (
                    <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Full Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Email Address</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Phone Number</p>
              <p className="font-medium">{user.phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{user.dateOfBirth ? formatDate(user.dateOfBirth) : "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Gender</p>
              <p className="font-medium capitalize">{user.gender || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 mb-1">Address</p>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="font-medium">{user.address || "-"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Job Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Employee ID</p>
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{user.employeeId || "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Designation</p>
              <p className="font-medium">{user.designation || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Department</p>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{user.department || "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Joining Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{user.joiningDate ? formatDate(user.joiningDate) : "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Role</p>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{user.userRole?.displayName || getRoleDisplayName(user.role)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Account Created</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
