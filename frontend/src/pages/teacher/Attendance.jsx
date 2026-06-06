import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import Button from "../../components/Button";
import {
  deleteTeacherAttendanceRecord,
  fetchTeacherAttendanceClass,
  fetchTeacherAttendanceContext,
  fetchTeacherAttendanceRecords,
  saveTeacherAttendance,
} from "../../services/apiAttendance";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";
const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const today = () => new Date().toISOString().slice(0, 10);

export default function Attendance() {
  const [assignments, setAssignments] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [classData, setClassData] = useState(null);
  const [recordsByStudent, setRecordsByStudent] = useState(new Map());
  const [checks, setChecks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  useEffect(() => {
    const loadContext = async () => {
      setLoading(true);
      try {
        const response = await fetchTeacherAttendanceContext();
        const nextAssignments = response?.data?.assignments || [];
        setAssignments(nextAssignments);
        setSelectedOfferingId(nextAssignments[0]?.classOfferingId || "");
      } catch (error) {
        setNotice({
          type: "error",
          message: error.message || "Failed to load assigned classes.",
        });
      } finally {
        setLoading(false);
      }
    };
    loadContext();
  }, []);

  useEffect(() => {
    const loadClass = async () => {
      setClassData(null);
      setRecordsByStudent(new Map());
      setChecks({});
      if (!selectedOfferingId) return;

      setLoading(true);
      try {
        const response = await fetchTeacherAttendanceClass(selectedOfferingId);
        setClassData(response?.data || null);
        setNotice({ type: "", message: "" });
      } catch (error) {
        setNotice({
          type: "error",
          message: error.message || "Failed to load class attendance.",
        });
      } finally {
        setLoading(false);
      }
    };
    loadClass();
  }, [selectedOfferingId]);

  useEffect(() => {
    const loadRecords = async () => {
      setRecordsByStudent(new Map());
      setChecks({});
      if (!selectedOfferingId || !selectedDate || !classData?.students) return;

      try {
        const response = await fetchTeacherAttendanceRecords(
          selectedOfferingId,
          selectedDate,
        );
        const recordMap = new Map();
        const nextChecks = {};
        (response?.data?.records || []).forEach((record) => {
          recordMap.set(record.studentId, record);
          nextChecks[record.studentId] = record.status === "present";
        });
        classData.students.forEach((student) => {
          if (nextChecks[student._id] == null) nextChecks[student._id] = false;
        });
        setRecordsByStudent(recordMap);
        setChecks(nextChecks);
      } catch (error) {
        setNotice({
          type: "error",
          message: error.message || "Failed to load daily attendance.",
        });
      }
    };
    loadRecords();
  }, [classData, selectedOfferingId, selectedDate]);

  const students = classData?.students || [];
  const assignment = classData?.assignment;

  const assignmentOptions = useMemo(
    () =>
      assignments.map((item) => ({
        value: item.classOfferingId,
        label: `${item.facultyCode} - ${item.levelLabel} - Batch ${item.batch}`,
      })),
    [assignments],
  );

  const summaryByStudent = useMemo(() => {
    const map = new Map();
    (classData?.summary || []).forEach((item) => map.set(item.studentId, item));
    return map;
  }, [classData]);

  const presentCount = Object.values(checks).filter(Boolean).length;

  const classStats = useMemo(() => {
    const summary = classData?.summary || [];
    const studentById = new Map(students.map((student) => [student._id, student]));
    const withAttendance = summary.filter((item) => item.total > 0);
    const average = withAttendance.length
      ? Number(
          (
            withAttendance.reduce((sum, item) => sum + item.percentage, 0) /
            withAttendance.length
          ).toFixed(1),
        )
      : 0;
    const lowAttendance = summary.filter(
      (item) => item.total > 0 && item.percentage < 75,
    ).length;
    const ranked = withAttendance.map((item) => ({
      ...item,
      studentName: studentById.get(item.studentId)?.name || "Student",
      studentCode: studentById.get(item.studentId)?.studentId || "",
    }));
    const topStudents = [...ranked]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
    const bottomStudents = [...ranked]
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3);

    return {
      average,
      lowAttendance,
      totalClasses: Math.max(...summary.map((item) => item.total || 0), 0),
      topStudents,
      bottomStudents,
    };
  }, [classData, students]);

  const handleSave = async () => {
    if (!selectedOfferingId || !selectedDate || !students.length) return;
    setSaving(true);
    setNotice({ type: "", message: "" });
    try {
      await saveTeacherAttendance(
        selectedOfferingId,
        selectedDate,
        students.map((student) => ({
          studentId: student._id,
          status: checks[student._id] ? "present" : "absent",
        })),
      );
      const [classResponse, recordsResponse] = await Promise.all([
        fetchTeacherAttendanceClass(selectedOfferingId),
        fetchTeacherAttendanceRecords(selectedOfferingId, selectedDate),
      ]);
      setClassData(classResponse?.data || null);
      const recordMap = new Map();
      (recordsResponse?.data?.records || []).forEach((record) =>
        recordMap.set(record.studentId, record),
      );
      setRecordsByStudent(recordMap);
      setNotice({
        type: "success",
        message: `Attendance saved for ${selectedDate}. Present: ${presentCount}/${students.length}.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to save attendance.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId) => {
    const record = recordsByStudent.get(studentId);
    if (!record) return;
    try {
      await deleteTeacherAttendanceRecord(selectedOfferingId, record.id);
      setRecordsByStudent((current) => {
        const next = new Map(current);
        next.delete(studentId);
        return next;
      });
      setChecks((current) => ({ ...current, [studentId]: false }));
      const response = await fetchTeacherAttendanceClass(selectedOfferingId);
      setClassData(response?.data || null);
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to delete attendance record.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="mt-1 text-gray-600">
          Mark attendance for your currently active assigned classes.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Select class</h2>
        {loading && !assignments.length ? (
          <p className="text-gray-600">Loading assigned classes...</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-600">
            No active class assignments found for your account.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label className={labelClass}>Assigned class</label>
              <select
                className={selectClass}
                value={selectedOfferingId}
                onChange={(event) => {
                  setSelectedOfferingId(event.target.value);
                  setNotice({ type: "", message: "" });
                }}
              >
                {assignmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                className={inputClass}
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setNotice({ type: "", message: "" });
                }}
              />
            </div>
          </div>
        )}
        {assignment && (
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {assignment.facultyCode} - {assignment.levelLabel} - Batch{" "}
            {assignment.batch}
            {assignment.subjectName ? (
              <span className="block text-blue-800">
                Your active subject access: {assignment.subjectName}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {notice.message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border border-green-100 bg-green-50 text-green-800"
              : "border border-red-100 bg-red-50 text-red-800"
          }`}
        >
          {notice.message}
        </p>
      )}

      {!selectedOfferingId ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <CalendarDays className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">Select a class to mark attendance.</p>
        </div>
      ) : (
        <>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Attendance stats
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Class average
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  {classStats.average}%
                </span>
                <span className="pb-1 text-sm text-gray-500">
                  across marked classes
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${Math.min(classStats.average, 100)}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Below 75%
              </p>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {classStats.lowAttendance}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                students need attendance attention
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Classes marked
              </p>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {classStats.totalClasses}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                attendance days saved for this class
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
              <h3 className="font-bold text-green-900">
                Top 3 attending students
              </h3>
              {classStats.topStudents.length ? (
                <ol className="mt-3 space-y-2">
                  {classStats.topStudents.map((item, index) => (
                    <li
                      key={item.studentId}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {index + 1}. {item.studentName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.studentCode}
                        </p>
                      </div>
                      <span className="font-bold text-green-700">
                        {item.percentage}% ({item.present}/{item.total})
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
              {classStats.bottomStudents.length ? (
                <ol className="mt-3 space-y-2">
                  {classStats.bottomStudents.map((item, index) => (
                    <li
                      key={item.studentId}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {index + 1}. {item.studentName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.studentCode}
                        </p>
                      </div>
                      <span className="font-bold text-amber-700">
                        {item.percentage}% ({item.present}/{item.total})
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
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Daily attendance</h2>
              <p className="text-sm text-gray-600">
                Present today: <strong>{presentCount}</strong> / {students.length}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setChecks(Object.fromEntries(students.map((student) => [student._id, true])))
                }
                disabled={!students.length}
              >
                Mark all present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setChecks(Object.fromEntries(students.map((student) => [student._id, false])))
                }
                disabled={!students.length}
              >
                Clear all
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !students.length}
              >
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save attendance"
                )}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Present</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Student ID</th>
                  <th className="px-4 py-3 font-semibold">Roll no.</th>
                  <th className="px-4 py-3 font-semibold">Overall</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No active students found for this batch.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => {
                    const checked = Boolean(checks[student._id]);
                    const record = recordsByStudent.get(student._id);
                    const summary = summaryByStudent.get(student._id);
                    return (
                      <tr key={student._id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setChecks((current) => ({
                                ...current,
                                [student._id]: event.target.checked,
                              }))
                            }
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{student.studentId}</td>
                        <td className="px-4 py-3 text-gray-600">{student.rollNo}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {summary?.total || 0} classes, {summary?.percentage || 0}%
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {checked ? (
                              <span className="inline-flex items-center gap-1 font-medium text-green-700">
                                <CheckCircle2 className="h-4 w-4" /> Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-red-600">
                                <XCircle className="h-4 w-4" /> Absent
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(student._id)}
                              disabled={!record}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 disabled:text-gray-400"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
