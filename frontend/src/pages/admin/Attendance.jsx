import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Eye,
  Phone,
  RefreshCw,
  Save,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import Button from "../../components/Button";
import {
  fetchAdminExamAttendanceContext,
  fetchAdminExamAttendanceSession,
  fetchAdminGeneralAttendance,
  saveAdminExamAttendance,
} from "../../services/apiAttendance";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const statusBadge = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
};

const tabClass = (active) =>
  `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
    active
      ? "bg-blue-600 text-white shadow-sm"
      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
  }`;

const getGuardianContact = (student) => ({
  name: student.guardianName || student.fatherName || student.motherName || "Guardian",
  phone: student.guardianMobile || student.fatherMobile || student.motherMobile || "",
});

const historyStatusClass = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  "not-marked": "bg-gray-100 text-gray-600",
};

export default function Attendance() {
  const [activeTab, setActiveTab] = useState("general");
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [expandedStudentId, setExpandedStudentId] = useState("");

  const [examSessions, setExamSessions] = useState([]);
  const [selectedExamDate, setSelectedExamDate] = useState("");
  const [selectedSessionKey, setSelectedSessionKey] = useState("");
  const [examSessionData, setExamSessionData] = useState(null);
  const [examStatuses, setExamStatuses] = useState({});
  const [loadingExamContext, setLoadingExamContext] = useState(false);
  const [loadingExamSession, setLoadingExamSession] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [examNotice, setExamNotice] = useState({ type: "", message: "" });

  const loadGeneralAttendance = async (classOfferingId = "") => {
    setLoadingGeneral(true);
    try {
      const response = await fetchAdminGeneralAttendance({ classOfferingId });
      setClasses(response?.data?.classes || []);
      setNotice({ type: "", message: "" });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to load general attendance.",
      });
    } finally {
      setLoadingGeneral(false);
    }
  };

  const loadExamContext = async () => {
    setLoadingExamContext(true);
    try {
      const response = await fetchAdminExamAttendanceContext();
      const sessions = response?.data?.sessions || [];
      setExamSessions(sessions);
      setSelectedExamDate((current) => {
        if (current && sessions.some((session) => session.date === current)) {
          return current;
        }
        return sessions[0]?.date || "";
      });
      setExamNotice({ type: "", message: "" });
    } catch (error) {
      setExamNotice({
        type: "error",
        message: error.message || "Failed to load exam attendance sessions.",
      });
    } finally {
      setLoadingExamContext(false);
    }
  };

  const selectedExamSession = useMemo(
    () =>
      examSessions.find((session) => session.examItemId === selectedSessionKey) ||
      null,
    [examSessions, selectedSessionKey],
  );

  const examDates = useMemo(
    () => [...new Set(examSessions.map((session) => session.date))],
    [examSessions],
  );

  const sessionsForSelectedDate = useMemo(
    () =>
      examSessions.filter((session) => session.date === selectedExamDate),
    [examSessions, selectedExamDate],
  );

  const loadExamSession = async (session = selectedExamSession) => {
    if (!session) {
      setExamSessionData(null);
      setExamStatuses({});
      return;
    }

    setLoadingExamSession(true);
    try {
      const response = await fetchAdminExamAttendanceSession(
        session.examId,
        session.examItemId,
      );
      const data = response?.data || null;
      const recordsByStudent = new Map(
        (data?.records || []).map((record) => [record.studentId, record.status]),
      );
      const nextStatuses = {};
      (data?.students || []).forEach((student) => {
        nextStatuses[student._id] = recordsByStudent.get(student._id) || "present";
      });
      setExamSessionData(data);
      setExamStatuses(nextStatuses);
      setExamNotice({ type: "", message: "" });
    } catch (error) {
      setExamNotice({
        type: "error",
        message: error.message || "Failed to load exam attendance.",
      });
    } finally {
      setLoadingExamSession(false);
    }
  };

  useEffect(() => {
    loadGeneralAttendance();
  }, []);

  useEffect(() => {
    if (activeTab === "exam" && !examSessions.length) {
      loadExamContext();
    }
  }, [activeTab, examSessions.length]);

  useEffect(() => {
    if (activeTab === "exam" && selectedExamSession) {
      loadExamSession(selectedExamSession);
    }
  }, [activeTab, selectedExamSession]);

  useEffect(() => {
    if (activeTab !== "exam") return;
    if (!sessionsForSelectedDate.length) {
      setSelectedSessionKey("");
      setExamSessionData(null);
      setExamStatuses({});
      return;
    }
    if (
      !sessionsForSelectedDate.some(
        (session) => session.examItemId === selectedSessionKey,
      )
    ) {
      setSelectedSessionKey(sessionsForSelectedDate[0].examItemId);
    }
  }, [activeTab, sessionsForSelectedDate, selectedSessionKey]);

  const allClassOptions = useMemo(
    () =>
      classes.map(({ assignment }) => ({
        value: assignment.classOfferingId,
        label: `${assignment.facultyCode} - ${assignment.levelLabel} - Batch ${
          assignment.batch
        }`,
      })),
    [classes],
  );

  const visibleClasses = useMemo(() => {
    if (!selectedClassId) return classes;
    return classes.filter(
      ({ assignment }) => assignment.classOfferingId === selectedClassId,
    );
  }, [classes, selectedClassId]);

  const generalTotals = useMemo(() => {
    const students = visibleClasses.reduce(
      (sum, item) => sum + item.students.length,
      0,
    );
    const records = visibleClasses.reduce(
      (sum, item) => sum + item.records.length,
      0,
    );
    const present = visibleClasses.reduce(
      (sum, item) =>
        sum + item.records.filter((record) => record.status === "present").length,
      0,
    );
    return {
      students,
      records,
      present,
      absent: records - present,
      percentage: records ? Number(((present / records) * 100).toFixed(1)) : 0,
    };
  }, [visibleClasses]);

  const examTotals = useMemo(() => {
    const students = examSessionData?.students || [];
    const present = students.filter(
      (student) => examStatuses[student._id] === "present",
    ).length;
    const absent = students.filter(
      (student) => examStatuses[student._id] === "absent",
    ).length;

    return {
      students: students.length,
      present,
      absent,
      percentage: students.length
        ? Number(((present / students.length) * 100).toFixed(1))
        : 0,
    };
  }, [examSessionData, examStatuses]);

  const absentExamStudents = useMemo(
    () =>
      (examSessionData?.students || []).filter(
        (student) => examStatuses[student._id] === "absent",
      ),
    [examSessionData, examStatuses],
  );

  const dateExamStats = useMemo(() => {
    const examKeys = new Set(
      sessionsForSelectedDate.map((session) => session.examId),
    );
    const students = sessionsForSelectedDate.reduce(
      (sum, session) => sum + (session.studentCount || 0),
      0,
    );

    return {
      exams: examKeys.size,
      sessions: sessionsForSelectedDate.length,
      students,
      date: selectedExamDate || "No date selected",
    };
  }, [sessionsForSelectedDate, selectedExamDate]);

  const routineAttendanceByStudent = useMemo(() => {
    const byStudent = new Map();
    (examSessionData?.examRecords || []).forEach((record) => {
      if (!byStudent.has(record.studentId)) {
        byStudent.set(record.studentId, new Map());
      }
      byStudent.get(record.studentId).set(record.examItemId, record.status);
    });
    return byStudent;
  }, [examSessionData]);

  const routineSessions = useMemo(
    () => examSessionData?.examSessions || [],
    [examSessionData],
  );

  const getRoutineHistory = (studentId) => {
    const records = routineAttendanceByStudent.get(studentId) || new Map();
    return routineSessions.map((session) => ({
      ...session,
      status:
        session.examItemId === examSessionData?.session?.examItemId
          ? examStatuses[studentId] || records.get(session.examItemId) || "present"
          : records.get(session.examItemId) || "not-marked",
    }));
  };

  const recordsForStudent = (item, studentId) =>
    item.records.filter((record) => record.studentId === studentId);

  const rankedStudentsForClass = (item) => {
    const studentById = new Map(
      item.students.map((student) => [student._id, student]),
    );
    const ranked = item.summary
      .filter((summary) => summary.total > 0)
      .map((summary) => ({
        ...summary,
        studentName: studentById.get(summary.studentId)?.name || "Student",
        studentCode: studentById.get(summary.studentId)?.studentId || "",
      }));

    return {
      topStudents: [...ranked]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3),
      bottomStudents: [...ranked]
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 3),
    };
  };

  const updateExamStatus = (studentId, status) => {
    setExamStatuses((current) => ({ ...current, [studentId]: status }));
  };

  const markAllExamStudents = (status) => {
    const nextStatuses = {};
    (examSessionData?.students || []).forEach((student) => {
      nextStatuses[student._id] = status;
    });
    setExamStatuses(nextStatuses);
  };

  const handleSaveExamAttendance = async () => {
    if (!examSessionData?.session) return;
    setSavingExam(true);
    try {
      const records = (examSessionData.students || []).map((student) => ({
        studentId: student._id,
        status: examStatuses[student._id] === "absent" ? "absent" : "present",
      }));
      await saveAdminExamAttendance(
        examSessionData.session.examId,
        examSessionData.session.examItemId,
        records,
      );
      await loadExamSession(examSessionData.session);
      setExamNotice({
        type: "success",
        message: `Exam attendance saved. Present: ${examTotals.present}/${examTotals.students}.`,
      });
    } catch (error) {
      setExamNotice({
        type: "error",
        message: error.message || "Failed to save exam attendance.",
      });
    } finally {
      setSavingExam(false);
    }
  };

  const renderGeneralAttendance = () => (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          General attendance view
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className={labelClass}>Active class</label>
            <select
              className={selectClass}
              value={selectedClassId}
              onChange={(event) => {
                setSelectedClassId(event.target.value);
                setExpandedStudentId("");
              }}
            >
              <option value="">All active classes</option>
              {allClassOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Admin view is read-only. Teachers create, update, and delete daily
            general attendance from the teacher module.
          </div>
        </div>
      </div>

      {notice.message && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {notice.message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Students", generalTotals.students],
          ["Records", generalTotals.records],
          ["Present", generalTotals.present],
          ["Absent", generalTotals.absent],
          ["Overall %", `${generalTotals.percentage}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {label}
            </p>
            <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {loadingGeneral && !classes.length ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
          Loading attendance...
        </div>
      ) : visibleClasses.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
          No active attendance classes found.
        </div>
      ) : (
        visibleClasses.map((item) => {
          const summaryMap = new Map(
            item.summary.map((summary) => [summary.studentId, summary]),
          );
          const assignment = item.assignment;
          const ranked = rankedStudentsForClass(item);
          return (
            <div
              key={assignment.classOfferingId}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
                <h2 className="font-bold text-gray-900">
                  {assignment.facultyCode} - {assignment.levelLabel} - Batch{" "}
                  {assignment.batch}
                </h2>
                {assignment.subjects?.length ? (
                  <p className="text-sm text-gray-600">
                    Active subjects:{" "}
                    {assignment.subjects
                      .map((subject) =>
                        subject.subjectCode
                          ? `${subject.subjectCode} ${subject.subjectName}`
                          : subject.subjectName,
                      )
                      .join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 border-b border-gray-200 p-4 lg:grid-cols-2">
                <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                  <h3 className="font-bold text-green-900">
                    Top 3 attending students
                  </h3>
                  {ranked.topStudents.length ? (
                    <ol className="mt-3 space-y-2">
                      {ranked.topStudents.map((student, index) => (
                        <li
                          key={student.studentId}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {index + 1}. {student.studentName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {student.studentCode}
                            </p>
                          </div>
                          <span className="font-bold text-green-700">
                            {student.percentage}% ({student.present}/
                            {student.total})
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 text-sm text-green-800">
                      No saved attendance yet.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                  <h3 className="font-bold text-amber-900">
                    Bottom 3 attendance
                  </h3>
                  {ranked.bottomStudents.length ? (
                    <ol className="mt-3 space-y-2">
                      {ranked.bottomStudents.map((student, index) => (
                        <li
                          key={student.studentId}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {index + 1}. {student.studentName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {student.studentCode}
                            </p>
                          </div>
                          <span className="font-bold text-amber-700">
                            {student.percentage}% ({student.present}/
                            {student.total})
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 text-sm text-amber-800">
                      No saved attendance yet.
                    </p>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-white text-gray-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Student ID</th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Present
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Absent
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">%</th>
                      <th className="px-4 py-3 font-semibold">Recent logs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.students.map((student) => {
                      const summary = summaryMap.get(student._id) || {
                        present: 0,
                        absent: 0,
                        percentage: 0,
                      };
                      const studentKey = `${assignment.classOfferingId}:${student._id}`;
                      const expanded = expandedStudentId === studentKey;
                      const logs = recordsForStudent(item, student._id);
                      return (
                        <Fragment key={student._id}>
                          <tr className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {student.name}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {student.studentId}
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-green-700">
                              {summary.present}
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-red-700">
                              {summary.absent}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                  summary.percentage >= 85
                                    ? "bg-green-100 text-green-800"
                                    : summary.percentage >= 75
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {summary.percentage}%
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStudentId(expanded ? "" : studentKey)
                                }
                                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                              >
                                {expanded ? "Hide" : "View"} ({logs.length})
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr>
                              <td colSpan={6} className="bg-gray-50 px-4 py-3">
                                {!logs.length ? (
                                  <p className="text-sm text-gray-500">
                                    No daily logs recorded yet.
                                  </p>
                                ) : (
                                  <ul className="space-y-2">
                                    {logs.map((record) => (
                                      <li
                                        key={record.id}
                                        className="flex flex-wrap items-center gap-3 text-sm"
                                      >
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <span className="font-medium text-gray-800">
                                          {record.date}
                                        </span>
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                                            statusBadge[record.status]
                                          }`}
                                        >
                                          {record.status}
                                        </span>
                                        <span className="text-gray-500">
                                          marked by{" "}
                                          {record.markedBy?.name || "teacher"}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </>
  );

  const renderExamAttendance = () => (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr_auto] lg:items-end">
          <div>
            <label className={labelClass}>Exam date</label>
            <select
              className={selectClass}
              value={selectedExamDate}
              onChange={(event) => {
                setSelectedExamDate(event.target.value);
                setSelectedSessionKey("");
                setExamSessionData(null);
                setExamStatuses({});
              }}
              disabled={loadingExamContext || !examDates.length}
            >
              {examDates.length ? (
                examDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))
              ) : (
                <option value="">No active exam dates found</option>
              )}
            </select>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-sm font-semibold text-blue-950">
              {dateExamStats.sessions} subject exam
              {dateExamStats.sessions === 1 ? "" : "s"} on {dateExamStats.date}
            </p>
            <p className="text-sm text-blue-800">
              {dateExamStats.exams} separate terminal/pre-board routine
              {dateExamStats.exams === 1 ? "" : "s"} across active classes.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadExamContext}
            disabled={loadingExamContext}
          >
            <RefreshCw
              className={`mr-2 inline h-4 w-4 ${
                loadingExamContext ? "animate-spin" : ""
              }`}
            />
            Refresh exams
          </Button>
        </div>

        {sessionsForSelectedDate.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {sessionsForSelectedDate.map((session) => {
              const selected = session.examItemId === selectedSessionKey;
              return (
                <button
                  key={session.examItemId}
                  type="button"
                  onClick={() => {
                    setSelectedSessionKey(session.examItemId);
                    setExamSessionData(null);
                    setExamStatuses({});
                  }}
                  className={`rounded-lg border p-4 text-left transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{session.title}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {session.facultyCode} - {session.levelLabel} - Batch{" "}
                        {session.batch}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {session.time}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">
                    {session.subjectCode ? `${session.subjectCode} - ` : ""}
                    {session.subjectName}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {session.studentCount} active students
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {examNotice.message && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            examNotice.type === "success"
              ? "border-green-100 bg-green-50 text-green-800"
              : "border-red-100 bg-red-50 text-red-800"
          }`}
        >
          {examNotice.message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["Exam routines", dateExamStats.exams, Calendar, "text-blue-700"],
          ["Subject sessions", dateExamStats.sessions, Users, "text-blue-700"],
          ["Scheduled", dateExamStats.students, Users, "text-gray-800"],
          ["Students", examTotals.students, Users, "text-blue-700"],
          ["Present", examTotals.present, CheckCircle2, "text-green-700"],
          ["Absent", examTotals.absent, XCircle, "text-red-700"],
          ["Selected %", `${examTotals.percentage}%`, UserCheck, "text-gray-800"],
        ].map(([label, value, Icon, colorClass]) => (
          <div
            key={label}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </p>
              <Icon className={`h-5 w-5 ${colorClass}`} />
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {loadingExamContext || loadingExamSession ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
          Loading exam attendance...
        </div>
      ) : !examSessions.length ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
          Create an exam routine first, then exam attendance will appear here.
        </div>
      ) : !examSessionData ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
          Select an exam session to mark attendance.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-4">
              <div>
                <h2 className="font-bold text-gray-900">
                  {examSessionData.session.title}
                </h2>
                <p className="text-sm text-gray-600">
                  {examSessionData.session.facultyCode} -{" "}
                  {examSessionData.session.levelLabel} - Batch{" "}
                  {examSessionData.session.batch} |{" "}
                  {examSessionData.session.subjectCode
                    ? `${examSessionData.session.subjectCode} - `
                    : ""}
                  {examSessionData.session.subjectName}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllExamStudents("present")}
                >
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  All present
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleSaveExamAttendance}
                  disabled={savingExam}
                >
                  {savingExam ? (
                    <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 inline h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-white text-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Student ID</th>
                    <th className="px-4 py-3 font-semibold">Roll no.</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">This exam routine</th>
                    <th className="px-4 py-3 font-semibold">Guardian contact</th>
                  </tr>
                </thead>
                <tbody>
                  {examSessionData.students.map((student) => {
                    const status = examStatuses[student._id] || "present";
                    const contact = getGuardianContact(student);
                    const history = getRoutineHistory(student._id);
                    return (
                      <tr
                        key={student._id}
                        className={`border-t border-gray-100 ${
                          status === "absent" ? "bg-red-50/60" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {student.studentId}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {student.rollNo || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="mx-auto flex w-max overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                            <button
                              type="button"
                              onClick={() => updateExamStatus(student._id, "present")}
                              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                                status === "present"
                                  ? "bg-green-600 text-white"
                                  : "text-gray-600 hover:bg-green-50"
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => updateExamStatus(student._id, "absent")}
                              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                                status === "absent"
                                  ? "bg-red-600 text-white"
                                  : "text-gray-600 hover:bg-red-50"
                              }`}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Absent
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-[340px] flex-wrap gap-1.5">
                            {history.map((item) => (
                              <span
                                key={item.examItemId}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                  historyStatusClass[item.status]
                                }`}
                                title={`${item.date} ${item.time} - ${
                                  item.subjectName
                                }`}
                              >
                                {item.subjectCode || item.subjectName}:{" "}
                                {item.status === "not-marked"
                                  ? "not marked"
                                  : item.status}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-xs text-gray-500">
                            {contact.phone || "No phone saved"}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-lg border border-red-100 bg-white shadow-sm">
            <div className="border-b border-red-100 bg-red-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-700" />
                <div>
                  <h2 className="font-bold text-red-950">Exam absentees</h2>
                  <p className="text-sm text-red-800">
                    Guardian details are shown here for quick follow-up.
                  </p>
                </div>
              </div>
            </div>
            <div className="max-h-[620px] overflow-y-auto p-4">
              {!absentExamStudents.length ? (
                <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-6 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-green-700" />
                  <p className="mt-2 font-semibold text-green-900">
                    No absent students selected.
                  </p>
                  <p className="text-sm text-green-800">
                    Any student marked absent will appear here immediately.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {absentExamStudents.map((student) => {
                    const contact = getGuardianContact(student);
                    const history = getRoutineHistory(student._id);
                    return (
                      <div
                        key={student._id}
                        className="rounded-lg border border-red-100 bg-red-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-red-950">
                              {student.name}
                            </p>
                            <p className="text-sm text-red-800">
                              {student.studentId}
                              {student.rollNo ? ` - Roll ${student.rollNo}` : ""}
                            </p>
                          </div>
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                            Absent
                          </span>
                        </div>
                        <div className="mt-3 rounded-lg bg-white px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Routine attendance
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {history.map((item) => (
                              <span
                                key={item.examItemId}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                  historyStatusClass[item.status]
                                }`}
                                title={`${item.date} ${item.time} - ${
                                  item.subjectName
                                }`}
                              >
                                {item.subjectCode || item.subjectName}:{" "}
                                {item.status === "not-marked"
                                  ? "not marked"
                                  : item.status}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3 rounded-lg bg-white px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Guardian
                          </p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {contact.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="h-4 w-4 text-red-600" />
                            <span>{contact.phone || "No phone saved"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-gray-600">
            Review general attendance and mark admin-controlled exam attendance.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            activeTab === "general"
              ? loadGeneralAttendance()
              : selectedExamSession
                ? loadExamSession(selectedExamSession)
                : loadExamContext()
          }
          disabled={loadingGeneral || loadingExamContext || loadingExamSession}
        >
          {loadingGeneral || loadingExamContext || loadingExamSession ? (
            <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
          ) : (
            <Eye className="mr-2 inline h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={tabClass(activeTab === "general")}
          onClick={() => setActiveTab("general")}
        >
          <Calendar className="h-4 w-4" />
          General
        </button>
        <button
          type="button"
          className={tabClass(activeTab === "exam")}
          onClick={() => setActiveTab("exam")}
        >
          <UserCheck className="h-4 w-4" />
          Exam
        </button>
      </div>

      {activeTab === "general" ? renderGeneralAttendance() : renderExamAttendance()}
    </div>
  );
}
