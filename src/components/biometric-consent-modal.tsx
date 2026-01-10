"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, Check, X, Fingerprint, Camera, Lock } from "lucide-react";
import { Button, Modal } from "@/components/ui";

interface BiometricConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: () => void;
  biometricType: "face" | "fingerprint" | "both";
  studentName: string;
}

export default function BiometricConsentModal({
  isOpen,
  onClose,
  onConsent,
  biometricType,
  studentName,
}: BiometricConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConsent = async () => {
    if (!agreed) return;
    
    setIsSubmitting(true);
    try {
      onConsent();
    } finally {
      setIsSubmitting(false);
      setAgreed(false);
    }
  };

  const handleClose = () => {
    setAgreed(false);
    onClose();
  };

  const getBiometricIcon = () => {
    if (biometricType === "face") return <Camera className="w-6 h-6" />;
    if (biometricType === "fingerprint") return <Fingerprint className="w-6 h-6" />;
    return (
      <div className="flex gap-1">
        <Camera className="w-5 h-5" />
        <Fingerprint className="w-5 h-5" />
      </div>
    );
  };

  const getBiometricLabel = () => {
    if (biometricType === "face") return "Face Data";
    if (biometricType === "fingerprint") return "Fingerprint Data";
    return "Biometric Data (Face & Fingerprint)";
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Biometric Data Consent" size="lg">
      <div className="space-y-6">
        {/* Header Icon */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center"
          >
            <Shield className="w-10 h-10 text-blue-600" />
          </motion.div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900">
            Consent Required for {getBiometricLabel()}
          </h3>
          <p className="mt-2 text-gray-600">
            We need your consent to collect and store biometric data for{" "}
            <span className="font-medium">{studentName}</span>
          </p>
        </div>

        {/* Information Cards */}
        <div className="space-y-3">
          {/* What we collect */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              {getBiometricIcon()}
              <div>
                <h4 className="font-medium text-blue-900">What we collect</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {biometricType === "face" && (
                    "We capture face images and create mathematical representations (face embeddings) for identification purposes."
                  )}
                  {biometricType === "fingerprint" && (
                    "We use your device's secure fingerprint sensor to create a cryptographic credential for authentication."
                  )}
                  {biometricType === "both" && (
                    "We capture face images for recognition and use your device's fingerprint sensor for secure authentication."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* How we protect it */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <Lock className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">How we protect your data</h4>
                <ul className="text-sm text-green-700 mt-1 space-y-1">
                  <li>• All biometric data is encrypted using industry-standard SHA-256 hashing</li>
                  <li>• Data is stored with unique server-side salt for each user</li>
                  <li>• Encrypted at rest in our secure database</li>
                  <li>• Fingerprint data never leaves your device - only cryptographic proof is stored</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-purple-600" />
              <div>
                <h4 className="font-medium text-purple-900">Purpose of collection</h4>
                <p className="text-sm text-purple-700 mt-1">
                  This biometric data is used solely for automated attendance tracking and identity verification. 
                  It will not be shared with third parties or used for any other purpose.
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-900">Your rights</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  You can request deletion of your biometric data at any time by contacting the administrator. 
                  Refusing to provide biometric data will not result in any penalty, but you may need to use 
                  alternative attendance methods.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I have read and understood the above information. I voluntarily consent to the collection, 
              storage, and use of my biometric data for attendance tracking purposes. I understand that 
              I can withdraw this consent at any time.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleConsent}
            disabled={!agreed || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              "Processing..."
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                I Consent
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
