"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  MoreHorizontal,
  MapPin,
  Users,
  Target,
  Calendar,
  Building2,
  Layers,
  Upload,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Search,
  Check,
  Home
} from "lucide-react";
import Link from "next/link";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  DataTable, 
  Modal, 
  Input, 
  Badge 
} from "@/components/ui";
import { branchSchema, type BranchInput } from "@/lib/validations";

interface Project {
  id: string;
  name: string;
  donorName: string;
  isActive: boolean;
}

interface Cohort {
  id: string;
  cohortId: string;
  name: string;
  duration: number | null;
  learnerTarget: number | null;
  jobPlacementTarget: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  description: string | null;
  project: Project;
  _count?: {
    directBranches: number;
    batches: number;
  };
}

interface Branch {
  id: string;
  division: string;
  district: string;
  upazila: string;
  union?: string;
  branchName: string;
  branchCode: string | null;
  isActive: boolean;
}

interface BulkBranchInput extends BranchInput {
  projectName?: string;
  cohortName?: string;
}

interface ValidationError {
  row: number;
  branchName: string;
  error: string;
}

// Geo location interfaces
interface Division {
  id: string;
  name: string;
  isActive: boolean;
}

interface District {
  id: string;
  name: string;
  divisionId: string;
  isActive: boolean;
}

interface Upazila {
  id: string;
  name: string;
  districtId: string;
  isActive: boolean;
}

interface Union {
  id: string;
  name: string;
  upazilaId: string;
  isActive: boolean;
}

