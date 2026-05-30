import { useState, useMemo, useEffect, useRef } from "react";
// import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Users,
  GraduationCap,
  ArrowUpCircle,
  KeyRound,
  Plus,
  RefreshCw,
  BookOpen,
  Search,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import Button from "../../components/Button";
import { DUMMY_SUBJECTS } from "../../data/examDummyData";
import {
  createFaculty,
  fetchFaculties,
  updateFaculty,
  deleteFaculty,
} from "../../services/apiFaculty";
import StudentProfile from "./academics/StudentProfile";
import {
  fetchStudents,
  createStudent as apiCreateStudent,
  updateStudent as apiUpdateStudent,
  deleteStudent as apiDeleteStudent,
} from "../../services/apiAddStudent";

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600";
const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

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

const MAX_SEMESTERS = 8;
const MAX_YEARS = 5;

function getLevelLabel(structureType, level) {
  const names = structureType === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
  const name = names[level - 1] || `Level ${level}`;
  return structureType === "semester" ? `${name} Semester` : `${name} Year`;
}

function getLevelOptions(faculty) {
  if (!faculty) return [];
  const limit = faculty.structureType === "semester" ? MAX_SEMESTERS : MAX_YEARS;
  const max = Math.min(Math.max(Number(faculty.maxLevel) || 1, 1), limit);
  return Array.from({ length: max }, (_, i) => {
    const level = i + 1;
    return { value: level, label: getLevelLabel(faculty.structureType, level) };
  });
}

function getFacultyLevelLabels(faculty) {
  if (!faculty) return [];
  const limit = faculty.structureType === "semester" ? MAX_SEMESTERS : MAX_YEARS;
  const max = Math.min(Math.max(Number(faculty.maxLevel) || 1, 1), limit);
  return Array.from({ length: max }, (_, i) =>
    getLevelLabel(faculty.structureType, i + 1),
  );
}

function generatePassword() {
  return `Tmp@${Math.random().toString(36).slice(2, 10)}`;
}

function generateUsername(firstName, lastName, studentId) {
  const base = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, "");
  return base || studentId?.toLowerCase() || `user${Date.now()}`;
}

