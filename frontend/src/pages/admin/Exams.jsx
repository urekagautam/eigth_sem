import { useState, useEffect } from "react";
import ExamScheduleTab from "../../components/exams/ExamScheduleTab";
import SeatingArrangementTab from "../../components/exams/SeatingArrangementTab";
import ClassLayoutsTab from "../../components/exams/ClassLayoutsTab";
import {
  loadLayouts,
  saveLayouts,
  loadSeatPlans,
  saveSeatPlans,
  loadExamSchedules,
  saveExamSchedules,
} from "../../utils/examStorage";

const TABS = [
  { id: "schedule", label: "Exam Schedule" },
  { id: "seating", label: "Seating Arrangement" },
  { id: "layouts", label: "Class Layouts" },
];

export default function Exams() {
  const [tab, setTab] = useState("schedule");
  const [layouts, setLayouts] = useState(() => loadLayouts());
  const [seatPlans, setSeatPlans] = useState(() => loadSeatPlans());
  const [schedules, setSchedules] = useState(() => loadExamSchedules());

  useEffect(() => {
    saveLayouts(layouts);
  }, [layouts]);

  useEffect(() => {
    saveSeatPlans(seatPlans);
  }, [seatPlans]);

  useEffect(() => {
    saveExamSchedules(schedules);
  }, [schedules]);

  return (
    <div className="max-w-6xl">
      <div className="flex gap-1 p-1 bg-gray-200/80 rounded-xl w-fit mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "schedule" ? (
        <ExamScheduleTab schedules={schedules} onSaveSchedules={setSchedules} />
      ) : tab === "seating" ? (
        <SeatingArrangementTab
          layouts={layouts}
          seatPlans={seatPlans}
          onSaveSeatPlans={setSeatPlans}
        />
      ) : (
        <ClassLayoutsTab layouts={layouts} onSaveLayouts={setLayouts} />
      )}
    </div>
  );
}
