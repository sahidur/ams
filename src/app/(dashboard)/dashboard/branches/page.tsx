"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { Plus, Pencil, Trash2, MoreHorizontal, Upload, FileSpreadsheet, MapPin } from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  DataTable, 
  Modal, 
  Input 
} from "@/components/ui";
import { branchSchema, type BranchInput } from "@/lib/validations";

interface Branch {
  id: string;
  division: string;
  district: string;
  upazila: string;
  branchName: string;
  branchCode: string | null;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<BranchInput[]>([]);
  const [uploadError, setUploadError] = useState("");

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

  useEffect(() => {
    fetchBranches();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Record<string, string>[];
          const validData: BranchInput[] = [];
          
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
        body: JSON.stringify({ branches: uploadData }),
      });

      if (res.ok) {
        fetchBranches();
        setIsUploadModalOpen(false);
        setUploadData([]);
      }
    } catch (error) {
      console.error("Error uploading branches:", error);
    }
  };

  const onSubmit = async (data: BranchInput) => {
    try {
      const url = selectedBranch 
        ? `/api/branches/${selectedBranch.id}` 
        : "/api/branches";
      const method = selectedBranch ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        fetchBranches();
        closeModal();
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
    reset();
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
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
          <p className="text-gray-500 mt-1">Manage branches by location</p>
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
        onClose={() => { setIsUploadModalOpen(false); setUploadData([]); setUploadError(""); }}
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
                  CSV should have columns: Division, District, Upazila, Branch Name, Branch Code
                </p>
              </>
            )}
          </div>

          {uploadError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {uploadError}
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
                    </tr>
                  </thead>
                  <tbody>
                    {uploadData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{row.division}</td>
                        <td className="px-3 py-2">{row.district}</td>
                        <td className="px-3 py-2">{row.upazila}</td>
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
              onClick={() => { setIsUploadModalOpen(false); setUploadData([]); setUploadError(""); }} 
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
