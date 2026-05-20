import { DUMMY_STUDENTS, enumerateSeatSlots } from "../data/examDummyData";

/** UI-only seat assignment (backend / genetic algorithm later). */
export function generateSeatPlan({
  layouts,
  roomIds,
  groups,
  mode = "adjacent",
  examId,
}) {
  const selectedLayouts = layouts.filter((l) => roomIds.includes(l.id));
  const slots = selectedLayouts.flatMap((l) => enumerateSeatSlots(l));

  const normalizedGroups = Array.isArray(groups) ? groups : [];
  let students = DUMMY_STUDENTS.filter((s) => {
    return normalizedGroups.some((g) => {
      if (!g?.facultyCode) return false;
      if (s.faculty !== g.facultyCode) return false;
      if (!Array.isArray(g.levels) || g.levels.length === 0) return false;
      return g.levels.includes(String(s.level));
    });
  });

  if (mode === "adjacent") {
    students = [...students].sort((a, b) => a.rollSort - b.rollSort);
  } else {
    students = shuffle([...students]);
  }

  const assignments = [];
  const assignmentBySeatId = {};
  const count = Math.min(students.length, slots.length);

  for (let i = 0; i < count; i++) {
    const slot = slots[i];
    const student = students[i];
    const entry = { ...slot, student };
    assignments.push(entry);
    assignmentBySeatId[slot.seatId] = student;
  }

  return {
    id: `plan-${Date.now()}`,
    examId,
    roomIds,
    groups: normalizedGroups,
    mode,
    createdAt: new Date().toISOString(),
    assignments,
    assignmentBySeatId,
    stats: {
      studentsPlaced: count,
      studentsTotal: students.length,
      seatsUsed: count,
      seatsAvailable: slots.length,
      unplaced: Math.max(0, students.length - slots.length),
    },
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Per-room assignment map for ClassLayoutDiagram */
export function assignmentsForRoom(plan, layout) {
  const map = {};
  for (const a of plan.assignments) {
    if (a.roomId === layout.id) {
      map[a.seatId] = a.student;
    }
  }
  return map;
}
