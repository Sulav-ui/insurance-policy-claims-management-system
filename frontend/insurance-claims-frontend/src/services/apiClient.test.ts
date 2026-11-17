import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest, ApiError } from "./apiClient";
import { getToken } from "./authService";

// =====================================
// MOCK AUTHENTICATION SERVICE
// =====================================

vi.mock("./authService", () => ({
  getToken: vi.fn(),
}));

const mockGetToken = vi.mocked(getToken);
const mockFetch = vi.fn<typeof fetch>();

const API_URL = "/api/policies";
const MOCK_TOKEN = "mock-jwt-token";

const mockPolicy = {
  id: 1,
  policyNumber: "POL-001",
  policyHolderName: "John Smith",
  status: "ACTIVE",
};

// =====================================
// HELPER FUNCTION
// =====================================

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// =====================================
// API CLIENT TESTS
// =====================================

describe("API Client", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockGetToken.mockReturnValue(MOCK_TOKEN);

    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // =====================================
  // API ERROR CLASS
  // =====================================

  describe("ApiError", () => {
    // 1
    it("should create a custom API error", () => {
      const error = new ApiError("Request failed", 400);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.name).toBe("ApiError");
      expect(error.message).toBe("Request failed");
      expect(error.status).toBe(400);
    });
  });

  // =====================================
  // SUCCESSFUL HTTP REQUESTS
  // =====================================

  describe("Successful HTTP Requests", () => {
    // 2
    it("should perform a successful GET request", async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockPolicy));

      const result = await apiRequest(API_URL);

      expect(result).toEqual(mockPolicy);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      expect(mockFetch).toHaveBeenCalledWith(API_URL, expect.any(Object));
    });

    // 3
    it("should perform a successful POST request", async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockPolicy, 201));

      const result = await apiRequest(API_URL, {
        method: "POST",
        body: JSON.stringify(mockPolicy),
      });

      expect(result).toEqual(mockPolicy);

      expect(mockFetch).toHaveBeenCalledWith(
        API_URL,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(mockPolicy),
        }),
      );
    });

    // 4
    it("should perform a successful PUT request", async () => {
      const updatedPolicy = {
        ...mockPolicy,
        status: "INACTIVE",
      };

      mockFetch.mockResolvedValue(jsonResponse(updatedPolicy));

      const result = await apiRequest(`${API_URL}/1`, {
        method: "PUT",
        body: JSON.stringify(updatedPolicy),
      });

      expect(result).toEqual(updatedPolicy);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/1`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(updatedPolicy),
        }),
      );
    });

    // 5
    it("should perform a successful DELETE request", async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

      const result = await apiRequest<void>(`${API_URL}/1`, {
        method: "DELETE",
      });

      expect(result).toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/1`,
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    // 6
    it("should return an array of policies", async () => {
      const policies = [
        mockPolicy,
        {
          ...mockPolicy,
          id: 2,
          policyNumber: "POL-002",
        },
      ];

      mockFetch.mockResolvedValue(jsonResponse(policies));

      const result = await apiRequest<(typeof mockPolicy)[]>(API_URL);

      expect(result).toHaveLength(2);
      expect(result).toEqual(policies);
    });
  });

  // =====================================
  // REQUEST HEADERS
  // =====================================

  describe("Request Headers", () => {
    // 7
    it("should attach the JWT authorization header", async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockPolicy));

      await apiRequest(API_URL);

      const headers = new Headers(mockFetch.mock.calls[0][1]?.headers);

      expect(headers.get("Authorization")).toBe(`Bearer ${MOCK_TOKEN}`);
    });

    // 8
    it("should not attach authorization without a token", async () => {
      mockGetToken.mockReturnValue(null);

      mockFetch.mockResolvedValue(jsonResponse(mockPolicy));

      await apiRequest(API_URL);

      const headers = new Headers(mockFetch.mock.calls[0][1]?.headers);

      expect(headers.has("Authorization")).toBe(false);
    });

    // 9
    it("should add JSON content type when a body exists", async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockPolicy));

      await apiRequest(API_URL, {
        method: "POST",
        body: JSON.stringify(mockPolicy),
      });

      const headers = new Headers(mockFetch.mock.calls[0][1]?.headers);

      expect(headers.get("Content-Type")).toBe("application/json");
    });

    // 10
    it("should not add content type without a body", async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockPolicy));

      await apiRequest(API_URL);

      const headers = new Headers(mockFetch.mock.calls[0][1]?.headers);

      expect(headers.has("Content-Type")).toBe(false);
    });

    // 11
    it("should preserve a custom content type", async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockPolicy));

      await apiRequest(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: "sample data",
      });

      const headers = new Headers(mockFetch.mock.calls[0][1]?.headers);

      expect(headers.get("Content-Type")).toBe("text/plain");
    });

    // 12
    it("should preserve custom request headers", async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockPolicy));

      await apiRequest(API_URL, {
        headers: {
          "X-Request-ID": "request-123",
          Accept: "application/json",
        },
      });

      const headers = new Headers(mockFetch.mock.calls[0][1]?.headers);

      expect(headers.get("X-Request-ID")).toBe("request-123");

      expect(headers.get("Accept")).toBe("application/json");
    });

    // 13
    it("should use the current JWT over a custom authorization header", async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockPolicy));

      await apiRequest(API_URL, {
        headers: {
          Authorization: "Bearer old-token",
        },
      });

      const headers = new Headers(mockFetch.mock.calls[0][1]?.headers);

      expect(headers.get("Authorization")).toBe(`Bearer ${MOCK_TOKEN}`);
    });
  });

  // =====================================
  // RESPONSE PARSING
  // =====================================

  describe("Response Parsing", () => {
    // 14
    it("should return undefined for a 204 response", async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

      await expect(apiRequest<void>(API_URL)).resolves.toBeUndefined();
    });

    // 15
    it("should return undefined for an empty successful response", async () => {
      mockFetch.mockResolvedValue(new Response("", { status: 200 }));

      await expect(apiRequest<void>(API_URL)).resolves.toBeUndefined();
    });

    // 16
    it("should parse a valid JSON response", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: true }));

      const result = await apiRequest<{
        success: boolean;
      }>(API_URL);

      expect(result.success).toBe(true);
    });

    // 17
    it("should reject invalid JSON responses", async () => {
      mockFetch.mockResolvedValue(
        new Response("invalid-json", {
          status: 200,
        }),
      );

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        name: "ApiError",
        message: "The server returned an invalid response.",
        status: 200,
      });
    });

    // 18
    it("should support JSON null responses", async () => {
      mockFetch.mockResolvedValue(jsonResponse(null));

      await expect(apiRequest(API_URL)).resolves.toBeNull();
    });
  });

  // =====================================
  // HTTP ERROR HANDLING
  // =====================================

  describe("HTTP Error Handling", () => {
    // 19
    it("should handle unauthorized requests", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 401));

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        name: "ApiError",
        status: 401,
        message: "Your session has expired. Please log in again.",
      });
    });

    // 20
    it("should handle forbidden requests", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 403));

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        status: 403,
        message: "Access denied. You do not have permission.",
      });
    });

    // 21
    it("should handle bad requests", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 400));

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        status: 400,
        message: "Invalid request. Please check your information.",
      });
    });

    // 22
    it("should handle records not found", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 404));

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        status: 404,
        message: "The requested record was not found.",
      });
    });

    // 23
    it("should handle conflicting records", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 409));

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        status: 409,
        message: "This record already exists or conflicts with existing data.",
      });
    });

    // 24
    it("should handle internal server errors", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 500));

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        status: 500,
        message: "Server error. Please try again later.",
      });
    });

    // 25
    it("should handle other HTTP status codes", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 503));

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        status: 503,
        message: "Request failed with status 503.",
      });
    });
  });

  // =====================================
  // BACKEND VALIDATION ERRORS
  // =====================================

  describe("Backend Validation Errors", () => {
    // 26
    it("should extract multiple backend validation errors", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          {
            errors: {
              policyNumber: "Policy number is required",
              premiumAmount: "Premium must be positive",
            },
          },
          400,
        ),
      );

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        status: 400,
        message: "Policy number is required, Premium must be positive",
      });
    });

    // 27
    it("should filter out non-string validation errors", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          {
            errors: {
              policyNumber: "Policy number is required",
              premiumAmount: 123,
              status: null,
              active: false,
            },
          },
          400,
        ),
      );

      await expect(apiRequest(API_URL)).rejects.toThrow(
        "Policy number is required",
      );
    });

    // 28
    it("should fall back when validation errors are empty", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ errors: {} }, 400));

      await expect(apiRequest(API_URL)).rejects.toThrow(
        "Invalid request. Please check your information.",
      );
    });

    // 29
    it("should ignore validation errors stored as an array", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          {
            errors: ["Invalid policy"],
            message: "Backend validation failed",
          },
          400,
        ),
      );

      await expect(apiRequest(API_URL)).rejects.toThrow(
        "Backend validation failed",
      );
    });

    // 30
    it("should ignore validation errors that are not objects", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          {
            errors: "Invalid information",
            message: "Invalid policy data",
          },
          400,
        ),
      );

      await expect(apiRequest(API_URL)).rejects.toThrow("Invalid policy data");
    });

    // 31
    it("should extract the backend error message", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          {
            message: "Policy number already exists",
          },
          409,
        ),
      );

      await expect(apiRequest(API_URL)).rejects.toThrow(
        "Policy number already exists",
      );
    });

    // 32
    it("should ignore blank backend error messages", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: "   " }, 404));

      await expect(apiRequest(API_URL)).rejects.toThrow(
        "The requested record was not found.",
      );
    });

    // 33
    it("should handle primitive error response data", async () => {
      mockFetch.mockResolvedValue(jsonResponse("Something went wrong", 500));

      await expect(apiRequest(API_URL)).rejects.toThrow(
        "Server error. Please try again later.",
      );
    });

    // 34
    it("should handle empty error responses", async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 400 }));

      await expect(apiRequest(API_URL)).rejects.toThrow(
        "Invalid request. Please check your information.",
      );
    });

    // 35
    it("should handle non-JSON error responses", async () => {
      mockFetch.mockResolvedValue(
        new Response("<html>Server Error</html>", {
          status: 500,
        }),
      );

      await expect(apiRequest(API_URL)).rejects.toThrow(
        "Server error. Please try again later.",
      );
    });
  });

  // =====================================
  // SESSION EXPIRATION
  // =====================================

  describe("Session Expiration", () => {
    // 36
    it("should dispatch a session expired event for the active token", async () => {
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");

      mockFetch.mockResolvedValue(jsonResponse({}, 401));

      await expect(apiRequest(API_URL)).rejects.toBeInstanceOf(ApiError);

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "auth:session-expired",
        }),
      );
    });

    // 37
    it("should not dispatch session expiration without a token", async () => {
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");

      mockGetToken.mockReturnValue(null);

      mockFetch.mockResolvedValue(jsonResponse({}, 401));

      await expect(apiRequest(API_URL)).rejects.toBeInstanceOf(ApiError);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    // 38
    it("should not expire a new session because of an old request", async () => {
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");

      mockGetToken
        .mockReturnValueOnce("old-token")
        .mockReturnValue("new-token");

      mockFetch.mockResolvedValue(jsonResponse({}, 401));

      await expect(apiRequest(API_URL)).rejects.toBeInstanceOf(ApiError);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    // 39
    it("should not expire the session for forbidden requests", async () => {
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");

      mockFetch.mockResolvedValue(jsonResponse({}, 403));

      await expect(apiRequest(API_URL)).rejects.toBeInstanceOf(ApiError);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  // =====================================
  // NETWORK FAILURE
  // =====================================

  describe("Network Failure", () => {
    // 40
    it("should convert network failures into API errors", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(apiRequest(API_URL)).rejects.toMatchObject({
        name: "ApiError",
        status: 0,
        message:
          "Unable to connect to the server. Please check your connection.",
      });
    });
  });
});
