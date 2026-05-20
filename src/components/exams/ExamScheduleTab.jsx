import { useMemo, useState } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import Button from "../Button";
import {
  FACULTY_CATALOG,
  getFacultyByCode,
  getLevelOptionsForFacultyCode,
  getLevelLabel,
} from "../../data/examDummyData";

const inputClass =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const EXAM_TEMPLATES = [
  "First Terminal Examination",
  "Second Terminal Examination",
  "Pre-Board Examination",
  "Final Examination",
];

export default function ExamScheduleTab({ schedules, onSaveSchedules }) {
  const [selectedFaculty, setSelectedFaculty] = useState("BCA");
  const [selectedLevel, setSelectedLevel] = useState("1");
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [expandedScheduleId, setExpandedScheduleId] = useState(null);

  const faculty = getFacultyByCode(selectedFaculty);
  const levelOptions = useMemo(
    () => getLevelOptionsForFacultyCode(selectedFaculty),
    [selectedFaculty],
  );

  const levelLabel = useMemo(
    () =>
      getLevelLabel(
        faculty?.structureType || "semester",
        Number(selectedLevel),
      ),
    [faculty?.structureType, selectedLevel],
  );

  const currentSchedule = schedules.find(
    (s) => s.facultyCode === selectedFaculty && s.level === selectedLevel,
  );

  const [examForm, setExamForm] = useState({
    title: "",
    isCustom: false,
    items: [{ id: "tmp-1", date: "", time: "", subject: "" }],
  });

  const addRow = () =>
    setExamForm((f) => ({
      ...f,
      items: [
        ...f.items,
        { id: `tmp-${Date.now()}`, date: "", time: "", subject: "" },
      ],
    }));

  const removeRow = (id) =>
    setExamForm((f) => ({
      ...f,
      items:
        f.items.length === 1 ? f.items : f.items.filter((x) => x.id !== id),
    }));

  const updateRow = (id, patch) => {
    if (patch.date !== undefined) {
      const existingDates = examForm.items
        .filter((item) => item.id !== id && item.date)
        .map((item) => item.date);
      if (existingDates.includes(patch.date)) {
        return; // Prevent duplicate dates
      }
    }
    setExamForm((f) => ({
      ...f,
      items: f.items.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  };

  const saveExam = () => {
    if (!examForm.title.trim()) return;
    const cleanItems = examForm.items
      .filter((i) => i.date && i.time && i.subject.trim())
      .map((i) => ({
        id: `i-${Date.now()}-${Math.random()}`,
        date: i.date,
        time: i.time,
        subject: i.subject.trim(),
      }));

    const newExam = {
      id: `exam-${Date.now()}`,
      title: examForm.title.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      items: cleanItems,
    };

    let updatedSchedules;
    const existingSchedule = schedules.find(
      (s) => s.facultyCode === selectedFaculty && s.level === selectedLevel,
    );

    if (existingSchedule) {
      updatedSchedules = schedules.map((s) =>
        s.id === existingSchedule.id
          ? { ...s, exams: [...s.exams, newExam] }
          : s,
      );
    } else {
      const newSchedule = {
        id: `sch-${Date.now()}`,
        facultyCode: selectedFaculty,
        level: selectedLevel,
        exams: [newExam],
      };
      updatedSchedules = [...schedules, newSchedule];
    }

    onSaveSchedules(updatedSchedules);
    setShowCreateExam(false);
    setExamForm({
      title: "",
      isCustom: false,
      items: [{ id: "tmp-1", date: "", time: "", subject: "" }],
    });
  };

  const deleteExam = (scheduleId, examId) => {
    const updatedSchedules = schedules.map((s) => {
      if (s.id === scheduleId) {
        const updatedExams = s.exams.filter((e) => e.id !== examId);
        return { ...s, exams: updatedExams };
      }
      return s;
    });
    onSaveSchedules(updatedSchedules);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Schedule</h1>
          <p className="text-gray-600 mt-1">
            Create routines by faculty and semester/year
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Faculty</label>
            <select
              value={selectedFaculty}
              onChange={(e) => {
                setSelectedFaculty(e.target.value);
                setSelectedLevel("1");
              }}
              className={inputClass}
            >
              {FACULTY_CATALOG.map((f) => (
                <option key={f.id} value={f.code}>
                  {f.code} ({f.structureType})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              {faculty?.structureType === "year" ? "Year" : "Semester"}
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className={inputClass}
            >
              {levelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {selectedFaculty} - {levelLabel}
            </h2>
            <p className="text-sm text-gray-500">
              {currentSchedule?.exams?.length || 0} exam(s) created
            </p>
          </div>
          <Button onClick={() => setShowCreateExam(true)}>Create Exam</Button>
        </div>

        <div className="mt-6 space-y-4">
          {!currentSchedule || currentSchedule.exams.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500">
                No exams created yet for this semester/year
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Click "Create Exam" to get started
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
                        Created: {exam.createdAt}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteExam(currentSchedule.id, exam.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete Exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                          {exam.items.length === 0 ? (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-4 py-6 text-gray-500 text-center"
                              >
                                No exam items scheduled
                              </td>
                            </tr>
                          ) : (
                            exam.items.map((item) => (
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
                                <td className="px-4 py-2">{item.subject}</td>
                              </tr>
                            ))
                          )}
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
                Create Exam for {selectedFaculty} - {levelLabel}
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateExam(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className={labelClass}>Exam Title</label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {EXAM_TEMPLATES.map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() =>
                          setExamForm((f) => ({
                            ...f,
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
                    onChange={(e) =>
                      setExamForm((f) => ({
                        ...f,
                        title: e.target.value,
                        isCustom: true,
                      }))
                    }
                    placeholder="Or enter custom exam title..."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    Exam Schedule
                  </p>
                  <button
                    type="button"
                    onClick={addRow}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add more subjects
                  </button>
                </div>

                {examForm.items.map((it) => (
                  <div
                    key={it.id}
                    className="grid md:grid-cols-[140px_120px_1fr_40px] gap-3 items-end"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={it.date}
                        onChange={(e) =>
                          updateRow(it.id, { date: e.target.value })
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={it.time}
                        onChange={(e) =>
                          updateRow(it.id, { time: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Subject
                      </label>
                      <input
                        value={it.subject}
                        onChange={(e) =>
                          updateRow(it.id, { subject: e.target.value })
                        }
                        placeholder="e.g. Data Structures"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(it.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateExam(false)}
                >
                  Cancel
                </Button>
                <Button onClick={saveExam}>Save Exam</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
