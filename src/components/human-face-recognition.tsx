"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { 
  Camera, 
  Loader2, 
  UserCheck, 
  AlertCircle, 
  RefreshCw,
  Square,
  Video,
  Image as ImageIcon,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Human = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FaceResult = any;

// Human.js configuration - will be applied when loading
const humanConfig = {
  modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models/",
  filter: { enabled: true, equalization: true },
  face: {
    enabled: true,
    detector: { rotation: true, maxDetected: 20 },
    mesh: { enabled: true },
    iris: { enabled: false },
    description: { enabled: true }, // This provides face embeddings
    emotion: { enabled: false },
    antispoof: { enabled: true },
    liveness: { enabled: true },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
};

interface KnownFace {
  id: string;
  name: string;
  embedding: number[];
}

interface DetectedStudent {
  studentId: string;
  studentName: string;
  confidence: number;
  timestamp: Date;
}

interface HumanFaceRecognitionProps {
  mode: "train" | "recognize" | "group";
  studentId?: string;
  studentName?: string;
  knownFaces?: KnownFace[];
  onFaceDetected?: (studentId: string, studentName: string, confidence: number) => void;
  onFaceTrained?: (embeddings: number[][]) => void;
  onMultipleFacesDetected?: (students: DetectedStudent[]) => void;
  minConfidence?: number;
}

// Calculate cosine similarity between two embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function HumanFaceRecognition({
  mode,
  studentId,
  studentName,
  knownFaces = [],
  onFaceDetected,
  onFaceTrained,
  onMultipleFacesDetected,
  minConfidence = 0.5,
}: HumanFaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const humanRef = useRef<Human | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Training mode states
  const [capturedEmbeddings, setCapturedEmbeddings] = useState<number[][]>([]);
  const [captureCount, setCaptureCount] = useState(0);
  const targetCaptures = 5;
  
  // Recognition mode states
  const [recognizedStudents, setRecognizedStudents] = useState<DetectedStudent[]>([]);
  const [detectionActive, setDetectionActive] = useState(false);
  
  // Group photo mode
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Initialize Human.js with dynamic import to avoid SSR issues
  useEffect(() => {
    const initHuman = async () => {
      try {
        // Dynamic import to load Human.js only on client-side
        const HumanModule = await import("@vladmandic/human");
        const HumanClass = HumanModule.default || HumanModule.Human;
        humanRef.current = new HumanClass(humanConfig);
        await humanRef.current.load();
        await humanRef.current.warmup();
        setIsModelLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading Human.js:", err);
        setError("Failed to load face recognition models");
        setIsLoading(false);
      }
    };

    initHuman();

    return () => {
      stopCamera();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: "user" 
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
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
    }
    setIsCameraReady(false);
    setDetectionActive(false);
  }, []);

  // Find best match for a face embedding
  const findMatch = useCallback((embedding: number[]): { id: string; name: string; confidence: number } | null => {
    let bestMatch: { id: string; name: string; confidence: number } | null = null;
    
    for (const face of knownFaces) {
      const similarity = cosineSimilarity(embedding, face.embedding);
      if (similarity > minConfidence && (!bestMatch || similarity > bestMatch.confidence)) {
        bestMatch = {
          id: face.id,
          name: face.name,
          confidence: similarity,
        };
      }
    }
    
    return bestMatch;
  }, [knownFaces, minConfidence]);

  // Draw detection results on canvas
  const drawResults = useCallback((faces: FaceResult[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faces.forEach((face) => {
      if (face.box) {
        const [x, y, width, height] = face.box;
        
        // Check if this face matches a known student
        let matchInfo = "";
        let boxColor = "#ffcc00"; // Yellow for unknown
        
        if (mode === "recognize" || mode === "group") {
          if (face.embedding && face.embedding.length > 0) {
            const match = findMatch(Array.from(face.embedding));
            if (match) {
              matchInfo = `${match.name} (${Math.round(match.confidence * 100)}%)`;
              boxColor = "#00ff00"; // Green for matched
            } else {
              matchInfo = "Unknown";
              boxColor = "#ff0000"; // Red for unknown
            }
          }
        } else if (mode === "train") {
          matchInfo = studentName || "Capturing...";
          boxColor = "#00ccff";
        }

        // Draw box
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        ctx.fillStyle = boxColor;
        ctx.fillRect(x, y - 25, matchInfo.length * 10 + 10, 25);

        // Draw label text
        ctx.fillStyle = "#000";
        ctx.font = "16px Arial";
        ctx.fillText(matchInfo, x + 5, y - 7);
      }
    });
  }, [mode, studentName, findMatch]);

  // Process single frame for training
  const captureForTraining = useCallback(async () => {
    if (!humanRef.current || !videoRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await humanRef.current.detect(videoRef.current);
      
      if (result.face && result.face.length === 1) {
        const face = result.face[0];
        
        // Check face quality
        if (face.real && face.real < 0.5) {
          setError("Please show your real face (no photos)");
          setIsProcessing(false);
          return;
        }
        
        if (face.embedding && face.embedding.length > 0) {
          const embedding: number[] = Array.from(face.embedding) as number[];
          setCapturedEmbeddings((prev) => [...prev, embedding]);
          setCaptureCount((prev) => prev + 1);
          drawResults(result.face);
          
          if (captureCount + 1 >= targetCaptures) {
            // Training complete
            setIsRecording(false);
            if (onFaceTrained) {
              onFaceTrained([...capturedEmbeddings, embedding]);
            }
          }
        }
      } else if (result.face && result.face.length > 1) {
        setError("Multiple faces detected. Please ensure only one face is visible.");
      } else {
        setError("No face detected. Please look at the camera.");
      }
    } catch (err) {
      console.error("Error capturing face:", err);
    }
    setIsProcessing(false);
  }, [captureCount, capturedEmbeddings, drawResults, isProcessing, onFaceTrained]);

  // Continuous recognition loop
  const recognitionLoop = useCallback(async () => {
    if (!humanRef.current || !videoRef.current || !detectionActive) return;

    try {
      const result = await humanRef.current.detect(videoRef.current);
      
      if (result.face && result.face.length > 0) {
        drawResults(result.face);
        
        const newRecognitions: DetectedStudent[] = [];
        
        for (const face of result.face) {
          if (face.embedding && face.embedding.length > 0) {
            const match = findMatch(Array.from(face.embedding));
            if (match) {
              // Check if already recognized recently (within 10 seconds)
              const existingRecent = recognizedStudents.find(
                (s) => s.studentId === match.id && 
                  Date.now() - s.timestamp.getTime() < 10000
              );
              
              if (!existingRecent) {
                const detected: DetectedStudent = {
                  studentId: match.id,
                  studentName: match.name,
                  confidence: match.confidence,
                  timestamp: new Date(),
                };
                newRecognitions.push(detected);
                
                if (onFaceDetected) {
                  onFaceDetected(match.id, match.name, match.confidence);
                }
              }
            }
          }
        }
        
        if (newRecognitions.length > 0) {
          setRecognizedStudents((prev) => [...prev, ...newRecognitions]);
          if (onMultipleFacesDetected) {
            onMultipleFacesDetected(newRecognitions);
          }
        }
      }
    } catch (err) {
      console.error("Recognition error:", err);
    }

    if (detectionActive) {
      animationRef.current = requestAnimationFrame(recognitionLoop);
    }
  }, [detectionActive, drawResults, findMatch, onFaceDetected, onMultipleFacesDetected, recognizedStudents]);

  // Start/stop recognition
  useEffect(() => {
    if (detectionActive && isModelLoaded && isCameraReady) {
      recognitionLoop();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [detectionActive, isModelLoaded, isCameraReady, recognitionLoop]);

  // Process uploaded group photo
  const processGroupPhoto = useCallback(async (imageUrl: string) => {
    if (!humanRef.current) return;

    setIsProcessing(true);
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const result = await humanRef.current.detect(img);
      
      if (result.face && result.face.length > 0) {
        const detected: DetectedStudent[] = [];
        
        // Draw on canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            for (const face of result.face) {
              if (face.box && face.embedding && face.embedding.length > 0) {
                const [x, y, width, height] = face.box;
                const match = findMatch(Array.from(face.embedding));
                
                if (match) {
                  detected.push({
                    studentId: match.id,
                    studentName: match.name,
                    confidence: match.confidence,
                    timestamp: new Date(),
                  });
                  
                  // Draw green box
                  ctx.strokeStyle = "#00ff00";
                  ctx.lineWidth = 3;
                  ctx.strokeRect(x, y, width, height);
                  ctx.fillStyle = "#00ff00";
                  ctx.fillRect(x, y - 25, match.name.length * 10 + 10, 25);
                  ctx.fillStyle = "#000";
                  ctx.font = "16px Arial";
                  ctx.fillText(match.name, x + 5, y - 7);
                } else {
                  // Draw red box for unknown
                  ctx.strokeStyle = "#ff0000";
                  ctx.lineWidth = 3;
                  ctx.strokeRect(x, y, width, height);
                }
              }
            }
          }
        }
        
        if (detected.length > 0 && onMultipleFacesDetected) {
          onMultipleFacesDetected(detected);
        }
        
        setRecognizedStudents(detected);
      } else {
        setError("No faces detected in the image");
      }
    } catch (err) {
      console.error("Error processing group photo:", err);
      setError("Failed to process image");
    }
    setIsProcessing(false);
  }, [findMatch, onMultipleFacesDetected]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedImage(dataUrl);
        processGroupPhoto(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Start training capture
  const startTrainingCapture = () => {
    setCapturedEmbeddings([]);
    setCaptureCount(0);
    setIsRecording(true);
  };

  // Training auto-capture loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && mode === "train" && isCameraReady) {
      interval = setInterval(() => {
        captureForTraining();
      }, 1000); // Capture every second
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, mode, isCameraReady, captureForTraining]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-100 rounded-xl">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600">Loading face recognition models...</p>
        <p className="text-xs text-slate-400 mt-2">This may take a moment on first load</p>
      </div>
    );
  }

  if (error && !isCameraReady && mode !== "group") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => setError("")} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video/Image display */}
      <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ minHeight: "400px" }}>
        {mode !== "group" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraReady ? "block" : "hidden"}`}
          />
        )}
        
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />

        {mode === "group" && uploadedImage && (
          <img src={uploadedImage} alt="Group" className="w-full h-auto" />
        )}

        {!isCameraReady && mode !== "group" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Camera className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg mb-4">Camera not started</p>
            <Button onClick={startCamera}>
              <Video className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          </div>
        )}

        {/* Status overlay */}
        {isCameraReady && mode === "train" && (
          <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg">
            <p className="font-medium">{studentName}</p>
            <p className="text-sm">
              Captures: {captureCount} / {targetCaptures}
            </p>
          </div>
        )}

        {isCameraReady && mode === "recognize" && (
          <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg">
            <p className="font-medium">
              {detectionActive ? "Detecting..." : "Ready"}
            </p>
            <p className="text-sm">
              Recognized: {recognizedStudents.length}
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setError("")}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {mode === "train" && (
          <>
            {!isCameraReady ? (
              <Button onClick={startCamera} disabled={!isModelLoaded}>
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="outline">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Camera
                </Button>
                {!isRecording ? (
                  <Button 
                    onClick={startTrainingCapture} 
                    disabled={isProcessing}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Start Capture
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setIsRecording(false)} 
                    variant="destructive"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Capture
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {mode === "recognize" && (
          <>
            {!isCameraReady ? (
              <Button onClick={startCamera} disabled={!isModelLoaded}>
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="outline">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Camera
                </Button>
                {!detectionActive ? (
                  <Button 
                    onClick={() => setDetectionActive(true)} 
                    disabled={knownFaces.length === 0}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Start Detection
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setDetectionActive(false)} 
                    variant="destructive"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Detection
                  </Button>
                )}
                <Button 
                  onClick={() => setRecognizedStudents([])} 
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear Results
                </Button>
              </>
            )}
          </>
        )}

        {mode === "group" && (
          <>
            <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isProcessing}
              />
              <ImageIcon className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : "Upload Group Photo"}
            </label>
            {uploadedImage && (
              <Button 
                onClick={() => {
                  setUploadedImage(null);
                  setRecognizedStudents([]);
                }} 
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </>
        )}
      </div>

      {/* Recognized students list */}
      {(mode === "recognize" || mode === "group") && recognizedStudents.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 rounded-xl">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Recognized Students ({recognizedStudents.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {recognizedStudents.map((student, idx) => (
              <div 
                key={`${student.studentId}-${idx}`}
                className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm"
              >
                <Check className="w-4 h-4 text-green-600" />
                <div>
                  <p className="font-medium text-sm">{student.studentName}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round(student.confidence * 100)}% match
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training progress */}
      {mode === "train" && captureCount > 0 && (
        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-800">Training Progress</span>
            <span className="text-blue-600">{captureCount} / {targetCaptures}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(captureCount / targetCaptures) * 100}%` }}
            />
          </div>
          {captureCount >= targetCaptures && (
            <p className="mt-2 text-green-600 font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              Training complete! Face data ready to save.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
