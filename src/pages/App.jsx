import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import Dashboard from "./admin/Dashboard";
import Academics from "./admin/Academics";
import Exams from "./admin/Exams";
import Notices from "./admin/Notices";
import Attendance from "./admin/Attendance";
import StudentPerformance from "./admin/StudentPerformance";
import ChangePassword from "./admin/ChangePassword";
import NotFoundPage from "./NotFoundPage";
import TeacherDashboard from "./teacher/Dashboard";
import TeacherAttendance from "./teacher/Attendance";
import TeacherMarks from "./teacher/Marks";
import TeacherResources from "./teacher/Resources";
import Login from "./auth/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="academics" element={<Academics />} />
          <Route path="exams" element={<Exams />} />
          <Route path="notices" element={<Notices />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="student-performance" element={<StudentPerformance />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="marks" element={<TeacherMarks />} />
          <Route path="resources" element={<TeacherResources />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
