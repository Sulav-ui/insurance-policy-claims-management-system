import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  type CreatePolicyRequest,
} from "./policyService";

import { apiRequest, ApiError } from "./apiClient";

import type { Policy } from "../types/Policy";

// =====================================
// MOCK API CLIENT
// =====================================

vi.mock("./apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apiClient")>();

  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

const mockApiRequest = vi.mocked(apiRequest);

const API_URL = "/api/policies";

// =====================================
// MOCK POLICY DATA
// =====================================

const mockCreatePolicy: CreatePolicyRequest = {
  policyNumber: "POL-001",
  policyHolderName: "John Smith",
  policyType: "HEALTH",
  premiumAmount: 1500,
  startDate: "2026-01-01",
  endDate: "2027-01-01",
  status: "ACTIVE",
};

const mockPolicy: Policy = {
  id: 1,
  ...mockCreatePolicy,
};

const mockSecondPolicy: Policy = {
  ...mockPolicy,
  id: 2,
  policyNumber: "POL-002",
  policyHolderName: "Jane Smith",
};

const mockUpdatedRequest: CreatePolicyRequest = {
  ...mockCreatePolicy,
  premiumAmount: 2000,
  status: "INACTIVE",
};

const mockUpdatedPolicy: Policy = {
  id: 1,
  ...mockUpdatedRequest,
};

// =====================================
// POLICY SERVICE TESTS
// =====================================