export default function CohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<BulkBranchInput[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadErrors, setUploadErrors] = useState<ValidationError[]>([]);

  // Geo location state
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [upazilas, setUpazilas] = useState<Upazila[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedUpazila, setSelectedUpazila] = useState<string>("");
  const [selectedUnion, setSelectedUnion] = useState<string>("");
  
  // Dropdown open states
  const [isDivisionOpen, setIsDivisionOpen] = useState(false);
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [isUpazilaOpen, setIsUpazilaOpen] = useState(false);
  const [isUnionOpen, setIsUnionOpen] = useState(false);
  
  // Search states
  const [divisionSearch, setDivisionSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [upazilaSearch, setUpazilaSearch] = useState("");
  const [unionSearch, setUnionSearch] = useState("");
  
  // Dropdown refs
  const divisionRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);
  const upazilaRef = useRef<HTMLDivElement>(null);
  const unionRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BranchInput>({
    resolver: zodResolver(branchSchema),
  });

  // Fetch divisions on mount
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const res = await fetch("/api/geo/divisions?activeOnly=true");
        const data = await res.json();
        setDivisions(data);
      } catch (error) {
        console.error("Error fetching divisions:", error);
      }
    };
    fetchDivisions();
  }, []);

  // Fetch districts when division changes
  useEffect(() => {
    if (selectedDivision) {
      const fetchDistricts = async () => {
        try {
          const res = await fetch(`/api/geo/districts?divisionId=${selectedDivision}&activeOnly=true`);
          const data = await res.json();
          setDistricts(data);
        } catch (error) {
          console.error("Error fetching districts:", error);
        }
      };
      fetchDistricts();
    } else {
      setDistricts([]);
    }
    setSelectedDistrict("");
    setSelectedUpazila("");
    setSelectedUnion("");
    setUpazilas([]);
    setUnions([]);
  }, [selectedDivision]);

  // Fetch upazilas when district changes
  useEffect(() => {
    if (selectedDistrict) {
      const fetchUpazilas = async () => {
        try {
          const res = await fetch(`/api/geo/upazilas?districtId=${selectedDistrict}&activeOnly=true`);
          const data = await res.json();
          setUpazilas(data);
        } catch (error) {
          console.error("Error fetching upazilas:", error);
        }
      };
      fetchUpazilas();
    } else {
      setUpazilas([]);
    }
    setSelectedUpazila("");
    setSelectedUnion("");
    setUnions([]);
  }, [selectedDistrict]);

  // Fetch unions when upazila changes
  useEffect(() => {
    if (selectedUpazila) {
      const fetchUnions = async () => {
        try {
          const res = await fetch(`/api/geo/unions?upazilaId=${selectedUpazila}&activeOnly=true`);
          const data = await res.json();
          setUnions(data);
        } catch (error) {
          console.error("Error fetching unions:", error);
        }
      };
      fetchUnions();
    } else {
      setUnions([]);
    }
    setSelectedUnion("");
  }, [selectedUpazila]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (divisionRef.current && !divisionRef.current.contains(event.target as Node)) {
        setIsDivisionOpen(false);
      }
      if (districtRef.current && !districtRef.current.contains(event.target as Node)) {
        setIsDistrictOpen(false);
      }
      if (upazilaRef.current && !upazilaRef.current.contains(event.target as Node)) {
        setIsUpazilaOpen(false);
      }
      if (unionRef.current && !unionRef.current.contains(event.target as Node)) {
        setIsUnionOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter geo data by search
  const filteredDivisions = divisions.filter(d => 
    d.name.toLowerCase().includes(divisionSearch.toLowerCase())
  );
  const filteredDistricts = districts.filter(d => 
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );
  const filteredUpazilas = upazilas.filter(u => 
    u.name.toLowerCase().includes(upazilaSearch.toLowerCase())
  );
  const filteredUnions = unions.filter(u => 
    u.name.toLowerCase().includes(unionSearch.toLowerCase())
  );

  const fetchCohort = async () => {
    try {
      const res = await fetch(`/api/cohorts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCohort(data);
      }
    } catch (error) {
      console.error("Error fetching cohort:", error);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`/api/branches?cohortId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCohort();
    fetchBranches();
  }, [id]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Record<string, string>[];
          const validData: BulkBranchInput[] = [];
          
          for (const row of data) {
            const parsed = branchSchema.safeParse({
              division: row.division || row.Division,
              district: row.district || row.District,
              upazila: row.upazila || row.Upazila,
              branchName: row.branchName || row["Branch Name"] || row.branch_name,
              branchCode: row.branchCode || row["Branch Code"] || row.branch_code,
            });
            
            if (parsed.success) {
              validData.push(parsed.data);
            }
          }
          
          if (validData.length === 0) {
            setUploadError("No valid data found in CSV. Please check the format.");
          } else {
            setUploadData(validData);
            setUploadError("");
          }
        },
        error: () => {
          setUploadError("Error parsing CSV file");
        },
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    try {
      const res = await fetch("/api/branches/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          branches: uploadData,
          cohortId: id // Pass the current cohort ID
        }),
      });

      const result = await res.json();

      if (res.ok) {
        fetchBranches();
        if (result.errors && result.errors.length > 0) {
          setUploadErrors(result.errors);
        } else {
          setIsUploadModalOpen(false);
          setUploadData([]);
          setUploadErrors([]);
        }
      } else {
        setUploadError(result.error || "Failed to upload branches");
      }
    } catch (error) {
      console.error("Error uploading branches:", error);
      setUploadError("Failed to upload branches");
    }
  };

  const onSubmit = async (data: BranchInput) => {
    try {
      const url = selectedBranch 
        ? `/api/branches/${selectedBranch.id}` 
        : "/api/branches";
      const method = selectedBranch ? "PUT" : "POST";

      const payload = {
        ...data,
        cohortId: id, // Always use current cohort
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchBranches();
        closeModal();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save branch");
      }
    } catch (error) {
      console.error("Error saving branch:", error);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedBranch) return;
    try {
      const res = await fetch(`/api/branches/${selectedBranch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          division: selectedBranch.division,
          district: selectedBranch.district,
          upazila: selectedBranch.upazila,
          branchName: selectedBranch.branchName,
          branchCode: selectedBranch.branchCode,
          cohortId: id,
          isActive: !selectedBranch.isActive,
        }),
      });

      if (res.ok) {
        fetchBranches();
        setIsStatusModalOpen(false);
        setSelectedBranch(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;
    try {
      await fetch(`/api/branches/${selectedBranch.id}`, { method: "DELETE" });
      fetchBranches();
      setIsDeleteModalOpen(false);
      setSelectedBranch(null);
    } catch (error) {
      console.error("Error deleting branch:", error);
    }
  };

  const openEditModal = async (branch: Branch) => {
    setSelectedBranch(branch);
    
    // First reset the form with text values
    reset({
      division: branch.division,
      district: branch.district,
      upazila: branch.upazila,
      union: branch.union || "",
      branchName: branch.branchName,
      branchCode: branch.branchCode || "",
    });
    
    // Look up division ID from name and populate cascading dropdowns
    const matchingDivision = divisions.find(d => d.name.toLowerCase() === branch.division.toLowerCase());
    if (matchingDivision) {
      setSelectedDivision(matchingDivision.id);
      
      // Fetch and set districts
      try {
        const distRes = await fetch(`/api/geo/districts?divisionId=${matchingDivision.id}&activeOnly=true`);
        const distData = await distRes.json();
        setDistricts(distData);
        
        // Find matching district
        const matchingDistrict = distData.find((d: District) => d.name.toLowerCase() === branch.district.toLowerCase());
        if (matchingDistrict) {
          setSelectedDistrict(matchingDistrict.id);
          
          // Fetch and set upazilas
          const upzRes = await fetch(`/api/geo/upazilas?districtId=${matchingDistrict.id}&activeOnly=true`);
          const upzData = await upzRes.json();
          setUpazilas(upzData);
          
          // Find matching upazila
          const matchingUpazila = upzData.find((u: Upazila) => u.name.toLowerCase() === branch.upazila.toLowerCase());
          if (matchingUpazila) {
            setSelectedUpazila(matchingUpazila.id);
            
            // Fetch and set unions
            const uniRes = await fetch(`/api/geo/unions?upazilaId=${matchingUpazila.id}&activeOnly=true`);
            const uniData = await uniRes.json();
            setUnions(uniData);
            
            // Find matching union if exists
            if (branch.union) {
              const matchingUnion = uniData.find((u: Union) => u.name.toLowerCase() === branch.union?.toLowerCase());
              if (matchingUnion) {
                setSelectedUnion(matchingUnion.id);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading geo data for edit:", error);
      }
    }
    
    setIsModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const openStatusModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsStatusModalOpen(true);
    setActionMenuOpen(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBranch(null);
    reset();
    // Reset geo selections
    setSelectedDivision("");
    setSelectedDistrict("");
    setSelectedUpazila("");
    setSelectedUnion("");
    setDivisionSearch("");
    setDistrictSearch("");
    setUpazilaSearch("");
    setUnionSearch("");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns: ColumnDef<Branch>[] = [
    {
      accessorKey: "branchName",
      header: "Branch",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.original.branchName}</p>
            <p className="text-xs text-gray-500">{row.original.branchCode || "No code"}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "division",
      header: "Division",
    },
    {
      accessorKey: "district",
      header: "District",
    },
    {
      accessorKey: "upazila",
      header: "Upazila",
    },
    {
      accessorKey: "union",
      header: "Union",
      cell: ({ row }) => row.original.union || "-",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "default"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
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
                    openEditModal(row.original);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openStatusModal(row.original);
                  }}
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${
                    row.original.isActive ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"
                  }`}
                >
                  {row.original.isActive ? (
                    <ToggleLeft className="w-4 h-4" />
                  ) : (
                    <ToggleRight className="w-4 h-4" />
                  )}
                  {row.original.isActive ? "Deactivate" : "Activate"}
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
              </motion.div>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cohort not found</p>
        <Link href="/dashboard/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/projects/${cohort.project.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">{cohort.name}</h1>
            <Badge variant="info">{cohort.cohortId}</Badge>
            <Badge variant={cohort.isActive ? "success" : "default"}>
              {cohort.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-gray-500">Manage branches for this cohort</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Project</p>
                <p className="font-semibold">{cohort.project.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-semibold">
                  {formatDate(cohort.startDate)} - {formatDate(cohort.endDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Branches</p>
                <p className="font-semibold">{branches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Learner Target</p>
                <p className="font-semibold">{cohort.learnerTarget?.toLocaleString() || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Target className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Job Placement Target</p>
                <p className="font-semibold">{cohort.jobPlacementTarget?.toLocaleString() || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Branches</CardTitle>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload CSV
            </Button>
            <Button onClick={() => { reset(); setIsModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={branches}
            searchPlaceholder="Search branches..."
          />
        </CardContent>
      </Card>

      {/* Add/Edit Branch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedBranch ? "Edit Branch" : "Add Branch"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Adding branch to: <strong>{cohort.name}</strong> ({cohort.cohortId})
              </span>
            </div>
          </div>
          
          {/* Division Dropdown */}
          <div ref={divisionRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Division *</label>
            <button
              type="button"
              onClick={() => setIsDivisionOpen(!isDivisionOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.division ? "border-red-500" : "border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className={selectedDivision ? "text-gray-900" : "text-gray-400"}>
                  {selectedDivision ? divisions.find(d => d.id === selectedDivision)?.name : "Select division"}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDivisionOpen ? "rotate-180" : ""}`} />
            </button>
            {isDivisionOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={divisionSearch}
                      onChange={(e) => setDivisionSearch(e.target.value)}
                      placeholder="Search divisions..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredDivisions.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No divisions found</p>
                  ) : (
                    filteredDivisions.map(division => (
                      <button
                        key={division.id}
                        type="button"
                        onClick={() => {
                          setSelectedDivision(division.id);
                          setValue("division", division.name, { shouldValidate: true });
                          setIsDivisionOpen(false);
                          setDivisionSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedDivision === division.id ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <span>{division.name}</span>
                        {selectedDivision === division.id && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {errors.division && <p className="mt-1 text-sm text-red-500">{errors.division.message}</p>}
            <input type="hidden" {...register("division")} />
          </div>

          {/* District Dropdown */}
          <div ref={districtRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
            <button
              type="button"
              onClick={() => selectedDivision && setIsDistrictOpen(!isDistrictOpen)}
              disabled={!selectedDivision}
              className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.district ? "border-red-500" : "border-gray-300"
              } ${!selectedDivision ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className={selectedDistrict ? "text-gray-900" : "text-gray-400"}>
                  {selectedDistrict ? districts.find(d => d.id === selectedDistrict)?.name : (selectedDivision ? "Select district" : "Select division first")}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDistrictOpen ? "rotate-180" : ""}`} />
            </button>
            {isDistrictOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      placeholder="Search districts..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredDistricts.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No districts found</p>
                  ) : (
                    filteredDistricts.map(district => (
                      <button
                        key={district.id}
                        type="button"
                        onClick={() => {
                          setSelectedDistrict(district.id);
                          setValue("district", district.name, { shouldValidate: true });
                          setIsDistrictOpen(false);
                          setDistrictSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedDistrict === district.id ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <span>{district.name}</span>
                        {selectedDistrict === district.id && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {errors.district && <p className="mt-1 text-sm text-red-500">{errors.district.message}</p>}
            <input type="hidden" {...register("district")} />
          </div>

          {/* Upazila Dropdown */}
          <div ref={upazilaRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Upazila *</label>
            <button
              type="button"
              onClick={() => selectedDistrict && setIsUpazilaOpen(!isUpazilaOpen)}
              disabled={!selectedDistrict}
              className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.upazila ? "border-red-500" : "border-gray-300"
              } ${!selectedDistrict ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className={selectedUpazila ? "text-gray-900" : "text-gray-400"}>
                  {selectedUpazila ? upazilas.find(u => u.id === selectedUpazila)?.name : (selectedDistrict ? "Select upazila" : "Select district first")}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isUpazilaOpen ? "rotate-180" : ""}`} />
            </button>
            {isUpazilaOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={upazilaSearch}
                      onChange={(e) => setUpazilaSearch(e.target.value)}
                      placeholder="Search upazilas..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredUpazilas.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No upazilas found</p>
                  ) : (
                    filteredUpazilas.map(upazila => (
                      <button
                        key={upazila.id}
                        type="button"
                        onClick={() => {
                          setSelectedUpazila(upazila.id);
                          setValue("upazila", upazila.name, { shouldValidate: true });
                          setIsUpazilaOpen(false);
                          setUpazilaSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedUpazila === upazila.id ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <span>{upazila.name}</span>
                        {selectedUpazila === upazila.id && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {errors.upazila && <p className="mt-1 text-sm text-red-500">{errors.upazila.message}</p>}
            <input type="hidden" {...register("upazila")} />
          </div>

          {/* Union Dropdown (Optional) */}
          <div ref={unionRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Union (Optional)</label>
            <button
              type="button"
              onClick={() => selectedUpazila && setIsUnionOpen(!isUnionOpen)}
              disabled={!selectedUpazila}
              className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !selectedUpazila ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-gray-400" />
                <span className={selectedUnion ? "text-gray-900" : "text-gray-400"}>
                  {selectedUnion ? unions.find(u => u.id === selectedUnion)?.name : (selectedUpazila ? "Select union (optional)" : "Select upazila first")}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isUnionOpen ? "rotate-180" : ""}`} />
            </button>
            {isUnionOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={unionSearch}
                      onChange={(e) => setUnionSearch(e.target.value)}
                      placeholder="Search unions..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredUnions.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No unions found</p>
                  ) : (
                    filteredUnions.map(union => (
                      <button
                        key={union.id}
                        type="button"
                        onClick={() => {
                          setSelectedUnion(union.id);
                          setValue("union", union.name, { shouldValidate: true });
                          setIsUnionOpen(false);
                          setUnionSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedUnion === union.id ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <span>{union.name}</span>
                        {selectedUnion === union.id && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            <input type="hidden" {...register("union")} />
          </div>

          <Input
            label="Branch Name *"
            placeholder="Enter branch name"
            error={errors.branchName?.message}
            {...register("branchName")}
          />
          <Input
            label="Branch Code (Optional)"
            placeholder="Enter branch code"
            {...register("branchCode")}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : selectedBranch ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => { setIsUploadModalOpen(false); setUploadData([]); setUploadError(""); setUploadErrors([]); }}
        title="Upload Branches CSV"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                All branches will be added to: <strong>{cohort.name}</strong> ({cohort.cohortId})
              </span>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the CSV file here...</p>
            ) : (
              <>
                <p className="text-gray-600 mb-2">Drag & drop a CSV file here, or click to select</p>
                <p className="text-sm text-gray-400">
                  CSV columns: Division, District, Upazila, Branch Name, Branch Code
                </p>
              </>
            )}
          </div>

          {uploadError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {uploadError}
            </div>
          )}

          {uploadErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-sm">
              <p className="font-medium mb-2">Some rows had errors:</p>
              <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                {uploadErrors.slice(0, 10).map((err, i) => (
                  <li key={i}>Row {err.row}: {err.branchName} - {err.error}</li>
                ))}
                {uploadErrors.length > 10 && (
                  <li>...and {uploadErrors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}

          {uploadData.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-green-600 font-medium">
                ✓ {uploadData.length} valid branches found
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Division</th>
                      <th className="px-3 py-2 text-left">District</th>
                      <th className="px-3 py-2 text-left">Upazila</th>
                      <th className="px-3 py-2 text-left">Branch Name</th>
                      <th className="px-3 py-2 text-left">Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{row.division}</td>
                        <td className="px-3 py-2">{row.district}</td>
                        <td className="px-3 py-2">{row.upazila}</td>
                        <td className="px-3 py-2">{row.branchName}</td>
                        <td className="px-3 py-2">{row.branchCode || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadData.length > 10 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    ...and {uploadData.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => { setIsUploadModalOpen(false); setUploadData([]); setUploadError(""); setUploadErrors([]); }} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={uploadData.length === 0} 
              className="flex-1"
            >
              Upload {uploadData.length} Branches
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={selectedBranch?.isActive ? "Deactivate Branch" : "Activate Branch"}
        size="sm"
      >
        <div className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            selectedBranch?.isActive ? "bg-orange-100" : "bg-green-100"
          }`}>
            {selectedBranch?.isActive ? (
              <ToggleLeft className="w-6 h-6 text-orange-600" />
            ) : (
              <ToggleRight className="w-6 h-6 text-green-600" />
            )}
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to {selectedBranch?.isActive ? "deactivate" : "activate"}{" "}
            branch <span className="font-semibold">&quot;{selectedBranch?.branchName}&quot;</span>?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant={selectedBranch?.isActive ? "destructive" : "success"}
              onClick={handleToggleStatus} 
              className="flex-1"
            >
              {selectedBranch?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Branch"
        size="sm"
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete branch <span className="font-semibold">&quot;{selectedBranch?.branchName}&quot;</span>?
            This action cannot be undone.
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
    </div>
  );
}
