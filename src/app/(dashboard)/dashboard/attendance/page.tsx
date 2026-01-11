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
  Loader2,
  Plus,
  History,
  Eye,
  X,
  User,
  MapPin,
  Fingerprint
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Badge,
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

// Dynamic import for fingerprint attendance
const FingerprintAttendance = dynamic(
  () => import("@/components/fingerprint-attendance"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading fingerprint scanner...</span>
      </div>
    )
  }
);

interface ClassInfo {
  id: string;
  name: string;
  title?: string;
  subject: string;
  description?: string;
  startDate: string;
  endDate: string;
  date?: string;
  startTime: string;
  endTime: string;
  batch: {
    id: string;
    name: string;
    trainer?: {
      id: string;
      name: string;
    };
    branch?: {
      branchName: string;
      upazila: string;
      district: string;
    };
  };
  _count?: {
    students: number;
    attendance: number;
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
  capturedImageUrl?: string;
}

interface AttendanceSession {
  sessionId: string;
  sessionDate: string;
  presentCount: number;
  totalCount: number;
  attendancePercentage: number;
}

interface KnownFace {
  id: string;
  name: string;
  embedding: number[];
}

type ModeType = "list" | "live" | "group" | "fingerprint" | "sessions";

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<ModeType>("list");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; name: string } | null>(null);

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
      // Fetch students in the class (not batch)
      const studentsRes = await fetch(`/api/classes/${classInfo.id}/students`);
      let studentsData: Student[] = [];
      if (studentsRes.ok) {
        studentsData = await studentsRes.json();
        setStudents(studentsData);
      }

      // Fetch attendance sessions
      const sessionsRes = await fetch(`/api/attendance/${classInfo.id}/sessions`);
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }

      // Create a new session for today if taking attendance
      const now = new Date();
      const newSessionId = `${now.toISOString().split('T')[0]}_${now.getTime()}`;
      setCurrentSessionId(newSessionId);

      // Initialize attendance for all students (start fresh for new session)
      // Previous session attendance can be viewed through session history
      const fullAttendance: Attendance[] = studentsData.map((student) => ({
        studentId: student.id,
        studentName: student.name,
        isPresent: false,
      }));
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

  // Start new attendance session
  const startNewSession = async () => {
    if (!selectedClass) return;

    const now = new Date();
    const newSessionId = `${now.toISOString().split('T')[0]}_${now.getTime()}`;
    setCurrentSessionId(newSessionId);

    // Reset attendance for new session
    const fullAttendance: Attendance[] = students.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      isPresent: false,
    }));
    setAttendance(fullAttendance);

    setMessage({ type: "success", text: "New attendance session started" });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // View a specific session's attendance
  const viewSession = async (session: AttendanceSession) => {
    if (!selectedClass) return;

    setSelectedSession(session);
    setIsLoading(true);

    try {
      const attendanceRes = await fetch(`/api/attendance/${selectedClass.id}?sessionId=${session.sessionId}`);
      if (attendanceRes.ok) {
        const existingAttendance = await attendanceRes.json();
        
        const attendanceMap = new Map(existingAttendance.map((a: Attendance & { student?: { id: string; name: string } }) => [a.studentId, a]));
        const fullAttendance: Attendance[] = students.map((student) => {
          const existing = attendanceMap.get(student.id) as Attendance | undefined;
          return {
            studentId: student.id,
            studentName: student.name,
            isPresent: existing?.isPresent || false,
            confidence: existing?.confidence,
            markedAt: existing?.markedAt,
            markedBy: existing?.markedBy,
            capturedImageUrl: existing?.capturedImageUrl,
          };
        });
        setAttendance(fullAttendance);
      }
    } catch (error) {
      console.error("Error loading session attendance:", error);
    } finally {
      setIsLoading(false);
      setShowSessionModal(true);
    }
  };

  // Handle face detection (single)
  const handleFaceDetected = useCallback(async (studentId: string, studentName: string, confidence: number, capturedImage?: string) => {
    if (!selectedClass) return;

    // Check if already marked present - skip if so
    const existing = attendance.find((a) => a.studentId === studentId);
    if (existing?.isPresent) {
      // Already marked, just show a brief notification (don't duplicate)
      return;
    }

    const now = new Date().toISOString();
    
    // Update local state
    setAttendance((prev) => {
      return prev.map((a) =>
        a.studentId === studentId
          ? { 
              ...a, 
              isPresent: true, 
              confidence, 
              markedAt: now,
              markedBy: "FACE_RECOGNITION",
              capturedImageUrl: capturedImage,
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
          capturedImageUrl: capturedImage,
          sessionId: currentSessionId,
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
  }, [selectedClass, attendance, currentSessionId]);

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

  // Handle fingerprint attendance
  const handleFingerprintAttendance = useCallback((student: { id: string; name: string }) => {
    if (!selectedClass) return;

    const now = new Date().toISOString();
    
    // Update local state
    setAttendance((prev) => {
      const existing = prev.find((a) => a.studentId === student.id);
      if (existing?.isPresent) {
        return prev; // Already marked
      }
      
      return prev.map((a) =>
        a.studentId === student.id
          ? { 
              ...a, 
              isPresent: true, 
              confidence: 1.0, // Fingerprint is 100% match
              markedAt: now,
              markedBy: "FINGERPRINT",
            }
          : a
      );
    });

    setMessage({ 
      type: "success", 
      text: `✓ ${student.name} marked present via fingerprint` 
    });
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
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
    setSessions([]);
    setCurrentSessionId(null);
    setSelectedSession(null);
    setShowSessionModal(false);
  };

  // Format date safely
  const safeFormatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Format datetime safely
  const safeFormatDateTime = (dateStr: string | undefined | null) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
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
                      <h3 className="font-semibold text-lg">{classInfo.name || classInfo.title || "Class"}</h3>
                      <p className="text-sm text-gray-500">{classInfo.subject || classInfo.description}</p>
                    </div>
                    <Badge variant="info">{classInfo.batch.name}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    {/* Trainer Info */}
                    {classInfo.batch.trainer && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Trainer: {classInfo.batch.trainer.name}</span>
                      </div>
                    )}
                    {/* Branch Info */}
                    {classInfo.batch.branch && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{classInfo.batch.branch.branchName}, {classInfo.batch.branch.upazila}</span>
                      </div>
                    )}
                    {/* Date Info */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {classInfo.startDate && classInfo.endDate 
                          ? `${safeFormatDate(classInfo.startDate)} - ${safeFormatDate(classInfo.endDate)}`
                          : safeFormatDate(classInfo.date || classInfo.startDate)}
                      </span>
                    </div>
                    {/* Time Info */}
                    {classInfo.startTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{classInfo.startTime} - {classInfo.endTime}</span>
                      </div>
                    )}
                    {/* Student Count */}
                    {classInfo._count && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>
                          {classInfo._count.students} Students • {classInfo._count.attendance || 0} Attended
                        </span>
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
          <h1 className="text-3xl font-bold text-gray-900">{selectedClass?.name || selectedClass?.title}</h1>
          <p className="text-gray-500 mt-1">
            {selectedClass?.batch.name} • {selectedClass?.batch.trainer?.name && `Trainer: ${selectedClass.batch.trainer.name}`} • {safeFormatDate(selectedClass?.startDate || selectedClass?.date)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={startNewSession}>
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
          <Button 
            variant={mode === "sessions" ? "default" : "outline"} 
            onClick={() => setMode("sessions")}
          >
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
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
        <Button
          variant={mode === "fingerprint" ? "default" : "outline"}
          onClick={() => setMode("fingerprint")}
        >
          <Fingerprint className="w-4 h-4 mr-2" />
          Fingerprint
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
        {/* Recognition Panel - Face or Fingerprint */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mode === "fingerprint" ? (
                <>
                  <Fingerprint className="w-5 h-5" />
                  Fingerprint Attendance
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  {mode === "live" ? "Live Face Recognition" : "Group Photo Recognition"}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "fingerprint" ? (
              <FingerprintAttendance 
                classId={selectedClass?.id || ""}
                className={selectedClass?.name || selectedClass?.title || ""}
                onAttendanceRecorded={handleFingerprintAttendance}
              />
            ) : isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <HumanFaceRecognition
                mode={mode === "live" ? "recognize" : "group"}
                knownFaces={knownFaces}
                onFaceDetected={handleFaceDetected}
                onMultipleFacesDetected={handleMultipleFacesDetected}
                minConfidence={0.8}
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
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar/Initial */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${
                      record.isPresent 
                        ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                        : "bg-gradient-to-br from-gray-400 to-gray-500"
                    }`}>
                      {record.studentName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{record.studentName}</p>
                      {record.isPresent && record.markedAt && (
                        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                          <span>{safeFormatDateTime(record.markedAt)}</span>
                          {record.confidence && (
                            <span className="text-blue-600 font-medium">
                              {Math.round(record.confidence * 100)}% match
                            </span>
                          )}
                          {record.markedBy && (
                            <Badge variant="info" className="text-xs">
                              {record.markedBy === "MANUAL" ? "Manual" : "AI"}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* View Photo Button - Only show if captured image exists */}
                    {record.capturedImageUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingPhoto({ url: record.capturedImageUrl!, name: record.studentName })}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="View Captured Photo"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    )}
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
                  </div>
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

      {/* Photo Viewer Modal */}
      <Modal
        isOpen={!!viewingPhoto}
        onClose={() => setViewingPhoto(null)}
        title={`Captured Photo - ${viewingPhoto?.name || ""}`}
        size="md"
      >
        <div className="flex flex-col items-center">
          {viewingPhoto?.url && (
            <img 
              src={viewingPhoto.url} 
              alt={viewingPhoto.name}
              className="max-w-full max-h-[70vh] rounded-lg shadow-lg object-contain"
              style={{ backgroundColor: "#f3f4f6" }}
            />
          )}
          <p className="mt-4 text-sm text-gray-500">
            Face captured during attendance verification
          </p>
        </div>
      </Modal>

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

      {/* Session History Modal */}
      <Modal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title={`Attendance Session - ${selectedSession ? safeFormatDate(selectedSession.sessionDate) : ""}`}
        size="full"
      >
        <div className="space-y-4">
          {/* Session Stats */}
          {selectedSession && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{selectedSession.presentCount}</p>
                <p className="text-sm text-green-700">Present</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{selectedSession.totalCount - selectedSession.presentCount}</p>
                <p className="text-sm text-red-700">Absent</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{selectedSession.attendancePercentage}%</p>
                <p className="text-sm text-blue-700">Attendance</p>
              </div>
            </div>
          )}

          {/* Students List - Row-wise */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {attendance.map((record) => (
              <div
                key={record.studentId}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  record.isPresent 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium flex-shrink-0 ${
                    record.isPresent 
                      ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                      : "bg-gradient-to-br from-red-400 to-red-500"
                  }`}>
                    {record.studentName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{record.studentName}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <Badge variant={record.isPresent ? "success" : "danger"}>
                        {record.isPresent ? "Present" : "Absent"}
                      </Badge>
                      {record.confidence && (
                        <span className="text-xs text-blue-600 font-medium">
                          {Math.round(record.confidence * 100)}% match
                        </span>
                      )}
                      {record.markedAt && (
                        <span className="text-xs text-gray-500">{safeFormatDateTime(record.markedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* View Photo Button */}
                {record.capturedImageUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingPhoto({ url: record.capturedImageUrl!, name: record.studentName })}
                    className="ml-2"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Photo
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Sessions History View */}
      {mode === "sessions" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No attendance sessions recorded yet</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session, index) => {
                  // Color schemes for different sessions
                  const colors = [
                    { bg: "bg-gradient-to-r from-blue-500 to-blue-600", light: "bg-blue-50" },
                    { bg: "bg-gradient-to-r from-purple-500 to-purple-600", light: "bg-purple-50" },
                    { bg: "bg-gradient-to-r from-indigo-500 to-indigo-600", light: "bg-indigo-50" },
                    { bg: "bg-gradient-to-r from-cyan-500 to-cyan-600", light: "bg-cyan-50" },
                    { bg: "bg-gradient-to-r from-teal-500 to-teal-600", light: "bg-teal-50" },
                    { bg: "bg-gradient-to-r from-emerald-500 to-emerald-600", light: "bg-emerald-50" },
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <motion.div
                      key={session.sessionId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`${color.light} rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow`}
                    >
                      <div className={`${color.bg} text-white p-4`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-lg">{safeFormatDate(session.sessionDate)}</p>
                            <p className="text-sm text-white/80">
                              {new Date(session.sessionDate).toLocaleTimeString("en-US", { 
                                hour: "2-digit", 
                                minute: "2-digit" 
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold">{session.attendancePercentage}%</p>
                            <p className="text-sm text-white/80">Attendance</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              {session.presentCount} Present
                            </span>
                            <span className="flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-red-500" />
                              {session.totalCount - session.presentCount} Absent
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                          <div 
                            className={`${color.bg} h-2 rounded-full`}
                            style={{ width: `${session.attendancePercentage}%` }}
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => viewSession(session)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
