"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Camera, Loader2, UserCheck, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

interface FaceRecognitionProps {
  mode: "train" | "recognize";
  studentId?: string;
  studentName?: string;
  knownFaces?: { id: string; name: string; encoding: number[] }[];
  onFaceDetected?: (studentId: string, confidence: number) => void;
  onFaceTrained?: (encoding: number[]) => void;
}

export function FaceRecognition({
  mode,
  studentId,
  studentName,
  knownFaces = [],
  onFaceDetected,
  onFaceTrained,
}: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState("");
  const [detectedFace, setDetectedFace] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMatcher = useRef<faceapi.FaceMatcher | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading models:", err);
        setError("Failed to load face recognition models. Please ensure model files are in /public/models/");
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Initialize face matcher with known faces
  useEffect(() => {
    if (mode === "recognize" && knownFaces.length > 0 && isModelLoaded) {
      const labeledDescriptors = knownFaces.map((face) => {
        const descriptor = new Float32Array(face.encoding);
        return new faceapi.LabeledFaceDescriptors(
          JSON.stringify({ id: face.id, name: face.name }),
          [descriptor]
        );
      });
      faceMatcher.current = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    }
  }, [mode, knownFaces, isModelLoaded]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraReady(true);
        setError("");
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please grant camera permissions.");
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsCameraReady(false);
    }
  }, []);

  useEffect(() => {
    if (isModelLoaded) {
      startCamera();
    }
    return () => stopCamera();
  }, [isModelLoaded, startCamera, stopCamera]);

  // Face detection loop
  useEffect(() => {
    if (!isCameraReady || !isModelLoaded || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const detectFaces = async () => {
      if (video.paused || video.ended || isProcessing) return;

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Clear canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Draw detections
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      if (mode === "recognize" && faceMatcher.current && resizedDetections.length > 0) {
        for (const detection of resizedDetections) {
          const match = faceMatcher.current.findBestMatch(detection.descriptor);
          
          if (match.label !== "unknown") {
            try {
              const parsed = JSON.parse(match.label);
              setDetectedFace(parsed.name);
              
              if (onFaceDetected) {
                onFaceDetected(parsed.id, 1 - match.distance);
              }
            } catch {
              // Invalid label format
            }
          }
        }
      }
    };

    const intervalId = setInterval(detectFaces, 500);
    return () => clearInterval(intervalId);
  }, [isCameraReady, isModelLoaded, mode, isProcessing, onFaceDetected]);

  // Train face
  const trainFace = async () => {
    if (!videoRef.current || !isModelLoaded || !studentId) return;

    setIsProcessing(true);

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const encoding = Array.from(detection.descriptor);
        if (onFaceTrained) {
          onFaceTrained(encoding);
        }
        setDetectedFace(studentName || "Face captured");
      } else {
        setError("No face detected. Please position your face in the frame.");
      }
    } catch (err) {
      console.error("Error training face:", err);
      setError("Failed to capture face. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-600">Loading face recognition models...</p>
      </div>
    );
  }

  if (error && !isCameraReady) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-red-50 rounded-xl border-2 border-dashed border-red-200">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="mt-4 text-red-600 text-center px-4">{error}</p>
        <Button onClick={startCamera} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />

        {/* Status overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              <span>{isCameraReady ? "Camera active" : "Starting camera..."}</span>
            </div>
            {detectedFace && (
              <div className="flex items-center gap-2 bg-green-500/90 px-3 py-1 rounded-full">
                <UserCheck className="w-4 h-4" />
                <span>{detectedFace}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
          {error}
        </div>
      )}

      {mode === "train" && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={trainFace}
            isLoading={isProcessing}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Camera className="w-5 h-5 mr-2" />
            Capture Face
          </Button>
        </div>
      )}
    </div>
  );
}
