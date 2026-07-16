import { Attendance } from "../models/attendance.model.js";
import { ClassAttendanceSession } from "../models/classAttendanceSession.model.js";
import { ClassOffering } from "../models/classOffering.model.js";
import { Exam } from "../models/exam.model.js";
import { ExamAttendance } from "../models/examAttendance.model.js";
import { Faculty } from "../models/faculty.model.js";
import { Marks } from "../models/marks.model.js";
import { Quiz } from "../models/quiz.model.js";
import { QuizSubmission } from "../models/quizSubmission.model.js";
import { Student } from "../models/student.model.js";
import { Subject } from "../models/subject.model.js";

void Faculty;
void Subject;

const FEATURE_NAMES = [
  "classAttendancePercent",
  "examAttendancePercent",
  "quizPercent",
  "quizCompletionPercent",
  "latestExamPercent",
  "averageExamPercent",
  "markCompletionPercent",
];

const CLUSTER_LABELS = [
  {
    label: "At Risk",
    color: "red",
    description: "Low marks, weak attendance, or incomplete academic activity.",
  },
  {
    label: "Needs Attention",
    color: "yellow",
    description: "Mixed performance with visible gaps in marks, quizzes, or attendance.",
  },
  {
    label: "Improving",
    color: "blue",
    description: "Decent current pattern with room to improve consistency.",
  },
  {
    label: "Strong Performer",
    color: "green",
    description: "Healthy attendance, quiz completion, and exam performance.",
  },
];

const round = (value, places = 2) => {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(Number(value).toFixed(places));
};

const percent = (obtained, full) =>
  full ? Math.max(0, Math.min(100, (Number(obtained || 0) / Number(full)) * 100)) : null;

const dateKey = (date) => new Date(date).toISOString().slice(0, 10);

const classKey = ({ facultyId, level, batch }) =>
  `${facultyId?.toString?.() || facultyId}-${Number(level)}-${Number(batch)}`;

const fullName = (student) =>
  [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");

const normalizeFaculty = (faculty) => ({
  id: faculty?._id?.toString?.() || "",
  code: faculty?.faculty_code || "",
  name: faculty?.faculty_name || "",
});

const keepNewestBatchPerLevel = (groups) => {
  const map = new Map();
  groups.forEach((group) => {
    const key = `${group.facultyId?.toString?.() || group.facultyId}-${Number(group.level)}`;
    const current = map.get(key);
    if (!current || Number(group.batch) > Number(current.batch)) {
      map.set(key, group);
    }
  });
  return [...map.values()];
};

const getFeatureVector = (features) =>
  FEATURE_NAMES.map((name) => Number(features[name] ?? 0));

const distance = (a, b) =>
  Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));

const meanVector = (vectors, dimensions) =>
  Array.from({ length: dimensions }, (_, index) =>
    vectors.reduce((sum, vector) => sum + vector[index], 0) / vectors.length,
  );

const runKMeans = (vectors, requestedK = 4, maxIterations = 40) => {
  if (!vectors.length) return { assignments: [], centroids: [], iterations: 0 };

  const k = Math.min(requestedK, vectors.length);
  let centroids = vectors.slice(0, k).map((vector) => [...vector]);
  let assignments = Array(vectors.length).fill(-1);
  let iterations = 0;

  for (; iterations < maxIterations; iterations += 1) {
    let changed = false;
    const nextAssignments = vectors.map((vector) => {
      let bestIndex = 0;
      let bestDistance = Infinity;
      centroids.forEach((centroid, index) => {
        const currentDistance = distance(vector, centroid);
        if (currentDistance < bestDistance) {
          bestDistance = currentDistance;
          bestIndex = index;
        }
      });
      return bestIndex;
    });

    changed = nextAssignments.some((assignment, index) => assignment !== assignments[index]);
    assignments = nextAssignments;

    centroids = centroids.map((centroid, index) => {
      const members = vectors.filter((_, vectorIndex) => assignments[vectorIndex] === index);
      return members.length ? meanVector(members, centroid.length) : centroid;
    });

    if (!changed) break;
  }

  return { assignments, centroids, iterations: iterations + 1 };
};

const clusterScore = (features) =>
  Number(features.averageExamPercent || 0) * 0.32 +
  Number(features.latestExamPercent || 0) * 0.22 +
  Number(features.classAttendancePercent || 0) * 0.16 +
  Number(features.examAttendancePercent || 0) * 0.14 +
  Number(features.quizPercent || 0) * 0.1 +
  Number(features.quizCompletionPercent || 0) * 0.06;

