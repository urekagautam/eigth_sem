const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const QUIZ_API_URL = `${API_BASE_URL}/api/quizzes`;

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
    throw new Error(result?.message || "Quiz request failed");
  }
  return result ?? { success: true };
};

export const fetchTeacherQuizContext = async () => {
  const response = await fetch(`${QUIZ_API_URL}/teacher/context`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const fetchTeacherQuizClass = async (classOfferingId) => {
  const response = await fetch(`${QUIZ_API_URL}/teacher/classes/${classOfferingId}`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const saveTeacherQuizDraft = async (classOfferingId, quiz) => {
  const response = await fetch(`${QUIZ_API_URL}/teacher/classes/${classOfferingId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(quiz),
  });
  return handleResponse(response);
};

export const sendTeacherQuizToAdmin = async (classOfferingId, quiz) => {
  const response = await fetch(
    `${QUIZ_API_URL}/teacher/classes/${classOfferingId}/send`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(quiz),
    },
  );
  return handleResponse(response);
};

export const fetchAdminQuizzes = async () => {
  const response = await fetch(`${QUIZ_API_URL}/admin`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const publishAdminQuiz = async (quizId, schedule) => {
  const response = await fetch(`${QUIZ_API_URL}/admin/${quizId}/publish`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(schedule),
  });
  return handleResponse(response);
};

export const fetchStudentQuizzes = async () => {
  const response = await fetch(`${QUIZ_API_URL}/student`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const fetchStudentQuiz = async (quizId) => {
  const response = await fetch(`${QUIZ_API_URL}/student/${quizId}`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const saveStudentQuizProgress = async (quizId, answers) => {
  const response = await fetch(`${QUIZ_API_URL}/student/${quizId}/progress`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ answers }),
  });
  return handleResponse(response);
};

export const submitStudentQuiz = async (quizId, answers) => {
  const response = await fetch(`${QUIZ_API_URL}/student/${quizId}/submit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ answers }),
  });
  return handleResponse(response);
};
