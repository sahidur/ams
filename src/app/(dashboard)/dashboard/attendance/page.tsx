"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Camera,
  Play,
  Square,
  Image as ImageIcon,
  ArrowLeft,
  RefreshCw,
  UserCheck,
  Upload,
  Scan,
  Loader2
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Badge 
} from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/utils";

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

interface ClassInfo {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  batch: {
    id: string;
    name: string;
  };
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Attendance {
  studentId: string;
  studentName: string;
  isPresent: boolean;
  confidence?: number;
  markedAt?: string;
  markedBy?: string;
}

interface KnownFace {
  id: string;
  name: string;
  embedding: number[];
}

type ModeType = "list" | "live" | "group";

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<ModeType>("list");
  const [message, setMessage] = useState({ type: "", text: "" });

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
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // Fetch students and faces when class is selected
  const selectClass = async (classInfo: ClassInfo) => {
    setSelectedClass(classInfo);
    setIsLoading(true);

    try {
      // Fetch students in the batch
      const studentsRes = await fetch(`/api/batches/${classInfo.batch.id}/students`);
      let studentsData: Student[] = [];
      if (studentsRes.ok) {
        studentsData = await studentsRes.json();
        setStudents(studentsData);
      }

      // Fetch existing attendance
      const attendanceRes = await fetch(`/api/attendance/${classInfo.id}`);
      let existingAttendance: { studentId: string; isPresent: boolean; confidence?: number; markedAt?: string; markedBy?: string }[] = [];
      if (attendanceRes.ok) {
        existingAttendance = await attendanceRes.json();
      }

      // Initialize attendance for all students
      const attendanceMap = new Map(existingAttendance.map(a => [a.studentId, a]));
      const fullAttendance: Attendance[] = studentsData.map((student) => {
        const existing = attendanceMap.get(student.id);
        return {
          studentId: student.id,
          studentName: student.name,
          isPresent: existing?.isPresent || false,
          confidence: existing?.confidence,
          markedAt: existing?.markedAt,
          markedBy: existing?.markedBy,
        };
      });
      setAttendance(fullAttendance);

      // Fetch face encodings for students
      const facesRes = await fetch(`/api/attendance/${classInfo.id}/faces`);
      if (facesRes.ok) {
        const facesData = await facesRes.json();
        setKnownFaces(facesData);
      }
    } catch (error) {
      console.error("Error loading class data:", error);
      setMessage({ type: "error", text: "Failed to load class data" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle face detection (single)
  const handleFaceDetected = useCallback(async (studentId: string, studentName: string, confidence: number) => {
    if (!selectedClass) return;

    const now = new Date().toISOString();
    
    // Update local state
    setAttendance((prev) => {
      const existing = prev.find((a) => a.studentId === studentId);
      if (existing?.isPresent) {
        return prev; // Already marked
      }
      
      return prev.map((a) =>
        a.studentId === studentId
          ? { 
              ...a, 
              isPresent: true, 
              confidence, 
              markedAt: now,
              markedBy: "FACE_RECOGNITION"
            }
          : a
      );
    });

    // Save to database
    try {
      await fetch(`/api/attendance/${selectedClass.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          isPresent: true,
          confidence,
          markedBy: "FACE_RECOGNITION",
        }),
      });
      
      setMessage({ 
        type: "success", 
        text: `✓ ${studentName} marked present (${Math.round(confidence * 100)}% match)` 
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
  }, [selectedClass]);

  // Handle multiple faces detected (group photo)
  const handleMultipleFacesDetected = useCallback(async (detectedStudents: { studentId: string; studentName: string; confidence: number }[]) => {
    if (!selectedClass) return;

    const now = new Date().toISOString();
    
    // Update local state for all detected students
    setAttendance((prev) => {
      const newAttendance = [...prev];
      
      for (const detected of detectedStudents) {
        const idx = newAttendance.findIndex((a) => a.studentId === detected.studentId);
        if (idx !== -1 && !newAttendance[idx].isPresent) {
          newAttendance[idx] = {
            ...newAttendance[idx],
            isPresent: true,
            confidence: detected.confidence,
            markedAt: now,
            markedBy: "FACE_RECOGNITION_GROUP",
          };
        }
      }
      
      return newAttendance;
    });

    // Save all to database
    try {
      await Promise.all(
        detectedStudents.map((student) =>
          fetch(`/api/attendance/${selectedClass.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: student.studentId,
              isPresent: true,
              confidence: student.confidence,
              markedBy: "FACE_RECOGNITION_GROUP",
            }),
          })
        )
      );
      
      setMessage({ 
        type: "success", 
        text: `✓ ${detectedStudents.length} students marked present from group photo` 
      });
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
  }, [selectedClass]);

  // Toggle manual attendance
  const toggleManualAttendance = async (studentId: string) => {
    if (!selectedClass) return;

    const student = attendance.find((a) => a.studentId === studentId);
    const newStatus = !student?.isPresent;
    const now = new Date().toISOString();

    setAttendance((prev) =>
      prev.map((a) =>
        a.studentId === studentId
          ? { 
              ...a, 
              isPresent: newStatus, 
              markedAt: newStatus ? now : undefined,
              markedBy: newStatus ? "MANUAL" : undefined,
              confidence: undefined
            }
          : a
      )
    );

    try {
      await fetch(`/api/attendance/${selectedClass.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          isPresent: newStatus,
          markedBy: "MANUAL",
        }),
      });
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
  };

  // Get attendance stats
  const getStats = () => {
    const present = attendance.filter((a) => a.isPresent).length;
    const total = attendance.length;
    return { 
      present, 
      absent: total - present,
      total, 
      percentage: total > 0 ? Math.round((present / total) * 100) : 0 
    };
  };

  // Back to list
  const goBack = () => {
    setMode("list");
    setSelectedClass(null);
    setStudents([]);
    setAttendance([]);
    setKnownFaces([]);
    setMessage({ type: "", text: "" });
  };

  if (isLoading && mode === "list") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Class List View
  if (mode === "list" && !selectedClass) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">Take attendance using AI face recognition</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classInfo) => (
            <motion.div
              key={classInfo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => selectClass(classInfo)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{classInfo.title}</h3>
                      <p className="text-sm text-gray-500">{classInfo.description}</p>
                    </div>
                    <Badge variant="info">{classInfo.batch.name}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(classInfo.date)}</span>
                    </div>
                    {classInfo.startTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{classInfo.startTime} - {classInfo.endTime}</span>
                      </div>
                    )}
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    <Camera className="w-4 h-4 mr-2" />
                    Take Attendance
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {classes.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No classes available. Create a class first.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const stats = getStats();

  // Attendance Taking View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{selectedClass?.title}</h1>
          <p className="text-gray-500 mt-1">
            {selectedClass?.batch.name} • {selectedClass && formatDate(selectedClass.date)}
          </p>
        </div>
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Classes
        </Button>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={mode === "live" ? "default" : "outline"}
          onClick={() => setMode("live")}
        >
          <Scan className="w-4 h-4 mr-2" />
          Live Camera
        </Button>
        <Button
          variant={mode === "group" ? "default" : "outline"}
          onClick={() => setMode("group")}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Group Photo
        </Button>
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
              <XCircle className="w-5 h-5" />
            )}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.present}</p>
            <p className="text-sm text-gray-500">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{stats.absent}</p>
            <p className="text-sm text-gray-500">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-600">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.percentage}%</p>
            <p className="text-sm text-gray-500">Attendance</p>
          </CardContent>
        </Card>
      </div>

      {/* No faces warning */}
      {knownFaces.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">No face data registered</p>
            <p className="text-sm text-yellow-700">
              Please register student faces in the Face Training page before using face recognition.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Face Recognition Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {mode === "live" ? "Live Face Recognition" : "Group Photo Recognition"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <HumanFaceRecognition
                mode={mode === "live" ? "recognize" : "group"}
                knownFaces={knownFaces}
                onFaceDetected={handleFaceDetected}
                onMultipleFacesDetected={handleMultipleFacesDetected}
                minConfidence={0.5}
              />
            )}
          </CardContent>
        </Card>

        {/* Student List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Students ({stats.present}/{stats.total})
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => selectClass(selectedClass!)}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {attendance.map((record) => (
                <motion.div
                  key={record.studentId}
                  layout
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    record.isPresent
                      ? "bg-green-50 border border-green-200"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                      record.isPresent 
                        ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                        : "bg-gradient-to-br from-gray-400 to-gray-500"
                    }`}>
                      {record.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{record.studentName}</p>
                      {record.isPresent && record.markedAt && (
                        <p className="text-xs text-gray-500">
                          {formatDateTime(record.markedAt)}
                          {record.confidence && (
                            <span className="ml-2 text-blue-600">
                              ({Math.round(record.confidence * 100)}% match)
                            </span>
                          )}
                          {record.markedBy && (
                            <Badge variant="info" className="ml-2 text-xs">
                              {record.markedBy === "MANUAL" ? "Manual" : "AI"}
                            </Badge>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleManualAttendance(record.studentId)}
                    className={`p-2 rounded-full transition-colors ${
                      record.isPresent
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    }`}
                    title={record.isPresent ? "Mark Absent" : "Mark Present"}
                  >
                    {record.isPresent ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </button>
                </motion.div>
              ))}

              {attendance.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No students in this class
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Take Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Scan className="w-4 h-4" />
                Live Camera Mode
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Click &quot;Start Camera&quot; and then &quot;Start Detection&quot;</li>
                <li>Students walk in front of the camera one by one</li>
                <li>System auto-detects and marks attendance</li>
                <li>Real-time updates with confidence scores</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Group Photo Mode
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Take a group photo of all students</li>
                <li>Upload the photo</li>
                <li>System detects all faces in the image</li>
                <li>Matches and marks attendance for all recognized students</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