const getExamDate = (exam) => {
  const times = (exam.items || [])
    .map((item) => item.examDate)
    .filter(Boolean)
    .map((date) => new Date(date).getTime());
  return times.length ? Math.max(...times) : new Date(exam.createdAt || 0).getTime();
};

const applyStudentFilters = (baseFilter, { facultyId, level, batch }) => {
  if (facultyId) baseFilter.facultyId = facultyId;
  if (level) baseFilter.current_level = Number(level);
  if (batch) baseFilter.admitted_batch = Number(batch);
  return baseFilter;
};

const getAdminClassGroups = async ({ facultyId, level, batch }) => {
  const filter = { isActive: true };
  if (facultyId) filter.facultyId = facultyId;
  if (level) filter.level = Number(level);
  if (batch) filter.batch = Number(batch);

  const offerings = await ClassOffering.find(filter).populate("facultyId");
  const map = new Map();
  offerings.forEach((offering) => {
    const key = classKey(offering);
    if (!map.has(key)) {
      map.set(key, {
        facultyId: offering.facultyId?._id || offering.facultyId,
        faculty: normalizeFaculty(offering.facultyId),
        level: Number(offering.level),
        batch: Number(offering.batch),
      });
    }
  });

  const groups = [...map.values()];
  return batch ? groups : keepNewestBatchPerLevel(groups);
};

const getTeacherClassGroups = async (teacherId) => {
  const offerings = await ClassOffering.find({ teacherId, isActive: true })
    .populate("facultyId")
    .populate("subjectId");

  const map = new Map();
  offerings.forEach((offering) => {
    const key = classKey(offering);
    if (!map.has(key)) {
      map.set(key, {
        facultyId: offering.facultyId?._id || offering.facultyId,
        faculty: normalizeFaculty(offering.facultyId),
        level: Number(offering.level),
        batch: Number(offering.batch),
        subjects: [],
      });
    }
    map.get(key).subjects.push({
      id: offering.subjectId?._id?.toString?.() || offering.subjectId?.toString?.(),
      code: offering.subjectId?.subject_code || "",
      name: offering.subjectId?.subject_name || "Subject",
    });
  });

  const groups = [...map.values()];
  return keepNewestBatchPerLevel(groups);
};

const getStudentsForScope = async ({ scope, teacherId, facultyId, level, batch }) => {
  const baseFilter = {
    isActive: true,
    academic_status: { $ne: "graduated" },
  };

  if (scope === "teacher") {
    const groups = await getTeacherClassGroups(teacherId);
    if (!groups.length) return { students: [], groups };
    const selectedGroups = groups.filter((group) => {
      if (facultyId && String(group.facultyId) !== String(facultyId)) return false;
      if (level && String(group.level) !== String(level)) return false;
      if (batch && String(group.batch) !== String(batch)) return false;
      return true;
    });
    const scopedGroups = selectedGroups.length ? selectedGroups : groups;

    const or = scopedGroups.map((group) => ({
      facultyId: group.facultyId,
      current_level: group.level,
      admitted_batch: group.batch,
    }));
    const students = await Student.find({ ...baseFilter, $or: or })
      .populate("facultyId")
      .sort({ current_level: 1, admitted_batch: -1, roll_no: 1 });
    return { students, groups };
  }

  const groups = await getAdminClassGroups({ facultyId, level, batch });
  if (!groups.length) return { students: [], groups };

  const or = groups.map((group) => ({
    facultyId: group.facultyId,
    current_level: group.level,
    admitted_batch: group.batch,
  }));

  const students = await Student.find({
    ...applyStudentFilters(baseFilter, { facultyId, level, batch }),
    $or: or,
  })
    .populate("facultyId")
    .sort({ current_level: 1, admitted_batch: -1, roll_no: 1 });

  return { students, groups };
};

