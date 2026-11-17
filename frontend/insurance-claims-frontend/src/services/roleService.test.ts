import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUserRole, isAdmin } from "./roleService";

import { getAuth, type AuthResponse } from "./authService";

// =====================================
// MOCK AUTH SERVICE
// =====================================

vi.mock("./authService", () => ({
  getAuth: vi.fn(),
}));

const mockGetAuth = vi.mocked(getAuth);

// =====================================
// MOCK AUTHENTICATION DATA
// =====================================

const mockAdminAuth: AuthResponse = {
  token: "mock-admin-token",
  tokenType: "Bearer",
  role: "ADMIN",
  email: "admin@example.com",
};

const mockUserAuth: AuthResponse = {
  token: "mock-user-token",
  tokenType: "Bearer",
  role: "USER",
  email: "user@example.com",
};

// =====================================
// ROLE SERVICE TESTS
// =====================================

describe("Role Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // =====================================
  // GET USER ROLE TESTS
  // =====================================

  describe("getUserRole()", () => {
    // 1. Admin role

    it("should return ADMIN for an admin user", () => {
      mockGetAuth.mockReturnValue(mockAdminAuth);

      expect(getUserRole()).toBe("ADMIN");
    });

    // 2. Regular user role

    it("should return USER for a regular user", () => {
      mockGetAuth.mockReturnValue(mockUserAuth);

      expect(getUserRole()).toBe("USER");
    });

    // 3. Unauthenticated user

    it("should return null for an unauthenticated user", () => {
      mockGetAuth.mockReturnValue(null);

      expect(getUserRole()).toBeNull();
    });

    // 4. Missing role

    it("should return null when authentication has no role", () => {
      const incompleteAuth = {
        token: "mock-token",
        tokenType: "Bearer",
        email: "user@example.com",
      } as AuthResponse;

      mockGetAuth.mockReturnValue(incompleteAuth);

      expect(getUserRole()).toBeNull();
    });

    // 5. Retrieve authentication

    it("should retrieve authentication from authService", () => {
      mockGetAuth.mockReturnValue(mockUserAuth);

      getUserRole();

      expect(mockGetAuth).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================
  // IS ADMIN TESTS
  // =====================================

  describe("isAdmin()", () => {
    // 6. Admin privileges

    it("should return true for an admin user", () => {
      mockGetAuth.mockReturnValue(mockAdminAuth);

      expect(isAdmin()).toBe(true);
    });

    // 7. Regular user privileges

    it("should return false for a regular user", () => {
      mockGetAuth.mockReturnValue(mockUserAuth);

      expect(isAdmin()).toBe(false);
    });

    // 8. Unauthenticated user

    it("should return false for an unauthenticated user", () => {
      mockGetAuth.mockReturnValue(null);

      expect(isAdmin()).toBe(false);
    });

    // 9. Missing role

    it("should return false when the user role is missing", () => {
      const incompleteAuth = {
        token: "mock-token",
        tokenType: "Bearer",
        email: "user@example.com",
      } as AuthResponse;

      mockGetAuth.mockReturnValue(incompleteAuth);

      expect(isAdmin()).toBe(false);
    });

    // 10. Authentication changes

    it("should reflect changes in the authenticated user's role", () => {
      mockGetAuth.mockReturnValue(mockAdminAuth);

      expect(getUserRole()).toBe("ADMIN");
      expect(isAdmin()).toBe(true);

      mockGetAuth.mockReturnValue(mockUserAuth);

      expect(getUserRole()).toBe("USER");
      expect(isAdmin()).toBe(false);
    });

    // 11. Permission after logout

    it("should remove admin privileges after logout", () => {
      mockGetAuth.mockReturnValue(mockAdminAuth);

      expect(isAdmin()).toBe(true);

      mockGetAuth.mockReturnValue(null);

      expect(getUserRole()).toBeNull();
      expect(isAdmin()).toBe(false);
    });
  });
});
