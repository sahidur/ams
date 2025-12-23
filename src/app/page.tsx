"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  ChevronRight
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validations";

type TabType = "login" | "signup";
type StatusType = "idle" | "loading" | "success" | "error";

export default function AuthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("login");
  const [authStatus, setAuthStatus] = useState<StatusType>("idle");
  const [message, setMessage] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Login form
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // Register form
  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
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

  const handleRegister = async (data: RegisterInput) => {
    setAuthStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setAuthStatus("error");
        setMessage(result.error || "Registration failed");
        setTimeout(() => setAuthStatus("idle"), 3000);
      } else {
        setAuthStatus("success");
        setMessage("Account created successfully!");
        setRegistrationSuccess(true);
        registerForm.reset();
      }
    } catch {
      setAuthStatus("error");
      setMessage("An unexpected error occurred");
      setTimeout(() => setAuthStatus("idle"), 3000);
    }
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setAuthStatus("idle");
    setMessage("");
    setRegistrationSuccess(false);
    loginForm.reset();
    registerForm.reset();
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
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
            <div className="p-8">
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
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    {authStatus === "success" && (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    )}
                    {authStatus === "error" && (
                      <XCircle className="w-5 h-5 text-red-600" />
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
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={registerForm.handleSubmit(handleRegister)}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Enter your full name"
                          className="pl-12 h-11"
                          error={registerForm.formState.errors.name?.message}
                          {...registerForm.register("name")}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          className="pl-12 h-11"
                          error={registerForm.formState.errors.email?.message}
                          {...registerForm.register("email")}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type="tel"
                          placeholder="e.g., 01712345678"
                          className="pl-12 h-11"
                          error={registerForm.formState.errors.phone?.message}
                          {...registerForm.register("phone")}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Bangladesh phone format required</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        6-Digit PIN
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Enter 6-digit PIN"
                          maxLength={6}
                          className="pl-12 h-11"
                          error={registerForm.formState.errors.pin?.message}
                          {...registerForm.register("pin")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input
                            type="password"
                            placeholder="Password"
                            className="pl-12 h-11"
                            error={registerForm.formState.errors.password?.message}
                            {...registerForm.register("password")}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Confirm
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input
                            type="password"
                            placeholder="Confirm"
                            className="pl-12 h-11"
                            error={registerForm.formState.errors.confirmPassword?.message}
                            {...registerForm.register("confirmPassword")}
                          />
                        </div>
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
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </motion.form>
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