const buildClassAttendanceFeatures = async (students) => {
  const classFilters = [...new Map(students.map((student) => [
    classKey({
      facultyId: student.facultyId?._id || student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
    }),
    {
      facultyId: student.facultyId?._id || student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
    },
  ])).values()];

  const sessions = classFilters.length
    ? await ClassAttendanceSession.find({ $or: classFilters }).select("facultyId level batch date")
    : [];
  const records = students.length
    ? await Attendance.find({ studentId: { $in: students.map((student) => student._id) } }).select(
        "studentId facultyId level batch date status",
      )
    : [];

  const classDates = new Map();
  sessions.forEach((session) => {
    const key = classKey(session);
    if (!classDates.has(key)) classDates.set(key, new Set());
    classDates.get(key).add(dateKey(session.date));
  });

  const recordsByStudent = new Map();
  records.forEach((record) => {
    const studentId = record.studentId.toString();
    if (!recordsByStudent.has(studentId)) recordsByStudent.set(studentId, []);
    recordsByStudent.get(studentId).push(record);
  });

  return students.reduce((map, student) => {
    const studentId = student._id.toString();
    const key = classKey({
      facultyId: student.facultyId?._id || student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
    });
    const totalDates = new Set(classDates.get(key) || []);
    const presentDates = new Set();

    (recordsByStudent.get(studentId) || []).forEach((record) => {
      totalDates.add(dateKey(record.date));
      if (record.status === "present") presentDates.add(dateKey(record.date));
    });

    map.set(studentId, {
      present: presentDates.size,
      total: totalDates.size,
      percentage: totalDates.size ? (presentDates.size / totalDates.size) * 100 : 0,
    });
    return map;
  }, new Map());
};

const buildExamFeatures = async (students) => {
  const classFilters = [...new Map(students.map((student) => [
    classKey({
      facultyId: student.facultyId?._id || student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
    }),
    {
      facultyId: student.facultyId?._id || student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
    },
  ])).values()];

  const exams = classFilters.length ? await Exam.find({ $or: classFilters }).sort({ createdAt: 1 }) : [];
  const offerings = classFilters.length
    ? await ClassOffering.find({ $or: classFilters, isActive: true }).select("facultyId level batch subjectId")
    : [];
  const marks = students.length && exams.length
    ? await Marks.find({
        studentId: { $in: students.map((student) => student._id) },
        examId: { $in: exams.map((exam) => exam._id) },
      }).populate("classOfferingId")
    : [];
  const attendance = students.length && exams.length
    ? await ExamAttendance.find({
        studentId: { $in: students.map((student) => student._id) },
        examId: { $in: exams.map((exam) => exam._id) },
      }).select("studentId examId status")
    : [];

  const examsByClass = new Map();
  exams.forEach((exam) => {
    const key = classKey(exam);
    if (!examsByClass.has(key)) examsByClass.set(key, []);
    examsByClass.get(key).push(exam);
  });

  const subjectCountByClass = new Map();
  offerings.forEach((offering) => {
    const key = classKey(offering);
    if (!subjectCountByClass.has(key)) subjectCountByClass.set(key, new Set());
    subjectCountByClass.get(key).add(offering.subjectId.toString());
  });

  const marksByStudentExam = new Map();
  marks.forEach((mark) => {
    const key = `${mark.studentId.toString()}-${mark.examId.toString()}`;
    if (!marksByStudentExam.has(key)) marksByStudentExam.set(key, []);
    marksByStudentExam.get(key).push(mark);
  });

  const attendanceByStudent = new Map();
  attendance.forEach((record) => {
    const studentId = record.studentId.toString();
    if (!attendanceByStudent.has(studentId)) attendanceByStudent.set(studentId, []);
    attendanceByStudent.get(studentId).push(record);
  });

  return students.reduce((map, student) => {
    const studentId = student._id.toString();
    const key = classKey({
      facultyId: student.facultyId?._id || student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
    });
    const classExams = [...(examsByClass.get(key) || [])].sort((a, b) => getExamDate(a) - getExamDate(b));
    const subjectCount = subjectCountByClass.get(key)?.size || 0;

    const examPercents = classExams
      .map((exam) => {
        const examMarks = marksByStudentExam.get(`${studentId}-${exam._id.toString()}`) || [];
        const fullMarks = (subjectCount || examMarks.length || 1) * Number(exam.fullMarks || 100);
        const obtained = examMarks.reduce((sum, mark) => sum + Number(mark.obtained_marks || 0), 0);
        return examMarks.length ? percent(obtained, fullMarks) : null;
      })
      .filter((value) => value != null);

    const enteredMarkCount = classExams.reduce(
      (sum, exam) => sum + (marksByStudentExam.get(`${studentId}-${exam._id.toString()}`) || []).length,
      0,
    );
    const possibleMarkCount = classExams.length * Math.max(subjectCount, 1);
    const examAttendance = attendanceByStudent.get(studentId) || [];
    const presentExamAttendance = examAttendance.filter((record) => record.status === "present").length;

    map.set(studentId, {
      latestExamPercent: examPercents.length ? examPercents[examPercents.length - 1] : 0,
      averageExamPercent: examPercents.length
        ? examPercents.reduce((sum, value) => sum + value, 0) / examPercents.length
        : 0,
      markCompletionPercent: possibleMarkCount ? (enteredMarkCount / possibleMarkCount) * 100 : 0,
      examAttendancePercent: examAttendance.length
        ? (presentExamAttendance / examAttendance.length) * 100
        : 0,
      examAttendancePresent: presentExamAttendance,
      examAttendanceTotal: examAttendance.length,
      completedExamCount: examPercents.length,
    });
    return map;
  }, new Map());
};

