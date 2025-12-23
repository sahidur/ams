"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  CalendarCheck, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  KeyRound,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Shield,
  Users,
  Building2,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  MapPin,
  Calendar,
  IdCard,
  Building,
  Check,
  FolderKanban,
  Layers
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { loginSchema, type LoginInput } from "@/lib/validations";

// Bangladesh phone number regex
const bangladeshPhoneRegex = /^(?:\+?880|0)1[3-9]\d{8}$/;

// Step schemas for validation - ALL MANDATORY
const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(bangladeshPhoneRegex, "Invalid Bangladesh phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

const step2Schema = z.object({
  designation: z.string().min(2, "Designation is required"),
  department: z.string().min(2, "Department is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  projectId: z.string().min(1, "Project is required"),
  cohortId: z.string().min(1, "Cohort is required"),
});

const step3Schema = z.object({
  pin: z.string().length(6, "PIN must be exactly 6 digits").regex(/^\d{6}$/, "PIN must be 6 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

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
}

type TabType = "login" | "signup";
type StatusType = "idle" | "loading" | "success" | "error";

const steps = [
  { id: 1, name: "Personal", icon: User },
  { id: 2, name: "Job Info", icon: Briefcase },
  { id: 3, name: "Security", icon: Lock },
];

export default function AuthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("login");
  const [authStatus, setAuthStatus] = useState<StatusType>("idle");
  const [message, setMessage] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data>>({});

  // Project/Cohort state
  const [projects, setProjects] = useState<Project[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [cohortsLoading, setCohortsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Fetch projects when switching to signup tab or step 2
  useEffect(() => {
    if (activeTab === "signup") {
      fetchProjects();
    }
  }, [activeTab]);

  // Fetch cohorts when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchCohorts(selectedProjectId);
    } else {
      setCohorts([]);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchCohorts = async (projectId: string) => {
    setCohortsLoading(true);
    setCohorts([]);
    step2Form.setValue("cohortId", "");
    try {
      const res = await fetch(`/api/cohorts?projectId=${projectId}&activeOnly=true`);
      if (res.ok) {
        const data = await res.json();
        setCohorts(data);
      }
    } catch (error) {
      console.error("Error fetching cohorts:", error);
    } finally {
      setCohortsLoading(false);
    }
  };

  // Login form
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // Step forms
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: formData,
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: formData,
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: formData,
  });

  const handleLogin = async (data: LoginInput) => {
    setAuthStatus("loading");
    setMessage("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        setAuthStatus("error");
        setMessage(result.error);
        setTimeout(() => setAuthStatus("idle"), 3000);
      } else {
        setAuthStatus("success");
        setMessage("Login successful! Redirecting...");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      }
    } catch {
      setAuthStatus("error");
      setMessage("An unexpected error occurred");
      setTimeout(() => setAuthStatus("idle"), 3000);
    }
  };

  const handleStep1Submit = (data: Step1Data) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleStep2Submit = (data: Step2Data) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleStep3Submit = async (data: Step3Data) => {
    const finalData = { ...formData, ...data };
    setAuthStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      const result = await res.json();

      if (!res.ok) {
        setAuthStatus("error");
        setMessage(result.error || "Registration failed");
        setTimeout(() => setAuthStatus("idle"), 4000);
      } else {
        setAuthStatus("success");
        setMessage("Account created successfully!");
        setTimeout(() => {
          setRegistrationSuccess(true);
        }, 500);
      }
    } catch {
      setAuthStatus("error");
      setMessage("An unexpected error occurred");
      setTimeout(() => setAuthStatus("idle"), 3000);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setAuthStatus("idle");
    setMessage("");
    setRegistrationSuccess(false);
    setCurrentStep(1);
    setFormData({});
    setSelectedProjectId("");
    setCohorts([]);
    loginForm.reset();
    step1Form.reset();
    step2Form.reset();
    step3Form.reset();
  };

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-400">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // Registration success screen
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
            className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-6 shadow-lg"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-slate-900 mb-2"
          >
            Registration Successful!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-slate-600 mb-6"
          >
            Your account has been created. Please wait for admin approval before you can log in.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button 
              onClick={() => switchTab("login")} 
              className="w-full"
              size="lg"
            >
              Go to Login
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-12"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <CalendarCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AMS</h1>
              <p className="text-slate-400 text-sm">Attendance Management System</p>
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Manage Your Workforce
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Seamlessly
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-md">
              AI-powered attendance tracking with face recognition, role-based access, and beautiful dashboards.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-4"
          >
            {[
              { icon: Sparkles, text: "AI-Powered Face Recognition" },
              { icon: Shield, text: "Role-Based Access Control" },
              { icon: Users, text: "Team & Student Management" },
              { icon: Building2, text: "Multi-Branch Support" },
            ].map((feature, index) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-3 text-slate-300"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <span>{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <CalendarCheck className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AMS</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => switchTab("login")}
                className={`flex-1 py-4 text-center font-medium transition-all relative ${
                  activeTab === "login"
                    ? "text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Sign In
                {activeTab === "login" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
              <button
                onClick={() => switchTab("signup")}
                className={`flex-1 py-4 text-center font-medium transition-all relative ${
                  activeTab === "signup"
                    ? "text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Create Account
                {activeTab === "signup" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 lg:p-8">
              {/* Status Messages */}
              <AnimatePresence mode="wait">
                {authStatus !== "idle" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                      authStatus === "loading"
                        ? "bg-blue-50 border border-blue-200"
                        : authStatus === "success"
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    {authStatus === "loading" && (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                    )}
                    {authStatus === "success" && (
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    )}
                    {authStatus === "error" && (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        authStatus === "loading"
                          ? "text-blue-700"
                          : authStatus === "success"
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {authStatus === "loading" ? "Please wait..." : message}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {activeTab === "login" ? (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={loginForm.handleSubmit(handleLogin)}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          className="pl-12 h-12"
                          error={loginForm.formState.errors.email?.message}
                          {...loginForm.register("email")}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="pl-12 h-12"
                          error={loginForm.formState.errors.password?.message}
                          {...loginForm.register("password")}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-medium"
                      disabled={authStatus === "loading"}
                    >
                      {authStatus === "loading" ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Step Indicator */}
                    <div className="flex items-center justify-between mb-8">
                      {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                currentStep > step.id
                                  ? "bg-emerald-500 text-white"
                                  : currentStep === step.id
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {currentStep > step.id ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <step.icon className="w-5 h-5" />
                              )}
                            </div>
                            <span
                              className={`text-xs mt-1 font-medium ${
                                currentStep >= step.id
                                  ? "text-slate-700"
                                  : "text-slate-400"
                              }`}
                            >
                              {step.name}
                            </span>
                          </div>
                          {index < steps.length - 1 && (
                            <div
                              className={`w-12 lg:w-16 h-0.5 mx-2 mb-5 ${
                                currentStep > step.id
                                  ? "bg-emerald-500"
                                  : "bg-slate-200"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Step 1: Personal Information */}
                    <AnimatePresence mode="wait">
                      {currentStep === 1 && (
                        <motion.form
                          key="step1"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          onSubmit={step1Form.handleSubmit(handleStep1Submit)}
                          className="space-y-4"
                        >
                          <h3 className="text-lg font-semibold text-slate-800 mb-4">Personal Information</h3>
                          
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input
                                placeholder="Enter your full name"
                                className="pl-10 h-11"
                                error={step1Form.formState.errors.name?.message}
                                {...step1Form.register("name")}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input
                                type="email"
                                placeholder="Enter your email"
                                className="pl-10 h-11"
                                error={step1Form.formState.errors.email?.message}
                                {...step1Form.register("email")}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input
                                type="tel"
                                placeholder="e.g., 01712345678"
                                className="pl-10 h-11"
                                error={step1Form.formState.errors.phone?.message}
                                {...step1Form.register("phone")}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                  type="date"
                                  className="pl-10 h-11"
                                  error={step1Form.formState.errors.dateOfBirth?.message}
                                  {...step1Form.register("dateOfBirth")}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                              <select
                                className={`flex h-11 w-full rounded-lg border bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  step1Form.formState.errors.gender ? "border-red-500" : "border-gray-300"
                                }`}
                                {...step1Form.register("gender")}
                              >
                                <option value="">Select</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                              </select>
                              {step1Form.formState.errors.gender && (
                                <p className="text-xs text-red-500 mt-1">{step1Form.formState.errors.gender.message}</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                              <textarea
                                placeholder="Enter your full address"
                                className={`flex min-h-[80px] w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  step1Form.formState.errors.address ? "border-red-500" : "border-gray-300"
                                }`}
                                {...step1Form.register("address")}
                              />
                            </div>
                            {step1Form.formState.errors.address && (
                              <p className="text-xs text-red-500 mt-1">{step1Form.formState.errors.address.message}</p>
                            )}
                          </div>

                          <Button type="submit" className="w-full h-11 mt-4">
                            Next Step
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </motion.form>
                      )}

                      {/* Step 2: Job Information */}
                      {currentStep === 2 && (
                        <motion.form
                          key="step2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          onSubmit={step2Form.handleSubmit(handleStep2Submit)}
                          className="space-y-4"
                        >
                          <h3 className="text-lg font-semibold text-slate-800 mb-4">Job Information</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID *</label>
                              <div className="relative">
                                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                  placeholder="Enter employee ID"
                                  className="pl-10 h-11"
                                  error={step2Form.formState.errors.employeeId?.message}
                                  {...step2Form.register("employeeId")}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Joining Date *</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                  type="date"
                                  className="pl-10 h-11"
                                  error={step2Form.formState.errors.joiningDate?.message}
                                  {...step2Form.register("joiningDate")}
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Designation *</label>
                            <div className="relative">
                              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input
                                placeholder="e.g., Software Engineer"
                                className="pl-10 h-11"
                                error={step2Form.formState.errors.designation?.message}
                                {...step2Form.register("designation")}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                            <div className="relative">
                              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input
                                placeholder="e.g., Engineering"
                                className="pl-10 h-11"
                                error={step2Form.formState.errors.department?.message}
                                {...step2Form.register("department")}
                              />
                            </div>
                          </div>

                          {/* Project Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
                            <div className="relative">
                              <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              {projectsLoading ? (
                                <div className="flex h-11 w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-4 py-2 text-sm items-center">
                                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                                  <span className="text-gray-400">Loading projects...</span>
                                </div>
                              ) : (
                                <select
                                  className={`flex h-11 w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    step2Form.formState.errors.projectId ? "border-red-500" : "border-gray-300"
                                  }`}
                                  {...step2Form.register("projectId")}
                                  onChange={(e) => {
                                    step2Form.setValue("projectId", e.target.value);
                                    setSelectedProjectId(e.target.value);
                                  }}
                                >
                                  <option value="">Select a project</option>
                                  {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                      {project.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {step2Form.formState.errors.projectId && (
                              <p className="text-xs text-red-500 mt-1">{step2Form.formState.errors.projectId.message}</p>
                            )}
                          </div>

                          {/* Cohort Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cohort *</label>
                            <div className="relative">
                              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              {cohortsLoading ? (
                                <div className="flex h-11 w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-4 py-2 text-sm items-center">
                                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                                  <span className="text-gray-400">Loading cohorts...</span>
                                </div>
                              ) : !selectedProjectId ? (
                                <div className="flex h-11 w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-4 py-2 text-sm items-center text-gray-400">
                                  Select a project first
                                </div>
                              ) : cohorts.length === 0 ? (
                                <div className="flex h-11 w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-4 py-2 text-sm items-center text-gray-400">
                                  No cohorts available
                                </div>
                              ) : (
                                <select
                                  className={`flex h-11 w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    step2Form.formState.errors.cohortId ? "border-red-500" : "border-gray-300"
                                  }`}
                                  {...step2Form.register("cohortId")}
                                >
                                  <option value="">Select a cohort</option>
                                  {cohorts.map((cohort) => (
                                    <option key={cohort.id} value={cohort.id}>
                                      {cohort.name} ({cohort.cohortId})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {step2Form.formState.errors.cohortId && (
                              <p className="text-xs text-red-500 mt-1">{step2Form.formState.errors.cohortId.message}</p>
                            )}
                          </div>

                          <div className="flex gap-3 mt-6">
                            <Button type="button" variant="outline" onClick={goBack} className="flex-1 h-11">
                              <ChevronLeft className="w-4 h-4 mr-2" />
                              Back
                            </Button>
                            <Button type="submit" className="flex-1 h-11">
                              Next Step
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </motion.form>
                      )}

                      {/* Step 3: Security */}
                      {currentStep === 3 && (
                        <motion.form
                          key="step3"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          onSubmit={step3Form.handleSubmit(handleStep3Submit)}
                          className="space-y-4"
                        >
                          <h3 className="text-lg font-semibold text-slate-800 mb-4">Security Details</h3>
                          
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">6-Digit PIN *</label>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input
                                type="text"
                                placeholder="Enter 6-digit PIN"
                                maxLength={6}
                                className="pl-10 h-11"
                                error={step3Form.formState.errors.pin?.message}
                                {...step3Form.register("pin")}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">This PIN will be used for quick access</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input
                                type="password"
                                placeholder="Enter password"
                                className="pl-10 h-11"
                                error={step3Form.formState.errors.password?.message}
                                {...step3Form.register("password")}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input
                                type="password"
                                placeholder="Confirm password"
                                className="pl-10 h-11"
                                error={step3Form.formState.errors.confirmPassword?.message}
                                {...step3Form.register("confirmPassword")}
                              />
                            </div>
                          </div>

                          <div className="flex gap-3 mt-6">
                            <Button type="button" variant="outline" onClick={goBack} className="flex-1 h-11">
                              <ChevronLeft className="w-4 h-4 mr-2" />
                              Back
                            </Button>
                            <Button 
                              type="submit" 
                              className="flex-1 h-11"
                              disabled={authStatus === "loading"}
                            >
                              {authStatus === "loading" ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  Create Account
                                  <CheckCircle className="w-4 h-4 ml-2" />
                                </>
                              )}
                            </Button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-slate-500 text-sm mt-8"
          >
            © {new Date().getFullYear()} AMS. All rights reserved.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
