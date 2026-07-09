const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const DASHBOARD_API_URL = `${API_BASE_URL}/api/dashboard`;

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
    throw new Error(result?.message || "Dashboard API request failed");
  }
  return result ?? { success: true };
};

export const fetchAdminDashboard = async ({ facultyId, level, batch } = {}) => {
  const url = new URL(`${DASHBOARD_API_URL}/admin`);
  if (facultyId) url.searchParams.append("facultyId", facultyId);
  if (level) url.searchParams.append("level", level);
  if (batch) url.searchParams.append("batch", batch);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const fetchTeacherDashboard = async ({ facultyId, level, batch } = {}) => {
  const url = new URL(`${DASHBOARD_API_URL}/teacher`);
  if (facultyId) url.searchParams.append("facultyId", facultyId);
  if (level) url.searchParams.append("level", level);
  if (batch) url.searchParams.append("batch", batch);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};