const buildQuizFeatures = async (students) => {
  const classFilters = [...new Map(students.map((student) => [
    classKey({
      facultyId: student.facultyId?._id || student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
    }),
    {
      facultyId: student.facultyId?._id || student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
    },
  ])).values()];

  const quizzes = classFilters.length
    ? await Quiz.find({ $or: classFilters, status: "published" }).select("facultyId level batch questions")
    : [];
  const submissions = students.length && quizzes.length
    ? await QuizSubmission.find({
        studentId: { $in: students.map((student) => student._id) },
        quizId: { $in: quizzes.map((quiz) => quiz._id) },
      }).select("quizId studentId obtainedMarks fullMarks status")
    : [];

  const quizzesByClass = new Map();
  quizzes.forEach((quiz) => {
    const key = classKey(quiz);
    if (!quizzesByClass.has(key)) quizzesByClass.set(key, []);
    quizzesByClass.get(key).push(quiz);
  });

  const submissionsByStudent = new Map();
  submissions.forEach((submission) => {
    const studentId = submission.studentId.toString();
    if (!submissionsByStudent.has(studentId)) submissionsByStudent.set(studentId, []);
    submissionsByStudent.get(studentId).push(submission);
  });

  return students.reduce((map, student) => {
    const studentId = student._id.toString();
    const key = classKey({
      facultyId: student.facultyId?._id || student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
    });
    const classQuizzes = quizzesByClass.get(key) || [];
    const submitted = (submissionsByStudent.get(studentId) || []).filter(
      (submission) => submission.status === "submitted",
    );
    const obtained = submitted.reduce((sum, submission) => sum + Number(submission.obtainedMarks || 0), 0);
    const full = submitted.reduce((sum, submission) => sum + Number(submission.fullMarks || 0), 0);

    map.set(studentId, {
      quizPercent: percent(obtained, full) || 0,
      quizCompletionPercent: classQuizzes.length ? (submitted.length / classQuizzes.length) * 100 : 0,
      submittedQuizCount: submitted.length,
      totalQuizCount: classQuizzes.length,
    });
    return map;
  }, new Map());
};

const labelClusters = (clusterRows) => {
  const ordered = [...clusterRows].sort((a, b) => a.score - b.score);
  const labelsByCluster = new Map();
  ordered.forEach((cluster, index) => {
    const labelIndex = Math.min(
      CLUSTER_LABELS.length - 1,
      Math.round((index / Math.max(ordered.length - 1, 1)) * (CLUSTER_LABELS.length - 1)),
    );
    labelsByCluster.set(cluster.clusterId, CLUSTER_LABELS[labelIndex]);
  });
  return labelsByCluster;
};

const buildActiveClasses = (students) => {
  const classMap = new Map();
  students.forEach((student) => {
    const faculty = normalizeFaculty(student.facultyId);
    const level = Number(student.current_level);
    const batch = Number(student.admitted_batch);
    const key = `${faculty.id}-${level}-${batch}`;
    const current = classMap.get(key) || {
      faculty,
      level,
      batch,
      studentCount: 0,
    };
    current.studentCount += 1;
    classMap.set(key, current);
  });
  return [...classMap.values()].sort(
    (a, b) =>
      a.faculty.code.localeCompare(b.faculty.code) ||
      a.level - b.level ||
      b.batch - a.batch,
  );
};

