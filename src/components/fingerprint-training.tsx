"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Check, X, Loader2, AlertCircle, Scan } from "lucide-react";
import { Button, Badge } from "@/components/ui";

interface FingerprintTrainingProps {
  studentId: string;
  studentName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function FingerprintTraining({
  studentId,
  studentName,
  onSuccess,
  onError,
}: FingerprintTrainingProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "scanning" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const startRegistration = useCallback(async () => {
    try {
      setStatus("loading");
      setErrorMessage("");

      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported on this browser");
      }

      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error("No fingerprint or biometric sensor available on this device");
      }

      // Get registration options from server
      const optionsRes = await fetch(`/api/fingerprint?studentId=${studentId}`);
      if (!optionsRes.ok) {
        const error = await optionsRes.json();
        throw new Error(error.error || "Failed to get registration options");
      }

      const { options } = await optionsRes.json();

      setStatus("scanning");

      // Convert challenge and user.id from base64url to ArrayBuffer
      const challenge = base64urlToBuffer(options.challenge);
      const userId = base64urlToBuffer(options.user.id);

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge,
          user: {
            ...options.user,
            id: userId,
          },
        },
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      const response = credential.response as AuthenticatorAttestationResponse;

      // Prepare credential data for server
      const credentialData = {
        id: bufferToBase64url(credential.rawId),
        publicKey: bufferToBase64url(response.getPublicKey()!),
        transports: response.getTransports?.() || [],
        authenticatorAttachment: (credential as { authenticatorAttachment?: string }).authenticatorAttachment,
        clientExtensionResults: credential.getClientExtensionResults(),
      };

      // Register credential with server
      const registerRes = await fetch("/api/fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          credential: credentialData,
        }),
      });

      if (!registerRes.ok) {
        const error = await registerRes.json();
        throw new Error(error.error || "Failed to register fingerprint");
      }

      setStatus("success");
      onSuccess?.();
    } catch (error) {
      console.error("Fingerprint registration error:", error);
      const message = error instanceof Error ? error.message : "Registration failed";
      setErrorMessage(message);
      setStatus("error");
      onError?.(message);
    }
  }, [studentId, onSuccess, onError]);

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Fingerprint className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Fingerprint Registration</h3>
        <p className="text-sm text-gray-500 mt-1">
          Register fingerprint for <span className="font-medium">{studentName}</span>
        </p>
      </div>

      {status === "idle" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Make sure the student is ready to scan their fingerprint when prompted.
          </div>
          <Button onClick={startRegistration} className="w-full">
            <Fingerprint className="w-4 h-4 mr-2" />
            Start Registration
          </Button>
        </div>
      )}

      {status === "loading" && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-gray-500 mt-2">Preparing registration...</p>
        </div>
      )}

      {status === "scanning" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center"
          >
            <Scan className="w-10 h-10 text-white" />
          </motion.div>
          <p className="text-lg font-medium text-gray-900">Scan Fingerprint Now</p>
          <p className="text-sm text-gray-500 mt-1">
            Place your finger on the sensor
          </p>
        </motion.div>
      )}

      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-600">Registration Successful!</p>
          <p className="text-sm text-gray-500 mt-1">
            Fingerprint has been registered for {studentName}
          </p>
          <Badge variant="success" className="mt-4">
            <Fingerprint className="w-3 h-3 mr-1" />
            Fingerprint Enrolled
          </Badge>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-6"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-lg font-medium text-red-600">Registration Failed</p>
          <p className="text-sm text-gray-500 mt-1">{errorMessage}</p>
          <Button onClick={startRegistration} variant="outline" className="mt-4">
            Try Again
          </Button>
        </motion.div>
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
