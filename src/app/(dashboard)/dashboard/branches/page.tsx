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
  Search
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

interface Project {
  id: string;
  name: string;
  isActive: boolean;
}

interface Cohort {
  id: string;
  cohortId: string;
  name: string;
  isActive: boolean;
  project?: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

interface Branch {
  id: string;
  division: string;
  district: string;
  upazila: string;
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

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<BulkBranchInput[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadErrors, setUploadErrors] = useState<ValidationError[]>([]);

  // Form dropdowns
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [filteredCohorts, setFilteredCohorts] = useState<Cohort[]>([]);
  
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

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects?activeOnly=true");
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchCohorts = async () => {
    try {
      const res = await fetch("/api/cohorts?activeOnly=true");
      const data = await res.json();
      setCohorts(data);
    } catch (error) {
      console.error("Error fetching cohorts:", error);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchProjects();
    fetchCohorts();
  }, []);

  // Filter cohorts when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const filtered = cohorts.filter(c => c.project?.id === selectedProjectId);
      setFilteredCohorts(filtered);
      // Reset cohort selection if it's not in the filtered list
      if (!filtered.find(c => c.id === selectedCohortId)) {
        setSelectedCohortId("");
      }
    } else {
      setFilteredCohorts([]);
      setSelectedCohortId("");
    }
  }, [selectedProjectId, cohorts, selectedCohortId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (cohortDropdownRef.current && !cohortDropdownRef.current.contains(event.target as Node)) {
        setIsCohortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      const url = selectedBranch 
        ? `/api/branches/${selectedBranch.id}` 
        : "/api/branches";
      const method = selectedBranch ? "PUT" : "POST";

      const payload = {
        ...data,
        cohortId: selectedCohortId || null,
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

  const openEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    
    // Set project and cohort from branch
    if (branch.cohort?.project?.id) {
      setSelectedProjectId(branch.cohort.project.id);
    }
    if (branch.cohort?.id) {
      setSelectedCohortId(branch.cohort.id);
    }
    
    reset({
      division: branch.division,
      district: branch.district,
      upazila: branch.upazila,
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

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBranch(null);
    setSelectedProjectId("");
    setSelectedCohortId("");
    setProjectSearch("");
    setCohortSearch("");
    reset();
  };

  const filteredProjectsList = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredCohortsList = filteredCohorts.filter(c =>
    c.name.toLowerCase().includes(cohortSearch.toLowerCase()) ||
    c.cohortId.toLowerCase().includes(cohortSearch.toLowerCase())
  );

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
                className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                <button
                  onClick={() => openEditModal(row.original)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
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
        size="md"
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

          <Input
            label="Division"
            placeholder="Enter division"
            error={errors.division?.message}
            {...register("division")}
          />
          <Input
            label="District"
            placeholder="Enter district"
            error={errors.district?.message}
            {...register("district")}
          />
          <Input
            label="Upazila"
            placeholder="Enter upazila"
            error={errors.upazila?.message}
            {...register("upazila")}
          />
          <Input
            label="Branch Name"
            placeholder="Enter branch name"
            error={errors.branchName?.message}
            {...register("branchName")}
          />
          <Input
            label="Branch Code (Optional)"
            placeholder="Enter branch code"
            {...register("branchCode")}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
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
                  CSV columns: Division, District, Upazila, Branch Name, Branch Code, Project Name, Cohort Name
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
    </div>
  );
}
