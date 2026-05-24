import { useEffect, useMemo, useState } from "react";
import { Info, Trash2, CalendarDays } from "lucide-react";
import Button from "../../components/Button";
import { FACULTY_CATALOG, getLevelLabel } from "../../data/examDummyData";
import { loadExamSchedules } from "../../utils/examStorage";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";
const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const CURRENT_TEACHER_ID = "tch_001";
const MARKS_STORAGE_KEY = "eigth_sem_teacher_marks";

const DUMMY_MARKS_SUBJECTS = [
  {
    _id: "sub_m_001",
    name: "Database Management System",
    code: "BCA301",
    facultyId: "fac_bca",
    facultyCode: "BCA",
    level: 3,
    levelLabel: "Third Semester",
    structureType: "semester",
    assignedTeacher: {
      teacherId: "tch_001",
      fullName: "Anil Prasad Gurung",
    },
  },
  {
    _id: "sub_m_002",
    name: "Mathematics III",
    code: "BCA303",
    facultyId: "fac_bca",
    facultyCode: "BCA",
    level: 3,
    levelLabel: "Third Semester",
    structureType: "semester",
    assignedTeacher: {
      teacherId: "tch_001",
      fullName: "Anil Prasad Gurung",
    },
  },
  {
    _id: "sub_m_003",
    name: "Business Economics",
    code: "BBS201",
    facultyId: "fac_bbs",
    facultyCode: "BBS",
    level: 2,
    levelLabel: "Second Year",
    structureType: "year",
    assignedTeacher: {
      teacherId: "tch_001",
      fullName: "Anil Prasad Gurung",
    },
  },
];

