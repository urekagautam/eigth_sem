import { useState, useMemo, useEffect, Fragment } from "react"
import {
  Calendar,
  ClipboardCheck,
  Eye,
  GraduationCap,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import Button from "../../components/Button"

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
const labelClass = "block text-sm font-semibold text-gray-700 mb-2"

const SEMESTER_NAMES = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
]
const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"]

function getLevelLabel(structureType, level) {
  const names = structureType === "semester" ? SEMESTER_NAMES : YEAR_NAMES
  const name = names[level - 1] || `Level ${level}`
  return structureType === "semester" ? `${name} Semester` : `${name} Year`
}

function getLevelOptions(faculty) {
  if (!faculty) return []
  const max =
    faculty.structureType === "semester"
      ? Math.min(faculty.maxLevel, 8)
      : Math.min(faculty.maxLevel, 5)
  return Array.from({ length: max }, (_, i) => {
    const level = i + 1
    return { value: level, label: getLevelLabel(faculty.structureType, level) }
  })
}

function fullName(profile) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ")
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
]

/** Active students roster — same shape academics would return for a class */
const dummyClassRoster = [
  {
    _id: "stu_001",
    studentId: "BCA-2081-001",
    profile: { firstName: "Sita", middleName: "Kumari", lastName: "Shrestha" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2081" },
    enrollment: { status: "active", currentLevel: 3, currentLevelLabel: "Third Semester" },
  },
  {
    _id: "stu_003",
    studentId: "BCA-2081-002",
    profile: { firstName: "Ram", middleName: "", lastName: "Thapa" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2081" },
    enrollment: { status: "active", currentLevel: 3, currentLevelLabel: "Third Semester" },
  },
  {
    _id: "stu_004",
    studentId: "BCA-2081-003",
    profile: { firstName: "Anita", middleName: "Devi", lastName: "Poudel" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2081" },
    enrollment: { status: "active", currentLevel: 3, currentLevelLabel: "Third Semester" },
  },
  {
    _id: "stu_005",
    studentId: "BCA-2081-004",
    profile: { firstName: "Bikash", middleName: "Kumar", lastName: "Rai" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2081" },
    enrollment: { status: "active", currentLevel: 3, currentLevelLabel: "Third Semester" },
  },
  {
    _id: "stu_006",
    studentId: "BBS-2081-001",
    profile: { firstName: "Priya", middleName: "", lastName: "Maharjan" },
    admission: { facultyId: "fac_bbs", facultyCode: "BBS", batch: "2081" },
    enrollment: { status: "active", currentLevel: 2, currentLevelLabel: "Second Year" },
  },
]

/**
 * General class attendance — marked by teachers; admin read-only.
 * type: "general" distinguishes from exam attendance in performance reports later.
 */
const dummyGeneralAttendance = [
  {
    _id: "att_gen_001",
    studentId: "stu_001",
    facultyId: "fac_bca",
    level: 3,
    type: "general",
    summary: { totalClasses: 42, present: 38, absent: 3, late: 1, percentage: 90.5 },
    records: [
      {
        _id: "rec_1",
        date: "2024-05-15",
        status: "present",
        markedBy: { role: "teacher", teacherId: "tch_001", name: "Anil Gurung" },
      },
      {
        _id: "rec_2",
        date: "2024-05-14",
        status: "present",
        markedBy: { role: "teacher", teacherId: "tch_001", name: "Anil Gurung" },
      },
      {
        _id: "rec_3",
        date: "2024-05-13",
        status: "late",
        markedBy: { role: "teacher", teacherId: "tch_001", name: "Anil Gurung" },
      },
      {
        _id: "rec_4",
        date: "2024-05-12",
        status: "absent",
        markedBy: { role: "teacher", teacherId: "tch_001", name: "Anil Gurung" },
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
    summary: { totalClasses: 42, present: 35, absent: 6, late: 1, percentage: 83.3 },
    records: [
      {
        _id: "rec_5",
        date: "2024-05-15",
        status: "present",
        markedBy: { role: "teacher", teacherId: "tch_001", name: "Anil Gurung" },
      },
      {
        _id: "rec_6",
        date: "2024-05-14",
        status: "absent",
        markedBy: { role: "teacher", teacherId: "tch_001", name: "Anil Gurung" },
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
    summary: { totalClasses: 42, present: 40, absent: 2, late: 0, percentage: 95.2 },
    records: [],
    updatedAt: "2024-05-14T09:00:00.000Z",
  },
  {
    _id: "att_gen_004",
    studentId: "stu_005",
    facultyId: "fac_bca",
    level: 3,
    type: "general",
    summary: { totalClasses: 42, present: 30, absent: 10, late: 2, percentage: 71.4 },
    records: [],
    updatedAt: "2024-05-13T09:00:00.000Z",
  },
]

/**
 * Subjects collection — same documents as Academics (GET /api/subjects?facultyId&level)
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
    assignedTeacher: { teacherId: "tch_003", fullName: "Ramesh Kumar Adhikari" },
  },
]

/** Exam sessions — linked to subjectId from subjects collection */
const dummyExamSessions = [
  {
    _id: "exs_001",
    facultyId: "fac_bca",
    level: 3,
    examDate: "2024-05-20",
    title: "Mid-Term Examination",
    subjectId: "sub_001",
    subjectName: "Database Management System",
    subjectCode: "BCA301",
    createdBy: { role: "admin", adminId: "admin_001" },
    createdAt: "2024-05-18T00:00:00.000Z",
  },
  {
    _id: "exs_002",
    facultyId: "fac_bca",
    level: 3,
    examDate: "2024-05-10",
    title: "Internal Assessment",
    subjectId: "sub_002",
    subjectName: "Web Technology",
    subjectCode: "BCA302",
    createdBy: { role: "admin", adminId: "admin_001" },
    createdAt: "2024-05-08T00:00:00.000Z",
  },
]

/**
 * Exam attendance — marked by admin only. type: "exam" for performance module.
 */
const dummyExamAttendance = [
  {
    _id: "att_ex_001",
    examSessionId: "exs_002",
    studentId: "stu_001",
    facultyId: "fac_bca",
    level: 3,
    subjectId: "sub_002",
    type: "exam",
    examDate: "2024-05-10",
    present: true,
    markedBy: { role: "admin", adminId: "admin_001" },
    markedAt: "2024-05-10T08:30:00.000Z",
  },
  {
    _id: "att_ex_002",
    examSessionId: "exs_002",
    studentId: "stu_003",
    facultyId: "fac_bca",
    level: 3,
    subjectId: "sub_002",
    type: "exam",
    examDate: "2024-05-10",
    present: true,
    markedBy: { role: "admin", adminId: "admin_001" },
    markedAt: "2024-05-10T08:30:00.000Z",
  },
  {
    _id: "att_ex_003",
    examSessionId: "exs_002",
    studentId: "stu_004",
    facultyId: "fac_bca",
    level: 3,
    subjectId: "sub_002",
    type: "exam",
    examDate: "2024-05-10",
    present: false,
    markedBy: { role: "admin", adminId: "admin_001" },
    markedAt: "2024-05-10T08:30:00.000Z",
  },
  {
    _id: "att_ex_004",
    examSessionId: "exs_002",
    studentId: "stu_005",
    facultyId: "fac_bca",
    level: 3,
    subjectId: "sub_002",
    type: "exam",
    examDate: "2024-05-10",
    present: true,
    markedBy: { role: "admin", adminId: "admin_001" },
    markedAt: "2024-05-10T08:31:00.000Z",
  },
]

const statusBadge = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  late: "bg-amber-100 text-amber-800",
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Attendance() {
  const [filterFacultyId, setFilterFacultyId] = useState("")
  const [filterLevel, setFilterLevel] = useState("")
  const [category, setCategory] = useState("general")

  const [generalAttendance] = useState(dummyGeneralAttendance)
  const [examSessions, setExamSessions] = useState(dummyExamSessions)
  const [examAttendance, setExamAttendance] = useState(dummyExamAttendance)

  const [examDate, setExamDate] = useState("2024-05-20")
  const [examTitle, setExamTitle] = useState("Mid-Term Examination")
  const [selectedSubjectId, setSelectedSubjectId] = useState("sub_001")
  const [examChecks, setExamChecks] = useState({})
  const [saveMessage, setSaveMessage] = useState("")
  const [expandedStudentId, setExpandedStudentId] = useState(null)

  const filterFaculty = dummyFaculties.find((f) => f._id === filterFacultyId)
  const levelOptions = useMemo(() => getLevelOptions(filterFaculty), [filterFaculty])
  const levelNum = filterLevel ? Number(filterLevel) : null
  const classSelected = Boolean(filterFacultyId && filterLevel)

  const classStudents = useMemo(() => {
    if (!classSelected) return []
    return dummyClassRoster.filter(
      (s) =>
        s.admission.facultyId === filterFacultyId &&
        s.enrollment.status === "active" &&
        s.enrollment.currentLevel === levelNum
    )
  }, [classSelected, filterFacultyId, filterLevel, levelNum])

  const generalForClass = useMemo(() => {
    const map = new Map()
    generalAttendance
      .filter((a) => a.facultyId === filterFacultyId && a.level === levelNum)
      .forEach((a) => map.set(a.studentId, a))
    return map
  }, [generalAttendance, filterFacultyId, levelNum])

  const subjectsForClass = useMemo(() => {
    if (!classSelected) return []
    return dummySubjects.filter(
      (s) => s.facultyId === filterFacultyId && s.level === levelNum
    )
  }, [classSelected, filterFacultyId, levelNum])

  const selectedSubject = subjectsForClass.find((s) => s._id === selectedSubjectId)

  const examSessionForDate = useMemo(
    () =>
      examSessions.find(
        (s) =>
          s.facultyId === filterFacultyId &&
          s.level === levelNum &&
          s.examDate === examDate &&
          s.subjectId === selectedSubjectId
      ),
    [examSessions, filterFacultyId, levelNum, examDate, selectedSubjectId]
  )

  const examRecordsForDate = useMemo(
    () =>
      examAttendance.filter(
        (a) =>
          a.facultyId === filterFacultyId &&
          a.level === levelNum &&
          a.examDate === examDate &&
          a.subjectId === selectedSubjectId
      ),
    [examAttendance, filterFacultyId, levelNum, examDate, selectedSubjectId]
  )

  const buildExamChecksFromRecords = () => {
    const checks = {}
    classStudents.forEach((s) => {
      const rec = examRecordsForDate.find((r) => r.studentId === s._id)
      checks[s._id] = rec ? rec.present : false
    })
    return checks
  }

  useEffect(() => {
    if (subjectsForClass.length && !subjectsForClass.find((s) => s._id === selectedSubjectId)) {
      setSelectedSubjectId(subjectsForClass[0]._id)
    }
  }, [subjectsForClass, selectedSubjectId])

  useEffect(() => {
    if (category === "exam" && classSelected && classStudents.length) {
      setExamChecks(buildExamChecksFromRecords())
    }
  }, [
    category,
    classSelected,
    examDate,
    filterFacultyId,
    filterLevel,
    selectedSubjectId,
    examAttendance,
    classStudents.length,
  ])

  const handleCategoryExam = () => setCategory("exam")

  const classStats = useMemo(() => {
    if (!classStudents.length) return null
    const genPercents = classStudents.map((s) => {
      const g = generalForClass.get(s._id)
      return g?.summary?.percentage ?? 0
    })
    const avgGeneral =
      genPercents.reduce((a, b) => a + b, 0) / (genPercents.length || 1)
    const examPresent = examRecordsForDate.filter((r) => r.present).length
    const examTotal = classStudents.length
    return {
      studentCount: classStudents.length,
      avgGeneral: avgGeneral.toFixed(1),
      examMarked: examRecordsForDate.length,
      examPresent,
      examRate:
        examTotal > 0 ? ((examPresent / examTotal) * 100).toFixed(1) : "—",
    }
  }, [classStudents, generalForClass, examRecordsForDate])

  const pastExamDates = useMemo(
    () =>
      examSessions
        .filter((s) => s.facultyId === filterFacultyId && s.level === levelNum)
        .sort((a, b) => b.examDate.localeCompare(a.examDate)),
    [examSessions, filterFacultyId, levelNum]
  )

  const handleSaveExamAttendance = () => {
    if (!classSelected || !examDate || !selectedSubjectId) return
    if (!selectedSubject) {
      setSaveMessage("Select a subject registered for this class (add in Academics → Subjects).")
      return
    }

    let session = examSessionForDate
    if (!session) {
      session = {
        _id: `exs_${Date.now()}`,
        facultyId: filterFacultyId,
        level: levelNum,
        examDate,
        title: examTitle || "Examination",
        subjectId: selectedSubject._id,
        subjectName: selectedSubject.name,
        subjectCode: selectedSubject.code,
        createdBy: { role: "admin", adminId: "admin_001" },
        createdAt: new Date().toISOString(),
      }
      setExamSessions([...examSessions, session])
    }

    const now = new Date().toISOString()
    const withoutThisDate = examAttendance.filter(
      (a) =>
        !(
          a.facultyId === filterFacultyId &&
          a.level === levelNum &&
          a.examDate === examDate &&
          a.subjectId === selectedSubjectId
        )
    )

    const newRecords = classStudents.map((s) => ({
      _id: `att_ex_${s._id}_${examDate}_${selectedSubjectId}`,
      examSessionId: session._id,
      studentId: s._id,
      facultyId: filterFacultyId,
      level: levelNum,
      subjectId: selectedSubjectId,
      type: "exam",
      examDate,
      present: Boolean(examChecks[s._id]),
      markedBy: { role: "admin", adminId: "admin_001" },
      markedAt: now,
    }))

    setExamAttendance([...withoutThisDate, ...newRecords])
    setSaveMessage(`Exam attendance saved for ${examDate}. (UI demo — API later.)`)
    setTimeout(() => setSaveMessage(""), 4000)
  }

  const toggleAllExamPresent = (value) => {
    const checks = {}
    classStudents.forEach((s) => {
      checks[s._id] = value
    })
    setExamChecks(checks)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="mt-1 text-gray-600">
          View general class attendance (teacher-marked) and mark exam-day attendance (admin)
        </p>
      </div>

      {/* Class selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Select class</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Faculty</label>
            <select
              className={selectClass}
              value={filterFacultyId}
              onChange={(e) => {
                setFilterFacultyId(e.target.value)
                setFilterLevel("")
              }}
            >
              <option value="">Choose faculty</option>
              {dummyFaculties.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.code} — {f.structureType === "semester" ? "Semester" : "Year"} based
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              {filterFaculty?.structureType === "year" ? "Year" : "Semester"}
            </label>
            <select
              className={selectClass}
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              disabled={!filterFacultyId}
            >
              <option value="">Choose level</option>
              {levelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {classSelected && filterFaculty && (
          <p className="mt-3 text-sm text-gray-600">
            Showing: <strong>{filterFaculty.code}</strong> ·{" "}
            {getLevelLabel(filterFaculty.structureType, levelNum)} · Batch students
          </p>
        )}
      </div>

      {!classSelected && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <GraduationCap className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">Select a faculty and level to view attendance.</p>
        </div>
      )}

      {classSelected && (
        <>
          {/* Stats */}
          {classStats && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Students", value: classStats.studentCount },
                { label: "Avg. general %", value: `${classStats.avgGeneral}%` },
                {
                  label: "Exam day present",
                  value: `${classStats.examPresent}/${classStats.studentCount}`,
                },
                { label: "Exam rate (date)", value: `${classStats.examRate}%` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
            <button
              type="button"
              onClick={() => setCategory("general")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                category === "general"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Eye className="h-4 w-4" />
              General (class days)
            </button>
            <button
              type="button"
              onClick={handleCategoryExam}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                category === "exam"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ClipboardCheck className="h-4 w-4" />
              Exam
            </button>
          </div>

          {/* ─── General ─── */}
          {category === "general" && (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <Info className="h-5 w-5 shrink-0" />
                <p>
                  <strong>General attendance</strong> is recorded by teachers during regular class
                  days. Admins can view summaries and daily logs only — no editing on this page.
                </p>
              </div>

              {classStudents.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
                  No active students in this class.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-gray-700">Student</th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Student ID</th>
                          <th className="px-4 py-3 font-semibold text-gray-700 text-center">
                            Present
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-700 text-center">
                            Absent
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-700 text-center">
                            Late
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-700 text-center">
                            %
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Recent logs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((s) => {
                          const att = generalForClass.get(s._id)
                          const sum = att?.summary ?? {
                            present: 0,
                            absent: 0,
                            late: 0,
                            percentage: 0,
                          }
                          const expanded = expandedStudentId === s._id
                          return (
                            <Fragment key={s._id}>
                              <tr className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {fullName(s.profile)}
                                </td>
                                <td className="px-4 py-3 text-gray-600">{s.studentId}</td>
                                <td className="px-4 py-3 text-center text-green-700 font-medium">
                                  {sum.present}
                                </td>
                                <td className="px-4 py-3 text-center text-red-700 font-medium">
                                  {sum.absent}
                                </td>
                                <td className="px-4 py-3 text-center text-amber-700 font-medium">
                                  {sum.late}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                                      sum.percentage >= 85
                                        ? "bg-green-100 text-green-800"
                                        : sum.percentage >= 75
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {sum.percentage}%
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedStudentId(expanded ? null : s._id)
                                    }
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                  >
                                    {expanded ? "Hide" : "View"} ({att?.records?.length ?? 0})
                                  </button>
                                </td>
                              </tr>
                              {expanded && (
                                <tr key={`${s._id}-detail`}>
                                  <td colSpan={7} className="bg-gray-50 px-4 py-3">
                                    {!att?.records?.length ? (
                                      <p className="text-sm text-gray-500">
                                        No daily logs yet (teacher module will add these).
                                      </p>
                                    ) : (
                                      <ul className="space-y-2">
                                        {att.records.map((r) => (
                                          <li
                                            key={r._id}
                                            className="flex flex-wrap items-center gap-3 text-sm"
                                          >
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium text-gray-800">
                                              {r.date}
                                            </span>
                                            <span
                                              className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusBadge[r.status]}`}
                                            >
                                              {r.status}
                                            </span>
                                            <span className="text-gray-500">
                                              by {r.markedBy.name} (teacher)
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Exam ─── */}
          {category === "exam" && (
            <div className="space-y-6">
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <Info className="h-5 w-5 shrink-0" />
                <p>
                  <strong>Exam attendance</strong> is marked by admin on dates when examinations
                  are held. 
                </p>
             {/*    Stored as type: exam
                  for student performance reports (separate from general class attendance). */}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900">Exam session</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Exam date</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={examDate}
                      onChange={(e) => {
                        setExamDate(e.target.value)
                        setSaveMessage("")
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Exam title</label>
                    <input
                      className={inputClass}
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder="Mid-Term Examination"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Subject</label>
                    {subjectsForClass.length === 0 ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        No subjects for this class. Add them in Academics → Subjects.
                      </p>
                    ) : (
                      <select
                        className={selectClass}
                        value={selectedSubjectId}
                        onChange={(e) => {
                          setSelectedSubjectId(e.target.value)
                          setSaveMessage("")
                        }}
                      >
                        {subjectsForClass.map((sub) => (
                          <option key={sub._id} value={sub._id}>
                            {sub.name} ({sub.code})
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedSubject?.assignedTeacher && (
                      <p className="mt-1 text-xs text-gray-500">
                        Class teacher: {selectedSubject.assignedTeacher.fullName}
                      </p>
                    )}
                  </div>
                </div>
                {examSessionForDate && (
                  <p className="text-sm text-green-700 font-medium">
                    Existing session: {examSessionForDate.title} — {examSessionForDate.subjectName}{" "}
                    ({examSessionForDate.subjectCode})
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExamChecks(buildExamChecksFromRecords())}
                  >
                    Load saved for this date
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleAllExamPresent(true)}>
                    Mark all present
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleAllExamPresent(false)}>
                    Clear all
                  </Button>
                </div>
              </div>

              {classStudents.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
                  No students to mark.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-gray-700 w-12 text-center">
                            Present
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Student</th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Student ID</th>
                          <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((s) => {
                          const checked = Boolean(examChecks[s._id])
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
                                    setExamChecks({
                                      ...examChecks,
                                      [s._id]: e.target.checked,
                                    })
                                  }
                                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                  aria-label={`Present at exam for ${fullName(s.profile)}`}
                                />
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {fullName(s.profile)}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{s.studentId}</td>
                              <td className="px-4 py-3">
                                {checked ? (
                                  <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                                    <CheckCircle2 className="h-4 w-4" /> Present at exam
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                    <XCircle className="h-4 w-4" /> Absent at exam
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-4">
                    <p className="text-sm text-gray-600">
                      {Object.values(examChecks).filter(Boolean).length} of{" "}
                      {classStudents.length} marked present
                    </p>
                    <Button variant="primary" onClick={handleSaveExamAttendance}>
                      Save exam attendance
                    </Button>
                  </div>
                </div>
              )}

              {saveMessage && (
                <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                  {saveMessage}
                </p>
              )}

              {/* Past exam dates */}
              {pastExamDates.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-gray-900">Past exam sessions (this class)</h3>
                  <ul className="space-y-3">
                    {pastExamDates.map((ex) => {
                      const records = examAttendance.filter(
                        (a) => a.examSessionId === ex._id
                      )
                      const present = records.filter((r) => r.present).length
                      return (
                        <li
                          key={ex._id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {ex.examDate} — {ex.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {ex.subjectName} ({ex.subjectCode})
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-700">
                              {present}/{records.length || classStudents.length} present
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExamDate(ex.examDate)
                                setExamTitle(ex.title)
                                setSelectedSubjectId(ex.subjectId)
                                setCategory("exam")
                              }}
                            >
                              Open
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