export const buildPerformanceClusters = async ({
  scope = "admin",
  teacherId = null,
  facultyId = "",
  level = "",
  batch = "",
} = {}) => {
  const { students, groups } = await getStudentsForScope({
    scope,
    teacherId,
    facultyId,
    level,
    batch,
  });

  if (!students.length) {
    return {
      algorithm: "K-Means Clustering",
      featureNames: FEATURE_NAMES,
      trainedSampleCount: 0,
      clusters: [],
      students: [],
      activeClasses: [],
      scope,
      teacherGroups: groups,
      note: "No active students found for this scope.",
    };
  }

  const [classAttendance, examFeatures, quizFeatures] = await Promise.all([
    buildClassAttendanceFeatures(students),
    buildExamFeatures(students),
    buildQuizFeatures(students),
  ]);

  const rows = students.map((student) => {
    const studentId = student._id.toString();
    const features = {
      classAttendancePercent: round(classAttendance.get(studentId)?.percentage || 0),
      examAttendancePercent: round(examFeatures.get(studentId)?.examAttendancePercent || 0),
      quizPercent: round(quizFeatures.get(studentId)?.quizPercent || 0),
      quizCompletionPercent: round(quizFeatures.get(studentId)?.quizCompletionPercent || 0),
      latestExamPercent: round(examFeatures.get(studentId)?.latestExamPercent || 0),
      averageExamPercent: round(examFeatures.get(studentId)?.averageExamPercent || 0),
      markCompletionPercent: round(examFeatures.get(studentId)?.markCompletionPercent || 0),
    };

    return {
      studentId,
      studentCode: student.std_id,
      name: fullName(student),
      rollNo: student.roll_no,
      faculty: normalizeFaculty(student.facultyId),
      level: Number(student.current_level),
      batch: Number(student.admitted_batch),
      features,
      support: {
        classAttendance: {
          present: classAttendance.get(studentId)?.present || 0,
          total: classAttendance.get(studentId)?.total || 0,
        },
        examAttendance: {
          present: examFeatures.get(studentId)?.examAttendancePresent || 0,
          total: examFeatures.get(studentId)?.examAttendanceTotal || 0,
        },
        quizzes: {
          submitted: quizFeatures.get(studentId)?.submittedQuizCount || 0,
          total: quizFeatures.get(studentId)?.totalQuizCount || 0,
        },
        completedExamCount: examFeatures.get(studentId)?.completedExamCount || 0,
      },
      score: round(clusterScore(features)),
    };
  });

  const vectors = rows.map((row) => getFeatureVector(row.features));
  const { assignments, centroids, iterations } = runKMeans(vectors, 4);

  const clusterRows = centroids.map((centroid, clusterId) => {
    const members = rows.filter((_, index) => assignments[index] === clusterId);
    const averageFeatures = Object.fromEntries(
      FEATURE_NAMES.map((name) => [
        name,
        round(members.reduce((sum, member) => sum + Number(member.features[name] || 0), 0) / Math.max(members.length, 1)),
      ]),
    );
    return {
      clusterId,
      centroid: Object.fromEntries(FEATURE_NAMES.map((name, index) => [name, round(centroid[index])])),
      averageFeatures,
      count: members.length,
      score: round(members.reduce((sum, member) => sum + member.score, 0) / Math.max(members.length, 1)),
    };
  }).filter((cluster) => cluster.count > 0);

  const labelsByCluster = labelClusters(clusterRows);
  const clusters = clusterRows
    .map((cluster) => ({
      ...cluster,
      ...labelsByCluster.get(cluster.clusterId),
      students: rows
        .filter((_, index) => assignments[index] === cluster.clusterId)
        .sort((a, b) => a.score - b.score),
    }))
    .sort((a, b) => a.score - b.score);

  const studentsWithClusters = rows
    .map((row, index) => ({
      ...row,
      clusterId: assignments[index],
      cluster: labelsByCluster.get(assignments[index]),
    }))
    .sort((a, b) => a.score - b.score);

  return {
    algorithm: "K-Means Clustering",
    featureNames: FEATURE_NAMES,
    trainedSampleCount: rows.length,
    iterations,
    clusters,
    students: studentsWithClusters,
    activeClasses: buildActiveClasses(students),
    scope,
    teacherGroups: groups,
    generatedAt: new Date(),
    note: "Students are clustered from current-semester attendance, exam, quiz, and marks patterns.",
  };
};
