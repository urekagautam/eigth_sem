import {
  createSampleLayout,
  DEFAULT_SCHEDULE_HISTORY,
} from "../data/examDummyData";

const LAYOUTS_KEY = "eigth_sem_class_layouts";
const SEAT_PLANS_KEY = "eigth_sem_seat_plans";
const SCHEDULES_KEY = "eigth_sem_exam_schedules";
const EXAM_MARKS_KEY = "eigth_sem_exam_marks";
const EXAM_ATTENDANCE_KEY = "eigth_sem_exam_attendance";

export function loadLayouts() {
  try {
    const raw = localStorage.getItem(LAYOUTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [createSampleLayout("101"), createSampleLayout("102")];
}

export function saveLayouts(layouts) {
  localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts));
}

export function loadSeatPlans() {
  try {
    const raw = localStorage.getItem(SEAT_PLANS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

export function saveSeatPlans(plans) {
  localStorage.setItem(SEAT_PLANS_KEY, JSON.stringify(plans));
}

export function loadExamSchedules() {
  try {
    const raw = localStorage.getItem(SCHEDULES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return DEFAULT_SCHEDULE_HISTORY;
}

export function saveExamSchedules(schedules) {
  localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
}

export function loadExamMarks() {
  try {
    const raw = localStorage.getItem(EXAM_MARKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

export function saveExamMarks(marks) {
  localStorage.setItem(EXAM_MARKS_KEY, JSON.stringify(marks));
}

export function loadExamAttendance() {
  try {
    const raw = localStorage.getItem(EXAM_ATTENDANCE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

export function saveExamAttendance(attendance) {
  localStorage.setItem(EXAM_ATTENDANCE_KEY, JSON.stringify(attendance));
}
