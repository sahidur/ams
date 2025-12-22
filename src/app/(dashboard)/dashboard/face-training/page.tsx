"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  Users
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Badge 
} from "@/components/ui";
import { FaceRecognition } from "@/components/face-recognition";

interface Student {
  id: string;
  name: string;
  email: string;
  hasFaceEncoding: boolean;
}

export default function FaceTrainingPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/face-encodings/students");
      const data = await res.json();
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceTrained = async (encoding: number[]) => {
    if (!selectedStudent) return;

    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/face-encodings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudent.id,
          encoding,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Face encoding saved successfully!" });
        setStudents((prev) =>
          prev.map((s) =>
            s.id === selectedStudent.id ? { ...s, hasFaceEncoding: true } : s
          )
        );
        setSelectedStudent(null);
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.message || "Failed to save face encoding" });
      }
    } catch (error) {
      console.error("Error saving face encoding:", error);
      setMessage({ type: "error", text: "Failed to save face encoding" });
    } finally {
      setIsSaving(false);
    }
  };

  const stats = {
    total: students.length,
    trained: students.filter((s) => s.hasFaceEncoding).length,
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
        <h1 className="text-3xl font-bold text-gray-900">Face Training</h1>
        <p className="text-gray-500 mt-1">
          Register student faces for AI-powered attendance recognition
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.trained}</p>
            <p className="text-sm text-gray-500">Faces Registered</p>
          </CardContent>
        </Card>
      </div>

      {/* Message */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Face Training */}
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
                <FaceRecognition
                  mode="train"
                  studentId={selectedStudent.id}
                  studentName={selectedStudent.name}
                  onFaceTrained={handleFaceTrained}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedStudent(null)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-100 rounded-xl">
                <div className="text-center text-gray-500">
                  <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a student from the list to start training</p>
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
              Students ({stats.trained}/{stats.total} trained)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {students.map((student) => (
                <motion.div
                  key={student.id}
                  layout
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                    selectedStudent?.id === student.id
                      ? "bg-blue-50 border-2 border-blue-300"
                      : student.hasFaceEncoding
                      ? "bg-green-50 border border-green-200"
                      : "bg-gray-50 border border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => !student.hasFaceEncoding && setSelectedStudent(student)}
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
                  <Badge
                    variant={student.hasFaceEncoding ? "success" : "default"}
                  >
                    {student.hasFaceEncoding ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Trained
                      </span>
                    ) : (
                      "Not Trained"
                    )}
                  </Badge>
                </motion.div>
              ))}

              {students.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No students found. Add students to batches first.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Train Faces</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Select a student from the list who hasn&apos;t been trained yet</li>
            <li>Position the student&apos;s face clearly in front of the camera</li>
            <li>Ensure good lighting and face the camera directly</li>
            <li>Click &quot;Capture Face&quot; when ready</li>
            <li>The system will automatically detect and save the face encoding</li>
            <li>Repeat for all students in your batches</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
