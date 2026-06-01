const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function loginUser({ role, identifier, password }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role, identifier, password }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to login. Please try again.");
  }

  return result;
}

export async function loginAdmin(email, password) {
  return loginUser({ role: "admin", identifier: email, password });
}
