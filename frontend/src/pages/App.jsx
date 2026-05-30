import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import StudentLayout from "../layouts/StudentLayout";
import Login from "./auth/Login";
import Dashboard from "./admin/Dashboard";
import Academics from "./admin/Academics";
import Exams from "./admin/Exams";
import Notices from "./admin/Notices";
import Attendance from "./admin/Attendance";
import StudentPerformance from "./admin/StudentPerformance";
import ChangePassword from "./admin/ChangePassword";
import FacultyManagement from "./admin/academics/FacultyManagement";
import NotFoundPage from "./NotFoundPage";
import TeacherDashboard from "./teacher/Dashboard";
import TeacherAttendance from "./teacher/Attendance";
import TeacherMarks from "./teacher/Marks";
import TeacherResources from "./teacher/Resources";
import StudentDashboard from "./student/Dashboard";
import StudentNotices from "./student/Notices";
import StudentAcademics from "./student/Academics";
import StudentAttendance from "./student/Attendance";
import StudentResources from "./student/Resources";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="academics" element={<Academics />} />
          <Route path="academics/faculties" element={<FacultyManagement />} />
          <Route path="exams" element={<Exams />} />
          <Route path="notices" element={<Notices />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="student-performance" element={<StudentPerformance />} />
          <Route
            path="student-performance/:studentId"
            element={<StudentPerformance />}
          />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="marks" element={<TeacherMarks />} />
          <Route path="resources" element={<TeacherResources />} />
        </Route>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="notices" element={<StudentNotices />} />
          <Route path="academics" element={<StudentAcademics />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="resources" element={<StudentResources />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
