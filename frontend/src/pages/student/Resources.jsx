import { useState, useMemo } from "react";
import Button from "../../components/Button";

const dummyFaculties = [
  {
    _id: "fac_bca",
    code: "BCA",
    name: "Bachelor of Computer Applications",
    structureType: "semester",
    maxLevel: 8,
  },
  {
    _id: "fac_bbs",
    code: "BBS",
    name: "Bachelor of Business Studies",
    structureType: "year",
    maxLevel: 4,
  },
];

function getLevelLabel(structureType, level) {
  const SEM = [
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
    "Sixth",
    "Seventh",
    "Eighth",
  ];
  const YR = ["First", "Second", "Third", "Fourth", "Fifth"];
  const names = structureType === "semester" ? SEM : YR;
  return (
    (names[level - 1] || `Level ${level}`) +
    (structureType === "semester" ? " Semester" : " Year")
  );
}

const SAMPLE_RESOURCES = [
  {
    _id: "r1",
    facultyId: "fac_bca",
    level: 3,
    subjectId: "sub_001",
    title: "Database Notes",
    type: "text",
    description: "Important DB topics.",
  },
  {
    _id: "r2",
    facultyId: "fac_bca",
    level: 3,
    subjectId: "sub_002",
    title: "Web Tech Slides",
    type: "images",
    images: [{ url: "/public/uploads/sample.jpg", title: "Slide 1" }],
  },
];

export default function Resources() {
  const [facultyId, setFacultyId] = useState("");
  const [level, setLevel] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("student_bookmarks") || "[]");
    } catch {
      return [];
    }
  });

  const faculty = useMemo(
    () => dummyFaculties.find((f) => f._id === facultyId),
    [facultyId],
  );
  const levelOptions = useMemo(() => {
    if (!faculty) return [];
    return Array.from({ length: faculty.maxLevel }, (_, i) => ({
      value: i + 1,
      label: getLevelLabel(faculty.structureType, i + 1),
    }));
  }, [faculty]);

  const filtered = SAMPLE_RESOURCES.filter(
    (r) =>
      (!facultyId || r.facultyId === facultyId) &&
      (!level || r.level === Number(level)) &&
      (!subjectId || r.subjectId === subjectId),
  );

  const toggleBookmark = (res) => {
    const exists = bookmarks.find((b) => b._id === res._id);
    const next = exists
      ? bookmarks.filter((b) => b._id !== res._id)
      : [res, ...bookmarks];
    setBookmarks(next);
    localStorage.setItem("student_bookmarks", JSON.stringify(next));
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
        <p className="text-gray-600 mt-1">
          Select Faculty, Semester and Subject to view resources posted by
          teachers. Bookmark resources to save them.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Faculty
          </label>
          <select
            value={facultyId}
            onChange={(e) => {
              setFacultyId(e.target.value);
              setLevel("");
              setSubjectId("");
            }}
            className="w-full px-4 py-3 border rounded"
          >
            <option value="">Select faculty</option>
            {dummyFaculties.map((f) => (
              <option key={f._id} value={f._id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Semester/Year
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full px-4 py-3 border rounded"
            disabled={!faculty}
          >
            <option value="">Select</option>
            {levelOptions.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Subject
          </label>
          <input
            placeholder="(optional) subject id"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full px-4 py-3 border rounded"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Resources</h3>
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white py-8 text-center text-gray-600">
            No resources found for selection.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {filtered.map((r) => (
              <div
                key={r._id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.type}</p>
                  </div>
                  <div>
                    <button
                      onClick={() => toggleBookmark(r)}
                      className={`px-3 py-1 rounded text-sm ${bookmarks.find((b) => b._id === r._id) ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}
                    >
                      {bookmarks.find((b) => b._id === r._id)
                        ? "Saved"
                        : "Save"}
                    </button>
                  </div>
                </div>
                {r.description && (
                  <p className="text-sm text-gray-700 mt-3">{r.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">Bookmarked</h3>
        {bookmarks.length === 0 ? (
          <p className="text-gray-600 mt-2">No saved resources.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 mt-3">
            {bookmarks.map((b) => (
              <div
                key={b._id}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <p className="font-medium text-gray-900">{b.title}</p>
                <p className="text-xs text-gray-500">{b.type}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
