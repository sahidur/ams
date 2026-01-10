"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Check, X, Loader2, AlertCircle, Scan, User } from "lucide-react";
import { Button, Badge } from "@/components/ui";

interface FingerprintAttendanceProps {
  classId: string;
  className: string;
  onAttendanceRecorded?: (student: { id: string; name: string }) => void;
}

interface AttendanceResult {
  success: boolean;
  student?: { id: string; name: string; email: string };
  alreadyRecorded?: boolean;
  error?: string;
}

export default function FingerprintAttendance({
  classId,
  className,
  onAttendanceRecorded,
}: FingerprintAttendanceProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "scanning" | "success" | "error">("idle");
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<{ name: string; time: Date }[]>([]);

  const startScan = useCallback(async () => {
    try {
      setStatus("loading");
      setResult(null);

      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported on this browser");
      }

      // Get authentication options from server
      const optionsRes = await fetch(`/api/fingerprint/verify?classId=${classId}`);
      if (!optionsRes.ok) {
        const error = await optionsRes.json();
        throw new Error(error.error || "Failed to get authentication options");
      }

      const { options } = await optionsRes.json();

      setStatus("scanning");

      // Convert challenge from base64url to ArrayBuffer
      const challenge = base64urlToBuffer(options.challenge);

      // Convert allowed credentials
      const allowCredentials = options.allowCredentials.map((cred: { id: string; type: string; transports: string[] }) => ({
        ...cred,
        id: base64urlToBuffer(cred.id),
      }));

      // Get credential
      const credential = await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge,
          allowCredentials,
        },
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Authentication cancelled");
      }

      // Prepare credential data for server
      const credentialData = {
        id: bufferToBase64url(credential.rawId),
        response: {
          authenticatorData: bufferToBase64url((credential.response as AuthenticatorAssertionResponse).authenticatorData),
          clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
          signature: bufferToBase64url((credential.response as AuthenticatorAssertionResponse).signature),
        },
      };

      // Verify with server
      const verifyRes = await fetch("/api/fingerprint/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          credential: credentialData,
        }),
      });

      const verifyResult = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyResult.error || "Verification failed");
      }

      setResult(verifyResult);
      setStatus("success");

      if (verifyResult.student) {
        setRecentAttendance(prev => [
          { name: verifyResult.student.name, time: new Date() },
          ...prev.slice(0, 4),
        ]);
        onAttendanceRecorded?.(verifyResult.student);
      }

      // Reset after 3 seconds for next scan
      setTimeout(() => {
        setStatus("idle");
        setResult(null);
      }, 3000);
    } catch (error) {
      console.error("Fingerprint scan error:", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Scan failed",
      });
      setStatus("error");

      // Reset after 3 seconds
      setTimeout(() => {
        setStatus("idle");
        setResult(null);
      }, 3000);
    }
  }, [classId, onAttendanceRecorded]);

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Fingerprint className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Fingerprint Attendance</h3>
        <p className="text-sm text-gray-500 mt-1">{className}</p>
      </div>

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <Button onClick={startScan} className="w-full py-6 text-lg">
              <Scan className="w-6 h-6 mr-2" />
              Scan Fingerprint
            </Button>
          </motion.div>
        )}

        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8"
          >
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600" />
            <p className="text-gray-500 mt-2">Preparing scanner...</p>
          </motion.div>
        )}

        {status === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center"
            >
              <Fingerprint className="w-12 h-12 text-white" />
            </motion.div>
            <p className="text-xl font-medium text-gray-900">Place Finger on Sensor</p>
            <p className="text-sm text-gray-500 mt-1">Waiting for fingerprint...</p>
          </motion.div>
        )}

        {status === "success" && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-6"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            {result.student && (
              <>
                <p className="text-xl font-medium text-green-600">{result.student.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {result.alreadyRecorded ? "Already marked present today" : "Attendance recorded!"}
                </p>
              </>
            )}
            <Badge variant="success" className="mt-4">
              <Check className="w-3 h-3 mr-1" />
              Present
            </Badge>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-6"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-10 h-10 text-red-600" />
            </div>
            <p className="text-xl font-medium text-red-600">Not Recognized</p>
            <p className="text-sm text-gray-500 mt-1">{result?.error || "Please try again"}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Attendance */}
      {recentAttendance.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Check-ins</h4>
          <div className="space-y-2">
            {recentAttendance.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{item.name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {item.time.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for base64url conversion
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
