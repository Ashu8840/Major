const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const buildHeaders = (options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
};

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJSON = contentType.includes("application/json");
  const payload = isJSON ? await response.json() : null;

  if (!response.ok) {
    throw Object.assign(new Error(payload?.message || "Request failed"), {
      status: response.status,
      payload,
    });
  }

  return payload;
};

export const apiClient = {
  async get(path, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      method: "GET",
      headers: buildHeaders(options),
    });
    return handleResponse(response);
  },

  async post(path, body, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      method: "POST",
      headers: buildHeaders(options),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async put(path, body, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      method: "PUT",
      headers: buildHeaders(options),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async patch(path, body, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      method: "PATCH",
      headers: buildHeaders(options),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async delete(path, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      method: "DELETE",
      headers: buildHeaders(options),
    });
    return handleResponse(response);
  },
};
