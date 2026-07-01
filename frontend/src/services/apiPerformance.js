const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const PERFORMANCE_API_URL = `${API_BASE_URL}/api/admin/performance`;

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
    throw new Error(result?.message || "Performance API request failed");
  }
  return result ?? { success: true };
};

export const fetchPerformanceLedger = async ({
  facultyId,
  level,
  batch,
  examId,
} = {}) => {
  const url = new URL(PERFORMANCE_API_URL);
  if (facultyId) url.searchParams.append("facultyId", facultyId);
  if (level) url.searchParams.append("level", level);
  if (batch) url.searchParams.append("batch", batch);
  if (examId) url.searchParams.append("examId", examId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const fetchStudentPerformanceDetail = async (studentId) => {
  const response = await fetch(`${PERFORMANCE_API_URL}/students/${studentId}`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};