describe("Policy Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // =====================================
  // GET ALL POLICIES
  // =====================================

  describe("getAllPolicies()", () => {
    // 1. Retrieve all policies

    it("should retrieve all policies successfully", async () => {
      const policies = [mockPolicy, mockSecondPolicy];

      mockApiRequest.mockResolvedValue(policies);

      const result = await getAllPolicies();

      expect(result).toEqual(policies);
      expect(result).toHaveLength(2);
    });

    // 2. Correct endpoint and method

    it("should call the correct endpoint using GET", async () => {
      mockApiRequest.mockResolvedValue([]);

      await getAllPolicies();

      expect(mockApiRequest).toHaveBeenCalledWith(API_URL, {
        method: "GET",
      });

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    // 3. Empty policy list

    it("should return an empty array when no policies exist", async () => {
      mockApiRequest.mockResolvedValue([]);

      const result = await getAllPolicies();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    // 4. Unauthorized request

    it("should propagate unauthorized errors", async () => {
      const error = new ApiError(
        "Your session has expired. Please log in again.",
        401,
      );

      mockApiRequest.mockRejectedValue(error);

      await expect(getAllPolicies()).rejects.toBe(error);
    });

    // 5. Server error

    it("should propagate server errors", async () => {
      const error = new ApiError("Server error. Please try again later.", 500);

      mockApiRequest.mockRejectedValue(error);

      await expect(getAllPolicies()).rejects.toMatchObject({
        status: 500,
        message: "Server error. Please try again later.",
      });
    });
  });

  // =====================================
  // CREATE POLICY
  // =====================================

  describe("createPolicy()", () => {
    // 6. Successful policy creation

    it("should create a policy successfully", async () => {
      mockApiRequest.mockResolvedValue(mockPolicy);

      const result = await createPolicy(mockCreatePolicy);

      expect(result).toEqual(mockPolicy);
      expect(result.id).toBe(1);
    });

    // 7. Correct POST request

    it("should call the correct endpoint using POST", async () => {
      mockApiRequest.mockResolvedValue(mockPolicy);

      await createPolicy(mockCreatePolicy);

      expect(mockApiRequest).toHaveBeenCalledWith(API_URL, {
        method: "POST",
        body: JSON.stringify(mockCreatePolicy),
      });

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    // 8. Serialize request body

    it("should serialize the policy request correctly", async () => {
      mockApiRequest.mockResolvedValue(mockPolicy);

      await createPolicy(mockCreatePolicy);

      const requestOptions = mockApiRequest.mock.calls[0][1];

      expect(requestOptions?.body).toBe(JSON.stringify(mockCreatePolicy));

      const requestBody = JSON.parse(requestOptions?.body as string);

      expect(requestBody).toEqual(mockCreatePolicy);
      expect(requestBody).not.toHaveProperty("id");
    });

    // 9. Duplicate policy number

    it("should propagate duplicate policy errors", async () => {
      const error = new ApiError("Policy number already exists", 409);

      mockApiRequest.mockRejectedValue(error);

      await expect(createPolicy(mockCreatePolicy)).rejects.toMatchObject({
        status: 409,
        message: "Policy number already exists",
      });
    });

    // 10. Validation error

    it("should propagate policy validation errors", async () => {
      const error = new ApiError("Premium amount must be positive", 400);

      mockApiRequest.mockRejectedValue(error);

      await expect(createPolicy(mockCreatePolicy)).rejects.toBe(error);
    });

    // 11. Forbidden request

    it("should propagate forbidden creation errors", async () => {
      const error = new ApiError(
        "Access denied. You do not have permission.",
        403,
      );

      mockApiRequest.mockRejectedValue(error);

      await expect(createPolicy(mockCreatePolicy)).rejects.toBe(error);
    });
  });

  // =====================================
  // UPDATE POLICY
  // =====================================

  describe("updatePolicy()", () => {
    // 12. Successful update

    it("should update a policy successfully", async () => {
      mockApiRequest.mockResolvedValue(mockUpdatedPolicy);

      const result = await updatePolicy(1, mockUpdatedRequest);

      expect(result).toEqual(mockUpdatedPolicy);
      expect(result.premiumAmount).toBe(2000);
      expect(result.status).toBe("INACTIVE");
    });

    // 13. Correct PUT request

    it("should call the correct endpoint using PUT", async () => {
      mockApiRequest.mockResolvedValue(mockUpdatedPolicy);

      await updatePolicy(1, mockUpdatedRequest);

      expect(mockApiRequest).toHaveBeenCalledWith(`${API_URL}/1`, {
        method: "PUT",
        body: JSON.stringify(mockUpdatedRequest),
      });

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    // 14. Dynamic policy ID

    it("should use the provided policy ID in the endpoint", async () => {
      mockApiRequest.mockResolvedValue({
        ...mockUpdatedPolicy,
        id: 25,
      });

      await updatePolicy(25, mockUpdatedRequest);

      expect(mockApiRequest).toHaveBeenCalledWith(`${API_URL}/25`, {
        method: "PUT",
        body: JSON.stringify(mockUpdatedRequest),
      });
    });

    // 15. Policy not found

    it("should propagate policy not found errors", async () => {
      const error = new ApiError("The requested record was not found.", 404);

      mockApiRequest.mockRejectedValue(error);

      await expect(updatePolicy(999, mockUpdatedRequest)).rejects.toBe(error);
    });

    // 16. Update validation error

    it("should propagate update validation errors", async () => {
      const error = new ApiError("Invalid policy information", 400);

      mockApiRequest.mockRejectedValue(error);

      await expect(updatePolicy(1, mockUpdatedRequest)).rejects.toBe(error);
    });
  });

  // =====================================
  // DELETE POLICY
  // =====================================

  describe("deletePolicy()", () => {
    // 17. Successful deletion

    it("should delete a policy successfully", async () => {
      mockApiRequest.mockResolvedValue(undefined);

      const result = await deletePolicy(1);

      expect(result).toBeUndefined();
    });

    // 18. Correct DELETE request

    it("should call the correct endpoint using DELETE", async () => {
      mockApiRequest.mockResolvedValue(undefined);

      await deletePolicy(15);

      expect(mockApiRequest).toHaveBeenCalledWith(`${API_URL}/15`, {
        method: "DELETE",
      });

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    // 19. Delete nonexistent policy

    it("should propagate errors for nonexistent policies", async () => {
      const error = new ApiError("The requested record was not found.", 404);

      mockApiRequest.mockRejectedValue(error);

      await expect(deletePolicy(999)).rejects.toBe(error);
    });

    // 20. Network failure

    it("should propagate network errors during deletion", async () => {
      const error = new ApiError(
        "Unable to connect to the server. Please check your connection.",
        0,
      );

      mockApiRequest.mockRejectedValue(error);

      await expect(deletePolicy(1)).rejects.toBe(error);
    });
  });
});
