"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  MoreHorizontal, 
  Upload, 
  FileSpreadsheet, 
  MapPin,
  ChevronDown,
  Building2,
  Layers,
  Search,
  ToggleLeft,
  ToggleRight,
  Download,
  Map,
  Home
} from "lucide-react";
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

interface Cohort {
  id: string;
  cohortId: string;
  name: string;
  isActive: boolean;
}

interface Project {
  id: string;
  name: string;
  isActive: boolean;
  cohorts: Cohort[];
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
  cohort?: {
    id: string;
    cohortId: string;
    name: string;
    isActive: boolean;
    project?: {
      id: string;
      name: string;
      isActive: boolean;
    };
  } | null;
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

// Geo types
interface GeoDistrict {
  id: string;
  name: string;
  divisionId: string;
}

interface GeoUpazila {
  id: string;
  name: string;
  districtId: string;
}

interface GeoUnion {
  id: string;
  name: string;
  upazilaId: string;
}

interface GeoDivision {
  id: string;
  name: string;
  districts?: GeoDistrict[];
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
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

  // Form dropdowns
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  
  // Geo data state
  const [divisions, setDivisions] = useState<GeoDivision[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [upazilas, setUpazilas] = useState<GeoUpazila[]>([]);
  const [unions, setUnions] = useState<GeoUnion[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedUpazilaId, setSelectedUpazilaId] = useState<string>("");
  const [selectedUnionId, setSelectedUnionId] = useState<string>("");
  
  // Geo dropdown states
  const [isDivisionDropdownOpen, setIsDivisionDropdownOpen] = useState(false);
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [isUpazilaDropdownOpen, setIsUpazilaDropdownOpen] = useState(false);
  const [isUnionDropdownOpen, setIsUnionDropdownOpen] = useState(false);
  const [divisionSearch, setDivisionSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [upazilaSearch, setUpazilaSearch] = useState("");
  const [unionSearch, setUnionSearch] = useState("");
  const divisionDropdownRef = useRef<HTMLDivElement>(null);
  const districtDropdownRef = useRef<HTMLDivElement>(null);
  const upazilaDropdownRef = useRef<HTMLDivElement>(null);
  const unionDropdownRef = useRef<HTMLDivElement>(null);
  
  // Get cohorts from selected project
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const filteredCohorts = selectedProject?.cohorts || [];
  
  // Dropdown states
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isCohortDropdownOpen, setIsCohortDropdownOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [cohortSearch, setCohortSearch] = useState("");
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const cohortDropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BranchInput>({
    resolver: zodResolver(branchSchema),
  });

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      setBranches(data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProjects = async () => {
    try {
      const res = await fetch("/api/users/my-projects?activeOnly=true");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchGeoData = async () => {
    try {
      const res = await fetch("/api/geo?type=divisions");
      const data = await res.json();
      setDivisions(data);
    } catch (error) {
      console.error("Error fetching geo data:", error);
    }
  };

  const fetchDistricts = async (divisionId: string) => {
    try {
      const res = await fetch(`/api/geo?type=districts&divisionId=${divisionId}`);
      const data = await res.json();
      setDistricts(data);
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  const fetchUpazilas = async (districtId: string) => {
    try {
      const res = await fetch(`/api/geo?type=upazilas&districtId=${districtId}`);
      const data = await res.json();
      setUpazilas(data);
    } catch (error) {
      console.error("Error fetching upazilas:", error);
    }
  };

  const fetchUnions = async (upazilaId: string) => {
    try {
      const res = await fetch(`/api/geo?type=unions&upazilaId=${upazilaId}`);
      const data = await res.json();
      setUnions(data);
    } catch (error) {
      console.error("Error fetching unions:", error);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchUserProjects();
    fetchGeoData();
  }, []);

  // Reset cohort when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedCohortId("");
    } else {
      // Reset cohort if not in new project's cohorts
      const projectCohorts = projects.find(p => p.id === selectedProjectId)?.cohorts || [];
      if (!projectCohorts.find(c => c.id === selectedCohortId)) {
        setSelectedCohortId("");
      }
    }
  }, [selectedProjectId, projects, selectedCohortId]);

  // Cascading geo updates
  useEffect(() => {
    if (selectedDivisionId) {
      fetchDistricts(selectedDivisionId);
      setSelectedDistrictId("");
      setSelectedUpazilaId("");
      setSelectedUnionId("");
      setUpazilas([]);
      setUnions([]);
      setValue("district", "");
      setValue("upazila", "");
    }
  }, [selectedDivisionId, setValue]);

  useEffect(() => {
    if (selectedDistrictId) {
      fetchUpazilas(selectedDistrictId);
      setSelectedUpazilaId("");
      setSelectedUnionId("");
      setUnions([]);
      setValue("upazila", "");
    }
  }, [selectedDistrictId, setValue]);

  useEffect(() => {
    if (selectedUpazilaId) {
      fetchUnions(selectedUpazilaId);
      setSelectedUnionId("");
    }
  }, [selectedUpazilaId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (cohortDropdownRef.current && !cohortDropdownRef.current.contains(event.target as Node)) {
        setIsCohortDropdownOpen(false);
      }
      if (divisionDropdownRef.current && !divisionDropdownRef.current.contains(event.target as Node)) {
        setIsDivisionDropdownOpen(false);
      }
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(event.target as Node)) {
        setIsDistrictDropdownOpen(false);
      }
      if (upazilaDropdownRef.current && !upazilaDropdownRef.current.contains(event.target as Node)) {
        setIsUpazilaDropdownOpen(false);
      }
      if (unionDropdownRef.current && !unionDropdownRef.current.contains(event.target as Node)) {
        setIsUnionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generate sample CSV
  const downloadSampleCSV = () => {
    // Simple CSV format with clear headers
    const headers = ["Division", "District", "Upazila", "Union", "Branch Name", "Branch Code", "Project Name", "Cohort Name"];
    const sampleRow = ["Dhaka", "Dhaka", "Dhanmondi", "Dhanmondi", "Sample Branch", "BR-001", "Project Name Here", "Cohort Name Here"];
    
    // Build clean CSV content
    let csvContent = headers.join(",") + "\n";
    csvContent += sampleRow.join(",") + "\n";

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "branch_upload_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        comments: "#",
        complete: (results) => {
          const data = results.data as Record<string, string>[];
          const validData: BulkBranchInput[] = [];
          
          for (const row of data) {
            const parsed = branchSchema.safeParse({
              division: row.division || row.Division,
              district: row.district || row.District,
              upazila: row.upazila || row.Upazila,
              union: row.union || row.Union || row["Union (Optional)"] || "",
              branchName: row.branchName || row["Branch Name"] || row.branch_name,
              branchCode: row.branchCode || row["Branch Code"] || row["Branch Code (Optional)"] || row.branch_code,
            });
            
            if (parsed.success) {
              validData.push({
                ...parsed.data,
                projectName: row.projectName || row["Project Name"] || row.project_name || row.Project,
                cohortName: row.cohortName || row["Cohort Name"] || row.cohort_name || row.Cohort,
              });
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
        body: JSON.stringify({ branches: uploadData }),
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
      // Validate required fields for new branch
      if (!selectedBranch && (!selectedProjectId || !selectedCohortId)) {
        alert("Please select a project and cohort before creating a branch");
        return;
      }

      const url = selectedBranch 
        ? `/api/branches/${selectedBranch.id}` 
        : "/api/branches";
      const method = selectedBranch ? "PUT" : "POST";

      const selectedDivision = divisions.find(d => d.id === selectedDivisionId);
      const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
      const selectedUpazila = upazilas.find(u => u.id === selectedUpazilaId);
      const selectedUnion = unions.find(u => u.id === selectedUnionId);

      // For new branches, cohortId is required. For edits, use existing if not changed
      const cohortIdToSave = selectedCohortId || (selectedBranch?.cohort?.id ?? null);

      const payload = {
        ...data,
        division: selectedDivision?.name || data.division,
        district: selectedDistrict?.name || data.district,
        upazila: selectedUpazila?.name || data.upazila,
        union: selectedUnion?.name || "",
        cohortId: cohortIdToSave,
      };

      console.log("Submitting branch with payload:", payload);

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
    
    // Set project and cohort from branch
    if (branch.cohort?.project?.id) {
      setSelectedProjectId(branch.cohort.project.id);
    }
    if (branch.cohort?.id) {
      setSelectedCohortId(branch.cohort.id);
    }
    
    // Look up division ID from name and populate cascading dropdowns
    const matchingDivision = divisions.find(d => d.name.toLowerCase() === branch.division.toLowerCase());
    if (matchingDivision) {
      setSelectedDivisionId(matchingDivision.id);
      
      // Fetch districts for this division
      try {
        const distRes = await fetch(`/api/geo?type=districts&divisionId=${matchingDivision.id}`);
        const distData = await distRes.json();
        setDistricts(distData);
        
        // Find matching district
        const matchingDistrict = distData.find((d: GeoDistrict) => d.name.toLowerCase() === branch.district.toLowerCase());
        if (matchingDistrict) {
          setSelectedDistrictId(matchingDistrict.id);
          
          // Fetch upazilas for this district
          const upzRes = await fetch(`/api/geo?type=upazilas&districtId=${matchingDistrict.id}`);
          const upzData = await upzRes.json();
          setUpazilas(upzData);
          
          // Find matching upazila
          const matchingUpazila = upzData.find((u: GeoUpazila) => u.name.toLowerCase() === branch.upazila.toLowerCase());
          if (matchingUpazila) {
            setSelectedUpazilaId(matchingUpazila.id);
            
            // Fetch unions for this upazila
            const uniRes = await fetch(`/api/geo?type=unions&upazilaId=${matchingUpazila.id}`);
            const uniData = await uniRes.json();
            setUnions(uniData);
            
            // Find matching union if exists
            if (branch.union) {
              const matchingUnion = uniData.find((u: GeoUnion) => u.name.toLowerCase() === branch.union?.toLowerCase());
              if (matchingUnion) {
                setSelectedUnionId(matchingUnion.id);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading geo data for edit:", error);
      }
    }
    
    // Set form values
    reset({
      division: branch.division,
      district: branch.district,
      upazila: branch.upazila,
      union: branch.union || "",
      branchName: branch.branchName,
      branchCode: branch.branchCode || "",
    });
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
          union: selectedBranch.union || "",
          branchName: selectedBranch.branchName,
          branchCode: selectedBranch.branchCode,
          cohortId: selectedBranch.cohort?.id || null,
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

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBranch(null);
    setSelectedProjectId("");
    setSelectedCohortId("");
    setSelectedDivisionId("");
    setSelectedDistrictId("");
    setSelectedUpazilaId("");
    setSelectedUnionId("");
    setProjectSearch("");
    setCohortSearch("");
    setDivisionSearch("");
    setDistrictSearch("");
    setUpazilaSearch("");
    setUnionSearch("");
    setDistricts([]);
    setUpazilas([]);
    setUnions([]);
    reset();
  };

  // Filtered lists
  const filteredProjectsList = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredCohortsList = filteredCohorts.filter(c =>
    c.name.toLowerCase().includes(cohortSearch.toLowerCase()) ||
    c.cohortId.toLowerCase().includes(cohortSearch.toLowerCase())
  );

  const filteredDivisionsList = divisions.filter(d =>
    d.name.toLowerCase().includes(divisionSearch.toLowerCase())
  );

  const filteredDistrictsList = districts.filter(d =>
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const filteredUpazilasList = upazilas.filter(u =>
    u.name.toLowerCase().includes(upazilaSearch.toLowerCase())
  );

  const filteredUnionsList = unions.filter(u =>
    u.name.toLowerCase().includes(unionSearch.toLowerCase())
  );

  // Get selected names for display
  const selectedDivisionName = divisions.find(d => d.id === selectedDivisionId)?.name || "";
  const selectedDistrictName = districts.find(d => d.id === selectedDistrictId)?.name || "";
  const selectedUpazilaName = upazilas.find(u => u.id === selectedUpazilaId)?.name || "";
  const selectedUnionName = unions.find(u => u.id === selectedUnionId)?.name || "";

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
      accessorKey: "cohort",
      header: "Project / Cohort",
      cell: ({ row }) => {
        const cohort = row.original.cohort;
        if (!cohort) {
          return <span className="text-gray-400 text-sm">Not assigned</span>;
        }
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">{cohort.project?.name || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-green-500" />
              <span className="text-sm">{cohort.name}</span>
              <Badge variant="info" className="text-xs">{cohort.cohortId}</Badge>
            </div>
          </div>
        );
      },
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
        <div className="relative">
          <button
            onClick={() => setActionMenuOpen(actionMenuOpen === row.original.id ? null : row.original.id)}
            className="p-2 hover:bg-gray-100 rounded-lg"
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
                  onClick={() => openEditModal(row.original)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => openStatusModal(row.original)}
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
                  onClick={() => openDeleteModal(row.original)}
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

  // Check if project/cohort are selected (for disabling other fields)
  const isProjectCohortSelected = selectedProjectId && selectedCohortId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-500 mt-1">Manage branches by location and cohort</p>
        </div>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Branches</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={branches} 
              searchPlaceholder="Search branches..."
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedBranch ? "Edit Branch" : "Add New Branch"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Project Dropdown */}
          <div ref={projectDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className={selectedProjectId ? "text-gray-900" : "text-gray-400"}>
                  {selectedProjectId
                    ? projects.find(p => p.id === selectedProjectId)?.name
                    : "Select a project"}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProjectDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isProjectDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredProjectsList.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No projects found</p>
                  ) : (
                    filteredProjectsList.map(project => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setIsProjectDropdownOpen(false);
                          setProjectSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedProjectId === project.id ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <span>{project.name}</span>
                        {selectedProjectId === project.id && (
                          <span className="text-blue-600">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cohort Dropdown */}
          <div ref={cohortDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cohort <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => selectedProjectId && setIsCohortDropdownOpen(!isCohortDropdownOpen)}
              disabled={!selectedProjectId}
              className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !selectedProjectId ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className={selectedCohortId ? "text-gray-900" : "text-gray-400"}>
                  {selectedCohortId
                    ? filteredCohorts.find(c => c.id === selectedCohortId)?.name
                    : selectedProjectId ? "Select a cohort" : "Select a project first"}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCohortDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isCohortDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={cohortSearch}
                      onChange={(e) => setCohortSearch(e.target.value)}
                      placeholder="Search cohorts..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredCohortsList.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No cohorts found</p>
                  ) : (
                    filteredCohortsList.map(cohort => (
                      <button
                        key={cohort.id}
                        type="button"
                        onClick={() => {
                          setSelectedCohortId(cohort.id);
                          setIsCohortDropdownOpen(false);
                          setCohortSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedCohortId === cohort.id ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <div>
                          <span>{cohort.name}</span>
                          <span className="ml-2 text-xs text-gray-400">({cohort.cohortId})</span>
                        </div>
                        {selectedCohortId === cohort.id && (
                          <span className="text-blue-600">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {!selectedProjectId && (
              <p className="mt-1 text-xs text-gray-500">Please select a project first to see available cohorts</p>
            )}
          </div>

          {/* Divider */}
          {isProjectCohortSelected && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Location Details</p>
            </div>
          )}

          {/* Division Dropdown - Cascading */}
          <div ref={divisionDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Division <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => isProjectCohortSelected && setIsDivisionDropdownOpen(!isDivisionDropdownOpen)}
              disabled={!isProjectCohortSelected}
              className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !isProjectCohortSelected ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-gray-400" />
                <span className={selectedDivisionId ? "text-gray-900" : "text-gray-400"}>
                  {selectedDivisionName || (isProjectCohortSelected ? "Select division" : "Select project & cohort first")}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDivisionDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isDivisionDropdownOpen && (
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
                  {filteredDivisionsList.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No divisions found. Please seed geo data first.</p>
                  ) : (
                    filteredDivisionsList.map(division => (
                      <button
                        key={division.id}
                        type="button"
                        onClick={() => {
                          setSelectedDivisionId(division.id);
                          setValue("division", division.name);
                          setIsDivisionDropdownOpen(false);
                          setDivisionSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedDivisionId === division.id ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <span>{division.name}</span>
                        {selectedDivisionId === division.id && <span className="text-blue-600">✓</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* District Dropdown - Cascading */}
          <div ref={districtDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => selectedDivisionId && setIsDistrictDropdownOpen(!isDistrictDropdownOpen)}
              disabled={!selectedDivisionId}
              className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !selectedDivisionId ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className={selectedDistrictId ? "text-gray-900" : "text-gray-400"}>
                  {selectedDistrictName || (selectedDivisionId ? "Select district" : "Select division first")}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDistrictDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isDistrictDropdownOpen && (
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
                  {filteredDistrictsList.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No districts found</p>
                  ) : (
                    filteredDistrictsList.map(district => (
                      <button
                        key={district.id}
                        type="button"
                        onClick={() => {
                          setSelectedDistrictId(district.id);
                          setValue("district", district.name);
                          setIsDistrictDropdownOpen(false);
                          setDistrictSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedDistrictId === district.id ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <span>{district.name}</span>
                        {selectedDistrictId === district.id && <span className="text-blue-600">✓</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Upazila Dropdown - Cascading */}
          <div ref={upazilaDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upazila <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => selectedDistrictId && setIsUpazilaDropdownOpen(!isUpazilaDropdownOpen)}
              disabled={!selectedDistrictId}
              className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !selectedDistrictId ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className={selectedUpazilaId ? "text-gray-900" : "text-gray-400"}>
                  {selectedUpazilaName || (selectedDistrictId ? "Select upazila" : "Select district first")}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isUpazilaDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isUpazilaDropdownOpen && (
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
                  {filteredUpazilasList.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No upazilas found</p>
                  ) : (
                    filteredUpazilasList.map(upazila => (
                      <button
                        key={upazila.id}
                        type="button"
                        onClick={() => {
                          setSelectedUpazilaId(upazila.id);
                          setValue("upazila", upazila.name);
                          setIsUpazilaDropdownOpen(false);
                          setUpazilaSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          selectedUpazilaId === upazila.id ? "bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <span>{upazila.name}</span>
                        {selectedUpazilaId === upazila.id && <span className="text-blue-600">✓</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Union Dropdown - Optional */}
          <div ref={unionDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Union <span className="text-gray-400">(Optional)</span>
            </label>
            <button
              type="button"
              onClick={() => selectedUpazilaId && setIsUnionDropdownOpen(!isUnionDropdownOpen)}
              disabled={!selectedUpazilaId}
              className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !selectedUpazilaId ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-gray-400" />
                <span className={selectedUnionId ? "text-gray-900" : "text-gray-400"}>
                  {selectedUnionName || (selectedUpazilaId ? "Select union (optional)" : "Select upazila first")}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isUnionDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isUnionDropdownOpen && (
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUnionId("");
                      setIsUnionDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-400"
                  >
                    -- None --
                  </button>
                  {filteredUnionsList.map(union => (
                    <button
                      key={union.id}
                      type="button"
                      onClick={() => {
                        setSelectedUnionId(union.id);
                        setIsUnionDropdownOpen(false);
                        setUnionSearch("");
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                        selectedUnionId === union.id ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      <span>{union.name}</span>
                      {selectedUnionId === union.id && <span className="text-blue-600">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Input
            label="Branch Name"
            placeholder="Enter branch name"
            error={errors.branchName?.message}
            disabled={!isProjectCohortSelected}
            {...register("branchName")}
          />
          <Input
            label="Branch Code (Optional)"
            placeholder="Enter branch code"
            disabled={!isProjectCohortSelected}
            {...register("branchCode")}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1" disabled={!isProjectCohortSelected}>
              {selectedBranch ? "Update" : "Create"}
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
          {/* Download Sample Button */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
              <Download className="w-4 h-4 mr-2" />
              Download Sample CSV
            </Button>
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
                  Required: Division, District, Upazila, Branch Name
                </p>
                <p className="text-sm text-gray-400">
                  Optional: Union, Branch Code, Project Name, Cohort Name
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
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Project</th>
                      <th className="px-3 py-2 text-left">Cohort</th>
                      <th className="px-3 py-2 text-left">Division</th>
                      <th className="px-3 py-2 text-left">District</th>
                      <th className="px-3 py-2 text-left">Branch Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{row.projectName || "-"}</td>
                        <td className="px-3 py-2">{row.cohortName || "-"}</td>
                        <td className="px-3 py-2">{row.division}</td>
                        <td className="px-3 py-2">{row.district}</td>
                        <td className="px-3 py-2">{row.branchName}</td>
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
            Are you sure you want to delete <span className="font-semibold">{selectedBranch?.branchName}</span>?
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

      {/* Status Change Confirmation Modal */}
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
    </div>
  );
}