const DUMMY_MARKS_STUDENTS = [
  {
    _id: "stu_m_001",
    studentId: "BCA-2086-001",
    profile: { firstName: "Pratik", middleName: "Raj", lastName: "Shrestha" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    _id: "stu_m_002",
    studentId: "BCA-2086-002",
    profile: { firstName: "Mina", middleName: "Laxmi", lastName: "Koirala" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    _id: "stu_m_003",
    studentId: "BCA-2086-003",
    profile: { firstName: "Suresh", middleName: "Kumar", lastName: "Singh" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    _id: "stu_m_004",
    studentId: "BBS-2025-001",
    profile: { firstName: "Maya", middleName: "Devi", lastName: "Thapa" },
    admission: { facultyId: "fac_bbs", facultyCode: "BBS", batch: "2025" },
    enrollment: {
      status: "active",
      currentLevel: 2,
      currentLevelLabel: "Second Year",
    },
  },
  {
    _id: "stu_m_005",
    studentId: "BBS-2025-002",
    profile: { firstName: "Binod", middleName: "Prasad", lastName: "Nepal" },
    admission: { facultyId: "fac_bbs", facultyCode: "BBS", batch: "2025" },
    enrollment: {
      status: "active",
      currentLevel: 2,
      currentLevelLabel: "Second Year",
    },
  },
  {
    _id: "stu_m_006",
    studentId: "BCA-2085-001",
    profile: { firstName: "Rita", middleName: "Kumari", lastName: "Gurung" },
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2085" },
    enrollment: {
      status: "completed",
      currentLevel: 8,
      currentLevelLabel: "Eighth Semester",
    },
  },
];

const DUMMY_MARKS_RECORDS = [
  {
    id: "mr_001",
    teacherId: "tch_001",
    facultyId: "fac_bca",
    facultyCode: "BCA",
    level: 3,
    batch: "2086",
    subjectId: "sub_m_001",
    subjectName: "Database Management System",
    examId: "exam-1",
    examTitle: "First Terminal Examination",
    fullMarks: 100,
    studentId: "stu_m_001",
    obtainedMarks: 81,
    updatedAt: "2026-04-18T10:30:00.000Z",
  },
  {
    id: "mr_002",
    teacherId: "tch_001",
    facultyId: "fac_bca",
    facultyCode: "BCA",
    level: 3,
    batch: "2086",
    subjectId: "sub_m_001",
    subjectName: "Database Management System",
    examId: "exam-1",
    examTitle: "First Terminal Examination",
    fullMarks: 100,
    studentId: "stu_m_002",
    obtainedMarks: 72,
    updatedAt: "2026-04-18T10:30:00.000Z",
  },
];

function fullName(profile) {
  return [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(" ");
}

function loadSavedMarks() {
  try {
    const raw = localStorage.getItem(MARKS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return DUMMY_MARKS_RECORDS;
}

export default function Marks() {
  const examSchedules = useMemo(() => loadExamSchedules(), []);
  const [marksRecords, setMarksRecords] = useState(() => loadSavedMarks());
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [editedMarks, setEditedMarks] = useState({});
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify(marksRecords));
  }, [marksRecords]);

  const teacherAssignments = useMemo(() => {
    const assignments = new Map();
    DUMMY_MARKS_SUBJECTS.filter(
      (subject) => subject.assignedTeacher.teacherId === CURRENT_TEACHER_ID,
    ).forEach((subject) => {
      const key = `${subject.facultyId}_${subject.level}`;
      if (!assignments.has(key)) {
        assignments.set(key, {
          facultyId: subject.facultyId,
          facultyCode: subject.facultyCode,
          level: String(subject.level),
          levelLabel: subject.levelLabel,
          structureType: subject.structureType,
        });
      }
    });
    return Array.from(assignments.values());
  }, []);

  useEffect(() => {
    if (teacherAssignments.length === 1) {
      setSelectedFacultyId(teacherAssignments[0].facultyId);
      setSelectedLevel(teacherAssignments[0].level);
    }
  }, [teacherAssignments]);

  const selectedFaculty = FACULTY_CATALOG.find(
    (faculty) => faculty.id === selectedFacultyId,
  );

  const activeBatches = useMemo(() => {
    if (!selectedFacultyId || !selectedLevel) return [];
    const batches = Array.from(
      new Set(
        DUMMY_MARKS_STUDENTS.filter(
          (student) =>
            student.admission.facultyId === selectedFacultyId &&
            student.enrollment.status === "active" &&
            String(student.enrollment.currentLevel) === selectedLevel,
        ).map((student) => student.admission.batch),
      ),
    );
    return batches.sort((a, b) => Number(b) - Number(a));
  }, [selectedFacultyId, selectedLevel]);

  useEffect(() => {
    if (activeBatches.length === 1) {
      setSelectedBatch(activeBatches[0]);
    } else if (!activeBatches.includes(selectedBatch)) {
      setSelectedBatch("");
    }
  }, [activeBatches]);

  const classSubjects = useMemo(
    () =>
      DUMMY_MARKS_SUBJECTS.filter(
        (subject) =>
          subject.assignedTeacher.teacherId === CURRENT_TEACHER_ID &&
          subject.facultyId === selectedFacultyId &&
          String(subject.level) === selectedLevel,
      ),
    [selectedFacultyId, selectedLevel],
  );

  useEffect(() => {
    if (classSubjects.length === 1) {
      setSelectedSubjectId(classSubjects[0]._id);
    } else if (
      !classSubjects.some((subject) => subject._id === selectedSubjectId)
    ) {
      setSelectedSubjectId("");
    }
  }, [classSubjects]);

  const selectedFacultyCode = selectedFaculty?.code || "";
  const currentSchedule = examSchedules.find(
    (schedule) =>
      schedule.facultyCode === selectedFacultyCode &&
      schedule.level === selectedLevel,
  );
  const availableExams = currentSchedule?.exams || [];

  useEffect(() => {
    if (availableExams.length === 1) {
      setSelectedExamId(availableExams[0].id);
    } else if (!availableExams.some((exam) => exam.id === selectedExamId)) {
      setSelectedExamId("");
    }
  }, [availableExams]);

  const classStudents = useMemo(() => {
    if (!selectedFacultyId || !selectedLevel || !selectedBatch) return [];
    return DUMMY_MARKS_STUDENTS.filter(
      (student) =>
        student.admission.facultyId === selectedFacultyId &&
        student.admission.batch === selectedBatch &&
        student.enrollment.status === "active" &&
        String(student.enrollment.currentLevel) === selectedLevel,
    ).sort((a, b) => a.studentId.localeCompare(b.studentId));
  }, [selectedFacultyId, selectedLevel, selectedBatch]);

  const currentSubject = DUMMY_MARKS_SUBJECTS.find(
    (subject) => subject._id === selectedSubjectId,
  );

  const currentExam = availableExams.find((exam) => exam.id === selectedExamId);
  const isExamPublished = currentExam?.published === true;

  const currentMarksByStudent = useMemo(() => {
    const map = new Map();
    marksRecords
      .filter(
        (record) =>
          record.teacherId === CURRENT_TEACHER_ID &&
          record.facultyId === selectedFacultyId &&
          String(record.level) === selectedLevel &&
          record.batch === selectedBatch &&
          record.subjectId === selectedSubjectId &&
          record.examId === selectedExamId,
      )
      .forEach((record) => map.set(record.studentId, record));
    return map;
  }, [
    marksRecords,
    selectedFacultyId,
    selectedLevel,
    selectedBatch,
    selectedSubjectId,
    selectedExamId,
  ]);

  useEffect(() => {
    if (!selectedExamId || !selectedSubjectId) {
      setEditedMarks({});
      return;
    }

    const next = {};
    classStudents.forEach((student) => {
      const record = currentMarksByStudent.get(student._id);
      if (record) {
        next[student._id] = String(record.obtainedMarks);
      }
    });
    setEditedMarks(next);
  }, [selectedExamId, selectedSubjectId, classStudents, currentMarksByStudent]);

  const handleMarkChange = (studentId, value) => {
    if (isExamPublished) return;
    const cleaned = value.replace(/[^0-9.]/g, "");
    setEditedMarks((prev) => ({ ...prev, [studentId]: cleaned }));
  };

  const handleDeleteMark = (studentId) => {
    if (isExamPublished) return;
    setMarksRecords((prev) =>
      prev.filter(
        (record) =>
          !(
            record.teacherId === CURRENT_TEACHER_ID &&
            record.studentId === studentId &&
            record.facultyId === selectedFacultyId &&
            String(record.level) === selectedLevel &&
            record.batch === selectedBatch &&
            record.subjectId === selectedSubjectId &&
            record.examId === selectedExamId
          ),
      ),
    );
    setEditedMarks((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const handleSaveMarks = () => {
    if (
      !selectedFacultyId ||
      !selectedLevel ||
      !selectedBatch ||
      !selectedSubjectId ||
      !selectedExamId ||
      !currentSubject ||
      !currentExam ||
      isExamPublished
    ) {
      return;
    }

    const baseRecords = marksRecords.filter(
      (record) =>
        !(
          record.teacherId === CURRENT_TEACHER_ID &&
          record.facultyId === selectedFacultyId &&
          String(record.level) === selectedLevel &&
          record.batch === selectedBatch &&
          record.subjectId === selectedSubjectId &&
          record.examId === selectedExamId
        ),
    );

    const nextRecords = [...baseRecords];
    classStudents.forEach((student) => {
      const rawScore = editedMarks[student._id];
      if (rawScore == null || rawScore.trim() === "") return;
      const numericScore = Number(rawScore);
      if (Number.isNaN(numericScore) || numericScore < 0) return;
      nextRecords.push({
        id: `mr-${Date.now()}-${student._id}`,
        teacherId: CURRENT_TEACHER_ID,
        facultyId: selectedFacultyId,
        facultyCode: selectedFacultyCode,
        level: Number(selectedLevel),
        batch: selectedBatch,
        subjectId: selectedSubjectId,
        subjectName: currentSubject.name,
        examId: selectedExamId,
        examTitle: currentExam.title,
        fullMarks: currentExam.fullMarks ?? 100,
        studentId: student._id,
        obtainedMarks: Number(rawScore),
        updatedAt: new Date().toISOString(),
      });
    });

    setMarksRecords(nextRecords);
    setSaveMessage(
      `Marks saved for ${currentSubject.name} — ${currentExam.title}.`,
    );
    window.setTimeout(() => setSaveMessage(""), 4000);
  };

  const examMarksSummary = useMemo(() => {
    const records = Array.from(currentMarksByStudent.values());
    if (records.length === 0) return null;
    const scores = records.map((record) => record.obtainedMarks);
    const sum = scores.reduce((total, value) => total + value, 0);
    return {
      count: scores.length,
      average: Number((sum / scores.length).toFixed(1)),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
    };
  }, [currentMarksByStudent]);

  const hasAssignedClass = teacherAssignments.length > 0;
  const classSelected = Boolean(
    selectedFacultyId &&
    selectedLevel &&
    selectedBatch &&
    selectedSubjectId &&
    selectedExamId,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Marks</h1>
        <p className="mt-1 text-gray-600">
          Upload marks only for your currently assigned faculty, level, batch,
          subject and exam.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Select active class
        </h2>

        {!hasAssignedClass ? (
          <p className="text-gray-600">
            No subject assignments found for your teacher account. Contact
            admin.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label className={labelClass}>Faculty</label>
              <select
                className={selectClass}
                value={selectedFacultyId}
                onChange={(e) => {
                  setSelectedFacultyId(e.target.value);
                  setSelectedLevel("");
                  setSelectedBatch("");
                  setSelectedSubjectId("");
                  setSelectedExamId("");
                  setEditedMarks({});
                }}
              >
                <option value="">Select faculty</option>
                {teacherAssignments
                  .map((assign) => assign.facultyId)
                  .filter((value, index, self) => self.indexOf(value) === index)
                  .map((facultyId) => {
                    const faculty = FACULTY_CATALOG.find(
                      (f) => f.id === facultyId,
                    );
                    return (
                      <option key={facultyId} value={facultyId}>
                        {faculty?.code} —{" "}
                        {faculty?.structureType === "semester"
                          ? "Semester"
                          : "Year"}
                      </option>
                    );
                  })}
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
                  setSelectedLevel(e.target.value);
                  setSelectedBatch("");
                  setSelectedSubjectId("");
                  setSelectedExamId("");
                  setEditedMarks({});
                }}
                disabled={!selectedFacultyId}
              >
                <option value="">Select level</option>
                {teacherAssignments
                  .filter((assign) => assign.facultyId === selectedFacultyId)
                  .map((assign) => (
                    <option
                      key={`${assign.facultyId}-${assign.level}`}
                      value={assign.level}
                    >
                      {assign.levelLabel}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Batch</label>
              <select
                className={selectClass}
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  setSelectedSubjectId("");
                  setSelectedExamId("");
                  setEditedMarks({});
                }}
                disabled={!selectedLevel || activeBatches.length === 0}
              >
                <option value="">Select batch</option>
                {activeBatches.map((batch) => (
                  <option key={batch} value={batch}>
                    Batch {batch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Subject</label>
              {classSubjects.length === 1 ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
                  {classSubjects[0].code} — {classSubjects[0].name}
                </div>
              ) : (
                <select
                  className={selectClass}
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedExamId("");
                    setEditedMarks({});
                  }}
                  disabled={!selectedBatch}
                >
                  <option value="">Select subject</option>
                  {classSubjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.code} — {subject.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className={labelClass}>Exam</label>
              <select
                className={selectClass}
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setEditedMarks({});
                }}
                disabled={!selectedSubjectId}
              >
                <option value="">Select exam</option>
                {availableExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} · {exam.fullMarks ?? 100} marks
                    {exam.published ? " · Published" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {selectedFacultyId && selectedLevel && (
          <p className="mt-4 text-sm text-gray-600">
            Active assignment: <strong>{selectedFaculty?.code}</strong> ·{" "}
            {getLevelLabel(
              selectedFaculty?.structureType || "semester",
              Number(selectedLevel),
            )}{" "}
            · {selectedBatch ? `Batch ${selectedBatch}` : "Choose batch"}
          </p>
        )}
      </div>

      {!classSelected ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <CalendarDays className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">
            Select faculty, level, batch, subject, and exam to upload marks.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {isExamPublished && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              <div className="font-semibold">Results published</div>
              <p>
                This exam is marked as published. Marks are visible but cannot
                be edited or deleted.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Marks entry</h2>
                <p className="text-sm text-gray-600">
                  {currentSubject?.code} — {currentSubject?.name} ·{" "}
                  {currentExam?.title} · Full marks{" "}
                  {currentExam?.fullMarks ?? 100}
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleSaveMarks}
                disabled={isExamPublished}
              >
                Save marks
              </Button>
            </div>

            <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Student ID</th>
                      <th className="px-4 py-3 font-semibold">Obtained</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No active students found for this batch.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((student) => {
                        const record = currentMarksByStudent.get(student._id);
                        const inputValue =
                          editedMarks[student._id] ??
                          record?.obtainedMarks ??
                          "";
                        return (
                          <tr
                            key={student._id}
                            className="border-t border-gray-100"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {fullName(student.profile)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {student.studentId}
                            </td>
                            <td className="px-4 py-3">
                              {isExamPublished ? (
                                <span>{record?.obtainedMarks ?? "--"}</span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  max={currentExam?.fullMarks ?? 100}
                                  value={inputValue}
                                  onChange={(e) =>
                                    handleMarkChange(
                                      student._id,
                                      e.target.value,
                                    )
                                  }
                                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleDeleteMark(student._id)}
                                disabled={isExamPublished || !record}
                                className="text-sm font-semibold text-red-600 disabled:text-gray-400"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {saveMessage && (
              <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                {saveMessage}
              </p>
            )}

            {examMarksSummary && (
              <div className="mt-6 grid gap-3 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Saved marks
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {examMarksSummary.count}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Average
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {examMarksSummary.average}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Highest
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {examMarksSummary.highest}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Lowest
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {examMarksSummary.lowest}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
