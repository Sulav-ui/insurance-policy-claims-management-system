import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAllClaims,
  createClaim,
  updateClaim,
  deleteClaim,
  type CreateClaimRequest,
} from "./claimService";

import { apiRequest, ApiError } from "./apiClient";

import type { Claim } from "../types/Claim";

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

const API_URL = "/api/claims";

// =====================================
// MOCK CLAIM DATA
// =====================================

const mockCreateClaim: CreateClaimRequest = {
  claimNumber: "CLM-001",
  claimAmount: 1800,
  claimDate: "2026-11-10",
  description: "Medical expense claim",
  status: "PENDING",
  policyId: 1,
};

const mockClaim: Claim = {
  id: 1,
  ...mockCreateClaim,
};

const mockSecondClaim: Claim = {
  ...mockClaim,
  id: 2,
  claimNumber: "CLM-002",
  claimAmount: 2500,
  policyId: 2,
};

const mockUpdatedRequest: CreateClaimRequest = {
  ...mockCreateClaim,
  claimAmount: 2000,
  status: "APPROVED",
};

const mockUpdatedClaim: Claim = {
  id: 1,
  ...mockUpdatedRequest,
};

// =====================================
// CLAIM SERVICE TESTS
// =====================================

describe("Claim Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // =====================================
  // GET ALL CLAIMS
  // =====================================

  describe("getAllClaims()", () => {
    // 1. Retrieve all claims

    it("should retrieve all claims successfully", async () => {
      const claims = [mockClaim, mockSecondClaim];

      mockApiRequest.mockResolvedValue(claims);

      const result = await getAllClaims();

      expect(result).toEqual(claims);
      expect(result).toHaveLength(2);
    });

    // 2. Correct GET endpoint

    it("should call the correct endpoint using GET", async () => {
      mockApiRequest.mockResolvedValue([]);

      await getAllClaims();

      expect(mockApiRequest).toHaveBeenCalledWith(API_URL, {
        method: "GET",
      });

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    // 3. Empty claim list

    it("should return an empty array when no claims exist", async () => {
      mockApiRequest.mockResolvedValue([]);

      const result = await getAllClaims();

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

      await expect(getAllClaims()).rejects.toBe(error);
    });

    // 5. Server error

    it("should propagate server errors", async () => {
      const error = new ApiError("Server error. Please try again later.", 500);

      mockApiRequest.mockRejectedValue(error);

      await expect(getAllClaims()).rejects.toMatchObject({
        status: 500,
        message: "Server error. Please try again later.",
      });
    });
  });

  // =====================================
  // CREATE CLAIM
  // =====================================

  describe("createClaim()", () => {
    // 6. Successful claim creation

    it("should create a claim successfully", async () => {
      mockApiRequest.mockResolvedValue(undefined);

      const result = await createClaim(mockCreateClaim);

      expect(result).toBeUndefined();
    });

    // 7. Correct POST endpoint

    it("should call the correct endpoint using POST", async () => {
      mockApiRequest.mockResolvedValue(undefined);

      await createClaim(mockCreateClaim);

      expect(mockApiRequest).toHaveBeenCalledWith(API_URL, {
        method: "POST",
        body: JSON.stringify(mockCreateClaim),
      });

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    // 8. Request body serialization

    it("should serialize the claim request correctly", async () => {
      mockApiRequest.mockResolvedValue(undefined);

      await createClaim(mockCreateClaim);

      const requestOptions = mockApiRequest.mock.calls[0][1];

      expect(requestOptions?.body).toBe(JSON.stringify(mockCreateClaim));

      const requestBody = JSON.parse(requestOptions?.body as string);

      expect(requestBody).toEqual(mockCreateClaim);

      expect(requestBody).not.toHaveProperty("id");

      expect(requestBody.policyId).toBe(1);

      expect(requestBody.claimAmount).toBe(1800);
    });

    // 9. Duplicate claim number

    it("should propagate duplicate claim errors", async () => {
      const error = new ApiError("Claim number already exists", 409);

      mockApiRequest.mockRejectedValue(error);

      await expect(createClaim(mockCreateClaim)).rejects.toMatchObject({
        status: 409,
        message: "Claim number already exists",
      });
    });

    // 10. Validation error

    it("should propagate claim validation errors", async () => {
      const error = new ApiError("Claim amount must be positive", 400);

      mockApiRequest.mockRejectedValue(error);

      await expect(createClaim(mockCreateClaim)).rejects.toBe(error);
    });

    // 11. Forbidden creation

    it("should propagate forbidden creation errors", async () => {
      const error = new ApiError(
        "Access denied. You do not have permission.",
        403,
      );

      mockApiRequest.mockRejectedValue(error);

      await expect(createClaim(mockCreateClaim)).rejects.toBe(error);
    });
  });

  // =====================================
  // UPDATE CLAIM
  // =====================================

  describe("updateClaim()", () => {
    // 12. Successful update

    it("should update a claim successfully", async () => {
      mockApiRequest.mockResolvedValue(mockUpdatedClaim);

      const result = await updateClaim(1, mockUpdatedRequest);

      expect(result).toEqual(mockUpdatedClaim);
      expect(result.claimAmount).toBe(2000);
      expect(result.status).toBe("APPROVED");
    });

    // 13. Correct PUT endpoint

    it("should call the correct endpoint using PUT", async () => {
      mockApiRequest.mockResolvedValue(mockUpdatedClaim);

      await updateClaim(1, mockUpdatedRequest);

      expect(mockApiRequest).toHaveBeenCalledWith(`${API_URL}/1`, {
        method: "PUT",
        body: JSON.stringify(mockUpdatedRequest),
      });

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    // 14. Dynamic claim ID

    it("should use the provided claim ID in the endpoint", async () => {
      mockApiRequest.mockResolvedValue({
        ...mockUpdatedClaim,
        id: 25,
      });

      await updateClaim(25, mockUpdatedRequest);

      expect(mockApiRequest).toHaveBeenCalledWith(`${API_URL}/25`, {
        method: "PUT",
        body: JSON.stringify(mockUpdatedRequest),
      });
    });

    // 15. Claim not found

    it("should propagate claim not found errors", async () => {
      const error = new ApiError("The requested record was not found.", 404);

      mockApiRequest.mockRejectedValue(error);

      await expect(updateClaim(999, mockUpdatedRequest)).rejects.toBe(error);
    });

    // 16. Update validation error

    it("should propagate update validation errors", async () => {
      const error = new ApiError("Invalid claim information", 400);

      mockApiRequest.mockRejectedValue(error);

      await expect(updateClaim(1, mockUpdatedRequest)).rejects.toBe(error);
    });
  });

  // =====================================
  // DELETE CLAIM
  // =====================================

  describe("deleteClaim()", () => {
    // 17. Successful deletion

    it("should delete a claim successfully", async () => {
      mockApiRequest.mockResolvedValue(undefined);

      const result = await deleteClaim(1);

      expect(result).toBeUndefined();
    });

    // 18. Correct DELETE endpoint

    it("should call the correct endpoint using DELETE", async () => {
      mockApiRequest.mockResolvedValue(undefined);

      await deleteClaim(15);

      expect(mockApiRequest).toHaveBeenCalledWith(`${API_URL}/15`, {
        method: "DELETE",
      });

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    });

    // 19. Delete nonexistent claim

    it("should propagate errors for nonexistent claims", async () => {
      const error = new ApiError("The requested record was not found.", 404);

      mockApiRequest.mockRejectedValue(error);

      await expect(deleteClaim(999)).rejects.toBe(error);
    });

    // 20. Network failure

    it("should propagate network errors during deletion", async () => {
      const error = new ApiError(
        "Unable to connect to the server. Please check your connection.",
        0,
      );

      mockApiRequest.mockRejectedValue(error);

      await expect(deleteClaim(1)).rejects.toBe(error);
    });
  });
});
