"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Users,
  GraduationCap,
  RefreshCw,
  Trash2,
  UserCheck,
  Loader2,
  UserPlus
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Badge,
  Select,
  Modal
} from "@/components/ui";

// Dynamic import to avoid SSR issues with Human.js
const HumanFaceRecognition = dynamic(
  () => import("@/components/human-face-recognition").then(mod => mod.HumanFaceRecognition),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading face recognition...</span>
      </div>
    )
  }
);

interface Batch {
  id: string;
  name: string;
  branch: {
    id: string;
    branchName: string;
    upazila: string;
    district: string;
  };
  cohort?: {
    id: string;
    name: string;
  };
  _count: { 
    students: number;
    classes: number;
  };
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  faceEncodingCount: number;
}

export default function FaceTrainingPage() {
  const { data: session } = useSession();
  
  // Training state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Fetch batches for trainer
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch("/api/batches");
        if (res.ok) {
          const data = await res.json();
          setBatches(data);
        }
      } catch (error) {
        console.error("Error fetching batches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatches();
  }, []);

  // Fetch students when batch is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedBatchId) {
        setStudents([]);
        setSelectedBatch(null);
        return;
      }

      setIsLoadingStudents(true);
      
      // Find selected batch info
      const batch = batches.find(b => b.id === selectedBatchId);
      setSelectedBatch(batch || null);

      try {
        const res = await fetch(`/api/batches/${selectedBatchId}/students`);
        if (res.ok) {
          const data = await res.json();
          // Enrich with face encoding count
          const enrichedStudents = await Promise.all(
            data.map(async (student: { id: string; name: string; email: string }) => {
              const faceRes = await fetch(`/api/face-encodings?userId=${student.id}`);
              const faceData = faceRes.ok ? await faceRes.json() : { count: 0 };
              return {
                ...student,
                faceEncodingCount: faceData.count || 0,
              };
            })
          );
          setStudents(enrichedStudents);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedBatchId, batches]);

  // Handle face training complete
  const handleFaceTrained = async (embeddings: number[][]) => {
    if (!selectedStudent) return;

    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      // Average the embeddings for more robust recognition
      const avgEmbedding = embeddings[0].map((_, i) => {
        return embeddings.reduce((sum, emb) => sum + emb[i], 0) / embeddings.length;
      });

      const res = await fetch("/api/face-encodings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudent.id,
          embedding: avgEmbedding,
          label: selectedStudent.name,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `Face registered for ${selectedStudent.name}!` });
        
        // Update student in list
        setStudents((prev) =>
          prev.map((s) =>
            s.id === selectedStudent.id 
              ? { ...s, faceEncodingCount: s.faceEncodingCount + 1 } 
              : s
          )
        );
        
        setSelectedStudent(null);
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.message || "Failed to save face data" });
      }
    } catch (error) {
      console.error("Error saving face encoding:", error);
      setMessage({ type: "error", text: "Failed to save face data" });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete face encodings for a student
  const handleDeleteFaceEncodings = async () => {
    if (!studentToDelete) return;

    try {
      const res = await fetch(`/api/face-encodings?userId=${studentToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: `Face data deleted for ${studentToDelete.name}` });
        
        // Update student in list
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentToDelete.id ? { ...s, faceEncodingCount: 0 } : s
          )
        );
      }
    } catch (error) {
      console.error("Error deleting face encodings:", error);
      setMessage({ type: "error", text: "Failed to delete face data" });
    } finally {
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    }
  };

  // Refresh students
  const refreshStudents = async () => {
    if (!selectedBatchId) return;
    
    setIsLoadingStudents(true);
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}/students`);
      if (res.ok) {
        const data = await res.json();
        const enrichedStudents = await Promise.all(
          data.map(async (student: { id: string; name: string; email: string }) => {
            const faceRes = await fetch(`/api/face-encodings?userId=${student.id}`);
            const faceData = faceRes.ok ? await faceRes.json() : { count: 0 };
            return {
              ...student,
              faceEncodingCount: faceData.count || 0,
            };
          })
        );
        setStudents(enrichedStudents);
      }
    } catch (error) {
      console.error("Error refreshing students:", error);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Stats
  const stats = {
    totalStudents: students.length,
    trainedStudents: students.filter((s) => s.faceEncodingCount > 0).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Face Registration</h1>
        <p className="text-gray-500 mt-1">
          Register student faces for AI-powered attendance recognition
        </p>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
            <button 
              onClick={() => setMessage({ type: "", text: "" })}
              className="ml-auto hover:opacity-70"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Select Batch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedBatchId}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              setSelectedStudent(null);
            }}
          >
            <option value="">Select a batch...</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name} - {batch.branch.branchName}, {batch.branch.upazila} ({batch._count.students} students)
              </option>
            ))}
          </Select>
          
          {batches.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700">
                No batches found. Please create a batch first in the{" "}
                <Link href="/dashboard/batches" className="underline font-medium">
                  Batches page
                </Link>
                .
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedBatchId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
              <p className="text-sm text-gray-500">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.trainedStudents}</p>
              <p className="text-sm text-gray-500">Faces Registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{stats.totalStudents - stats.trainedStudents}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">
                {stats.totalStudents > 0 ? Math.round((stats.trainedStudents / stats.totalStudents) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500">Completion</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Training Section */}
      {selectedBatchId && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Face Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                {selectedStudent ? `Training: ${selectedStudent.name}` : "Select a Student"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedStudent ? (
                <div className="space-y-4">
                  <HumanFaceRecognition
                    mode="train"
                    studentId={selectedStudent.id}
                    studentName={selectedStudent.name}
                    onFaceTrained={handleFaceTrained}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedStudent(null)}
                    disabled={isSaving}
                  >
                    Cancel Training
                  </Button>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-100 rounded-xl">
                  <div className="text-center text-gray-500">
                    <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a student from the list</p>
                    <p className="text-sm">to start face registration</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Students ({stats.trainedStudents}/{stats.totalStudents} trained)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={refreshStudents}
                    disabled={isLoadingStudents}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingStudents ? "animate-spin" : ""}`} />
                  </Button>
                  <Link href="/dashboard/batches">
                    <Button size="sm" variant="outline">
                      <UserPlus className="w-4 h-4 mr-1" />
                      Manage Students
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-500">Loading students...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {students.map((student) => (
                    <motion.div
                      key={student.id}
                      layout
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        selectedStudent?.id === student.id
                          ? "bg-blue-50 border-2 border-blue-300"
                          : student.faceEncodingCount > 0
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={student.faceEncodingCount > 0 ? "success" : "default"}
                        >
                          {student.faceEncodingCount > 0 ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {student.faceEncodingCount} faces
                            </span>
                          ) : (
                            "Not Trained"
                          )}
                        </Badge>
                        {student.faceEncodingCount > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setStudentToDelete(student);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {students.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No students in this batch</p>
                      <p className="text-sm mt-1">
                        Add students to this batch from the{" "}
                        <Link href="/dashboard/batches" className="text-blue-600 underline">
                          Batches page
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Selected Batch Info */}
      {selectedBatch && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Batch Name</p>
                <p className="font-medium">{selectedBatch.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Branch</p>
                <p className="font-medium">{selectedBatch.branch.branchName}</p>
              </div>
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium">{selectedBatch.branch.upazila}, {selectedBatch.branch.district}</p>
              </div>
              {selectedBatch.cohort && (
                <div>
                  <p className="text-gray-500">Cohort</p>
                  <p className="font-medium">{selectedBatch.cohort.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Register Faces</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Select a batch from the dropdown above</li>
            <li>Click on a student from the list to start face registration</li>
            <li>Position the student clearly in front of the camera</li>
            <li>Click &quot;Start Capture&quot; - system will capture 5 images automatically</li>
            <li>Ensure different angles and expressions for better accuracy</li>
            <li>Face data will be saved automatically when capture completes</li>
          </ol>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span>
                <strong>Need to add students?</strong> Go to{" "}
                <Link href="/dashboard/batches" className="underline">
                  Batches page
                </Link>{" "}
                → Click on student icon → Select students to add to batch.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setStudentToDelete(null);
        }}
        title="Delete Face Data"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete all face data for{" "}
            <strong>{studentToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setStudentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFaceEncodings}>
              Delete Face Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
