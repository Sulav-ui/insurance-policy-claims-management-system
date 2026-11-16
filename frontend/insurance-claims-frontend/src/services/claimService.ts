import type { Claim } from "../types/Claim";
import { apiRequest } from "./apiClient";

const API_URL = "/api/claims";

export type CreateClaimRequest = Omit<Claim, "id">;

// GET - Fetch all claims
export async function getAllClaims(): Promise<Claim[]> {
  return apiRequest<Claim[]>(API_URL, {
    method: "GET",
  });
}

// POST - Create a claim
export async function createClaim(claim: CreateClaimRequest): Promise<void> {
  await apiRequest<void>(API_URL, {
    method: "POST",
    body: JSON.stringify(claim),
  });
}

// DELETE - Delete a claim
export async function deleteClaim(id: number): Promise<void> {
  await apiRequest<void>(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}

// PUT - Update a claim
export async function updateClaim(
  id: number,
  claim: CreateClaimRequest,
): Promise<Claim> {
  return apiRequest<Claim>(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(claim),
  });
}
