"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  FileText,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileArchive,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
} from "lucide-react";
import { Button, Card, Input, Badge } from "@/components/ui";

interface Project {
  id: string;
  name: string;
  donorName: string;
  startDate: string;
  endDate: string;
}

interface Cohort {
  id: string;
  cohortId: string;
  name: string;
  projectId: string;
}

interface FileDepartment {
  id: string;
  name: string;
}

interface FileType {
  id: string;
  name: string;
  departmentId: string | null;
}

// Get file icon based on mime type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return FileSpreadsheet;
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("compressed")) return FileArchive;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function CreateKnowledgeBasePage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");
  const [selectedDonors, setSelectedDonors] = useState<string[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("");
  const [customDonor, setCustomDonor] = useState("");

  // Dropdown data
  const [projects, setProjects] = useState<Project[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [departments, setDepartments] = useState<FileDepartment[]>([]);
  const [fileTypes, setFileTypes] = useState<FileType[]>([]);
  const [allDonors, setAllDonors] = useState<string[]>([]);

  // Filtered cohorts based on selected projects
  const filteredCohorts = selectedProjects.length > 0
    ? cohorts.filter(c => selectedProjects.includes(c.projectId))
    : cohorts;

  // Filtered file types based on selected department
  const filteredFileTypes = selectedDepartment
    ? fileTypes.filter(t => t.departmentId === selectedDepartment || !t.departmentId)
    : fileTypes;

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [projectsRes, cohortsRes, departmentsRes, fileTypesRes] = await Promise.all([
          fetch("/api/projects?activeOnly=true"),
          fetch("/api/cohorts?activeOnly=true"),
          fetch("/api/file-departments?activeOnly=true"),
          fetch("/api/file-types?activeOnly=true"),
        ]);

        if (projectsRes.ok) {
          const projectData = await projectsRes.json();
          setProjects(projectData);
          // Extract unique donors from projects
          const donors = [...new Set(projectData.map((p: Project) => p.donorName).filter(Boolean))] as string[];
          setAllDonors(donors);
        }
        if (cohortsRes.ok) setCohorts(await cohortsRes.json());
        if (departmentsRes.ok) setDepartments(await departmentsRes.json());
        if (fileTypesRes.ok) setFileTypes(await fileTypesRes.json());
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };
    fetchDropdownData();
  }, []);

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      // Check file size (2GB limit)
      const maxSize = 2 * 1024 * 1024 * 1024;
      if (uploadedFile.size > maxSize) {
        setError("File size exceeds 2GB limit");
        return;
      }
      setFile(uploadedFile);
      setError(null);
      // Auto-fill file name if empty
      if (!fileName) {
        const nameWithoutExt = uploadedFile.name.replace(/\.[^/.]+$/, "");
        setFileName(nameWithoutExt);
      }
    }
  }, [fileName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    if (!fileName.trim()) {
      setError("File name is required");
      return;
    }
    if (!fileDescription.trim()) {
      setError("File description is required");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", fileName.trim());
      formData.append("fileDescription", fileDescription.trim());
      if (selectedDepartment) formData.append("departmentId", selectedDepartment);
      if (selectedFileType) formData.append("fileTypeId", selectedFileType);
      if (yearFrom) formData.append("yearFrom", yearFrom);
      if (yearTo) formData.append("yearTo", yearTo);
      if (vendorName.trim()) formData.append("vendorName", vendorName.trim());
      formData.append("donorNames", JSON.stringify(selectedDonors));
      formData.append("projectIds", JSON.stringify(selectedProjects));
      formData.append("cohortIds", JSON.stringify(selectedCohorts));

      // Use XMLHttpRequest for real upload progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || "Failed to upload file"));
            } catch {
              reject(new Error("Failed to upload file"));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("timeout", () => {
          reject(new Error("Upload timed out. Please try again."));
        });

        xhr.open("POST", "/api/knowledge-base");
        xhr.timeout = 30 * 60 * 1000; // 30 minutes timeout
        xhr.send(formData);
      });

      await uploadPromise;

      setUploadProgress(100);
      setSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard/knowledge-base");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // Handle select all projects
  const handleSelectAllProjects = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map(p => p.id));
    }
  };

  // Handle select all cohorts
  const handleSelectAllCohorts = () => {
    if (selectedCohorts.length === filteredCohorts.length) {
      setSelectedCohorts([]);
    } else {
      setSelectedCohorts(filteredCohorts.map(c => c.id));
    }
  };

  // Add custom donor
  const addCustomDonor = () => {
    if (customDonor.trim() && !selectedDonors.includes(customDonor.trim())) {
      setSelectedDonors([...selectedDonors, customDonor.trim()]);
      setCustomDonor("");
    }
  };

  // Remove donor
  const removeDonor = (donor: string) => {
    setSelectedDonors(selectedDonors.filter(d => d !== donor));
  };

  // Set year range from selected projects
  useEffect(() => {
    if (selectedProjects.length > 0) {
      const selectedProjectData = projects.filter(p => selectedProjects.includes(p.id));
      if (selectedProjectData.length > 0) {
        const minYear = Math.min(...selectedProjectData.map(p => new Date(p.startDate).getFullYear()));
        const maxYear = Math.max(...selectedProjectData.map(p => new Date(p.endDate).getFullYear()));
        if (!yearFrom) setYearFrom(minYear.toString());
        if (!yearTo) setYearTo(maxYear.toString());
      }
    }
  }, [selectedProjects, projects, yearFrom, yearTo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Upload Document
            </h1>
            <p className="text-gray-600 mt-1">
              Add a new document to the knowledge base
            </p>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Upload Successful!</p>
              <p className="text-sm text-green-600">Redirecting to knowledge base...</p>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-600" />
            </button>
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* File Upload */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h2>
              
              {!file ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
                  </p>
                  <p className="text-gray-500 mb-4">or click to browse</p>
                  <p className="text-sm text-gray-400">
                    Supports all file types • Max 2GB
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    {(() => {
                      const FileIcon = getFileIcon(file.type);
                      return <FileIcon className="w-6 h-6 text-blue-600" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFile(null)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Uploading...</span>
                    <span className="font-medium text-blue-600">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* File Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">File Details</h2>
              
              <div className="space-y-4">
                {/* File Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Enter a descriptive name for the file"
                    required
                  />
                </div>

                {/* File Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    placeholder="Provide a detailed description of the file content..."
                    rows={4}
                    className="w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Project & Cohort Selection */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Project & Cohort</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Projects */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Projects</label>
                    <button
                      type="button"
                      onClick={handleSelectAllProjects}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {selectedProjects.length === projects.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {projects.map((project) => (
                      <label
                        key={project.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjects([...selectedProjects, project.id]);
                            } else {
                              setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{project.name}</span>
                      </label>
                    ))}
                    {projects.length === 0 && (
                      <p className="p-3 text-sm text-gray-500">No projects available</p>
                    )}
                  </div>
                  {selectedProjects.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {selectedProjects.length} project(s) selected
                    </p>
                  )}
                </div>

                {/* Cohorts */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Cohorts</label>
                    <button
                      type="button"
                      onClick={handleSelectAllCohorts}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {selectedCohorts.length === filteredCohorts.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredCohorts.map((cohort) => (
                      <label
                        key={cohort.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCohorts.includes(cohort.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCohorts([...selectedCohorts, cohort.id]);
                            } else {
                              setSelectedCohorts(selectedCohorts.filter(id => id !== cohort.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{cohort.name} ({cohort.cohortId})</span>
                      </label>
                    ))}
                    {filteredCohorts.length === 0 && (
                      <p className="p-3 text-sm text-gray-500">
                        {selectedProjects.length > 0
                          ? "No cohorts for selected projects"
                          : "No cohorts available"}
                      </p>
                    )}
                  </div>
                  {selectedCohorts.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {selectedCohorts.length} cohort(s) selected
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Metadata */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Year Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year Range</label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={yearFrom}
                      onChange={(e) => setYearFrom(e.target.value)}
                      placeholder="From"
                      min="2000"
                      max="2100"
                    />
                    <span className="text-gray-400">to</span>
                    <Input
                      type="number"
                      value={yearTo}
                      onChange={(e) => setYearTo(e.target.value)}
                      placeholder="To"
                      min="2000"
                      max="2100"
                    />
                  </div>
                </div>

                {/* Vendor Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Name (Optional)
                  </label>
                  <Input
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Enter vendor name"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedFileType(""); // Reset file type when department changes
                    }}
                    className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* File Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Type
                  </label>
                  <select
                    value={selectedFileType}
                    onChange={(e) => setSelectedFileType(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select File Type</option>
                    {filteredFileTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Donors */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Donor Names (Optional)
                </label>
                
                {/* Selected Donors */}
                {selectedDonors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedDonors.map((donor) => (
                      <Badge
                        key={donor}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {donor}
                        <button
                          type="button"
                          onClick={() => removeDonor(donor)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Donor Selection */}
                <div className="flex items-center gap-3">
                  <select
                    onChange={(e) => {
                      if (e.target.value && !selectedDonors.includes(e.target.value)) {
                        setSelectedDonors([...selectedDonors, e.target.value]);
                      }
                      e.target.value = "";
                    }}
                    className="flex-1 border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">Select from existing donors...</option>
                    {allDonors
                      .filter(d => !selectedDonors.includes(d))
                      .map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                  </select>
                  <span className="text-gray-400">or</span>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={customDonor}
                      onChange={(e) => setCustomDonor(e.target.value)}
                      placeholder="Add custom donor"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomDonor();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomDonor}
                      disabled={!customDonor.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || !file}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white min-w-32"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
