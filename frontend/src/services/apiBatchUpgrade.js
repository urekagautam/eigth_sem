const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const BATCH_UPGRADE_API_URL = `${API_BASE_URL}/api/admin/students/batch-upgrade`;

const handleResponse = async (response) => {
  let result = null;
  try {
    result = await response.json();
  } catch (e) {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.message || "Batch upgrade request failed");
  }

  return result ?? { success: true };
};

export const batchUpgradeStudents = async (payload) => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(BATCH_UPGRADE_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};
