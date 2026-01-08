"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  GraduationCap, 
  X, 
  ChevronRight,
  ChevronLeft,
  FolderKanban,
  Layers,
  Building2,
  Search,
  Check
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Button, 
  Card, 
  CardContent, 
  Input, 
  Modal, 
  Badge,
  DataTable,
} from "@/components/ui";
import { batchSchema, type BatchFormData } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

interface Batch {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  branch: {
    id: string;
    branchName: string;
    upazila: string;
    district: string;
  };
  cohort?: {
    id: string;
    name: string;
    project?: {
      id: string;
      name: string;
    };
  };
  trainer?: {
    id: string;
    name: string;
  };
  _count: {
    students: number;
    classes: number;
  };
}

interface Branch {
  id: string;
  branchName: string;
  district: string;
  upazila: string;
  cohort?: {
    id: string;
    name: string;
  };
}

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

interface Trainer {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

// Trainer role name
const TRAINER_ROLE = "Trainer";

export default function BatchesPage() {
  const { data: session } = useSession();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);

  // Step-based form state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState("");
  
  // Searchable dropdowns state
  const [projectSearch, setProjectSearch] = useState("");
  const [cohortSearch, setCohortSearch] = useState("");
  const [trainerSearch, setTrainerSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isCohortDropdownOpen, setIsCohortDropdownOpen] = useState(false);
  const [isTrainerDropdownOpen, setIsTrainerDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  
  // Refs for dropdown click outside handling
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const cohortDropdownRef = useRef<HTMLDivElement>(null);
  const trainerDropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  const userRoleName = session?.user?.userRoleName || "";
  const isTrainer = userRoleName === TRAINER_ROLE;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
  });

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/users/my-projects?activeOnly=true");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches?activeOnly=true");
      const data = await res.json();
      setBranches(data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  }, []);

  const fetchTrainers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?role=TRAINER");
      const data = await res.json();
      setTrainers(data);
    } catch (error) {
      console.error("Error fetching trainers:", error);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/users?role=STUDENT");
      const data = await res.json();
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
    fetchUserProjects();
    fetchBranches();
    fetchTrainers();
    fetchStudents();
  }, [fetchBatches, fetchUserProjects, fetchBranches, fetchTrainers, fetchStudents]);

  // Filter branches based on selected cohort
  useEffect(() => {
    if (selectedCohortId) {
      const cohortBranches = branches.filter(b => b.cohort?.id === selectedCohortId);
      setFilteredBranches(cohortBranches);
      // Reset branch selection if not in filtered list
      if (!cohortBranches.find(b => b.id === selectedBranchId)) {
        setSelectedBranchId("");
        setValue("branchId", "");
      }
    } else {
      setFilteredBranches([]);
      setSelectedBranchId("");
      setValue("branchId", "");
    }
  }, [selectedCohortId, branches, selectedBranchId, setValue]);

  // Auto-fill trainer if user is a Trainer
  useEffect(() => {
    if (isTrainer && session?.user?.id && !editingBatch) {
      setSelectedTrainerId(session.user.id);
      setValue("trainerId", session.user.id);
    }
  }, [isTrainer, session?.user?.id, editingBatch, setValue]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (cohortDropdownRef.current && !cohortDropdownRef.current.contains(event.target as Node)) {
        setIsCohortDropdownOpen(false);
      }
      if (trainerDropdownRef.current && !trainerDropdownRef.current.contains(event.target as Node)) {
        setIsTrainerDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get cohorts for selected project
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const cohorts = selectedProject?.cohorts || [];

  // Get selected entities for display
  const selectedProjectName = selectedProject?.name || "";
  const selectedCohortName = cohorts.find(c => c.id === selectedCohortId)?.name || "";
  const selectedTrainerName = trainers.find(t => t.id === selectedTrainerId)?.name || "";
  const selectedBranchName = filteredBranches.find(b => b.id === selectedBranchId)?.branchName || "";

  // Filtered lists for search
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );
  const filteredCohorts = cohorts.filter(c => 
    c.name.toLowerCase().includes(cohortSearch.toLowerCase()) ||
    c.cohortId.toLowerCase().includes(cohortSearch.toLowerCase())
  );
  const filteredTrainers = trainers.filter(t => 
    t.name.toLowerCase().includes(trainerSearch.toLowerCase())
  );
  const filteredBranchList = filteredBranches.filter(b => 
    b.branchName.toLowerCase().includes(branchSearch.toLowerCase()) ||
    b.district.toLowerCase().includes(branchSearch.toLowerCase()) ||
    b.upazila.toLowerCase().includes(branchSearch.toLowerCase())
  );

  const openModal = (batch?: Batch) => {
    if (batch) {
      setEditingBatch(batch);
      setSelectedProjectId(batch.cohort?.project?.id || "");
      setSelectedCohortId(batch.cohort?.id || "");
      setSelectedBranchId(batch.branch.id);
      setSelectedTrainerId(batch.trainer?.id || "");
      setCurrentStep(3); // Skip to step 3 when editing
      reset({
        name: batch.name,
        branchId: batch.branch.id,
        cohortId: batch.cohort?.id,
        trainerId: batch.trainer?.id,
        startDate: batch.startDate.split("T")[0],
        endDate: batch.endDate.split("T")[0],
      });
    } else {
      setEditingBatch(null);
      setSelectedProjectId("");
      setSelectedCohortId("");
      setSelectedBranchId("");
      setSelectedTrainerId(isTrainer && session?.user?.id ? session.user.id : "");
      setCurrentStep(1);
      reset({
        name: "",
        branchId: "",
        cohortId: "",
        trainerId: isTrainer && session?.user?.id ? session.user.id : "",
        startDate: "",
        endDate: "",
      });
    }
    setProjectSearch("");
    setCohortSearch("");
    setTrainerSearch("");
    setBranchSearch("");
    setIsModalOpen(true);
  };

  const openStudentModal = async (batch: Batch) => {
    setSelectedBatch(batch);
    try {
      const res = await fetch(`/api/batches/${batch.id}/students`);
      const data = await res.json();
      setBatchStudents(data);
      setSelectedStudents(data.map((s: Student) => s.id));
    } catch (error) {
      console.error("Error fetching batch students:", error);
    }
    setIsStudentModalOpen(true);
  };

  const nextStep = () => {
    if (currentStep === 1 && selectedProjectId) {
      setCurrentStep(2);
    } else if (currentStep === 2 && selectedCohortId) {
      setValue("cohortId", selectedCohortId);
      setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: BatchFormData) => {
    try {
      const submitData = {
        ...data,
        branchId: selectedBranchId,
        cohortId: selectedCohortId,
        trainerId: selectedTrainerId || undefined,
      };

      const url = editingBatch
        ? `/api/batches/${editingBatch.id}`
        : "/api/batches";
      const method = editingBatch ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        fetchBatches();
        setIsModalOpen(false);
        reset();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save batch");
      }
    } catch (error) {
      console.error("Error saving batch:", error);
    }
  };

  const deleteBatch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this batch?")) return;

    try {
      await fetch(`/api/batches/${id}`, { method: "DELETE" });
      fetchBatches();
    } catch (error) {
      console.error("Error deleting batch:", error);
    }
  };

  const updateBatchStudents = async () => {
    if (!selectedBatch) return;

    try {
      await fetch(`/api/batches/${selectedBatch.id}/students`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });
      fetchBatches();
      setIsStudentModalOpen(false);
    } catch (error) {
      console.error("Error updating students:", error);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const columns: ColumnDef<Batch>[] = [
    {
      accessorKey: "name",
      header: "Batch Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "cohort.project.name",
      header: "Project",
      cell: ({ row }) => row.original.cohort?.project?.name || "-",
    },
    {
      accessorKey: "cohort.name",
      header: "Cohort",
      cell: ({ row }) => row.original.cohort?.name || "-",
    },
    {
      accessorKey: "branch.branchName",
      header: "Branch",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.branch.branchName}</p>
          <p className="text-xs text-gray-500">
            {row.original.branch.upazila}, {row.original.branch.district}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "trainer.name",
      header: "Trainer",
      cell: ({ row }) => (
        row.original.trainer ? (
          <Badge variant="info">{row.original.trainer.name}</Badge>
        ) : "-"
      ),
    },
    {
      accessorKey: "startDate",
      header: "Duration",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{formatDate(row.original.startDate)}</p>
          <p className="text-gray-500">to {formatDate(row.original.endDate)}</p>
        </div>
      ),
    },
    {
      accessorKey: "_count.students",
      header: "Students",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openStudentModal(row.original)}
        >
          <Users className="w-4 h-4 mr-1" />
          {row.original._count.students}
        </Button>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal(row.original)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => deleteBatch(row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Step indicator
  const steps = [
    { number: 1, title: "Project", icon: FolderKanban },
    { number: 2, title: "Cohort", icon: Layers },
    { number: 3, title: "Details", icon: GraduationCap },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Batches</h1>
          <p className="text-gray-500 mt-1">Manage training batches and students</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Batch
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{batches.length}</p>
                <p className="text-sm text-gray-500">Total Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {batches.reduce((acc, b) => acc + b._count.students, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{trainers.length}</p>
                <p className="text-sm text-gray-500">Active Trainers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={batches}
              searchPlaceholder="Search batches..."
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal with Steps */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBatch ? "Edit Batch" : "Add Batch"}
        size="lg"
      >
        {/* Step Indicator */}
        {!editingBatch && (
          <div className="flex items-center justify-center mb-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  currentStep === step.number 
                    ? "bg-blue-100 text-blue-700" 
                    : currentStep > step.number 
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                }`}>
                  {currentStep > step.number ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Step 1: Select Project */}
          {currentStep === 1 && !editingBatch && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Select Project</h3>
                <p className="text-sm text-gray-500">Choose the project for this batch</p>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No projects assigned to you</p>
                  <p className="text-sm text-gray-400">Contact admin for project assignment</p>
                </div>
              ) : (
                <div ref={projectDropdownRef} className="relative">
                  <div 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors"
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-5 h-5 text-gray-400" />
                      <span className={selectedProjectName ? "text-gray-900" : "text-gray-400"}>
                        {selectedProjectName || "Select a project..."}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isProjectDropdownOpen ? "rotate-90" : ""}`} />
                  </div>

                  <AnimatePresence>
                    {isProjectDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden"
                      >
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search projects..."
                              value={projectSearch}
                              onChange={(e) => setProjectSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {filteredProjects.map((project) => (
                            <div
                              key={project.id}
                              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                                selectedProjectId === project.id ? "bg-blue-50" : ""
                              }`}
                              onClick={() => {
                                setSelectedProjectId(project.id);
                                setSelectedCohortId("");
                                setIsProjectDropdownOpen(false);
                                setProjectSearch("");
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <FolderKanban className="w-4 h-4 text-blue-500" />
                                <span className="font-medium">{project.name}</span>
                              </div>
                              <Badge variant="info">{project.cohorts.length} cohorts</Badge>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!selectedProjectId}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Cohort */}
          {currentStep === 2 && !editingBatch && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Select Cohort</h3>
                <p className="text-sm text-gray-500">
                  Choose a cohort from <span className="font-medium text-blue-600">{selectedProjectName}</span>
                </p>
              </div>

              {cohorts.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No cohorts available in this project</p>
                </div>
              ) : (
                <div ref={cohortDropdownRef} className="relative">
                  <div 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors"
                    onClick={() => setIsCohortDropdownOpen(!isCohortDropdownOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-gray-400" />
                      <span className={selectedCohortName ? "text-gray-900" : "text-gray-400"}>
                        {selectedCohortName || "Select a cohort..."}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isCohortDropdownOpen ? "rotate-90" : ""}`} />
                  </div>

                  <AnimatePresence>
                    {isCohortDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden"
                      >
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search cohorts..."
                              value={cohortSearch}
                              onChange={(e) => setCohortSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {filteredCohorts.map((cohort) => (
                            <div
                              key={cohort.id}
                              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                                selectedCohortId === cohort.id ? "bg-blue-50" : ""
                              }`}
                              onClick={() => {
                                setSelectedCohortId(cohort.id);
                                setIsCohortDropdownOpen(false);
                                setCohortSearch("");
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-green-500" />
                                <span className="font-medium">{cohort.name}</span>
                              </div>
                              <Badge variant="default">{cohort.cohortId}</Badge>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!selectedCohortId}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Batch Details */}
          {(currentStep === 3 || editingBatch) && (
            <div className="space-y-4">
              {!editingBatch && (
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <FolderKanban className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{selectedProjectName}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center gap-1">
                      <Layers className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{selectedCohortName}</span>
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Batch Name"
                {...register("name")}
                error={errors.name?.message}
              />

              {/* Searchable Branch Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <div ref={branchDropdownRef} className="relative">
                  <div 
                    className={`w-full px-4 py-2.5 border rounded-lg cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors ${
                      errors.branchId ? "border-red-300" : "border-gray-300"
                    }`}
                    onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className={selectedBranchName ? "text-gray-900" : "text-gray-400"}>
                        {selectedBranchName || (filteredBranches.length === 0 ? "No branches in this cohort" : "Select branch...")}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isBranchDropdownOpen ? "rotate-90" : ""}`} />
                  </div>

                  <AnimatePresence>
                    {isBranchDropdownOpen && filteredBranches.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-hidden"
                      >
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search branches..."
                              value={branchSearch}
                              onChange={(e) => setBranchSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-36">
                          {filteredBranchList.map((branch) => (
                            <div
                              key={branch.id}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                                selectedBranchId === branch.id ? "bg-blue-50" : ""
                              }`}
                              onClick={() => {
                                setSelectedBranchId(branch.id);
                                setValue("branchId", branch.id);
                                setIsBranchDropdownOpen(false);
                                setBranchSearch("");
                              }}
                            >
                              <p className="font-medium">{branch.branchName}</p>
                              <p className="text-xs text-gray-500">{branch.upazila}, {branch.district}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {errors.branchId && <p className="text-sm text-red-500 mt-1">{errors.branchId.message}</p>}
              </div>

              {/* Searchable Trainer Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trainer {isTrainer && "(Auto-filled)"}
                </label>
                <div ref={trainerDropdownRef} className="relative">
                  <div 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors"
                    onClick={() => setIsTrainerDropdownOpen(!isTrainerDropdownOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className={selectedTrainerName ? "text-gray-900" : "text-gray-400"}>
                        {selectedTrainerName || "Select trainer..."}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isTrainerDropdownOpen ? "rotate-90" : ""}`} />
                  </div>

                  <AnimatePresence>
                    {isTrainerDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-hidden"
                      >
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search trainers..."
                              value={trainerSearch}
                              onChange={(e) => setTrainerSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-36">
                          {filteredTrainers.map((trainer) => (
                            <div
                              key={trainer.id}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${
                                selectedTrainerId === trainer.id ? "bg-blue-50" : ""
                              }`}
                              onClick={() => {
                                setSelectedTrainerId(trainer.id);
                                setValue("trainerId", trainer.id);
                                setIsTrainerDropdownOpen(false);
                                setTrainerSearch("");
                              }}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                {trainer.name.charAt(0)}
                              </div>
                              <span className="font-medium">{trainer.name}</span>
                              {trainer.id === session?.user?.id && (
                                <Badge variant="info" className="ml-auto">You</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Start Date"
                  {...register("startDate")}
                  error={errors.startDate?.message}
                />
                <Input
                  type="date"
                  label="End Date"
                  {...register("endDate")}
                  error={errors.endDate?.message}
                />
              </div>

              <div className="flex justify-between pt-4">
                {!editingBatch && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <div className={`flex gap-2 ${editingBatch ? "w-full justify-end" : ""}`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    {editingBatch ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Student Assignment Modal */}
      <AnimatePresence>
        {isStudentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsStudentModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">
                  Manage Students - {selectedBatch?.name}
                </h2>
                <button
                  onClick={() => setIsStudentModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <div className="space-y-2">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedStudents.includes(student.id)
                          ? "bg-blue-50 border-2 border-blue-300"
                          : "bg-gray-50 border border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => {}}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <p className="text-sm text-gray-500">
                  {selectedStudents.length} students selected
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsStudentModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={updateBatchStudents}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
