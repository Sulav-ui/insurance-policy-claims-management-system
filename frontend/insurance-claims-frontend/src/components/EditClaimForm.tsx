import { useEffect, useState } from "react";
import {
  updateClaim,
  getAllClaims,
  type CreateClaimRequest,
} from "../services/claimService";
import type { Claim } from "../types/Claim";
import { getAllPolicies } from "../services/policyService";
import type { Policy } from "../types/Policy";

type EditClaimFormProps = {
  claim: Claim;
  onUpdated: () => void;
  onCancel: () => void;
};

type FieldName =
  | "claimNumber"
  | "claimAmount"
  | "claimDate"
  | "description"
  | "policyId";

type FieldErrors = Partial<Record<FieldName, string>>;

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function EditClaimForm({ claim, onUpdated, onCancel }: EditClaimFormProps) {
  const [formData, setFormData] = useState<CreateClaimRequest>({
    claimNumber: claim.claimNumber,
    claimAmount: claim.claimAmount,
    claimDate: claim.claimDate,
    description: claim.description,
    status: claim.status,
    policyId: claim.policyId,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policiesError, setPoliciesError] = useState("");
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  const selectedPolicy = policies.find(
    (policy) => policy.id === Number(formData.policyId),
  );

  useEffect(() => {
    let active = true;

    async function fetchPolicies() {
      try {
        const data = await getAllPolicies();

        if (active) {
          setPolicies(data);
          setPoliciesError("");
        }
      } catch {
        if (active) {
          setPoliciesError("Failed to load policies.");
        }
      } finally {
        if (active) {
          setLoadingPolicies(false);
        }
      }
    }

    fetchPolicies();

    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof CreateClaimRequest>(
    field: K,
    value: CreateClaimRequest[K],
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFieldErrors((previous) => {
      const updated = { ...previous };
      delete updated[field as FieldName];
      return updated;
    });

    setError("");
  }

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {};

    const claimNumber = formData.claimNumber.trim();
    const description = formData.description.trim();

    if (!claimNumber) {
      errors.claimNumber = "Claim number is required.";
    } else if (claimNumber.length < 3 || claimNumber.length > 50) {
      errors.claimNumber =
        "Claim number must contain between 3 and 50 characters.";
    }

    if (!Number.isFinite(formData.claimAmount) || formData.claimAmount <= 0) {
      errors.claimAmount = "Claim amount must be greater than $0.";
    } else if (
      !/^\d+(\.\d{1,2})?$/.test(String(formData.claimAmount)) ||
      formData.claimAmount >= 10000000000000
    ) {
      errors.claimAmount =
        "Amount must have at most 13 integer digits and 2 decimal places.";
    }

    if (!formData.claimDate) {
      errors.claimDate = "Please select a claim date.";
    } else if (
      !/^\d{4}-\d{2}-\d{2}$/.test(formData.claimDate) ||
      Number.isNaN(new Date(`${formData.claimDate}T00:00:00`).getTime())
    ) {
      errors.claimDate = "Please enter a valid claim date.";
    } else if (formData.claimDate > getToday()) {
      errors.claimDate = "Claim date cannot be in the future.";
    }

    if (!description) {
      errors.description = "Claim description is required.";
    } else if (description.length > 1000) {
      errors.description = "Description cannot exceed 1000 characters.";
    }

    if (!formData.policyId || !selectedPolicy) {
      errors.policyId = "Please select a valid policy.";
    }

    return errors;
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setError("");

    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      const existingClaims = await getAllClaims();

      const normalizedClaimNumber = formData.claimNumber.trim().toLowerCase();

      // Exclude the claim currently being edited.
      const duplicateExists = existingClaims.some(
        (existingClaim) =>
          existingClaim.id !== claim.id &&
          existingClaim.claimNumber.trim().toLowerCase() ===
            normalizedClaimNumber,
      );

      if (duplicateExists) {
        setFieldErrors({
          claimNumber: "This claim number already exists. Please use another.",
        });
        return;
      }

      await updateClaim(claim.id, {
        ...formData,
        claimNumber: formData.claimNumber.trim(),
        description: formData.description.trim(),
      });

      onUpdated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update claim. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="claim-create-form" onSubmit={handleSubmit} noValidate>
      <h2>Edit Claim: {claim.claimNumber}</h2>

      <div className="claim-form-grid">
        {/* Claim Number */}
        <div className="claim-field">
          <input
            type="text"
            placeholder="Claim Number"
            aria-label="Claim Number"
            aria-invalid={Boolean(fieldErrors.claimNumber)}
            required
            maxLength={50}
            value={formData.claimNumber}
            onChange={(e) => updateField("claimNumber", e.target.value)}
          />

          {fieldErrors.claimNumber && (
            <span className="field-error" role="alert">
              {fieldErrors.claimNumber}
            </span>
          )}
        </div>

        {/* Claim Amount */}
        <div className="claim-field">
          <input
            type="number"
            placeholder="Claim Amount"
            aria-label="Claim Amount"
            aria-invalid={Boolean(fieldErrors.claimAmount)}
            required
            min="0.01"
            step="0.01"
            value={formData.claimAmount || ""}
            onChange={(e) =>
              updateField(
                "claimAmount",
                e.target.value === "" ? 0 : Number(e.target.value),
              )
            }
          />

          {fieldErrors.claimAmount && (
            <span className="field-error" role="alert">
              {fieldErrors.claimAmount}
            </span>
          )}
        </div>

        {/* Claim Date */}
        <div className="claim-field">
          <input
            type="date"
            aria-label="Claim Date"
            aria-invalid={Boolean(fieldErrors.claimDate)}
            required
            max={getToday()}
            value={formData.claimDate}
            onChange={(e) => updateField("claimDate", e.target.value)}
          />

          {fieldErrors.claimDate && (
            <span className="field-error" role="alert">
              {fieldErrors.claimDate}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="claim-field">
          <input
            type="text"
            placeholder="Description"
            aria-label="Description"
            aria-invalid={Boolean(fieldErrors.description)}
            required
            maxLength={1000}
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
          />

          {fieldErrors.description && (
            <span className="field-error" role="alert">
              {fieldErrors.description}
            </span>
          )}
        </div>

        {/* Claim Status */}
        {/* Claim Status */}
        <div className="claim-field">
          <select
            aria-label="Claim Status"
            value={formData.status}
            onChange={(e) => updateField("status", e.target.value)}
            disabled={claim.status !== "PENDING"}
          >
            {claim.status === "PENDING" ? (
              <>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </>
            ) : (
              <option value={claim.status}>{claim.status}</option>
            )}
          </select>
        </div>

        {/* Policy Selection */}
        <div className="claim-field">
          <select
            id="edit-claim-policy"
            aria-label="Select Policy"
            aria-invalid={Boolean(fieldErrors.policyId)}
            required
            disabled={loadingPolicies}
            value={formData.policyId || ""}
            onChange={(e) => updateField("policyId", Number(e.target.value))}
          >
            <option value="">
              {loadingPolicies ? "Loading policies..." : "Select a Policy"}
            </option>

            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.policyNumber} - {policy.policyHolderName}
              </option>
            ))}
          </select>

          {fieldErrors.policyId && (
            <span className="field-error" role="alert">
              {fieldErrors.policyId}
            </span>
          )}
        </div>
      </div>

      {/* Selected Policy Details */}
      {selectedPolicy && (
        <div className="selected-policy-details">
          <h4>Selected Policy Details</h4>

          <div className="policy-details-grid">
            <p>
              <strong>Policy Number:</strong> {selectedPolicy.policyNumber}
            </p>

            <p>
              <strong>Policyholder:</strong> {selectedPolicy.policyHolderName}
            </p>

            <p>
              <strong>Policy Type:</strong> {selectedPolicy.policyType}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`status-badge ${selectedPolicy.status.toLowerCase()}`}
              >
                {selectedPolicy.status}
              </span>
            </p>
          </div>
        </div>
      )}

      {policiesError && (
        <p className="claim-form-error" role="alert">
          {policiesError}
        </p>
      )}

      {error && (
        <p className="claim-form-error" role="alert">
          {error}
        </p>
      )}

      {/* Form Actions */}
      <div className="claim-form-actions">
        <button
          type="submit"
          className="btn-create-claim"
          disabled={saving || loadingPolicies || policies.length === 0}
        >
          {saving ? "Updating..." : "Update Claim"}
        </button>

        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default EditClaimForm;
