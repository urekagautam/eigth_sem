import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import {
  DUMMY_SUBJECTS,
  FACULTY_CATALOG,
  getFacultyByCode,
  getLevelLabel,
  getLevelOptionsForFacultyCode,
} from "../../data/examDummyData";
import { loadExamSchedules } from "../../utils/examStorage";

const fieldClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const DUMMY_RESULT_STUDENTS = [
  {
    studentId: "BCA-2086-001",
    rollNo: "7830011",
    name: "Ajay Sharma",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    studentId: "BCA-2086-002",
    rollNo: "7830012",
    name: "Mina Koirala",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    studentId: "BCA-2086-003",
    rollNo: "7830013",
    name: "Nikita Thapa",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    studentId: "BCA-2086-004",
    rollNo: "7830014",
    name: "Pratik Adhikari",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    studentId: "BCA-2086-005",
    rollNo: "7830015",
    name: "Suresh Singh",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
];

function getStudentResult(studentId, examId, subjects, allTeacherMarks) {
  return subjects.map((subject) => {
    const mark = allTeacherMarks?.find(
      (m) =>
        m.studentId === studentId &&
        m.examId === examId &&
        m.subjectId === subject._id
    );
    return {
      subject,
      obtainedMarks: mark?.obtainedMarks ?? 0,
      fullMarks: mark?.fullMarks ?? 100,
      isFail: mark ? mark.obtainedMarks < 40 : false,
    };
  });
}

function getResultRows(students, subjects, examId, allTeacherMarks) {
  const initialRows = students
    .map((student) => {
      const subjectResults = getStudentResult(
        student.studentId,
        examId,
        subjects,
        allTeacherMarks
      );

      const total = subjectResults.reduce((sum, item) => {
        const marks = typeof item.obtainedMarks === "number" ? item.obtainedMarks : 0;
        return sum + marks;
      }, 0);
      const fullMarks = subjectResults.reduce(
        (sum, item) => sum + item.fullMarks,
        0
      );
      const percentage = fullMarks ? (total / fullMarks) * 100 : 0;
      return {
        student,
        subjectResults,
        total,
        fullMarks,
        percentage,
        fail: subjectResults.some((item) => item.isFail),
      };
    })
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  // Calculate ranks only for students with marks > 0
  const rowsWithMarks = initialRows.filter((row) => row.total > 0);
  const totals = Array.from(
    new Set(rowsWithMarks.map((row) => row.total).sort((a, b) => b - a))
  );
  const rankMap = new Map(totals.map((total, index) => [total, index + 1]));

  return initialRows.map((row) => ({
    ...row,
    rank: row.total === 0 ? "-" : rankMap.get(row.total) ?? "-",
  }));
}

function getFirstLevelForFaculty(facultyId) {
  const faculty = FACULTY_CATALOG.find((item) => item.id === facultyId);
  const options = getLevelOptionsForFacultyCode(faculty?.code);
  return options[0]?.value ?? "1";
}

export default function StudentPerformance() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const examSchedules = useMemo(() => loadExamSchedules(), []);
  
  // Load marks from teacher's marks storage
  const allTeacherMarks = useMemo(() => {
    try {
      const raw = localStorage.getItem("eigth_sem_teacher_marks");
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return [];
  }, []);

  const [selectedFacultyId, setSelectedFacultyId] = useState("fac_bca");
  const [selectedLevel, setSelectedLevel] = useState(() =>
    getFirstLevelForFaculty("fac_bca"),
  );
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  const selectedFaculty = FACULTY_CATALOG.find(
    (item) => item.id === selectedFacultyId,
  );
  const subjectOptions = useMemo(
    () =>
      DUMMY_SUBJECTS.filter(
        (subject) =>
          subject.facultyId === selectedFacultyId &&
          String(subject.level) === selectedLevel,
      ),
    [selectedFacultyId, selectedLevel],
  );

  const activeBatches = useMemo(() => {
    if (!selectedFacultyId || !selectedLevel) return [];
    return Array.from(
      new Set(
        DUMMY_RESULT_STUDENTS.filter(
          (student) =>
            student.admission.facultyId === selectedFacultyId &&
            String(student.enrollment.currentLevel) === selectedLevel &&
            student.enrollment.status === "active",
        ).map((student) => student.admission.batch),
      ),
    ).sort((a, b) => Number(b) - Number(a));
  }, [selectedFacultyId, selectedLevel]);

  useEffect(() => {
    const firstLevel = getFirstLevelForFaculty(selectedFacultyId);
    if (firstLevel !== selectedLevel) {
      setSelectedLevel(firstLevel);
    }
    setSelectedBatch("");
    setSelectedExamId("");
  }, [selectedFacultyId]);

  useEffect(() => {
    if (!selectedBatch && activeBatches.length > 0) {
      setSelectedBatch(activeBatches[0]);
    }
  }, [activeBatches, selectedBatch]);

  useEffect(() => {
    if (studentId) {
      const matchedStudent = DUMMY_RESULT_STUDENTS.find(
        (student) => student.studentId === studentId,
      );
      if (matchedStudent) {
        setSelectedFacultyId(matchedStudent.admission.facultyId);
        setSelectedLevel(String(matchedStudent.enrollment.currentLevel));
        setSelectedBatch(matchedStudent.admission.batch);
        setSelectedExamId("exam-1");
      }
    }
  }, [studentId]);

  const examOptions = useMemo(() => {
    if (!selectedFaculty || !selectedLevel) return [];
    return (
      examSchedules.find(
        (schedule) =>
          schedule.facultyCode === selectedFaculty.code &&
          String(schedule.level) === selectedLevel,
      )?.exams ?? []
    );
  }, [examSchedules, selectedFaculty, selectedLevel]);

  useEffect(() => {
    if (!selectedExamId && examOptions.length > 0) {
      setSelectedExamId(examOptions[0].id);
    }
  }, [examOptions, selectedExamId]);

  const classStudents = useMemo(() => {
    if (!selectedFacultyId || !selectedLevel || !selectedBatch) return [];
    return DUMMY_RESULT_STUDENTS.filter(
      (student) =>
        student.admission.facultyId === selectedFacultyId &&
        String(student.enrollment.currentLevel) === selectedLevel &&
        student.admission.batch === selectedBatch,
    );
  }, [selectedFacultyId, selectedLevel, selectedBatch]);

  const currentExam = examOptions.find((exam) => exam.id === selectedExamId);
  const resultRows = useMemo(() => {
    if (!currentExam || subjectOptions.length === 0) return [];
    return getResultRows(classStudents, subjectOptions, currentExam.id, allTeacherMarks);
  }, [classStudents, subjectOptions, currentExam, allTeacherMarks]);

  if (studentId) {
    const student = DUMMY_RESULT_STUDENTS.find(
      (item) => item.studentId === studentId,
    );
    const exam =
      examOptions.find((item) => item.id === selectedExamId) || currentExam;

    const subjects = subjectOptions;
    const subjectResults = student
      ? getStudentResult(student.studentId, selectedExamId, subjects, allTeacherMarks)
      : [];
    const total = subjectResults.reduce(
      (sum, item) => sum + item.obtainedMarks,
      0,
    );
    const fullMarks = subjectResults.reduce(
      (sum, item) => sum + item.fullMarks,
      0,
    );
    const percentage = fullMarks ? (total / fullMarks) * 100 : 0;
    const failed = subjectResults.some((item) => item.isFail);

    return (
      <div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
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

        {!student ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
            Student result not found for this record.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">
                    Student
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {student.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Roll No: {student.studentId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">
                    Class
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {selectedFaculty?.code}{" "}
                    {getLevelLabel(
                      selectedFaculty?.structureType,
                      Number(selectedLevel),
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    Batch {student.admission.batch}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">
                    Exam
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {exam?.title || "First Terminal Examination"}
                  </p>
                  <p className="text-sm text-gray-600">Attendance: 65/100</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Marksheet
                  </h2>
                  <p className="text-sm text-gray-500">
                    Terminal exam results for the current active batch.
                  </p>
                </div>
                <div className={`rounded-2xl px-4 py-3 ${failed ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                  {failed ? "Status: Failed" : "Status: Passed"}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Marks</th>
                      <th className="px-4 py-3">Full Marks</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectResults.map((item) => (
                      <tr
                        key={item.subject._id}
                        className={
                          item.isFail ? "bg-red-50 text-red-700" : "bg-white"
                        }
                      >
                        <td className="border-t px-4 py-3">
                          {item.subject.name}
                        </td>
                        <td className="border-t px-4 py-3 font-semibold">
                          {item.obtainedMarks}
                        </td>
                        <td className="border-t px-4 py-3">{item.fullMarks}</td>
                        <td className="border-t px-4 py-3">
                          {item.isFail ? "Fail" : "Pass"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-sm text-gray-500">Total marks</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {total}/{fullMarks}
                  </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-sm text-gray-500">Percentage</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {percentage.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-sm text-gray-500">Performance</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {percentage >= 80
                      ? "Excellent"
                      : percentage >= 60
                        ? "Good"
                        : percentage >= 40
                          ? "Needs Improvement"
                          : "Needs Attention"}
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
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Result and Performance
          </h1>
          <p className="text-sm text-gray-500">
            Review terminal results for active semesters and batches.
          </p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Current view</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">
            {selectedFaculty?.code} ·{" "}
            {getLevelLabel(
              selectedFaculty?.structureType,
              Number(selectedLevel),
            )}
          </div>
          <div className="text-sm text-gray-500">
            Batch {selectedBatch || "—"}
          </div>
        </div>
      </div>

      <div className="">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={labelClass}>Faculty</label>
              <select
                value={selectedFacultyId}
                onChange={(event) => {
                  setSelectedFacultyId(event.target.value);
                }}
                className={fieldClass}
              >
                {FACULTY_CATALOG.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                {selectedFaculty?.structureType === "year"
                  ? "Year"
                  : "Semester"}
              </label>
              <select
                value={selectedLevel}
                onChange={(event) => {
                  setSelectedLevel(event.target.value);
                  setSelectedBatch("");
                  setSelectedExamId("");
                }}
                className={fieldClass}
              >
                {getLevelOptionsForFacultyCode(selectedFaculty?.code).map(
                  (levelOption) => (
                    <option key={levelOption.value} value={levelOption.value}>
                      {levelOption.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className={labelClass}>Batch</label>
              <select
                value={selectedBatch}
                onChange={(event) => setSelectedBatch(event.target.value)}
                className={fieldClass}
              >
                <option value="">Choose batch</option>
                {activeBatches.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
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
              >
                <option value="">Choose exam</option>
                {examOptions.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm text-gray-600">
            Choose an active faculty, semester/year, batch, and terminal exam to
            see the ledger.
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Total subjects</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {subjectOptions.length}
              </p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Total students</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {classStudents.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {selectedBatch && selectedExamId && subjectOptions.length > 0 ? (
        <div>
          <div className="mb-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 text-sm text-gray-600 shadow-sm">
            Ledger shows student marks for each subject in the selected batch
            and terminal exam.
          </div>
          <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-[1000px] text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Roll No</th>
                  {subjectOptions.map((subject) => (
                    <th
                      key={subject._id}
                      className="px-4 py-3 min-w-[220px] text-left"
                    >
                      <div className="max-w-[220px] break-words">
                        {subject.name}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">% Score</th>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {resultRows.map((row) => (
                  <tr
                    key={row.student.studentId}
                    className={row.fail ? "bg-red-50 text-red-700" : "bg-white"}
                  >
                    <td className="border-t px-4 py-3 font-semibold text-gray-900">
                      {row.student.name}
                    </td>
                    <td className="border-t px-4 py-3">
                      {row.student.rollNo}
                    </td>
                    {row.subjectResults.map((subjectResult) => (
                      <td
                        key={subjectResult.subject._id}
                        className="border-t px-4 py-3 text-center font-semibold"
                      >
                        {subjectResult.obtainedMarks}
                      </td>
                    ))}
                    <td className="border-t px-4 py-3 font-semibold">
                      {row.total}
                    </td>
                    <td className="border-t px-4 py-3">
                      {row.percentage.toFixed(1)}%
                    </td>
                    <td className="border-t px-4 py-3">{row.rank}</td>
                    <td className="border-t px-4 py-3">
                      <Link
                        to={`/admin/student-performance/${row.student.studentId}`}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <Eye className="w-4 h-4" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          Select a faculty, semester/year, batch, and exam to see the results
          ledger.
        </div>
      )}
    </div>
  );
}
