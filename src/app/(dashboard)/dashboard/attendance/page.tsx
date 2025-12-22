"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Camera,
  Play,
  Square
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
import { formatDate, formatDateTime } from "@/lib/utils";

interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  batch: {
    id: string;
    name: string;
    students: { student: { id: string; name: string } }[];
  };
}

interface Attendance {
  studentId: string;
  isPresent: boolean;
  confidence?: number;
  markedAt: string;
}

interface KnownFace {
  id: string;
  name: string;
  encoding: number[];
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAttendanceActive, setIsAttendanceActive] = useState(false);
  const [mode, setMode] = useState<"list" | "take" | "train">("list");

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      setClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKnownFaces = async (classId: string) => {
    try {
      const res = await fetch(`/api/attendance/${classId}/faces`);
      const data = await res.json();
      setKnownFaces(data);
    } catch (error) {
      console.error("Error fetching faces:", error);
    }
  };

  const selectClass = async (classInfo: ClassInfo) => {
    setSelectedClass(classInfo);
    await fetchKnownFaces(classInfo.id);
    
    // Initialize attendance for all students
    const initialAttendance = classInfo.batch.students.map((s) => ({
      studentId: s.student.id,
      isPresent: false,
      markedAt: "",
    }));
    setAttendance(initialAttendance);
    setMode("take");
  };

  const handleFaceDetected = async (studentId: string, confidence: number) => {
    const now = new Date().toISOString();
    
    setAttendance((prev) => {
      const existing = prev.find((a) => a.studentId === studentId);
      if (existing && existing.isPresent) {
        return prev; // Already marked
      }
      
      return prev.map((a) =>
        a.studentId === studentId
          ? { ...a, isPresent: true, confidence, markedAt: now }
          : a
      );
    });

    // Save to database
    if (selectedClass) {
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
      } catch (error) {
        console.error("Error saving attendance:", error);
      }
    }
  };

  const toggleManualAttendance = async (studentId: string) => {
    const student = attendance.find((a) => a.studentId === studentId);
    const newStatus = !student?.isPresent;
    const now = new Date().toISOString();

    setAttendance((prev) =>
      prev.map((a) =>
        a.studentId === studentId
          ? { ...a, isPresent: newStatus, markedAt: newStatus ? now : "" }
          : a
      )
    );

    if (selectedClass) {
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
    }
  };

  const getAttendanceStats = () => {
    const present = attendance.filter((a) => a.isPresent).length;
    const total = attendance.length;
    return { present, total, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (mode === "list") {
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
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => selectClass(classInfo)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{classInfo.name}</h3>
                      <p className="text-sm text-gray-500">{classInfo.subject}</p>
                    </div>
                    <Badge variant="info">{classInfo.batch.name}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(classInfo.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{classInfo.startTime} - {classInfo.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{classInfo.batch.students.length} students</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    Take Attendance
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {classes.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No classes available. Create a class first.
            </div>
          )}
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{selectedClass?.name}</h1>
          <p className="text-gray-500 mt-1">{selectedClass?.subject}</p>
        </div>
        <Button variant="outline" onClick={() => { setMode("list"); setSelectedClass(null); }}>
          Back to Classes
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.present}</p>
            <p className="text-sm text-gray-500">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-600">{stats.total - stats.present}</p>
            <p className="text-sm text-gray-500">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.percentage}%</p>
            <p className="text-sm text-gray-500">Attendance Rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Face Recognition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Face Recognition
              </div>
              <Button
                size="sm"
                variant={isAttendanceActive ? "destructive" : "default"}
                onClick={() => setIsAttendanceActive(!isAttendanceActive)}
              >
                {isAttendanceActive ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAttendanceActive ? (
              <FaceRecognition
                mode="recognize"
                knownFaces={knownFaces}
                onFaceDetected={handleFaceDetected}
              />
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-100 rounded-xl">
                <div className="text-center text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Click &quot;Start&quot; to begin face recognition</p>
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
              Students ({stats.present}/{stats.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {selectedClass?.batch.students.map((s) => {
                const studentAttendance = attendance.find(
                  (a) => a.studentId === s.student.id
                );
                return (
                  <motion.div
                    key={s.student.id}
                    layout
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      studentAttendance?.isPresent
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                        {s.student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{s.student.name}</p>
                        {studentAttendance?.markedAt && (
                          <p className="text-xs text-gray-500">
                            {formatDateTime(studentAttendance.markedAt)}
                            {studentAttendance.confidence && (
                              <span className="ml-2 text-blue-600">
                                ({Math.round(studentAttendance.confidence * 100)}% match)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleManualAttendance(s.student.id)}
                      className={`p-2 rounded-full transition-colors ${
                        studentAttendance?.isPresent
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                      }`}
                    >
                      {studentAttendance?.isPresent ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
