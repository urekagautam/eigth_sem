const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const ATTENDANCE_API_URL = `${API_BASE_URL}/api/attendance`;

const getHeaders = () => {
  const token = localStorage.getItem("examifyToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || "Attendance request failed");
  }
  return result ?? { success: true };
};

export const fetchTeacherAttendanceContext = async () => {
  const response = await fetch(`${ATTENDANCE_API_URL}/teacher/context`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const fetchTeacherAttendanceClass = async (classOfferingId) => {
  const response = await fetch(
    `${ATTENDANCE_API_URL}/teacher/classes/${classOfferingId}`,
    { method: "GET", headers: getHeaders() },
  );
  return handleResponse(response);
};

export const fetchTeacherAttendanceRecords = async (classOfferingId, date) => {
  const url = new URL(`${ATTENDANCE_API_URL}/teacher/classes/${classOfferingId}/records`);
  if (date) url.searchParams.set("date", date);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const saveTeacherAttendance = async (classOfferingId, date, records) => {
  const response = await fetch(
    `${ATTENDANCE_API_URL}/teacher/classes/${classOfferingId}/records`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ date, records }),
    },
  );
  return handleResponse(response);
};

export const deleteTeacherAttendanceRecord = async (
  classOfferingId,
  attendanceId,
) => {
  const response = await fetch(
    `${ATTENDANCE_API_URL}/teacher/classes/${classOfferingId}/records/${attendanceId}`,
    { method: "DELETE", headers: getHeaders() },
  );
  return handleResponse(response);
};

export const fetchAdminGeneralAttendance = async (filters = {}) => {
  const url = new URL(`${ATTENDANCE_API_URL}/admin/general`);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};
