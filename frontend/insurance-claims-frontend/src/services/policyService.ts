import type { Policy } from "../types/Policy";
import { apiRequest } from "./apiClient";

const API_URL = "/api/policies";

export type CreatePolicyRequest = Omit<Policy, "id">;

// GET - Fetch all policies
export async function getAllPolicies(): Promise<Policy[]> {
  return apiRequest<Policy[]>(API_URL, {
    method: "GET",
  });
}

// POST - Create a policy
export async function createPolicy(
  policy: CreatePolicyRequest,
): Promise<Policy> {
  return apiRequest<Policy>(API_URL, {
    method: "POST",
    body: JSON.stringify(policy),
  });
}

// DELETE - Delete a policy
export async function deletePolicy(id: number): Promise<void> {
  return apiRequest<void>(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}

// PUT - Update a policy
export async function updatePolicy(
  id: number,
  policy: CreatePolicyRequest,
): Promise<Policy> {
  return apiRequest<Policy>(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(policy),
  });
}
