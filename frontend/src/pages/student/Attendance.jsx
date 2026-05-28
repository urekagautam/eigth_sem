import { useState, useMemo } from "react";

const TERMS = ["First Term", "Second Term", "Third Term"];

const generalAttendance = {
  totalClasses: 42,
  present: 38,
  absent: 4,
  percentage: 90.5,
};

const examAttendanceByTerm = {
  "First Term": { totalExams: 3, present: 3, absent: 0, percentage: 100 },
  "Second Term": { totalExams: 4, present: 3, absent: 1, percentage: 75 },
  "Third Term": { totalExams: 2, present: 2, absent: 0, percentage: 100 },
};

function getPieCoordinates(percentage) {
  const radius = 46;
  const degrees = (percentage / 100) * 360;
  const radians = ((degrees - 90) * Math.PI) / 180;
  const x = 60 + radius * Math.cos(radians);
  const y = 60 + radius * Math.sin(radians);
  const largeArcFlag = percentage > 50 ? 1 : 0;
  const sweepFlag = 1;
  return { x, y, largeArcFlag, sweepFlag };
}

export default function Attendance() {
  const [viewType, setViewType] = useState("general");
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);

  const selectedExamAttendance = useMemo(
    () => examAttendanceByTerm[selectedTerm],
    [selectedTerm],
  );

  const presentPercentage = generalAttendance.percentage;
  const sliceCoords = getPieCoordinates(presentPercentage);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600 mt-1">
          View your general class attendance and exam attendance with a visual
          summary.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-gray-200/80 rounded-xl p-2 w-fit">
        <button
          type="button"
          onClick={() => setViewType("general")}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            viewType === "general"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          General Attendance
        </button>
        <button
          type="button"
          onClick={() => setViewType("exam")}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            viewType === "exam"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Exam Attendance
        </button>
      </div>

      {viewType === "general" ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] items-center">
            <div className="rounded-3xl border border-gray-100 bg-slate-50 p-4 text-center">
              <svg className="mx-auto" viewBox="0 0 120 120" width="220" height="220">
                <circle cx="60" cy="60" r="46" fill="#eef2ff" />
                <path
                  d={`M60 14 A46 46 0 ${sliceCoords.largeArcFlag} ${sliceCoords.sweepFlag} ${sliceCoords.x} ${sliceCoords.y} L60 60 Z`}
                  fill="#2563eb"
                />
                <circle cx="60" cy="60" r="26" fill="#ffffff" />
                <text x="60" y="58" textAnchor="middle" className="text-2xl font-semibold fill-current" style={{ fontSize: 18, fill: "#1e3a8a" }}>
                  {presentPercentage}%
                </text>
                <text x="60" y="78" textAnchor="middle" className="text-xs fill-current" style={{ fill: "#475569" }}>
                  Present
                </text>
              </svg>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">General Attendance</h2>
                <p className="text-gray-500 mt-2">A quick summary of your attended classes for the current term.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm text-blue-700 font-semibold">Present Days</p>
                  <p className="mt-2 text-3xl font-bold text-blue-900">{generalAttendance.present}</p>
                </div>
                <div className="rounded-3xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm text-red-700 font-semibold">Absent Days</p>
                  <p className="mt-2 text-3xl font-bold text-red-900">{generalAttendance.absent}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Total classes</p>
                <p className="mt-2 text-xl font-semibold text-gray-900">{generalAttendance.totalClasses}</p>
                <p className="text-sm text-gray-500 mt-1">Your attendance ratio is shown in the chart.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Exam Attendance</h2>
              <p className="text-gray-500 mt-2">Review your exam-day attendance by term.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm font-semibold text-gray-700">Select Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-gray-100 bg-slate-50 p-5 text-center">
              <p className="text-sm text-gray-500">Selected Term</p>
              <p className="mt-2 font-semibold text-gray-900">{selectedTerm}</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-center">
              <p className="text-sm text-blue-700">Present Exams</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">{selectedExamAttendance.present}</p>
            </div>
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-center">
              <p className="text-sm text-red-700">Absent Exams</p>
              <p className="mt-2 text-3xl font-bold text-red-900">{selectedExamAttendance.absent}</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-gray-500">Performance</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{selectedExamAttendance.percentage}% Present</p>
              </div>
              <div className="max-w-xs">
                <div className="rounded-full bg-white border border-gray-200 overflow-hidden">
                  <div
                    className="h-4 bg-blue-600"
                    style={{ width: `${selectedExamAttendance.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
