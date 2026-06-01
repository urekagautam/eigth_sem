import { useEffect, useMemo, useState } from "react";
import { X, Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import Button from "../Button";
import { fetchFaculties } from "../../services/apiFaculty";
import { fetchSubjects } from "../../services/apiSubject";
import {
  createExamRoutine,
  deleteExamRoutine,
  fetchExamSchedules,
  updateExamRoutine,
} from "../../services/apiExam";

const inputClass =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const EXAM_TEMPLATES = [
  "First Terminal Examination",
  "Second Terminal Examination",
  "Pre-Board Examination",
  "Final Examination",
];

const today = new Date().toISOString().split("T")[0];
const defaultExamTime = "07:00";

const getLevelLabel = (faculty, level) => {
  const match = faculty?.levels?.find((item) => String(item.value) === String(level));
  if (match) return match.label;
  return `${faculty?.structureType === "year" ? "Year" : "Semester"} ${level}`;
};

const getLevelOptions = (faculty) => {
  if (!faculty) return [];
  if (Array.isArray(faculty.levels) && faculty.levels.length) return faculty.levels;

  const max = Math.max(Number(faculty.maxLevel) || 1, 1);
  return Array.from({ length: max }, (_, index) => ({
    value: index + 1,
    label: getLevelLabel(faculty, index + 1),
  }));
};

const buildSubjectRows = (subjects, exam = null) => {
  const savedItems = new Map(
    (exam?.items || []).map((item) => [String(item.subjectId), item]),
  );

  return subjects.map((subject) => {
    const savedItem = savedItems.get(String(subject._id));
    return {
      id: subject._id,
      date: savedItem?.date || today,
      time: savedItem?.time || defaultExamTime,
      subjectId: subject._id,
      subjectName: subject.name,
      subjectCode: subject.code || "",
      included: exam ? Boolean(savedItem) : true,
    };
  });
};

export default function ExamScheduleTab() {
  const [faculties, setFaculties] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [expandedScheduleId, setExpandedScheduleId] = useState(null);

  const selectedFaculty = faculties.find((faculty) => faculty._id === selectedFacultyId);
  const levelOptions = useMemo(
    () => getLevelOptions(selectedFaculty),
    [selectedFaculty],
  );
  const levelLabel = selectedLevel
    ? getLevelLabel(selectedFaculty, selectedLevel)
    : "semester/year";

  const currentSchedule = schedules[0];

  const [examForm, setExamForm] = useState({
    title: "",
    isCustom: false,
    fullMarks: 100,
    items: [],
  });

  useEffect(() => {
    const loadFaculties = async () => {
      try {
        const response = await fetchFaculties();
        if (response?.success && Array.isArray(response.data)) {
          const normalized = response.data.map((faculty) => ({
            ...faculty,
            _id: faculty._id ?? faculty.id,
          }));
          setFaculties(normalized);
          if (normalized.length) {
            setSelectedFacultyId(normalized[0]._id);
            setSelectedLevel(String(getLevelOptions(normalized[0])[0]?.value || ""));
          }
        }
      } catch (error) {
        console.error("Failed to fetch faculties:", error);
      }
    };

    loadFaculties();
  }, []);

  useEffect(() => {
    const loadSubjectsAndSchedules = async () => {
      setSubjects([]);
      setSchedules([]);
      if (!selectedFacultyId || !selectedLevel) return;

      setLoading(true);
      try {
        const [subjectResponse, scheduleResponse] = await Promise.all([
          fetchSubjects({
            facultyId: selectedFacultyId,
            level: selectedLevel,
          }),
          fetchExamSchedules({
            facultyId: selectedFacultyId,
            level: selectedLevel,
          }),
        ]);

        if (subjectResponse?.success && Array.isArray(subjectResponse.data)) {
          setSubjects(subjectResponse.data);
        }
        if (scheduleResponse?.success && Array.isArray(scheduleResponse.data)) {
          setSchedules(scheduleResponse.data);
        }
      } catch (error) {
        console.error("Failed to fetch exam page data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSubjectsAndSchedules();
  }, [selectedFacultyId, selectedLevel]);

  const resetForm = () => {
    setExamForm({
      title: "",
      isCustom: false,
      fullMarks: 100,
      items: buildSubjectRows(subjects),
    });
    setFormError("");
    setEditingExam(null);
  };

  const openCreateExam = () => {
    setEditingExam(null);
    setExamForm({
      title: "",
      isCustom: false,
      fullMarks: 100,
      items: buildSubjectRows(subjects),
    });
    setFormError("");
    setShowCreateExam(true);
  };

  const openEditExam = (exam) => {
    setEditingExam(exam);
    setExamForm({
      title: exam.title || "",
      isCustom: !EXAM_TEMPLATES.includes(exam.title),
      fullMarks: exam.fullMarks || 100,
      items: buildSubjectRows(subjects, exam),
    });
    setFormError("");
    setShowCreateExam(true);
  };

  const updateRow = (id, patch) => {
    setExamForm((form) => ({
      ...form,
      items: form.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  };

  const refreshSchedules = async () => {
    const response = await fetchExamSchedules({
      facultyId: selectedFacultyId,
      level: selectedLevel,
    });
    if (response?.success && Array.isArray(response.data)) {
      setSchedules(response.data);
    }
  };

  const saveExam = async () => {
    setFormError("");
    if (!examForm.title.trim()) {
      setFormError("Please enter an exam title.");
      return;
    }

    const cleanItems = examForm.items.filter(
      (item) => item.included && item.date && item.time && item.subjectId,
    );
    if (!cleanItems.length) {
      setFormError("Please include at least one subject with date and time.");
      return;
    }

    try {
      const payload = {
        title: examForm.title.trim(),
        facultyId: selectedFacultyId,
        level: selectedLevel,
        fullMarks: Number(examForm.fullMarks) || 100,
        items: cleanItems.map((item) => ({
          subjectId: item.subjectId,
          date: item.date,
          time: item.time,
        })),
      };

      if (editingExam) {
        await updateExamRoutine(editingExam.id, payload);
      } else {
        await createExamRoutine(payload);
      }
      await refreshSchedules();
      setShowCreateExam(false);
      resetForm();
    } catch (error) {
      setFormError(error.message || "Failed to save exam routine.");
    }
  };

  const deleteExam = async (examId) => {
    try {
      await deleteExamRoutine(examId);
      await refreshSchedules();
      setExpandedScheduleId(null);
    } catch (error) {
      console.error("Failed to delete exam routine:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Schedule</h1>
          <p className="text-gray-600 mt-1">
            Create routines by faculty and semester/year.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Faculty</label>
            <select
              value={selectedFacultyId}
              onChange={(event) => {
                const facultyId = event.target.value;
                const faculty = faculties.find((item) => item._id === facultyId);
                setSelectedFacultyId(facultyId);
                setSelectedLevel(String(getLevelOptions(faculty)[0]?.value || ""));
              }}
              className={inputClass}
            >
              {faculties.map((faculty) => (
                <option key={faculty._id} value={faculty._id}>
                  {faculty.code} ({faculty.structureType})
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
              onChange={(event) => setSelectedLevel(event.target.value)}
              className={inputClass}
              disabled={!selectedFacultyId}
            >
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-4 items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {selectedFaculty?.code || "Faculty"} - {levelLabel}
            </h2>
            <p className="text-sm text-gray-500">
              {currentSchedule?.exams?.length || 0} exam(s) created
            </p>
          </div>
          <Button
            onClick={openCreateExam}
            disabled={!selectedFacultyId || !selectedLevel}
          >
            Create Exam
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">Loading exam routine data...</p>
            </div>
          ) : !selectedFacultyId || !selectedLevel ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500">
                Select a faculty and semester/year to create a routine.
              </p>
            </div>
          ) : !currentSchedule || currentSchedule.exams.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500">
                No exams created yet for the current active batch in this class.
              </p>
            </div>
          ) : (
            currentSchedule.exams.map((exam) => (
              <div
                key={exam.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div
                  className="px-5 py-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                  onClick={() =>
                    setExpandedScheduleId(
                      expandedScheduleId === exam.id ? null : exam.id,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    {expandedScheduleId === exam.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {exam.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Created: {exam.createdAt} | Full marks:{" "}
                        {exam.fullMarks ?? 100} |{" "}
                        {exam.published ? "Published" : "Not published"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditExam(exam);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit Exam"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteExam(exam.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete Exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expandedScheduleId === exam.id && (
                  <div className="p-5">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-600">
                            <th className="px-4 py-2 font-semibold">Date</th>
                            <th className="px-4 py-2 font-semibold">Time</th>
                            <th className="px-4 py-2 font-semibold">Subject</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exam.items.map((item) => (
                            <tr
                              key={item.id}
                              className="border-t border-gray-100"
                            >
                              <td className="px-4 py-2 whitespace-nowrap">
                                {item.date}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {item.time}
                              </td>
                              <td className="px-4 py-2">
                                {item.subjectCode
                                  ? `${item.subjectCode} - ${item.subject}`
                                  : item.subject}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showCreateExam && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 min-h-screen">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingExam ? "Edit" : "Create"} Exam for{" "}
                {selectedFaculty?.code} - {levelLabel}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateExam(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                <div>
                  <label className={labelClass}>Exam Title</label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {EXAM_TEMPLATES.map((template) => (
                        <button
                          key={template}
                          type="button"
                          onClick={() =>
                            setExamForm((form) => ({
                              ...form,
                              title: template,
                              isCustom: false,
                            }))
                          }
                          className={`px-3 py-2 rounded-lg text-sm border ${
                            examForm.title === template && !examForm.isCustom
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                    <input
                      value={examForm.isCustom ? examForm.title : ""}
                      onChange={(event) =>
                        setExamForm((form) => ({
                          ...form,
                          title: event.target.value,
                          isCustom: true,
                        }))
                      }
                      placeholder="Or enter custom exam title..."
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Full marks</label>
                  <input
                    type="number"
                    min="1"
                    value={examForm.fullMarks}
                    onChange={(event) =>
                      setExamForm((form) => ({
                        ...form,
                        fullMarks: Number(event.target.value) || 100,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Exam Schedule
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Uncheck any subject that is not included in this exam.
                  </p>
                </div>

                {examForm.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                    No subjects available for this class.
                  </div>
                ) : (
                  examForm.items.map((item) => (
                    <div
                      key={item.id}
                      className={`grid gap-3 rounded-lg border p-3 md:grid-cols-[40px_1fr_140px_120px] md:items-center ${
                        item.included
                          ? "border-gray-200 bg-white"
                          : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={item.included}
                          onChange={(event) =>
                            updateRow(item.id, { included: event.target.checked })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                          title="Include subject"
                        />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            item.included ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {item.subjectCode
                            ? `${item.subjectCode} - ${item.subjectName}`
                            : item.subjectName}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={item.date}
                          onChange={(event) =>
                            updateRow(item.id, { date: event.target.value })
                          }
                          min={today}
                          className={inputClass}
                          disabled={!item.included}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Time
                        </label>
                        <input
                          type="time"
                          value={item.time}
                          onChange={(event) =>
                            updateRow(item.id, { time: event.target.value })
                          }
                          className={inputClass}
                          disabled={!item.included}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {formError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCreateExam(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={saveExam}>
                  {editingExam ? "Update Exam" : "Save Exam"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
