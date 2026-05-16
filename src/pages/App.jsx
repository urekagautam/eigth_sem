import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AdminLayout from "../layouts/AdminLayout"
import Dashboard from "./admin/Dashboard"
import Academics from "./admin/Academics"
import Exams from "./admin/Exams"
import Notices from "./admin/Notices"
import Attendance from "./admin/Attendance"
import StudentPerformance from "./admin/StudentPerformance"
import ChangePassword from "./admin/ChangePassword"
import NotFoundPage from "./NotFoundPage"

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
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
