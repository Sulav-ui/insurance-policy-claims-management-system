import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  login,
  register,
  saveAuth,
  getAuth,
  getToken,
  logout,
  isAuthenticated,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
} from "./authService";

// =====================================
// MOCK DATA
// =====================================

const mockUserAuth: AuthResponse = {
  token: "mock-user-jwt-token",
  tokenType: "Bearer",
  role: "USER",
  email: "user@example.com",
};

const mockAdminAuth: AuthResponse = {
  token: "mock-admin-jwt-token",
  tokenType: "Bearer",
  role: "ADMIN",
  email: "admin@example.com",
};

const loginRequest: LoginRequest = {
  email: "user@example.com",
  password: "Password123",
};

const registerRequest: RegisterRequest = {
  fullName: "John Smith",
  email: "user@example.com",
  password: "Password123",
};

// =====================================
// AUTH SERVICE TESTS
// =====================================

describe("Authentication Service", () => {
  const mockFetch = vi.fn<typeof fetch>();

  beforeEach(() => {
    sessionStorage.clear();
    mockFetch.mockReset();

    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // =====================================
  // LOGIN TESTS
  // =====================================

  describe("login()", () => {
    // 1. Successful user login

    it("should authenticate a user successfully", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockUserAuth), {
          status: 200,
        }),
      );

      const result = await login(loginRequest);

      expect(result).toEqual(mockUserAuth);
    });

    // 2. Successful admin login

    it("should authenticate an admin successfully", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockAdminAuth), {
          status: 200,
        }),
      );

      const result = await login({
        email: "admin@example.com",
        password: "AdminPassword123",
      });

      expect(result.role).toBe("ADMIN");
      expect(result.token).toBe("mock-admin-jwt-token");
    });

    // 3. Verify API request

    it("should send the correct login API request", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockUserAuth), {
          status: 200,
        }),
      );

      await login(loginRequest);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      expect(mockFetch).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginRequest),
      });
    });

    // 4. Invalid credentials

    it("should reject invalid credentials", async () => {
      mockFetch.mockResolvedValue(
        new Response(null, {
          status: 401,
        }),
      );

      await expect(login(loginRequest)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    // 5. Server error

    it("should handle a login server error", async () => {
      mockFetch.mockResolvedValue(
        new Response(null, {
          status: 500,
        }),
      );

      await expect(login(loginRequest)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    // 6. Network failure

    it("should propagate a login network error", async () => {
      mockFetch.mockRejectedValue(new Error("Failed to fetch"));

      await expect(login(loginRequest)).rejects.toThrow("Failed to fetch");
    });
  });

  // =====================================
  // REGISTRATION TESTS
  // =====================================

  describe("register()", () => {
    // 7. Successful registration

    it("should register a new user successfully", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockUserAuth), {
          status: 201,
        }),
      );

      const result = await register(registerRequest);

      expect(result).toEqual(mockUserAuth);
    });

    // 8. Verify registration API request

    it("should send the correct registration API request", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockUserAuth), {
          status: 201,
        }),
      );

      await register(registerRequest);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      expect(mockFetch).toHaveBeenCalledWith("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerRequest),
      });
    });

    // 9. Duplicate email

    it("should reject registration with duplicate email", async () => {
      mockFetch.mockResolvedValue(
        new Response(null, {
          status: 409,
        }),
      );

      await expect(register(registerRequest)).rejects.toThrow(
        "Registration failed",
      );
    });

    // 10. Invalid registration request

    it("should reject an invalid registration request", async () => {
      mockFetch.mockResolvedValue(
        new Response(null, {
          status: 400,
        }),
      );

      await expect(register(registerRequest)).rejects.toThrow(
        "Registration failed",
      );
    });

    // 11. Registration server error

    it("should handle a registration server error", async () => {
      mockFetch.mockResolvedValue(
        new Response(null, {
          status: 500,
        }),
      );

      await expect(register(registerRequest)).rejects.toThrow(
        "Registration failed",
      );
    });

    // 12. Network failure

    it("should propagate a registration network error", async () => {
      mockFetch.mockRejectedValue(new Error("Failed to fetch"));

      await expect(register(registerRequest)).rejects.toThrow(
        "Failed to fetch",
      );
    });
  });

  // =====================================
  // SAVE AUTH TESTS
  // =====================================

  describe("saveAuth()", () => {
    // 13. Save user authentication

    it("should save user authentication in sessionStorage", () => {
      saveAuth(mockUserAuth);

      expect(sessionStorage.getItem("auth")).toBe(JSON.stringify(mockUserAuth));
    });

    // 14. Save admin authentication

    it("should save admin authentication in sessionStorage", () => {
      saveAuth(mockAdminAuth);

      expect(sessionStorage.getItem("auth")).toBe(
        JSON.stringify(mockAdminAuth),
      );
    });

    // 15. Replace existing authentication

    it("should replace previously stored authentication", () => {
      saveAuth(mockUserAuth);
      saveAuth(mockAdminAuth);

      expect(sessionStorage.getItem("auth")).toBe(
        JSON.stringify(mockAdminAuth),
      );
    });
  });

  // =====================================
  // GET AUTH TESTS
  // =====================================

  describe("getAuth()", () => {
    // 16. Retrieve user authentication

    it("should retrieve stored user authentication", () => {
      saveAuth(mockUserAuth);

      expect(getAuth()).toEqual(mockUserAuth);
    });

    // 17. Retrieve admin authentication

    it("should retrieve stored admin authentication", () => {
      saveAuth(mockAdminAuth);

      expect(getAuth()).toEqual(mockAdminAuth);
    });

    // 18. Missing authentication

    it("should return null when authentication is missing", () => {
      expect(getAuth()).toBeNull();
    });

    // 19. Invalid JSON

    it("should return null for corrupted authentication data", () => {
      sessionStorage.setItem("auth", "invalid-json");

      expect(getAuth()).toBeNull();
    });
  });

  // =====================================
  // GET TOKEN TESTS
  // =====================================

  describe("getToken()", () => {
    // 20. Retrieve user token

    it("should return the stored user token", () => {
      saveAuth(mockUserAuth);

      expect(getToken()).toBe("mock-user-jwt-token");
    });

    // 21. Retrieve admin token

    it("should return the stored admin token", () => {
      saveAuth(mockAdminAuth);

      expect(getToken()).toBe("mock-admin-jwt-token");
    });

    // 22. Missing authentication

    it("should return null when no authentication exists", () => {
      expect(getToken()).toBeNull();
    });

    // 23. Authentication without token

    it("should return null when stored data has no token", () => {
      sessionStorage.setItem(
        "auth",
        JSON.stringify({
          email: "user@example.com",
          role: "USER",
        }),
      );

      expect(getToken()).toBeNull();
    });
  });

  // =====================================
  // LOGOUT TESTS
  // =====================================

  describe("logout()", () => {
    // 24. Remove authentication

    it("should remove authentication from sessionStorage", () => {
      saveAuth(mockUserAuth);

      logout();

      expect(sessionStorage.getItem("auth")).toBeNull();
      expect(getAuth()).toBeNull();
      expect(getToken()).toBeNull();
    });

    // 25. Logout without authentication

    it("should handle logout when authentication is missing", () => {
      expect(() => logout()).not.toThrow();

      expect(sessionStorage.getItem("auth")).toBeNull();
    });
  });

  // =====================================
  // AUTHENTICATION STATUS TESTS
  // =====================================

  describe("isAuthenticated()", () => {
    // 26. Authenticated user

    it("should return true when a token exists", () => {
      saveAuth(mockUserAuth);

      expect(isAuthenticated()).toBe(true);
    });

    // 27. Unauthenticated user

    it("should return false when no token exists", () => {
      expect(isAuthenticated()).toBe(false);
    });

    // 28. Authentication after logout

    it("should return false after logout", () => {
      saveAuth(mockAdminAuth);

      expect(isAuthenticated()).toBe(true);

      logout();

      expect(isAuthenticated()).toBe(false);
    });
  });
});
