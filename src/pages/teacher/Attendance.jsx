import { useEffect, useState, useMemo } from "react";
import {
  GraduationCap,
  Info,
  CheckCircle2,
  XCircle,
  CalendarX,
} from "lucide-react";
import Button from "../../components/Button";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";
const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const SEMESTER_NAMES = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
];
const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

function getLevelLabel(structureType, level) {
  const names = structureType === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
  const name = names[level - 1] || `Level ${level}`;
  return structureType === "semester" ? `${name} Semester` : `${name} Year`;
}

function fullName(profile) {
  return [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(" ");
}

// ─── Dummy data (MongoDB-style) ─────────────────────────────────────────────

const dummyFaculties = [
  {
    _id: "fac_bca",
    code: "BCA",
    name: "Bachelor of Computer Applications",
    structureType: "semester",
    maxLevel: 8,
  },
  {
    _id: "fac_bbm",
    code: "BBM",
    name: "Bachelor of Business Management",
    structureType: "semester",
    maxLevel: 8,
  },
  {
    _id: "fac_bbs",
    code: "BBS",
    name: "Bachelor of Business Studies",
    structureType: "year",
    maxLevel: 4,
  },
  {
    _id: "fac_bim",
    code: "BIM",
    name: "Bachelor of Information Management",
    structureType: "semester",
    maxLevel: 8,
  },
  {
    _id: "fac_bsc_csit",
    code: "BSC CSIT",
    name: "BSc Computer Science & Information Technology",
    structureType: "semester",
    maxLevel: 8,
  },
];

/** Active students roster */
const dummyClassRoster = [
  {
    _id: "stu_001",
    studentId: "BCA-2081-001",
    profile: { firstName: "Sita", middleName: "Kumari", lastName: "Shrestha" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2081" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    _id: "stu_003",
    studentId: "BCA-2081-002",
    profile: { firstName: "Ram", middleName: "", lastName: "Thapa" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2081" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    _id: "stu_004",
    studentId: "BCA-2081-003",
    profile: { firstName: "Anita", middleName: "Devi", lastName: "Poudel" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2081" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    _id: "stu_005",
    studentId: "BCA-2081-004",
    profile: { firstName: "Bikash", middleName: "Kumar", lastName: "Rai" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2081" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
];

/**
 * General class attendance — marked by teachers
 * type: "general" distinguishes from exam attendance
 */
const dummyGeneralAttendance = [
  {
    _id: "att_gen_001",
    studentId: "stu_001",
    facultyId: "fac_bca",
    level: 3,
    type: "general",
    summary: { totalClasses: 42, present: 38, absent: 4, percentage: 90.5 },
    records: [
      {
        _id: "rec_1",
        date: "2024-05-15",
        status: "present",
        markedBy: {
          role: "teacher",
          teacherId: "tch_001",
          name: "Anil Gurung",
        },
      },
      {
        _id: "rec_2",
        date: "2024-05-14",
        status: "present",
        markedBy: {
          role: "teacher",
          teacherId: "tch_001",
          name: "Anil Gurung",
        },
      },
      {
        _id: "rec_4",
        date: "2024-05-12",
        status: "absent",
        markedBy: {
          role: "teacher",
          teacherId: "tch_001",
          name: "Anil Gurung",
        },
      },
    ],
    updatedAt: "2024-05-15T10:00:00.000Z",
  },
  {
    _id: "att_gen_002",
    studentId: "stu_003",
    facultyId: "fac_bca",
    level: 3,
    type: "general",
    summary: { totalClasses: 42, present: 35, absent: 7, percentage: 83.3 },
    records: [
      {
        _id: "rec_5",
        date: "2024-05-15",
        status: "present",
        markedBy: {
          role: "teacher",
          teacherId: "tch_001",
          name: "Anil Gurung",
        },
      },
      {
        _id: "rec_6",
        date: "2024-05-14",
        status: "absent",
        markedBy: {
          role: "teacher",
          teacherId: "tch_001",
          name: "Anil Gurung",
        },
      },
    ],
    updatedAt: "2024-05-15T10:00:00.000Z",
  },
  {
    _id: "att_gen_003",
    studentId: "stu_004",
    facultyId: "fac_bca",
    level: 3,
    type: "general",
    summary: { totalClasses: 42, present: 40, absent: 2, percentage: 95.2 },
    records: [],
    updatedAt: "2024-05-14T09:00:00.000Z",
  },
  {
    _id: "att_gen_004",
    studentId: "stu_005",
    facultyId: "fac_bca",
    level: 3,
    type: "general",
    summary: { totalClasses: 42, present: 30, absent: 12, percentage: 71.4 },
    records: [],
    updatedAt: "2024-05-13T09:00:00.000Z",
  },
];

/**
 * Subjects collection — shows which teacher is assigned to which faculty/level
 */
const dummySubjects = [
  {
    _id: "sub_001",
    name: "Database Management System",
    code: "BCA301",
    facultyId: "fac_bca",
    facultyCode: "BCA",
    level: 3,
    levelLabel: "Third Semester",
    assignedTeacher: { teacherId: "tch_001", fullName: "Anil Prasad Gurung" },
  },
  {
    _id: "sub_002",
    name: "Web Technology",
    code: "BCA302",
    facultyId: "fac_bca",
    facultyCode: "BCA",
    level: 3,
    levelLabel: "Third Semester",
    assignedTeacher: { teacherId: "tch_002", fullName: "Sunita Sharma" },
  },
  {
    _id: "sub_003",
    name: "Mathematics III",
    code: "BCA303",
    facultyId: "fac_bca",
    facultyCode: "BCA",
    level: 3,
    levelLabel: "Third Semester",
    assignedTeacher: { teacherId: "tch_001", fullName: "Anil Prasad Gurung" },
  },
  {
    _id: "sub_004",
    name: "Business Economics",
    code: "BBS201",
    facultyId: "fac_bbs",
    facultyCode: "BBS",
    level: 2,
    levelLabel: "Second Year",
    assignedTeacher: { teacherId: "tch_001", fullName: "Anil Prasad Gurung" },
  },
  {
    _id: "sub_005",
    name: "Data Structures",
    code: "BCA201",
    facultyId: "fac_bca",
    facultyCode: "BCA",
    level: 2,
    levelLabel: "Second Semester",
    assignedTeacher: { teacherId: "tch_001", fullName: "Anil Prasad Gurung" },
  },
];

// Current logged-in teacher (in real app, this comes from auth)
const CURRENT_TEACHER_ID = "tch_001";

// Holidays (in real app, this comes from admin settings)
const dummyCustomHolidays = [
  "2024-05-01", // Labour Day
  "2024-12-25", // Christmas
];

// Check if a date is a weekend (Saturday = 6, Sunday = 0)
const isWeekend = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Check if a date is a holiday (weekend or custom holiday)
const isHoliday = (dateString) => {
  return isWeekend(dateString) || dummyCustomHolidays.includes(dateString);
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function Attendance() {
  const teacherAssignments = useMemo(() => {
    const assignments = new Map();
    dummySubjects
      .filter((s) => s.assignedTeacher?.teacherId === CURRENT_TEACHER_ID)
      .forEach((s) => {
        const key = `${s.facultyId}_${s.level}`;
        if (!assignments.has(key)) {
          assignments.set(key, {
            facultyId: s.facultyId,
            facultyCode: s.facultyCode,
            level: s.level,
            levelLabel: s.levelLabel,
            structureType: s.structureType,
          });
        }
      });
    return Array.from(assignments.values());
  }, []);

  const initialAssignedFacultyId =
    teacherAssignments.length === 1 ? teacherAssignments[0].facultyId : "";
  const initialAssignedLevel =
    teacherAssignments.length === 1 ? String(teacherAssignments[0].level) : "";

  const [selectedFacultyId, setSelectedFacultyId] = useState(
    initialAssignedFacultyId,
  );
  const [selectedLevel, setSelectedLevel] = useState(initialAssignedLevel);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today;
  });
  const [saveMessage, setSaveMessage] = useState("");

  const [generalAttendance, setGeneralAttendance] = useState(
    dummyGeneralAttendance,
  );

  const getClassStudents = (facultyId, levelNum, batch = null) => {
    return dummyClassRoster.filter(
      (s) =>
        s.admission.facultyId === facultyId &&
        s.enrollment.status === "active" &&
        s.enrollment.currentLevel === levelNum &&
        (batch ? s.admission.batch === batch : true),
    );
  };

  const getAttendanceChecksFor = (facultyId, levelNum, date, batch = null) => {
    if (!facultyId || !levelNum || !date) return {};
    const attendanceMap = new Map();
    generalAttendance
      .filter((a) => a.facultyId === facultyId && a.level === levelNum)
      .forEach((a) => attendanceMap.set(a.studentId, a));

    const checks = {};
    getClassStudents(facultyId, levelNum, batch).forEach((s) => {
      const record = attendanceMap
        .get(s._id)
        ?.records?.find((r) => r.date === date);
      checks[s._id] = record?.status === "present";
    });
    return checks;
  };

  const [attendanceChecks, setAttendanceChecks] = useState({});

  const selectedFaculty = dummyFaculties.find(
    (f) => f._id === selectedFacultyId,
  );
  const levelNum = selectedLevel ? Number(selectedLevel) : null;
  const classSelected = Boolean(selectedFacultyId && selectedLevel);

  const activeBatch = useMemo(() => {
    if (!selectedFacultyId || !levelNum) return null;
    const batches = Array.from(
      new Set(
        dummyClassRoster
          .filter(
            (s) =>
              s.admission.facultyId === selectedFacultyId &&
              s.enrollment.status === "active" &&
              s.enrollment.currentLevel === levelNum,
          )
          .map((s) => s.admission.batch),
      ),
    );
    return batches.sort((a, b) => Number(b) - Number(a))[0] || null;
  }, [selectedFacultyId, levelNum]);

  useEffect(() => {
    if (classSelected && activeBatch && selectedDate) {
      setAttendanceChecks(
        getAttendanceChecksFor(
          selectedFacultyId,
          levelNum,
          selectedDate,
          activeBatch,
        ),
      );
    } else {
      setAttendanceChecks({});
    }
  }, [classSelected, activeBatch, selectedDate, selectedFacultyId, levelNum]);

  const classStudents = useMemo(() => {
    if (!classSelected || !activeBatch) return [];
    return dummyClassRoster.filter(
      (s) =>
        s.admission.facultyId === selectedFacultyId &&
        s.admission.batch === activeBatch &&
        s.enrollment.status === "active" &&
        s.enrollment.currentLevel === levelNum,
    );
  }, [classSelected, selectedFacultyId, levelNum, activeBatch]);

  const generalForClass = useMemo(() => {
    const map = new Map();
    const classIds = new Set(classStudents.map((s) => s._id));
    generalAttendance
      .filter(
        (a) =>
          a.facultyId === selectedFacultyId &&
          a.level === levelNum &&
          classIds.has(a.studentId),
      )
      .forEach((a) => map.set(a.studentId, a));
    return map;
  }, [generalAttendance, selectedFacultyId, levelNum, classStudents]);

  const handleMarkAllPresent = () => {
    const checks = {};
    classStudents.forEach((s) => {
      checks[s._id] = true;
    });
    setAttendanceChecks(checks);
  };

  const handleClearAll = () => {
    const checks = {};
    classStudents.forEach((s) => {
      checks[s._id] = false;
    });
    setAttendanceChecks(checks);
  };

  const handleSaveAttendance = () => {
    if (!classSelected || !selectedDate) return;

    const todayPresentCount =
      Object.values(attendanceChecks).filter(Boolean).length;

    // Update attendance records
    const updatedAttendance = generalAttendance.map((att) => {
      const studentInClass = classStudents.find((s) => s._id === att.studentId);
      if (!studentInClass) return att;

      const existingRecordIndex =
        att.records?.findIndex((r) => r.date === selectedDate) ?? -1;
      const newRecord = {
        _id: `rec_${Date.now()}`,
        date: selectedDate,
        status: attendanceChecks[att.studentId] ? "present" : "absent",
        markedBy: {
          role: "teacher",
          teacherId: CURRENT_TEACHER_ID,
          name: "Anil Gurung",
        },
      };

      let newRecords;
      if (existingRecordIndex >= 0) {
        newRecords = [...att.records];
        newRecords[existingRecordIndex] = newRecord;
      } else {
        newRecords = [...(att.records || []), newRecord];
      }

      // Recalculate summary
      const presentCount = newRecords.filter(
        (r) => r.status === "present",
      ).length;
      const absentCount = newRecords.filter(
        (r) => r.status === "absent",
      ).length;
      const totalClasses = newRecords.length;
      const percentage =
        totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : 0;

      return {
        ...att,
        records: newRecords,
        summary: {
          totalClasses,
          present: presentCount,
          absent: absentCount,
          percentage: parseFloat(percentage),
        },
        updatedAt: new Date().toISOString(),
      };
    });

    setGeneralAttendance(updatedAttendance);
    setSaveMessage(
      `Attendance saved for ${selectedDate}. Present: ${todayPresentCount}/${classStudents.length}`,
    );
    setTimeout(() => setSaveMessage(""), 4000);
  };

  const selectedDateObj = new Date(selectedDate);
  const monthName = selectedDateObj.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const dayName = selectedDateObj.toLocaleDateString("en-US", {
    weekday: "long",
  });
  const isTodayHoliday = isHoliday(selectedDate);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="mt-1 text-gray-600">
          Mark daily attendance for your assigned classes
        </p>
      </div>

      {/* Class selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Select class</h2>

        {teacherAssignments.length === 0 ? (
          <p className="text-gray-600">
            No classes assigned to you yet. Contact admin.
          </p>
        ) : teacherAssignments.length === 1 ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Your assigned class:</strong>{" "}
              {teacherAssignments[0].facultyCode} —{" "}
              {teacherAssignments[0].levelLabel}
              {activeBatch ? ` · Batch ${activeBatch}` : ""}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Faculty</label>
              <select
                className={selectClass}
                value={selectedFacultyId}
                onChange={(e) => {
                  const facultyId = e.target.value;
                  setSelectedFacultyId(facultyId);
                  setSelectedLevel("");
                  setAttendanceChecks({});
                }}
              >
                <option value="">Choose faculty</option>
                {[...new Set(teacherAssignments.map((a) => a.facultyId))].map(
                  (facultyId) => {
                    const faculty = dummyFaculties.find(
                      (f) => f._id === facultyId,
                    );
                    return (
                      <option key={facultyId} value={facultyId}>
                        {faculty?.code} —{" "}
                        {faculty?.structureType === "semester"
                          ? "Semester"
                          : "Year"}{" "}
                        based
                      </option>
                    );
                  },
                )}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {selectedFaculty?.structureType === "year"
                  ? "Year"
                  : "Semester"}
              </label>
              <select
                className={selectClass}
                value={selectedLevel}
                onChange={(e) => {
                  const newLevel = e.target.value;
                  setSelectedLevel(newLevel);
                  if (selectedFacultyId && newLevel) {
                    setAttendanceChecks(
                      getAttendanceChecksFor(
                        selectedFacultyId,
                        Number(newLevel),
                        selectedDate,
                      ),
                    );
                  } else {
                    setAttendanceChecks({});
                  }
                }}
                disabled={!selectedFacultyId}
              >
                <option value="">Choose level</option>
                {teacherAssignments
                  .filter((a) => a.facultyId === selectedFacultyId)
                  .map((a) => (
                    <option key={`${a.facultyId}_${a.level}`} value={a.level}>
                      {a.levelLabel}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {classSelected && selectedFaculty && (
          <p className="mt-3 text-sm text-gray-600">
            Showing: <strong>{selectedFaculty.code}</strong> ·{" "}
            {getLevelLabel(selectedFaculty.structureType, levelNum)}
            {activeBatch ? ` · Batch ${activeBatch}` : ""}
          </p>
        )}
      </div>

      {!classSelected && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <GraduationCap className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">Select a class to mark attendance.</p>
        </div>
      )}

      {classSelected && (
        <>
          {/* Date selector */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Select date
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={selectedDate}
                  onChange={(e) => {
                    const date = e.target.value;
                    setSelectedDate(date);
                    setSaveMessage("");
                    if (classSelected) {
                      setAttendanceChecks(
                        getAttendanceChecksFor(
                          selectedFacultyId,
                          levelNum,
                          date,
                        ),
                      );
                    } else {
                      setAttendanceChecks({});
                    }
                  }}
                />
              </div>
              <div className="flex items-end">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg w-full">
                  <p className="text-sm text-gray-600">
                    <strong>Month:</strong> {monthName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Day:</strong> {dayName}
                  </p>
                </div>
              </div>
              <div className="flex items-end">
                {isTodayHoliday ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg w-full">
                    <p className="text-sm font-medium text-amber-900 flex items-center gap-2">
                      <CalendarX className="w-4 h-4" />
                      Holiday - Attendance not required
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg w-full">
                    <p className="text-sm font-medium text-green-900">
                      Regular class day - Mark attendance
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attendance marking */}
          {!isTodayHoliday && (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <Info className="h-5 w-5 shrink-0" />
                <p>
                  Mark attendance for students. Use "Mark all present" to
                  quickly mark everyone, then uncheck absent students.
                </p>
              </div>

              {classStudents.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
                  No active students in this class.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllPresent}
                    >
                      Mark all present
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                    >
                      Clear all
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 font-semibold text-gray-700 w-12 text-center">
                              Present
                            </th>
                            <th className="px-4 py-3 font-semibold text-gray-700">
                              Student
                            </th>
                            <th className="px-4 py-3 font-semibold text-gray-700">
                              Student ID
                            </th>
                            <th className="px-4 py-3 font-semibold text-gray-700">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {classStudents.map((s) => {
                            const checked = Boolean(attendanceChecks[s._id]);
                            return (
                              <tr
                                key={s._id}
                                className={`border-b border-gray-100 ${
                                  checked ? "bg-green-50/50" : ""
                                }`}
                              >
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      setAttendanceChecks({
                                        ...attendanceChecks,
                                        [s._id]: e.target.checked,
                                      })
                                    }
                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                    aria-label={`Present for ${fullName(s.profile)}`}
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {fullName(s.profile)}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {s.studentId}
                                </td>
                                <td className="px-4 py-3">
                                  {checked ? (
                                    <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                                      <CheckCircle2 className="h-4 w-4" />{" "}
                                      Present
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                      <XCircle className="h-4 w-4" /> Absent
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-4">
                      <p className="text-sm text-gray-600">
                        Total present today:{" "}
                        <strong>
                          {
                            Object.values(attendanceChecks).filter(Boolean)
                              .length
                          }
                        </strong>{" "}
                        / {classStudents.length}
                      </p>
                      <Button variant="primary" onClick={handleSaveAttendance}>
                        Save attendance
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {saveMessage && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              {saveMessage}
            </p>
          )}

          {/* Summary stats */}
          {classSelected && classStudents.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-gray-900">
                Class attendance summary
              </h3>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {classStudents.map((s) => {
                  const att = generalForClass.get(s._id);
                  const sum = att?.summary ?? {
                    present: 0,
                    absent: 0,
                    percentage: 0,
                  };
                  return (
                    <div
                      key={s._id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                        {fullName(s.profile)}
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-700">
                          Present:{" "}
                          <span className="font-semibold text-green-700">
                            {sum.present}
                          </span>
                        </p>
                        <p className="text-gray-700">
                          Absent:{" "}
                          <span className="font-semibold text-red-700">
                            {sum.absent}
                          </span>
                        </p>
                        <p className="text-gray-700">
                          %:{" "}
                          <span className="font-semibold">
                            {sum.percentage}%
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
