import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, RefreshCw } from "lucide-react";
import { fetchFaculties } from "../../services/apiFaculty";
import { fetchPerformanceLedger } from "../../services/apiPerformance";

const fieldClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const getLevelOptions = (faculty) => {
  if (!faculty) return [];
  if (Array.isArray(faculty.levels) && faculty.levels.length) {
    return faculty.levels;
  }

  const max = Math.max(Number(faculty.maxLevel) || 1, 1);
  return Array.from({ length: max }, (_, index) => ({
    value: index + 1,
    label: `${faculty.structureType === "year" ? "Year" : "Semester"} ${index + 1}`,
  }));
};

const formatMark = (value) => (value == null ? "--" : value);
const formatGpa = (value) => (value == null ? "--" : Number(value).toFixed(2));

const statusClass = (status) => {
  if (status === "Passed") return "bg-green-50 text-green-700 border-green-100";
  if (status === "Failed") return "bg-red-50 text-red-700 border-red-100";
  if (status === "Incomplete") return "bg-yellow-50 text-yellow-800 border-yellow-100";
  return "bg-gray-50 text-gray-600 border-gray-100";
};

export default function StudentPerformance() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [faculties, setFaculties] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedFaculty = faculties.find(
    (faculty) => faculty._id === selectedFacultyId,
  );
  const levelOptions = useMemo(
    () => getLevelOptions(selectedFaculty),
    [selectedFaculty],
  );

  useEffect(() => {
    const loadFaculties = async () => {
      try {
        const response = await fetchFaculties();
        const nextFaculties = (response?.data || []).map((faculty) => ({
          ...faculty,
          _id: faculty._id ?? faculty.id,
        }));
        setFaculties(nextFaculties);
        if (nextFaculties.length) {
          const requestedFaculty = searchParams.get("facultyId");
          const firstFaculty =
            nextFaculties.find((faculty) => faculty._id === requestedFaculty) ||
            nextFaculties[0];
          setSelectedFacultyId(firstFaculty._id);
          setSelectedLevel(
            searchParams.get("level") ||
              String(getLevelOptions(firstFaculty)[0]?.value || ""),
          );
          setSelectedBatch(searchParams.get("batch") || "");
          setSelectedExamId(searchParams.get("examId") || "");
        }
      } catch (err) {
        setError(err.message || "Failed to load faculties.");
      }
    };

    loadFaculties();
  }, [searchParams]);

  useEffect(() => {
    if (!selectedFaculty) return;
    const levels = getLevelOptions(selectedFaculty);
    if (!levels.some((item) => String(item.value) === String(selectedLevel))) {
      setSelectedLevel(String(levels[0]?.value || ""));
      setSelectedBatch("");
      setSelectedExamId("");
    }
  }, [selectedFaculty, selectedLevel]);

  useEffect(() => {
    const loadLedger = async () => {
      if (!selectedFacultyId || !selectedLevel) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetchPerformanceLedger({
          facultyId: selectedFacultyId,
          level: selectedLevel,
          batch: selectedBatch,
          examId: selectedExamId,
        });
        const data = response?.data || null;
        setLedger(data);
        if (!selectedBatch && data?.batch) setSelectedBatch(data.batch);
        if (data?.currentExam?.id && data.currentExam.id !== selectedExamId) {
          setSelectedExamId(data.currentExam.id);
        }
      } catch (err) {
        setLedger(null);
        setError(err.message || "Failed to load performance ledger.");
      } finally {
        setLoading(false);
      }
    };

    loadLedger();
  }, [selectedFacultyId, selectedLevel, selectedBatch, selectedExamId]);

  const rows = ledger?.rows || [];
  const subjects = ledger?.subjects || [];
  const exams = ledger?.exams || [];
  const currentExam = ledger?.currentExam;
  const currentStudentRow = studentId
    ? rows.find((row) => row.student.studentId === studentId)
    : null;
  const viewQuery = new URLSearchParams({
    facultyId: selectedFacultyId,
    level: selectedLevel,
    batch: selectedBatch,
    examId: selectedExamId,
  }).toString();

  const summary = useMemo(() => {
    const withGpa = rows.filter((row) => row.gpa != null);
    if (!withGpa.length) return null;
    const avg =
      withGpa.reduce((sum, row) => sum + Number(row.gpa), 0) / withGpa.length;
    return {
      students: rows.length,
      subjects: subjects.length,
      averageGpa: avg,
      complete: rows.filter((row) => row.complete).length,
    };
  }, [rows, subjects.length]);

  if (studentId) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => navigate("/admin/student-performance")}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-5 h-5" /> Back to result ledger
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Result and Performance
            </h1>
            <p className="text-sm text-gray-500">
              Student mark sheet and terminal summary
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
            Loading result...
          </div>
        ) : !currentStudentRow ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-red-700">
            Student result not found in the selected active class.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="grid gap-6 lg:grid-cols-4">
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Student
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {currentStudentRow.student.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ID: {currentStudentRow.student.studentId}
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Class
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {ledger?.faculty?.code} {ledger?.levelLabel}
                  </p>
                  <p className="text-sm text-gray-600">Batch {ledger?.batch}</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Exam
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {currentExam?.title || "No exam selected"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Rank {currentStudentRow.rank}
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Cumulative GPA
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {formatGpa(currentStudentRow.cumulativeGpa)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentStudentRow.termCount || 0} term(s)
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Marksheet
                  </h2>
                  <p className="text-sm text-gray-500">
                    Subject marks entered by assigned teachers.
                  </p>
                </div>
                <div
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold ${statusClass(currentStudentRow.status)}`}
                >
                  {currentStudentRow.status}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Marks</th>
                      <th className="px-4 py-3">%</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">GPA</th>
                      <th className="px-4 py-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStudentRow.subjectResults.map((item) => (
                      <tr
                        key={item.subjectId}
                        className={item.passed === false ? "bg-red-50" : "bg-white"}
                      >
                        <td className="border-t px-4 py-3 font-medium">
                          {item.subjectCode
                            ? `${item.subjectCode} - ${item.subjectName}`
                            : item.subjectName}
                        </td>
                        <td className="border-t px-4 py-3 font-semibold">
                          {formatMark(item.obtainedMarks)}/{item.fullMarks}
                        </td>
                        <td className="border-t px-4 py-3">
                          {item.percentage == null ? "--" : `${item.percentage}%`}
                        </td>
                        <td className="border-t px-4 py-3">{item.grade || "--"}</td>
                        <td className="border-t px-4 py-3">
                          {formatGpa(item.gradePoint)}
                        </td>
                        <td className="border-t px-4 py-3">{item.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Total marks</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">
                    {currentStudentRow.total}/{currentStudentRow.fullMarks}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Percentage</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">
                    {currentStudentRow.percentage == null
                      ? "--"
                      : `${currentStudentRow.percentage}%`}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Term GPA</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">
                    {formatGpa(currentStudentRow.gpa)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Rank</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">
                    {currentStudentRow.rank}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Result and Performance
          </h1>
          <p className="text-sm text-gray-500">
            Review teacher-entered marks, GPA, rank, and cumulative performance.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Current view</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">
            {ledger?.faculty?.code || selectedFaculty?.code || "Faculty"} -{" "}
            {ledger?.levelLabel || "Semester/year"}
          </div>
          <div className="text-sm text-gray-500">
            Batch {ledger?.batch || selectedBatch || "--"}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass}>Faculty</label>
            <select
              value={selectedFacultyId}
              onChange={(event) => {
                const facultyId = event.target.value;
                const faculty = faculties.find((item) => item._id === facultyId);
                setSelectedFacultyId(facultyId);
                setSelectedLevel(String(getLevelOptions(faculty)[0]?.value || ""));
                setSelectedBatch("");
                setSelectedExamId("");
              }}
              className={fieldClass}
            >
              {faculties.map((faculty) => (
                <option key={faculty._id} value={faculty._id}>
                  {faculty.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {selectedFaculty?.structureType === "year" ? "Year" : "Semester"}
            </label>
            <select
              value={selectedLevel}
              onChange={(event) => {
                setSelectedLevel(event.target.value);
                setSelectedBatch("");
                setSelectedExamId("");
              }}
              className={fieldClass}
              disabled={!selectedFacultyId}
            >
              {levelOptions.map((levelOption) => (
                <option key={levelOption.value} value={levelOption.value}>
                  {levelOption.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Batch</label>
            <select
              value={selectedBatch}
              onChange={(event) => {
                setSelectedBatch(event.target.value);
                setSelectedExamId("");
              }}
              className={fieldClass}
            >
              <option value="">Choose batch</option>
              {(ledger?.activeBatches || []).map((batch) => (
                <option key={batch} value={batch}>
                  Batch {batch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Terminal exam</label>
            <select
              value={selectedExamId}
              onChange={(event) => setSelectedExamId(event.target.value)}
              className={fieldClass}
              disabled={!exams.length}
            >
              <option value="">Choose exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Students</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {summary?.students ?? rows.length}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Subjects</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {summary?.subjects ?? subjects.length}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Average GPA</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatGpa(summary?.averageGpa)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Completed results</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {summary?.complete ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        GPA scale: A 4.0 (90+), A- 3.7 (80-89), B+ 3.3 (70-79), B 3.0
        (60-69), B- 2.7 (50-59), F 0.0 (below 50). Cumulative GPA is the
        average of a student's terminal exam GPAs for the selected class batch.
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
          Loading result ledger...
        </div>
      ) : selectedBatch && currentExam && subjects.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-[1100px] text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Roll No</th>
                {subjects.map((subject) => (
                  <th key={subject._id} className="px-4 py-3 min-w-[180px]">
                    {subject.code ? `${subject.code} - ${subject.name}` : subject.name}
                  </th>
                ))}
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Term GPA</th>
                <th className="px-4 py-3">Cumulative</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={subjects.length + 8}
                    className="border-t px-4 py-10 text-center text-gray-500"
                  >
                    No active students found for this batch.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.student._id}
                    className={row.failed ? "bg-red-50" : "bg-white"}
                  >
                    <td className="border-t px-4 py-3 font-semibold text-gray-900">
                      {row.student.name}
                      <p className="text-xs font-normal text-gray-500">
                        {row.student.studentId}
                      </p>
                    </td>
                    <td className="border-t px-4 py-3">{row.student.rollNo}</td>
                    {row.subjectResults.map((subjectResult) => (
                      <td
                        key={subjectResult.subjectId}
                        className="border-t px-4 py-3 font-semibold"
                      >
                        {formatMark(subjectResult.obtainedMarks)}
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          {subjectResult.grade || "--"}
                        </span>
                      </td>
                    ))}
                    <td className="border-t px-4 py-3 font-semibold">
                      {row.total}/{row.fullMarks}
                    </td>
                    <td className="border-t px-4 py-3">{formatGpa(row.gpa)}</td>
                    <td className="border-t px-4 py-3">
                      {formatGpa(row.cumulativeGpa)}
                    </td>
                    <td className="border-t px-4 py-3">{row.rank}</td>
                    <td className="border-t px-4 py-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="border-t px-4 py-3">
                      <Link
                        to={`/admin/student-performance/${row.student.studentId}?${viewQuery}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <Eye className="w-4 h-4" /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          Select an active faculty, semester/year, batch, and exam to see the
          result ledger.
        </div>
      )}
    </div>
  );
}
