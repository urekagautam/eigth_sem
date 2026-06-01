const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TEACHER_MARKS_API_URL = `${API_BASE_URL}/api/teacher/marks`;

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
    throw new Error(result?.message || "Teacher marks request failed");
  }
  return result ?? { success: true };
};

export const fetchTeacherMarksContext = async () => {
  const response = await fetch(`${TEACHER_MARKS_API_URL}/context`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const fetchTeacherMarksClass = async (classOfferingId) => {
  const response = await fetch(
    `${TEACHER_MARKS_API_URL}/classes/${classOfferingId}`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );
  return handleResponse(response);
};

export const fetchTeacherExamMarks = async (classOfferingId, examId) => {
  const response = await fetch(
    `${TEACHER_MARKS_API_URL}/classes/${classOfferingId}/exams/${examId}/marks`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );
  return handleResponse(response);
};

export const saveTeacherExamMarks = async (classOfferingId, examId, marks) => {
  const response = await fetch(
    `${TEACHER_MARKS_API_URL}/classes/${classOfferingId}/exams/${examId}/marks`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ marks }),
    },
  );
  return handleResponse(response);
};

export const deleteTeacherExamMark = async (
  classOfferingId,
  examId,
  studentId,
) => {
  const response = await fetch(
    `${TEACHER_MARKS_API_URL}/classes/${classOfferingId}/exams/${examId}/marks/${studentId}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    },
  );
  return handleResponse(response);
};
