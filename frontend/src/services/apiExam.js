const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const EXAMS_API_URL = `${API_BASE_URL}/api/admin/exams`;

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
    throw new Error(result?.message || "Exam API request failed");
  }

  return result ?? { success: true };
};

export const fetchExamSchedules = async ({ facultyId, level, batch } = {}) => {
  const url = new URL(EXAMS_API_URL);
  if (facultyId) url.searchParams.append("facultyId", facultyId);
  if (level) url.searchParams.append("level", level);
  if (batch) url.searchParams.append("batch", batch);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const createExamRoutine = async (exam) => {
  const response = await fetch(EXAMS_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(exam),
  });
  return handleResponse(response);
};

export const updateExamRoutine = async (examId, exam) => {
  const response = await fetch(`${EXAMS_API_URL}/${examId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(exam),
  });
  return handleResponse(response);
};

export const deleteExamRoutine = async (examId) => {
  const response = await fetch(`${EXAMS_API_URL}/${examId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};
