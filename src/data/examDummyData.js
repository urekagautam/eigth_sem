export const FACULTY_CATALOG = [
  { id: "fac_bca", code: "BCA", structureType: "semester", maxLevel: 8 },
  { id: "fac_bbm", code: "BBM", structureType: "semester", maxLevel: 8 },
  { id: "fac_bbs", code: "BBS", structureType: "year", maxLevel: 4 },
  { id: "fac_bim", code: "BIM", structureType: "semester", maxLevel: 8 },
  {
    id: "fac_bsc_csit",
    code: "BSC CSIT",
    structureType: "semester",
    maxLevel: 8,
  },
];

export const FACULTIES = FACULTY_CATALOG.map((f) => f.code);
export const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
export const YEARS = ["1", "2", "3", "4", "5"];

const SEMESTER_NAMES = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
];
const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

export function getLevelLabel(structureType, level) {
  const names = structureType === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
  const name = names[level - 1] || `Level ${level}`;
  return structureType === "semester" ? `${name} Semester` : `${name} Year`;
}

export function getFacultyByCode(code) {
  return FACULTY_CATALOG.find((f) => f.code === code) ?? null;
}

export function getLevelOptionsForFacultyCode(code) {
  const fac = getFacultyByCode(code);
  if (!fac) return [];
  const max = Math.max(
    1,
    Math.min(fac.maxLevel, fac.structureType === "semester" ? 8 : 5),
  );
  return Array.from({ length: max }, (_, i) => {
    const level = i + 1;
    return {
      value: String(level),
      label: getLevelLabel(fac.structureType, level),
    };
  });
}

function pad(n) {
  return String(n).padStart(3, "0");
}

export function buildDummyStudents() {
  const students = [];
  let n = 1;
  for (const fac of FACULTY_CATALOG) {
    const levelCount = Math.min(
      fac.maxLevel,
      fac.structureType === "semester" ? 8 : 4,
    );
    for (let level = 1; level <= levelCount; level++) {
      for (let i = 1; i <= 14; i++) {
        const rollNo = `${fac.code}-${String(level)}-${pad(i)}`;
        students.push({
          id: rollNo,
          rollNo,
          name: `Student ${i}`,
          faculty: fac.code,
          structureType: fac.structureType,
          level: String(level),
          rollSort: n++,
        });
      }
    }
  }
  return students;
}

export const DUMMY_STUDENTS = buildDummyStudents();

export const DUMMY_SUBJECTS = [
  {
    _id: "sub_001",
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
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2024-04-01T00:00:00.000Z",
  },
  {
    _id: "sub_002",
    name: "Web Technology",
    code: "BCA302",
    facultyId: "fac_bca",
    facultyCode: "BCA",
    level: 3,
    levelLabel: "Third Semester",
    structureType: "semester",
    assignedTeacher: {
      teacherId: "tch_002",
      fullName: "Sunita Sharma",
    },
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2024-04-01T00:00:00.000Z",
  },
  {
    _id: "sub_003",
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
    createdAt: "2024-02-01T00:00:00.000Z",
    updatedAt: "2024-02-01T00:00:00.000Z",
  },
  {
    _id: "sub_004",
    name: "Business Economics",
    code: "BBS201",
    facultyId: "fac_bbs",
    facultyCode: "BBS",
    level: 2,
    levelLabel: "Second Year",
    structureType: "year",
    assignedTeacher: {
      teacherId: "tch_003",
      fullName: "Ramesh Kumar Adhikari",
    },
    createdAt: "2024-03-01T00:00:00.000Z",
    updatedAt: "2024-03-01T00:00:00.000Z",
  },
];

const SECTION_NAMES = ["Left", "Middle", "Right"];

/** Build room layout from simple form: sections = [{ rows, seatsPerRow }] */
export function buildLayout(roomNumber, sectionInputs) {
  const sections = sectionInputs.map((sec, i) => {
    const rows = [];
    for (let r = 0; r < sec.rows; r++) {
      const seats = [];
      for (let s = 0; s < sec.seatsPerRow; s++) {
        seats.push({ id: `seat-${Date.now()}-${i}-${r}-${s}` });
      }
      rows.push({ id: `row-${i}-${r}`, seats });
    }
    return {
      id: `sec-${i}-${Date.now()}`,
      label: SECTION_NAMES[i] || `Part ${i + 1}`,
      rows,
    };
  });

  return {
    id: `layout-${Date.now()}`,
    roomNumber,
    sections,
  };
}

export function countSeats(layout) {
  let n = 0;
  for (const sec of layout.sections || []) {
    for (const row of sec.rows || []) {
      n += row.seats.length;
    }
  }
  return n;
}

export function enumerateSeatSlots(layout) {
  const slots = [];
  for (const sec of layout.sections || []) {
    for (const row of sec.rows || []) {
      row.seats.forEach((seat, seatIndex) => {
        slots.push({
          roomId: layout.id,
          roomNumber: layout.roomNumber,
          sectionId: sec.id,
          sectionLabel: sec.label,
          rowId: row.id,
          seatIndex,
          seatId: seat.id,
        });
      });
    }
  }
  return slots;
}

export const DEFAULT_SCHEDULE_HISTORY = [
  {
    id: "sch-1",
    facultyCode: "BCA",
    level: "3",
    exams: [
      {
        id: "exam-1",
        title: "First Terminal Examination",
        createdAt: "2026-04-01",
        items: [
          {
            id: "i-1",
            date: "2026-04-10",
            time: "09:00",
            subject: "Data Structures",
          },
          {
            id: "i-2",
            date: "2026-04-12",
            time: "10:00",
            subject: "Database Systems",
          },
        ],
      },
    ],
  },
  {
    id: "sch-2",
    facultyCode: "BBS",
    level: "2",
    exams: [
      {
        id: "exam-1",
        title: "Pre-Board Examination",
        createdAt: "2026-03-12",
        items: [
          {
            id: "i-1",
            date: "2026-03-20",
            time: "08:30",
            subject: "Business Law",
          },
          {
            id: "i-2",
            date: "2026-03-22",
            time: "09:30",
            subject: "Marketing",
          },
        ],
      },
    ],
  },
];

export function createSampleLayout(roomNumber) {
  return buildLayout(roomNumber, [
    { rows: 4, seatsPerRow: 2 },
    { rows: 4, seatsPerRow: 2 },
    { rows: 5, seatsPerRow: 2 },
  ]);
}
