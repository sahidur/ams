"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Users,
  GraduationCap,
  ChevronRight,
  RefreshCw,
  Trash2,
  UserCheck,
  Calendar,
  Loader2
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
  _count: { students: number };
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  faceEncodingCount: number;
}

interface Class {
  id: string;
  title: string;
  date: string;
  batch: {
    id: string;
    name: string;
  };
}

type TabType = "train" | "classes";

export default function FaceTrainingPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("train");
  
  // Training state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Classes state
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
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
        return;
      }

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
      }
    };

    fetchStudents();
  }, [selectedBatchId]);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/classes");
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    if (activeTab === "classes") {
      fetchClasses();
    }
  }, [activeTab]);

  // Fetch students for selected class
  useEffect(() => {
    const fetchClassStudents = async () => {
      if (!selectedClass) {
        setClassStudents([]);
        return;
      }

      try {
        const res = await fetch(`/api/batches/${selectedClass.batch.id}/students`);
        if (res.ok) {
          const data = await res.json();
          // Get face encoding count
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
          setClassStudents(enrichedStudents);
        }
      } catch (error) {
        console.error("Error fetching class students:", error);
      }
    };

    fetchClassStudents();
  }, [selectedClass]);

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
        
        // Also update class students if applicable
        setClassStudents((prev) =>
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
        
        // Update student in lists
        const updateFn = (prev: Student[]) =>
          prev.map((s) =>
            s.id === studentToDelete.id ? { ...s, faceEncodingCount: 0 } : s
          );
        
        setStudents(updateFn);
        setClassStudents(updateFn);
      }
    } catch (error) {
      console.error("Error deleting face encodings:", error);
      setMessage({ type: "error", text: "Failed to delete face data" });
    } finally {
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
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

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("train")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "train"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Camera className="w-4 h-4 inline mr-2" />
          Train Faces
        </button>
        <button
          onClick={() => setActiveTab("classes")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "classes"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          By Class
        </button>
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

      {activeTab === "train" && (
        <>
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
                    {batch.name} ({batch._count.students} students)
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>

          {/* Stats */}
          {selectedBatchId && (
            <div className="grid grid-cols-2 gap-4 max-w-md">
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
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Students ({stats.trainedStudents}/{stats.totalStudents} trained)
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                        No students in this batch
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {activeTab === "classes" && (
        <>
          {/* Class Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Select Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClass(cls)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedClass?.id === cls.id
                        ? "bg-blue-50 border-2 border-blue-300"
                        : "bg-gray-50 border border-gray-200 hover:border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{cls.title}</p>
                        <p className="text-sm text-gray-500">
                          {cls.batch.name} • {new Date(cls.date).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
                {classes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No classes found. Create a class first.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Class Students */}
          {selectedClass && (
            <div className="grid lg:grid-cols-2 gap-6">
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
                        <p>Select a student to train their face</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {selectedClass.title} - Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {classStudents.map((student) => (
                      <motion.div
                        key={student.id}
                        layout
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedStudent?.id === student.id
                            ? "bg-blue-50 border-2 border-blue-300"
                            : student.faceEncodingCount > 0
                            ? "bg-green-50 border border-green-200"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                        </div>
                        <Badge variant={student.faceEncodingCount > 0 ? "success" : "default"}>
                          {student.faceEncodingCount > 0 ? "Trained" : "Not Trained"}
                        </Badge>
                      </motion.div>
                    ))}
                    {classStudents.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No students in this class
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Register Faces</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Select a batch or class from the list</li>
            <li>Click on a student to start face registration</li>
            <li>Position the student clearly in front of the camera</li>
            <li>Click &quot;Start Capture&quot; - system will capture 5 images automatically</li>
            <li>Ensure different angles and expressions for better accuracy</li>
            <li>Face data will be saved automatically when capture completes</li>
          </ol>
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
