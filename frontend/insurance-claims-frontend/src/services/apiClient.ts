import { getToken } from "./authService";

// =====================================
// CUSTOM API ERROR
// =====================================

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// =====================================
// EXTRACT ERROR MESSAGE
// =====================================

function getErrorMessage(status: number, data: unknown): string {
  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "Access denied. You do not have permission.";
  }

  // Read Spring Boot validation errors
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;

    if (
      body.errors &&
      typeof body.errors === "object" &&
      !Array.isArray(body.errors)
    ) {
      const messages = Object.values(body.errors)
        .filter((value): value is string => typeof value === "string")
        .join(", ");

      if (messages) {
        return messages;
      }
    }

    // Read backend error message
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  }

  switch (status) {
    case 400:
      return "Invalid request. Please check your information.";

    case 404:
      return "The requested record was not found.";

    case 409:
      return "This record already exists or conflicts with existing data.";

    case 500:
      return "Server error. Please try again later.";

    default:
      return `Request failed with status ${status}.`;
  }
}

// =====================================
// HANDLE HTTP RESPONSE
// =====================================

async function handleResponse(
  response: Response,
  requestToken: string | null,
): Promise<void> {
  if (response.ok) {
    return;
  }

  // Expired or invalid JWT
  // Only notify if the failed request belongs
  // to the currently active session.
  if (response.status === 401 && requestToken && getToken() === requestToken) {
    window.dispatchEvent(new Event("auth:session-expired"));
  }

  let errorData: unknown = null;

  try {
    errorData = await response.json();
  } catch {
    // Empty or non-JSON error response
  }

  throw new ApiError(
    getErrorMessage(response.status, errorData),
    response.status,
  );
}

// =====================================
// CENTRALIZED API REQUEST
// =====================================

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  // Preserve any custom headers
  const headers = new Headers(options.headers);

  // Add JSON Content-Type when sending a body
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Attach JWT authentication
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Unable to connect to the server. Please check your connection.",
      0,
    );
  }

  // Handle HTTP errors and JWT expiration
  await handleResponse(response, token);

  // No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Read successful response
  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  // Parse JSON
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      "The server returned an invalid response.",
      response.status,
    );
  }
}