function teacherFullName(teacher) {
  return [
    teacher.profile.firstName,
    teacher.profile.middleName,
    teacher.profile.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

const emptyStudentForm = () => ({
  firstName: "",
  middleName: "",
  lastName: "",
  studentId: "",
  mobile: "",
  email: "",
  gender: "",
  bloodGroup: "",
  citizenshipNo: "",
  universityRegNo: "",
  universitySymbolNo: "",
  guardianName: "",
  guardianMobile: "",
  fatherName: "",
  motherName: "",
  fatherMobile: "",
  motherMobile: "",
  admittedBatch: "",
  currentLevel: "",
});

const emptyTeacherForm = () => ({
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  address: "",
  facultyId: "",
});

// ─── Dummy data (MongoDB-style documents) ───────────────────────────────────

const initialFaculties = [
  {
    _id: "fac_bca",
    code: "BCA",
    name: "Bachelor of Computer Applications",
    structureType: "semester",
    maxLevel: 8,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "fac_bbm",
    code: "BBM",
    name: "Bachelor of Business Management",
    structureType: "semester",
    maxLevel: 8,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "fac_bbs",
    code: "BBS",
    name: "Bachelor of Business Studies",
    structureType: "year",
    maxLevel: 4,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "fac_bim",
    code: "BIM",
    name: "Bachelor of Information Management",
    structureType: "semester",
    maxLevel: 8,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "fac_bsc_csit",
    code: "BSC CSIT",
    name: "BSc Computer Science & Information Technology",
    structureType: "semester",
    maxLevel: 8,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

const dummyStudents = [
  {
    _id: "stu_001",
    profile: {
      firstName: "Sita",
      middleName: "Kumari",
      lastName: "Shrestha",
      gender: "female",
      bloodGroup: "A+",
      email: "sita.shrestha@campus.edu.np",
      mobile: "9801111111",
      citizenshipNo: "12-34-567890",
    },
    studentId: "BCA-2081-001",
    universityRegNo: "REG-BCA-2081-001",
    universitySymbolNo: "SYM-001",
    guardian: {
      name: "Hari Shrestha",
      mobile: "9802222222",
      fatherName: "Hari Shrestha",
      motherName: "Gita Shrestha",
      fatherMobile: "9802222222",
      motherMobile: "9803333333",
    },
    admission: {
      facultyId: "fac_bca",
      facultyCode: "BCA",
      facultyName: "Bachelor of Computer Applications",
      batch: "2081",
    },
    enrollment: {
      status: "active",
      structureType: "semester",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
      currentClass: "BCA — Third Semester — Batch 2081",
    },
    graduation: null,
    credentials: {
      username: "sita.shrestha",
      hasPassword: true,
      lastResetAt: "2024-04-10T08:00:00.000Z",
    },
    createdAt: "2024-02-01T00:00:00.000Z",
    updatedAt: "2024-05-01T00:00:00.000Z",
  },
  {
    _id: "stu_002",
    profile: {
      firstName: "Rajesh",
      middleName: "",
      lastName: "Karki",
      gender: "male",
      bloodGroup: "B+",
      email: "rajesh.karki@campus.edu.np",
      mobile: "9804444444",
      citizenshipNo: null,
    },
    studentId: "BBS-2079-012",
    universityRegNo: "REG-BBS-2079-012",
    universitySymbolNo: "SYM-012",
    guardian: {
      name: "Prem Karki",
      mobile: "9805555555",
      fatherName: "Prem Karki",
      motherName: "Sunita Karki",
      fatherMobile: "9805555555",
      motherMobile: "9806666666",
    },
    admission: {
      facultyId: "fac_bbs",
      facultyCode: "BBS",
      facultyName: "Bachelor of Business Studies",
      batch: "2079",
    },
    enrollment: {
      status: "graduated",
      structureType: "year",
      currentLevel: null,
      currentLevelLabel: null,
      currentClass: null,
    },
    graduation: {
      facultyId: "fac_bbs",
      facultyCode: "BBS",
      facultyName: "Bachelor of Business Studies",
      batch: "2079",
      graduatedAt: "2024-03-15T00:00:00.000Z",
    },
    credentials: {
      username: "rajesh.karki",
      hasPassword: true,
      lastResetAt: null,
    },
    createdAt: "2020-08-01T00:00:00.000Z",
    updatedAt: "2024-03-15T00:00:00.000Z",
  },
];

const dummyTeachers = [
  {
    _id: "tch_001",
    profile: {
      firstName: "Anil",
      middleName: "Prasad",
      lastName: "Gurung",
      phone: "9811000001",
      address: "Kathmandu, Nepal",
    },
    facultyId: "fac_bca",
    facultyCode: "BCA",
    credentials: {
      username: "anil.gurung",
      hasPassword: true,
      lastResetAt: "2024-04-01T00:00:00.000Z",
    },
    createdAt: "2023-06-01T00:00:00.000Z",
    updatedAt: "2024-04-01T00:00:00.000Z",
  },
  {
    _id: "tch_002",
    profile: {
      firstName: "Sunita",
      middleName: "",
      lastName: "Sharma",
      phone: "9811000002",
      address: "Lalitpur, Nepal",
    },
    facultyId: "fac_bca",
    facultyCode: "BCA",
    credentials: {
      username: "sunita.sharma",
      hasPassword: true,
      lastResetAt: "2024-03-20T00:00:00.000Z",
    },
    createdAt: "2023-08-01T00:00:00.000Z",
    updatedAt: "2024-03-20T00:00:00.000Z",
  },
  {
    _id: "tch_003",
    profile: {
      firstName: "Ramesh",
      middleName: "Kumar",
      lastName: "Adhikari",
      phone: "9811000003",
      address: "Bhaktapur, Nepal",
    },
    facultyId: "fac_bbs",
    facultyCode: "BBS",
    credentials: {
      username: "ramesh.adhikari",
      hasPassword: true,
      lastResetAt: null,
    },
    createdAt: "2024-01-10T00:00:00.000Z",
    updatedAt: "2024-01-10T00:00:00.000Z",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function Academics() {
  const [faculties, setFaculties] = useState(initialFaculties);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState(dummyTeachers);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("students");
  const [filterFacultyId, setFilterFacultyId] = useState("");
  const [filterLevel, setFilterLevel] = useState("");

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [newStudentCreds, setNewStudentCreds] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState(emptyTeacherForm());
  const [newTeacherCreds, setNewTeacherCreds] = useState(null);

  const [showAddFaculty, setShowAddFaculty] = useState(false);
  const [newFacultyForm, setNewFacultyForm] = useState({
    code: "",
    name: "",
    structureType: "semester",
    maxLevel: 8,
  });
  const [loadingFaculties, setLoadingFaculties] = useState(false);

  useEffect(() => {
    const loadFaculties = async () => {
      setLoadingFaculties(true);
      try {
        const response = await fetchFaculties();
        if (response?.success && Array.isArray(response.data)) {
          // Normalize id fields: prefer `_id`, fall back to `id`
          setFaculties(
            response.data.map((f) => ({ ...f, _id: f._id ?? f.id })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch faculties:", error);
      } finally {
        setLoadingFaculties(false);
      }
    };

    loadFaculties();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      if (!filterFacultyId || !filterLevel) {
        setStudents([]);
        return;
      }

      try {
        const response = await fetchStudents({
          facultyId: filterFacultyId,
          level: filterLevel,
        });
        if (response?.success && Array.isArray(response.data)) {
          setStudents(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };
    loadStudents();
  }, [filterFacultyId, filterLevel]);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [upgradeForm, setUpgradeForm] = useState({
    facultyId: "",
    fromLevel: "",
    toLevel: "",
    markAsGraduated: false,
  });
  const [upgradeNotice, setUpgradeNotice] = useState("");

  const [subjects, setSubjects] = useState(DUMMY_SUBJECTS);
  const [subjectFacultyId, setSubjectFacultyId] = useState("");
  const [subjectLevel, setSubjectLevel] = useState("");
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [teacherSearch, setTeacherSearch] = useState({});
  const [teacherDropdownOpenId, setTeacherDropdownOpenId] = useState(null);

  const [duplicateAlert, setDuplicateAlert] = useState(null);
  const [editingFacultyId, setEditingFacultyId] = useState(null);
  const [facultyEditForm, setFacultyEditForm] = useState({
    code: "",
    name: "",
    structureType: "semester",
    maxLevel: 8,
  });

  const filterFaculty = faculties.find((f) => f._id === filterFacultyId);
  const subjectFaculty = faculties.find((f) => f._id === subjectFacultyId);
  const subjectLevelOptions = useMemo(
    () => getLevelOptions(subjectFaculty),
    [subjectFaculty],
  );
  const levelOptions = useMemo(
    () => getLevelOptions(filterFaculty),
    [filterFaculty],
  );

  const classSubjects = useMemo(() => {
    if (!subjectFacultyId || !subjectLevel) return [];
    return subjects.filter(
      (s) =>
        s.facultyId === subjectFacultyId && s.level === Number(subjectLevel),
    );
  }, [subjects, subjectFacultyId, subjectLevel]);

  const getTeacherOtherAssignments = (teacherId, excludeSubjectId) =>
    subjects
      .filter(
        (s) =>
          s.assignedTeacher?.teacherId === teacherId &&
          s._id !== excludeSubjectId,
      )
      .map((s) => `${s.facultyCode} · ${s.levelLabel} · ${s.name}`);

  const handleAddSubject = () => {
    const faculty = subjectFaculty;
    if (!faculty || !subjectLevel || !subjectForm.name.trim()) return;
    const level = Number(subjectLevel);
    const doc = {
      _id: `sub_${Date.now()}`,
      name: subjectForm.name.trim(),
      code:
        subjectForm.code.trim() || `${faculty.code}${level}${Date.now() % 100}`,
      facultyId: faculty._id,
      facultyCode: faculty.code,
      level,
      levelLabel: getLevelLabel(faculty.structureType, level),
      structureType: faculty.structureType,
      assignedTeacher: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSubjects([doc, ...subjects]);
    setSubjectForm({ name: "", code: "" });
  };

  const handleAssignTeacher = (subjectId, teacherId) => {
    const teacher = teachers.find((t) => t._id === teacherId);
    if (!teacher) return;
    setSubjects(
      subjects.map((s) =>
        s._id === subjectId
          ? {
              ...s,
              assignedTeacher: {
                teacherId: teacher._id,
                fullName: teacherFullName(teacher),
              },
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
    setTeacherSearch((prev) => ({ ...prev, [subjectId]: "" }));
  };

  const filteredStudents = students.filter((s) => {
    if (filterFacultyId && s.admission.facultyId !== filterFacultyId)
      return false;
    if (filterLevel) {
      if (s.enrollment.status === "graduated") return false;
      if (String(s.enrollment.currentLevel) !== filterLevel) return false;
    }
    return true;
  });

  const handleAddFaculty = async () => {
    if (!newFacultyForm.name.trim() || !newFacultyForm.code.trim()) return;

    const facultyName = newFacultyForm.name.trim();
    const facultyCode = newFacultyForm.code.trim().toUpperCase();

    // Check if a faculty with the same name already exists and is NOT deleted
    const existingFaculty = faculties.find(
      (f) => f.name.toLowerCase() === facultyName.toLowerCase() && !f.isDeleted
    );

    if (existingFaculty) {
      // If faculty exists and is not deleted, show duplicate alert
      setDuplicateAlert({
        name: existingFaculty.name,
        code: existingFaculty.code,
      });
      return;
    }

    const payload = {
      code: facultyCode,
      name: facultyName,
      structureType: newFacultyForm.structureType,
      maxLevel: Number(newFacultyForm.maxLevel),
    };

    try {
      const result = await createFaculty(payload);
      if (result?.success && result.data) {
        const created = { ...result.data, _id: result.data._id ?? result.data.id };
        setFaculties((current) => [...current, created]);
        setNewFacultyForm({
          code: "",
          name: "",
          structureType: "semester",
          maxLevel: 8,
        });
        setShowAddFaculty(false);
        setDuplicateAlert(null);
      }
    } catch (error) {
      console.error("Error adding faculty:", error);
      
      // Handle E11000 duplicate key error from backend
      if (error?.message?.includes("E11000") || error?.message?.includes("duplicate")) {
        setDuplicateAlert({
          name: facultyName,
          code: facultyCode,
        });
      } else {
        alert(error?.message || "Failed to add faculty. Please try again.");
      }
    }
  };

  const startEditFaculty = (faculty) => {
    setEditingFacultyId(faculty._id);
    setFacultyEditForm({
      code: faculty.code,
      name: faculty.name,
      structureType: faculty.structureType,
      maxLevel: faculty.maxLevel,
    });
  };

  const cancelEditFaculty = () => {
    setEditingFacultyId(null);
    setFacultyEditForm({
      code: "",
      name: "",
      structureType: "semester",
      maxLevel: 8,
    });
  };

  const handleUpdateFaculty = async () => {
    if (!editingFacultyId) return;
    if (!facultyEditForm.name.trim() || !facultyEditForm.code.trim()) return;

    const payload = {
      code: facultyEditForm.code.trim().toUpperCase(),
      name: facultyEditForm.name.trim(),
      structureType: facultyEditForm.structureType,
      maxLevel: Number(facultyEditForm.maxLevel),
    };

    try {
      const result = await updateFaculty(editingFacultyId, payload);
      if (result?.success && result.data) {
        const updated = { ...result.data, _id: result.data._id ?? result.data.id };
        setFaculties((current) => current.map((f) => (f._id === editingFacultyId ? updated : f)));
        cancelEditFaculty();
      }
    } catch (error) {
      console.error("Error updating faculty:", error);
    }
  };

  const handleSaveStudent = async (payload) => {
    try {
      if (editingStudent) {
        const response = await apiUpdateStudent(editingStudent._id, payload);
        if (response?.success && response.data) {
          setStudents((current) =>
            current.map((s) => (s._id === editingStudent._id ? response.data : s))
          );
          setEditingStudent(null);
        }
      } else {
        const response = await apiCreateStudent(payload);
        if (response?.success && response.data) {
          setStudents((current) => [response.data, ...current]);
          
          if (response.data.credentials?.password) {
            setNewStudentCreds({
              username: response.data.credentials.username,
              password: response.data.credentials.password,
            });
          }
        }
      }
      setShowAddStudent(false);
    } catch (error) {
      console.error("Failed to save student:", error);
      alert(error.message || "Failed to save student");
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      const response = await apiDeleteStudent(studentId);
      if (response?.success) {
        setStudents((current) => current.filter((s) => s._id !== studentId));
      }
    } catch (error) {
      console.error("Failed to delete student:", error);
      alert(error.message || "Failed to delete student");
    }
  };

  const handleCreateTeacher = () => {
    if (!teacherForm.firstName || !teacherForm.lastName) return;
    const faculty = faculties.find((f) => f._id === teacherForm.facultyId);
    const username = generateUsername(
      teacherForm.firstName,
      teacherForm.lastName,
      "teacher",
    );
    const password = generatePassword();
    setNewTeacherCreds({ username, password });

    const doc = {
      _id: `tch_${Date.now()}`,
      profile: {
        firstName: teacherForm.firstName,
        middleName: teacherForm.middleName || "",
        lastName: teacherForm.lastName,
        phone: teacherForm.phone,
        address: teacherForm.address,
      },
      facultyId: faculty?._id || null,
      facultyCode: faculty?.code || null,
      credentials: {
        username,
        hasPassword: true,
        lastResetAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTeachers([doc, ...teachers]);
    setTeacherForm(emptyTeacherForm());
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPasswordValue) return;
    const now = new Date().toISOString();
    try {
      if (resetTarget.type === "student") {
        await apiUpdateStudent(resetTarget.id, { password: resetPasswordValue });
        setStudents(
          students.map((s) =>
            s._id === resetTarget.id
              ? {
                  ...s,
                  credentials: {
                    ...s.credentials,
                    lastResetAt: now,
                    hasPassword: true,
                  },
                  updatedAt: now,
                }
              : s,
          ),
        );
      } else {
        setTeachers(
          teachers.map((t) =>
            t._id === resetTarget.id
              ? {
                  ...t,
                  credentials: {
                    ...t.credentials,
                    lastResetAt: now,
                    hasPassword: true,
                  },
                  updatedAt: now,
                }
              : t,
          ),
        );
      }
      setResetSuccess(true);
      setTimeout(() => {
        setResetTarget(null);
        setResetPasswordValue("");
        setResetSuccess(false);
      }, 2500);
    } catch (error) {
      console.error("Failed to reset password:", error);
      alert(error.message || "Failed to reset password");
    }
  };

  const handleBatchUpgrade = () => {
    setUpgradeNotice("");
    const faculty = faculties.find((f) => f._id === upgradeForm.facultyId);
    if (!faculty) {
      setUpgradeNotice("Please select a faculty.");
      return;
    }

    if (upgradeForm.markAsGraduated) {
      setUpgradeNotice(
        "UI preview: Graduated students are stored as FACULTY + BATCH only (no semester/year). Backend will enforce upgrade order.",
      );
      return;
    }

    if (!upgradeForm.fromLevel || !upgradeForm.toLevel) {
      setUpgradeNotice("Select both current and target level.");
      return;
    }

    const from = Number(upgradeForm.fromLevel);
    const to = Number(upgradeForm.toLevel);
    if (to <= from) {
      setUpgradeNotice("Target level must be higher than current level.");
      return;
    }

    if (to > from + 1) {
      setUpgradeNotice(
        "Upgrade higher semesters/years first. Example: move 5th → 6th before 3rd → 4th. (Backend rule — shown for UI only.)",
      );
      return;
    }

    setStudents(
      students.map((s) => {
        if (
          s.admission.facultyId !== faculty._id ||
          s.enrollment.status !== "active" ||
          s.enrollment.currentLevel !== from
        ) {
          return s;
        }
        const isFinal = to >= faculty.maxLevel;
        if (isFinal) {
          return {
            ...s,
            enrollment: {
              status: "graduated",
              structureType: faculty.structureType,
              currentLevel: null,
              currentLevelLabel: null,
              currentClass: null,
            },
            graduation: {
              facultyId: faculty._id,
              facultyCode: faculty.code,
              facultyName: faculty.name,
              batch: s.admission.batch,
              graduatedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return {
          ...s,
          enrollment: {
            ...s.enrollment,
            currentLevel: to,
            currentLevelLabel: getLevelLabel(faculty.structureType, to),
            currentClass: `${faculty.code} — ${getLevelLabel(faculty.structureType, to)} — Batch ${s.admission.batch}`,
          },
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    setUpgradeNotice(
      `Upgraded ${faculty.code} students from ${getLevelLabel(faculty.structureType, from)} to ${getLevelLabel(faculty.structureType, to)}. (Local UI demo.)`,
    );
  };

  const Field = ({ label, children, optional }) => (
    <div>
      <label className={labelClass}>
        {label}
        {optional && (
          <span className="font-normal text-gray-500"> (optional)</span>
        )}
      </label>
      {children}
    </div>
  );

  const tabs = [
    { id: "students", label: "Students", icon: Users },
    { id: "teachers", label: "Teachers", icon: GraduationCap },
    { id: "upgrade", label: "Batch Upgrade", icon: ArrowUpCircle },
    { id: "subjects", label: "Subjects", icon: BookOpen },
  ];

  const SearchableTeacherSelect = ({ subjectId, currentTeacherId }) => {
    const isOpen = teacherDropdownOpenId === subjectId;
    const q = teacherSearch[subjectId] ?? "";
    const selected = teachers.find((t) => t._id === currentTeacherId);
    const query = q.trim().toLowerCase();

    const filtered = teachers.filter((t) => {
      if (!query) return true;
      const name = teacherFullName(t).toLowerCase();
      return (
        name.includes(query) ||
        t.facultyCode?.toLowerCase().includes(query) ||
        t.profile.phone?.includes(query)
      );
    });

    const openDropdown = () => {
      setTeacherDropdownOpenId(subjectId);
      setTeacherSearch((prev) => ({
        ...prev,
        [subjectId]: prev[subjectId] ?? "",
      }));
    };

    const closeDropdown = () => {
      setTeacherDropdownOpenId(null);
      setTeacherSearch((prev) => ({ ...prev, [subjectId]: "" }));
    };

    const pickTeacher = (teacherId) => {
      handleAssignTeacher(subjectId, teacherId);
      closeDropdown();
    };

    return (
      <div className="relative max-w-md">
        <button
          type="button"
          onClick={() => (isOpen ? closeDropdown() : openDropdown())}
          className={`${selectClass} flex w-full items-center justify-between gap-2 text-left`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span
            className={selected ? "font-medium text-gray-900" : "text-gray-500"}
          >
            {selected ? teacherFullName(selected) : "Select teacher…"}
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              aria-label="Close teacher list"
              onClick={closeDropdown}
            />
            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-100 p-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Search by name, faculty, phone…"
                    value={q}
                    onChange={(e) =>
                      setTeacherSearch((prev) => ({
                        ...prev,
                        [subjectId]: e.target.value,
                      }))
                    }
                    autoFocus
                  />
                </div>
              </div>

              <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
                {filtered.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-gray-500">
                    No teachers found. Add teachers in the Teachers tab first.
                  </li>
                ) : (
                  filtered.map((t) => {
                    const isSelected = t._id === currentTeacherId;
                    return (
                      <li key={t._id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                            isSelected
                              ? "bg-blue-50 text-blue-800"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => pickTeacher(t._id)}
                        >
                          <div>
                            <span className="font-medium">
                              {teacherFullName(t)}
                            </span>
                            {t.facultyCode && (
                              <span className="mt-0.5 block text-xs text-gray-500">
                                {t.facultyCode}
                                {t.profile.phone ? ` · ${t.profile.phone}` : ""}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 shrink-0 text-blue-600" />
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academics</h1>
          <p className="text-gray-600 mt-1">
            Manage faculties, students, teachers, subjects, and batch upgrades
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddFaculty(!showAddFaculty)}
        >
          <Plus className="w-4 h-4 inline mr-1" />
          {showAddFaculty ? "Close" : "Add Faculty"}
        </Button>
      </div>

      {/* Duplicate Faculty Alert */}
      {duplicateAlert && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-4">
          <div className="flex-shrink-0">
            <X className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-grow">
            <h3 className="font-semibold text-red-900">Faculty already added</h3>
            <p className="text-sm text-red-800 mt-1">
              A faculty named <strong>{duplicateAlert.name}</strong> ({duplicateAlert.code}) 
              already exists. Please use a different name.
            </p>
          </div>
          <button
            onClick={() => setDuplicateAlert(null)}
            className="flex-shrink-0 text-red-600 hover:text-red-900"
            aria-label="Close alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Add faculty panel */}
      {showAddFaculty && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Add New Faculty</h2>
          <p className="text-sm text-gray-600">
            Enter faculty name first, then the faculty code. All fields are required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass} htmlFor="faculty-name">
                Faculty Name
              </label>
              <input
                id="faculty-name"
                type="text"
                className={inputClass}
                value={newFacultyForm.name}
                onChange={(e) =>
                  setNewFacultyForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Bachelor of Computer Applications"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="faculty-code">
                Faculty Code
              </label>
              <input
                id="faculty-code"
                type="text"
                className={inputClass}
                value={newFacultyForm.code}
                onChange={(e) =>
                  setNewFacultyForm((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="e.g. BCA"
              />
            </div>
            <Field label="Structure">
              <select
                className={selectClass}
                value={newFacultyForm.structureType}
                onChange={(e) =>
                  setNewFacultyForm((prev) => ({
                    ...prev,
                    structureType: e.target.value,
                    maxLevel: e.target.value === "semester" ? 8 : 5,
                  }))
                }
              >
                <option value="semester">Semester based</option>
                <option value="year">Year based</option>
              </select>
            </Field>
            <Field label="Max levels">
              <select
                className={selectClass}
                value={newFacultyForm.maxLevel}
                onChange={(e) =>
                  setNewFacultyForm((prev) => ({
                    ...prev,
                    maxLevel: Number(e.target.value),
                  }))
                }
              >
                {Array.from(
                  {
                    length:
                      newFacultyForm.structureType === "semester"
                        ? MAX_SEMESTERS
                        : MAX_YEARS,
                  },
                  (_, i) => i + 1,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}{" "}
                    {newFacultyForm.structureType === "semester"
                      ? "semesters"
                      : "years"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" type="button" onClick={handleAddFaculty}>
              Save Faculty
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Faculties overview</h2>
            <p className="text-sm text-gray-600">
              You can still add new faculties here, then manage all existing faculties on the dedicated page.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">
              {faculties.length} faculty{faculties.length === 1 ? "" : "ies"}
            </span>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate("/admin/academics/faculties")}
            >
              See all faculty ›
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === id
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Students tab ─── */}
      {activeTab === "students" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-45">
              <label className={labelClass}>Faculty</label>
              <select
                className={selectClass}
                value={filterFacultyId}
                onChange={(e) => {
                  setFilterFacultyId(e.target.value);
                  setFilterLevel("");
                }}
              >
                <option value="">All faculties</option>
                {faculties.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.code} —{" "}
                    {f.structureType === "semester" ? "Semester" : "Year"} based
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-45">
              <label className={labelClass}>
                {filterFaculty?.structureType === "year" ? "Year" : "Semester"}
              </label>
              <select
                className={selectClass}
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                disabled={!filterFacultyId}
              >
                <option value="">Select an option</option>
                {levelOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditingStudent(null);
                setShowAddStudent(true);
              }}
              disabled={!filterFacultyId || !filterLevel}
              title={(!filterFacultyId || !filterLevel) ? "Select faculty and level/semester first" : ""}
            >
              + Add Student
            </Button>
          </div>

          <StudentProfile
            isOpen={showAddStudent}
            onClose={() => {
              setShowAddStudent(false);
              setEditingStudent(null);
            }}
            onSave={handleSaveStudent}
            faculty={filterFaculty}
            currentLevel={filterLevel}
            student={editingStudent}
          />

          {newStudentCreds && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                  Student Credentials Created
                </h2>
                <p className="text-sm text-gray-600">
                  The student has been saved successfully. Please copy the temporary login credentials below:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">Username</span>
                    <p className="font-mono font-semibold text-gray-800">
                      {newStudentCreds.username}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">Password</span>
                    <p className="font-mono font-semibold text-gray-800">
                      {newStudentCreds.password}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={() => setNewStudentCreds(null)}
                  >
                    Close & Copy Details
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Student list */}
          <div className="space-y-4">
            {!filterFacultyId || !filterLevel ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-600">
                  Please select the respective faculty and sem/year to see the student list.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-600">No students match this filter.</p>
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div
                  key={s._id}
                  className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
                >
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {s.profile.firstName} {s.profile.middleName}{" "}
                        {s.profile.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{s.studentId}</p>
                      {s.enrollment.status === "graduated" ? (
                        <span className="inline-block mt-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                          Graduated — {s.graduation.facultyCode} Batch{" "}
                          {s.graduation.batch}
                        </span>
                      ) : (
                        <span className="inline-block mt-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                          {s.enrollment.currentClass}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-600 space-y-2 flex flex-col items-end justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800">
                          <span className="text-xs font-normal text-gray-500 mr-1">Username:</span>
                          @{s.credentials?.username}
                        </p>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs font-normal text-gray-500">Password:</span>
                          <span className="font-mono font-semibold text-gray-800">
                            {visiblePasswords[s._id] ? (s.credentials?.password || "Not set") : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setVisiblePasswords(prev => ({ ...prev, [s._id]: !prev[s._id] }))}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title={visiblePasswords[s._id] ? "Hide password" : "Show password"}
                          >
                            {visiblePasswords[s._id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          {s.profile?.mobile} · {s.profile?.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingStudent(s);
                            setShowAddStudent(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteStudent(s._id)}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResetTarget({
                              type: "student",
                              id: s._id,
                              name: `${s.profile?.firstName} ${s.profile?.lastName}`,
                            });
                            setResetPasswordValue(generatePassword());
                            setResetSuccess(false);
                          }}
                        >
                          <RefreshCw className="w-3 h-3 inline mr-1 text-blue-600" />
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Teachers tab ─── */}
      {activeTab === "teachers" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => setShowAddTeacher(!showAddTeacher)}
            >
              + Add Teacher
            </Button>
          </div>

          {showAddTeacher && (
            <div className="bg-white border-2 border-blue-200 rounded-lg p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Teacher Profile
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTeacher(false);
                    setTeacherForm(emptyTeacherForm());
                    setNewTeacherCreds(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="First Name">
                  <input
                    className={inputClass}
                    value={teacherForm.firstName}
                    onChange={(e) =>
                      setTeacherForm({
                        ...teacherForm,
                        firstName: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Middle Name" optional>
                  <input
                    className={inputClass}
                    value={teacherForm.middleName}
                    onChange={(e) =>
                      setTeacherForm({
                        ...teacherForm,
                        middleName: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Last Name">
                  <input
                    className={inputClass}
                    value={teacherForm.lastName}
                    onChange={(e) =>
                      setTeacherForm({
                        ...teacherForm,
                        lastName: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Phone No.">
                  <input
                    className={inputClass}
                    value={teacherForm.phone}
                    onChange={(e) =>
                      setTeacherForm({ ...teacherForm, phone: e.target.value })
                    }
                  />
                </Field>
                <Field label="Faculty (optional)">
                  <select
                    className={selectClass}
                    value={teacherForm.facultyId}
                    onChange={(e) =>
                      setTeacherForm({
                        ...teacherForm,
                        facultyId: e.target.value,
                      })
                    }
                  >
                    <option value="">Not linked to faculty</option>
                    {faculties.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.code}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Address">
                    <textarea
                      className={`${inputClass} resize-none`}
                      rows={2}
                      value={teacherForm.address}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          address: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <KeyRound className="w-4 h-4" /> Login credentials
                </p>
                {newTeacherCreds ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="bg-white rounded-lg px-3 py-2 border">
                      <span className="text-gray-500">Username</span>
                      <p className="font-mono font-semibold">
                        {newTeacherCreds.username}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border">
                      <span className="text-gray-500">Password</span>
                      <p className="font-mono font-semibold">
                        {newTeacherCreds.password}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNewTeacherCreds({
                        username: generateUsername(
                          teacherForm.firstName,
                          teacherForm.lastName,
                          "t",
                        ),
                        password: generatePassword(),
                      })
                    }
                  >
                    Preview generated credentials
                  </Button>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowAddTeacher(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreateTeacher}>
                  Save Teacher
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {teachers.map((t) => (
              <div
                key={t._id}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-wrap justify-between gap-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {t.profile.firstName} {t.profile.middleName}{" "}
                    {t.profile.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">{t.profile.address}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {t.profile.phone}
                    {t.facultyCode ? ` · ${t.facultyCode}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    @{t.credentials.username}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setResetTarget({
                        type: "teacher",
                        id: t._id,
                        name: `${t.profile.firstName} ${t.profile.lastName}`,
                      });
                      setResetPasswordValue(generatePassword());
                      setResetSuccess(false);
                    }}
                  >
                    Reset password
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Batch upgrade tab ─── */}
      {activeTab === "upgrade" && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">
            Semester / Year Batch Upgrade
          </h2>
          {/*   <p className="text-sm text-gray-600">
            Upgrade an entire class to the next semester or year. After final level, students move
            to graduated status (faculty + batch only).
          </p> */}

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            Upgrade an entire class to the next semester or year. After final
            level, students move to graduated status (faculty + batch only).
          </div>
          {/*         Higher levels must be upgraded before lower ones can advance (e.g. 7th before 5th). This
            rule will be enforced by the backend — this, for ref !!*/}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Faculty">
              <select
                className={selectClass}
                value={upgradeForm.facultyId}
                onChange={(e) =>
                  setUpgradeForm({
                    ...upgradeForm,
                    facultyId: e.target.value,
                    fromLevel: "",
                    toLevel: "",
                  })
                }
              >
                <option value="">Select faculty</option>
                {faculties.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.code} ({f.structureType})
                  </option>
                ))}
              </select>
            </Field>
            <Field label=" ">
              <label className="flex items-center gap-2 mt-8 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={upgradeForm.markAsGraduated}
                  onChange={(e) =>
                    setUpgradeForm({
                      ...upgradeForm,
                      markAsGraduated: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                Mark selected batch as graduated (faculty + batch only)
              </label>
            </Field>
            {!upgradeForm.markAsGraduated && (
              <>
                <Field
                  label={
                    faculties.find((f) => f._id === upgradeForm.facultyId)
                      ?.structureType === "year"
                      ? "From year"
                      : "From semester"
                  }
                >
                  <select
                    className={selectClass}
                    value={upgradeForm.fromLevel}
                    onChange={(e) =>
                      setUpgradeForm({
                        ...upgradeForm,
                        fromLevel: e.target.value,
                      })
                    }
                    disabled={!upgradeForm.facultyId}
                  >
                    <option value="">Current level</option>
                    {getLevelOptions(
                      faculties.find((f) => f._id === upgradeForm.facultyId),
                    ).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="To level">
                  <select
                    className={selectClass}
                    value={upgradeForm.toLevel}
                    onChange={(e) =>
                      setUpgradeForm({
                        ...upgradeForm,
                        toLevel: e.target.value,
                      })
                    }
                    disabled={!upgradeForm.fromLevel}
                  >
                    <option value="">Target level</option>
                    {getLevelOptions(
                      faculties.find((f) => f._id === upgradeForm.facultyId),
                    )
                      .filter((o) => o.value > Number(upgradeForm.fromLevel))
                      .map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                  </select>
                </Field>
              </>
            )}
          </div>

          {upgradeNotice && (
            <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {upgradeNotice}
            </p>
          )}

          <Button variant="primary" onClick={handleBatchUpgrade}>
            Apply batch upgrade
          </Button>
        </div>
      )}

      {/* ─── Subjects tab ─── */}
      {activeTab === "subjects" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Class subjects
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Add subjects per faculty and level. Assign teachers from your
              teacher list. These subjects are used when marking exam
              attendance.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Faculty">
                <select
                  className={selectClass}
                  value={subjectFacultyId}
                  onChange={(e) => {
                    setSubjectFacultyId(e.target.value);
                    setSubjectLevel("");
                  }}
                >
                  <option value="">Select faculty</option>
                  {faculties.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={
                  subjectFaculty?.structureType === "year" ? "Year" : "Semester"
                }
              >
                <select
                  className={selectClass}
                  value={subjectLevel}
                  onChange={(e) => setSubjectLevel(e.target.value)}
                  disabled={!subjectFacultyId}
                >
                  <option value="">Select level</option>
                  {subjectLevelOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {subjectFacultyId && subjectLevel && (
            <>
              <div className="rounded-lg border-2 border-blue-200 bg-white p-6 space-y-4">
                <h3 className="font-bold text-gray-900">Add subject</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Subject name">
                    <input
                      className={inputClass}
                      value={subjectForm.name}
                      onChange={(e) =>
                        setSubjectForm({ ...subjectForm, name: e.target.value })
                      }
                      placeholder="e.g. Database Management System"
                    />
                  </Field>
                  <Field label="Subject code" optional>
                    <input
                      className={inputClass}
                      value={subjectForm.code}
                      onChange={(e) =>
                        setSubjectForm({ ...subjectForm, code: e.target.value })
                      }
                      placeholder="e.g. BCA301"
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button variant="primary" onClick={handleAddSubject}>
                      Add subject
                    </Button>
                  </div>
                </div>
              </div>

              {classSubjects.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
                  No subjects for this class yet. Add subjects above.
                </div>
              ) : (
                <div className="space-y-4">
                  {classSubjects.map((sub) => (
                    <div
                      key={sub._id}
                      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
                    >
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {sub.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Code: <span className="font-mono">{sub.code}</span>{" "}
                            · {sub.facultyCode} · {sub.levelLabel}
                          </p>
                        </div>
                        {sub.assignedTeacher ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                            {sub.assignedTeacher.fullName}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            No teacher assigned
                          </span>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>
                          Assign / change teacher
                        </label>

                        <SearchableTeacherSelect
                          subjectId={sub._id}
                          currentTeacherId={sub.assignedTeacher?.teacherId}
                        />
                      </div>

                      {sub.assignedTeacher && (
                        <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            Other subjects for this teacher
                          </p>
                          {getTeacherOtherAssignments(
                            sub.assignedTeacher.teacherId,
                            sub._id,
                          ).length === 0 ? (
                            <p className="text-sm text-gray-600">
                              No other subject assignments.
                            </p>
                          ) : (
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                              {getTeacherOtherAssignments(
                                sub.assignedTeacher.teacherId,
                                sub._id,
                              ).map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {(!subjectFacultyId || !subjectLevel) && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-600">
              Select faculty and level to manage subjects.
            </div>
          )}
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                Reset password
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Set a new password for <strong>{resetTarget.name}</strong>
            </p>
            <Field label="New password">
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetPasswordValue(generatePassword())}
                >
                  Generate
                </Button>
              </div>
            </Field>
            {resetSuccess && (
              <p className="text-sm text-green-700 font-medium">
                Password reset recorded (UI demo).
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleResetPassword}>
                Confirm reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
