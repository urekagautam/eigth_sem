import { useState } from "react";
import Button from "../../components/Button";

const TABS = [
  { id: "result", label: "Result" },
  { id: "online", label: "Online Exam" },
];
const TERM_OPTIONS = ["First Term", "Second Term", "Third Term"];

export default function Academics() {
  const [tab, setTab] = useState("result");
  const [selectedTerm, setSelectedTerm] = useState(TERM_OPTIONS[0]);

  const dummyLedger = [
    { subject: "Database", grade: "A", marks: 85 },
    { subject: "Web Tech", grade: "B+", marks: 78 },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Academics</h1>
        <p className="text-gray-600 mt-1">
          View results and (future) online exams.
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-gray-200/80 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded ${tab === t.id ? "bg-white text-blue-600" : "text-gray-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "result" ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="block text-sm font-semibold text-gray-700">
              Select Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-4 py-2 border rounded"
            >
              {TERM_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <h3 className="text-lg font-semibold">
            Result Ledger - {selectedTerm}
          </h3>
          <div className="mt-3">
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-gray-500">
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {dummyLedger.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2">{r.subject}</td>
                    <td>{r.marks}</td>
                    <td>{r.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold">Online Exam</h3>
          <p className="text-gray-600 mt-2">
            This section is reserved for future online exam functionality.
          </p>
        </div>
      )}
    </div>
  );
}
