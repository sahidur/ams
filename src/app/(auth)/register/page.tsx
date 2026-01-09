"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Mail, Lock, User, Phone, KeyRound, ArrowLeft, Briefcase, Building2, Calendar, Search, Check, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Select } from "@/components/ui";
import { registerSchema, type RegisterInput } from "@/lib/validations";

interface Designation {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  cohorts: { id: string; cohortId: string; name: string }[];
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Designation dropdown state
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [designationSearch, setDesignationSearch] = useState("");
  const [isDesignationOpen, setIsDesignationOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const designationRef = useRef<HTMLDivElement>(null);

  // Project and Cohort dropdown state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const projectRef = useRef<HTMLDivElement>(null);

  const [isCohortOpen, setIsCohortOpen] = useState(false);
  const [cohortSearch, setCohortSearch] = useState("");
  const cohortRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const watchedProjectId = watch("projectId");
  const watchedCohortId = watch("cohortId");
  const selectedProject = projects.find(p => p.id === watchedProjectId);

  // Fetch designations
  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const res = await fetch("/api/designations?activeOnly=true");
        const data = await res.json();
        setDesignations(data);
      } catch (error) {
        console.error("Error fetching designations:", error);
      }
    };
    fetchDesignations();
  }, []);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects?activeOnly=true");
        const data = await res.json();
        setProjects(data);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (designationRef.current && !designationRef.current.contains(event.target as Node)) {
        setIsDesignationOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setIsProjectOpen(false);
      }
      if (cohortRef.current && !cohortRef.current.contains(event.target as Node)) {
        setIsCohortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter designations by search
  const filteredDesignations = designations.filter(d =>
    d.name.toLowerCase().includes(designationSearch.toLowerCase())
  );

  // Filter projects by search
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Filter cohorts by search
  const filteredCohorts = (selectedProject?.cohorts || []).filter(c =>
    c.name.toLowerCase().includes(cohortSearch.toLowerCase()) ||
    c.cohortId.toLowerCase().includes(cohortSearch.toLowerCase())
  );

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof RegisterInput)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ["name", "email", "phone", "dateOfBirth", "gender", "address"];
    } else if (step === 2) {
      fieldsToValidate = ["designation", "department", "employeeId", "joiningDate", "projectId", "cohortId"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Registration failed");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="shadow-xl border-0 text-center">
            <CardContent className="pt-10 pb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6"
              >
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your account has been created. Please wait for admin approval before you can log in.
              </p>
              <Link href="/login">
                <Button>Go to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-4"
            >
              <CalendarCheck className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Step {step} of 3: {step === 1 ? "Personal Information" : step === 2 ? "Job Information" : "Security"}
            </CardDescription>
            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-2 rounded-full transition-colors ${
                    s <= step ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Step 1: Personal Information */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Full name *"
                      className="pl-10"
                      error={errors.name?.message}
                      {...register("name")}
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email address *"
                      className="pl-10"
                      error={errors.email?.message}
                      {...register("email")}
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="Phone number (e.g., 01712345678) *"
                      className="pl-10"
                      error={errors.phone?.message}
                      {...register("phone")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                    <Input
                      type="date"
                      error={errors.dateOfBirth?.message}
                      {...register("dateOfBirth")}
                    />
                  </div>

                  <Select
                    label="Gender *"
                    error={errors.gender?.message}
                    {...register("gender")}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>

                  <Input
                    label="Address *"
                    placeholder="Your full address"
                    error={errors.address?.message}
                    {...register("address")}
                  />

                  <Button type="button" className="w-full" size="lg" onClick={handleNextStep}>
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Job Information */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  {/* Searchable Designation Dropdown */}
                  <div ref={designationRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                    <button
                      type="button"
                      onClick={() => setIsDesignationOpen(!isDesignationOpen)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.designation ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className={selectedDesignation ? "text-gray-900" : "text-gray-400"}>
                          {selectedDesignation || "Select designation"}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDesignationOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isDesignationOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={designationSearch}
                              onChange={(e) => setDesignationSearch(e.target.value)}
                              placeholder="Search designations..."
                              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredDesignations.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-500">No designations found</p>
                          ) : (
                            filteredDesignations.map(designation => (
                              <button
                                key={designation.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDesignation(designation.name);
                                  setValue("designation", designation.name, { shouldValidate: true });
                                  setIsDesignationOpen(false);
                                  setDesignationSearch("");
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                                  selectedDesignation === designation.name ? "bg-blue-50 text-blue-600" : ""
                                }`}
                              >
                                <span>{designation.name}</span>
                                {selectedDesignation === designation.name && <Check className="w-4 h-4 text-blue-600" />}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {errors.designation && (
                      <p className="mt-1 text-sm text-red-500">{errors.designation.message}</p>
                    )}
                    <input type="hidden" {...register("designation")} />
                  </div>

                  <Input
                    label="Department *"
                    placeholder="Your department"
                    error={errors.department?.message}
                    {...register("department")}
                  />

                  <div className="relative">
                    <Input
                      label="Employee ID *"
                      placeholder="Your employee ID"
                      error={errors.employeeId?.message}
                      {...register("employeeId")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                    <Input
                      type="date"
                      error={errors.joiningDate?.message}
                      {...register("joiningDate")}
                    />
                  </div>

                  {/* Searchable Project Dropdown */}
                  <div ref={projectRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                    <button
                      type="button"
                      onClick={() => setIsProjectOpen(!isProjectOpen)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.projectId ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className={watchedProjectId ? "text-gray-900" : "text-gray-400"}>
                          {selectedProject?.name || "Select project"}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProjectOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isProjectOpen && (
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
                          {filteredProjects.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-500">No projects found</p>
                          ) : (
                            filteredProjects.map(project => (
                              <button
                                key={project.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProjectId(project.id);
                                  setValue("projectId", project.id, { shouldValidate: true });
                                  setValue("cohortId", "", { shouldValidate: false });
                                  setIsProjectOpen(false);
                                  setProjectSearch("");
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                                  watchedProjectId === project.id ? "bg-blue-50 text-blue-600" : ""
                                }`}
                              >
                                <span>{project.name}</span>
                                {watchedProjectId === project.id && <Check className="w-4 h-4 text-blue-600" />}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {errors.projectId && (
                      <p className="mt-1 text-sm text-red-500">{errors.projectId.message}</p>
                    )}
                    <input type="hidden" {...register("projectId")} />
                  </div>

                  {/* Searchable Cohort Dropdown */}
                  <div ref={cohortRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cohort *</label>
                    <button
                      type="button"
                      onClick={() => watchedProjectId && setIsCohortOpen(!isCohortOpen)}
                      disabled={!watchedProjectId}
                      className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.cohortId ? "border-red-500" : "border-gray-300"
                      } ${!watchedProjectId ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-400" />
                        <span className={watchedCohortId ? "text-gray-900" : "text-gray-400"}>
                          {selectedProject?.cohorts.find(c => c.id === watchedCohortId)?.name || (watchedProjectId ? "Select cohort" : "Select project first")}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCohortOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isCohortOpen && (
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
                          {filteredCohorts.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-500">No cohorts found</p>
                          ) : (
                            filteredCohorts.map(cohort => (
                              <button
                                key={cohort.id}
                                type="button"
                                onClick={() => {
                                  setValue("cohortId", cohort.id, { shouldValidate: true });
                                  setIsCohortOpen(false);
                                  setCohortSearch("");
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                                  watchedCohortId === cohort.id ? "bg-blue-50 text-blue-600" : ""
                                }`}
                              >
                                <div>
                                  <span>{cohort.name}</span>
                                  <span className="ml-2 text-xs text-gray-400">({cohort.cohortId})</span>
                                </div>
                                {watchedCohortId === cohort.id && <Check className="w-4 h-4 text-blue-600" />}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {errors.cohortId && (
                      <p className="mt-1 text-sm text-red-500">{errors.cohortId.message}</p>
                    )}
                    <input type="hidden" {...register("cohortId")} />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={handlePrevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button type="button" className="flex-1" onClick={handleNextStep}>
                      Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Security */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="6-digit PIN *"
                      maxLength={6}
                      className="pl-10"
                      error={errors.pin?.message}
                      {...register("pin")}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Password *"
                      className="pl-10"
                      error={errors.password?.message}
                      {...register("password")}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Confirm password *"
                      className="pl-10"
                      error={errors.confirmPassword?.message}
                      {...register("confirmPassword")}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={handlePrevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" size="lg" isLoading={isLoading}>
                      Create Account
                    </Button>
                  </div>
                </motion.div>
              )}
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
