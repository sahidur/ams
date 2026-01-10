"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Mail, Lock, ArrowLeft, Fingerprint, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { loginSchema, type LoginInput } from "@/lib/validations";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeyStatus, setPasskeyStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [supportsPasskey, setSupportsPasskey] = useState(false);

  useEffect(() => {
    // Check if device supports WebAuthn
    const checkPasskeySupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setSupportsPasskey(available);
        } catch {
          setSupportsPasskey(false);
        }
      }
    };
    checkPasskeySupport();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true);
    setPasskeyStatus("scanning");
    setPasskeyMessage("Place your finger on the sensor...");
    setError("");

    try {
      // Get authentication options
      const optionsRes = await fetch("/api/passkey/authenticate");
      if (!optionsRes.ok) throw new Error("Failed to get authentication options");
      
      const { options } = await optionsRes.json();
      
      if (options.allowCredentials.length === 0) {
        throw new Error("No passkeys found. Please sign in with your password first.");
      }

      // Convert challenge from base64url to ArrayBuffer
      const challenge = Uint8Array.from(
        atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")),
        c => c.charCodeAt(0)
      );

      // Convert credential IDs
      const allowCredentials = options.allowCredentials.map((cred: { id: string; type: string }) => ({
        type: cred.type,
        id: Uint8Array.from(
          atob(cred.id.replace(/-/g, "+").replace(/_/g, "/")),
          c => c.charCodeAt(0)
        ),
      }));

      // Get credential
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials,
          userVerification: "required",
          timeout: 60000,
          rpId: options.rpId,
        },
      }) as PublicKeyCredential;

      if (!credential) throw new Error("Authentication cancelled");

      const response = credential.response as AuthenticatorAssertionResponse;

      // Verify with server
      const verifyRes = await fetch("/api/passkey/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(response.authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array(response.signature))),
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || "Verification failed");
      }

      const { user } = await verifyRes.json();

      setPasskeyStatus("success");
      setPasskeyMessage(`Welcome back, ${user.name}!`);

      // Sign in using NextAuth with the verified user
      const result = await signIn("credentials", {
        redirect: false,
        email: user.email,
        passkeyVerified: "true",
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Small delay for animation
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);

    } catch (error) {
      console.error("Passkey login error:", error);
      setPasskeyStatus("error");
      setPasskeyMessage(error instanceof Error ? error.message : "Authentication failed");
      
      setTimeout(() => {
        setPasskeyStatus("idle");
        setPasskeyMessage("");
      }, 3000);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

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
              className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25"
            >
              <CalendarCheck className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Somadhanhobe
            </CardTitle>
            <CardDescription className="text-gray-600">
              Programme Management System
            </CardDescription>
            <p className="text-sm text-gray-500 mt-2">Sign in to your account</p>
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

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Email address"
                  className="pl-10"
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Password"
                  className="pl-10"
                  error={errors.password?.message}
                  {...register("password")}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Sign In
              </Button>
            </form>

            {/* Passkey Login */}
            {supportsPasskey && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500">or continue with</span>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {passkeyStatus === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-4 h-14 border-2 hover:border-blue-300 hover:bg-blue-50 transition-all"
                        onClick={handlePasskeyLogin}
                        disabled={isPasskeyLoading}
                      >
                        <Fingerprint className="w-6 h-6 mr-3 text-blue-600" />
                        <span className="text-base">Sign in with Passkey</span>
                      </Button>
                    </motion.div>
                  )}

                  {passkeyStatus === "scanning" && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="mt-4 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200"
                    >
                      <div className="flex flex-col items-center">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4"
                        >
                          <Fingerprint className="w-10 h-10 text-blue-600" />
                        </motion.div>
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600 mb-2" />
                        <p className="text-blue-700 font-medium">{passkeyMessage}</p>
                      </div>
                    </motion.div>
                  )}

                  {passkeyStatus === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="mt-4 p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200"
                    >
                      <div className="flex flex-col items-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4"
                        >
                          <CheckCircle className="w-10 h-10 text-green-600" />
                        </motion.div>
                        <p className="text-green-700 font-medium">{passkeyMessage}</p>
                        <p className="text-sm text-green-600 mt-1">Redirecting to dashboard...</p>
                      </div>
                    </motion.div>
                  )}

                  {passkeyStatus === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="mt-4 p-6 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
                          <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <p className="text-red-700 font-medium text-center">{passkeyMessage}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
