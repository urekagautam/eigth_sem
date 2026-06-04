import { Fragment, useEffect, useMemo, useState } from "react";
import { Calendar, Eye, RefreshCw } from "lucide-react";
import Button from "../../components/Button";
import { fetchAdminGeneralAttendance } from "../../services/apiAttendance";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const statusBadge = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
};

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [expandedStudentId, setExpandedStudentId] = useState("");

  const loadAttendance = async (classOfferingId = "") => {
    setLoading(true);
    try {
      const response = await fetchAdminGeneralAttendance({ classOfferingId });
      const nextClasses = response?.data?.classes || [];
      setClasses(nextClasses);
      setNotice({ type: "", message: "" });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to load general attendance.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

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

  const totals = useMemo(() => {
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-gray-600">
            View teacher-marked general attendance for active classes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadAttendance()}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
          ) : (
            <Eye className="mr-2 inline h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

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
          ["Students", totals.students],
          ["Records", totals.records],
          ["Present", totals.present],
          ["Absent", totals.absent],
          ["Overall %", `${totals.percentage}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {label}
            </p>
            <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {loading && !classes.length ? (
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
                      <th className="px-4 py-3 text-center font-semibold">Present</th>
                      <th className="px-4 py-3 text-center font-semibold">Absent</th>
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
    </div>
  );
}
