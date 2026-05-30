const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TEACHERS_API_URL = `${API_BASE_URL}/api/admin/teachers`;

const getHeaders = () => {
  const token = localStorage.getItem("examifyToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  let result = null;
  try {
    result = await response.json();
  } catch (e) {
    result = null;
  }
  if (!response.ok) {
    throw new Error(result?.message || "Teacher API request failed");
  }
  return result ?? { success: true };
};

export const fetchTeachers = async () => {
  const response = await fetch(TEACHERS_API_URL, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const createTeacher = async (teacherData) => {
  const response = await fetch(TEACHERS_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(teacherData),
  });
  return handleResponse(response);
};

export const updateTeacher = async (teacherId, teacherData) => {
  const response = await fetch(`${TEACHERS_API_URL}/${teacherId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(teacherData),
  });
  return handleResponse(response);
};

export const deleteTeacher = async (teacherId) => {
  const response = await fetch(`${TEACHERS_API_URL}/${teacherId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};
