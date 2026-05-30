const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const FACULTIES_API_URL = `${API_BASE_URL}/api/admin/faculties`;

const handleResponse = async (response) => {
  let result = null;
  try {
    result = await response.json();
  } catch (e) {
    result = null;
  }
  if (!response.ok) {
    throw new Error(result?.message || "Faculty API request failed");
  }
  // Some endpoints (DELETE) may return no JSON body — normalize to a success object
  return result ?? { success: true };
};

export const fetchFaculties = async () => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(FACULTIES_API_URL, {
    method: "GET",
    headers,
  });
  return handleResponse(response);
};

export const fetchFaculty = async (facultyId) => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${FACULTIES_API_URL}/${facultyId}`, {
    method: "GET",
    headers,
  });
  return handleResponse(response);
};

export const createFaculty = async (faculty) => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(FACULTIES_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(faculty),
  });
  return handleResponse(response);
};

export const updateFaculty = async (facultyId, faculty) => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${FACULTIES_API_URL}/${facultyId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(faculty),
  });
  return handleResponse(response);
};

export const deleteFaculty = async (facultyId) => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${FACULTIES_API_URL}/${facultyId}`, {
    method: "DELETE",
    headers,
  });
  return handleResponse(response);
};
