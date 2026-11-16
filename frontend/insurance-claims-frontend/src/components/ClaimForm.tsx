import { useEffect, useState, type FormEvent } from "react";
import {
  createClaim,
  getAllClaims,
  type CreateClaimRequest,
} from "../services/claimService";
import { getAllPolicies } from "../services/policyService";
import type { Policy } from "../types/Policy";

type ClaimFormProps = {
  onClaimCreated: () => void;
};

type FieldName =
  | "claimNumber"
  | "claimAmount"
  | "claimDate"
  | "description"
  | "policyId";

type FieldErrors = Partial<Record<FieldName, string>>;

const initialFormData: CreateClaimRequest = {
  claimNumber: "",
  claimAmount: 0,
  claimDate: "",
  description: "",
  status: "PENDING",
  policyId: 0,
};

function getToday(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function ClaimForm({ onClaimCreated }: ClaimFormProps) {
  const [formData, setFormData] = useState<CreateClaimRequest>({
    ...initialFormData,
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
      setLoadingPolicies(true);

      try {
        const data = await getAllPolicies();

        if (active) {
          setPolicies(data);
          setPoliciesError("");
        }
      } catch (err) {
        if (active) {
          setPoliciesError(
            err instanceof Error ? err.message : "Failed to load policies.",
          );
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

    // Claim number validation
    if (!claimNumber) {
      errors.claimNumber = "Claim number is required.";
    } else if (claimNumber.length < 3 || claimNumber.length > 50) {
      errors.claimNumber = "Claim number must contain 3 to 50 characters.";
    }

    // Claim amount validation
    if (!Number.isFinite(formData.claimAmount) || formData.claimAmount <= 0) {
      errors.claimAmount = "Claim amount must be greater than $0.";
    } else if (!/^\d+(\.\d{1,2})?$/.test(String(formData.claimAmount))) {
      errors.claimAmount = "Claim amount can have at most 2 decimal places.";
    }

    // Claim date validation
    if (!formData.claimDate) {
      errors.claimDate = "Please select a claim date.";
    } else if (!isValidDate(formData.claimDate)) {
      errors.claimDate = "Enter a valid claim date.";
    } else if (formData.claimDate > getToday()) {
      errors.claimDate = "Claim date cannot be in the future.";
    }

    // Description validation
    if (!description) {
      errors.description = "Claim description is required.";
    } else if (description.length < 5) {
      errors.description = "Description must contain at least 5 characters.";
    }

    // Policy validation
    if (!formData.policyId || !selectedPolicy) {
      errors.policyId = "Please select a valid policy.";
    }

    return errors;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving || loadingPolicies) return;

    setError("");

    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      // Check duplicate claim numbers
      const existingClaims = await getAllClaims();

      const normalizedClaimNumber = formData.claimNumber.trim().toLowerCase();

      const duplicateExists = existingClaims.some(
        (claim) =>
          claim.claimNumber.trim().toLowerCase() === normalizedClaimNumber,
      );

      if (duplicateExists) {
        setFieldErrors({
          claimNumber: "This claim number already exists. Please use another.",
        });
        return;
      }

      // Create claim
      await createClaim({
        ...formData,
        claimNumber: formData.claimNumber.trim(),
        description: formData.description.trim(),
        status: "PENDING",
        policyId: Number(formData.policyId),
      });

      setFormData({ ...initialFormData });
      setFieldErrors({});
      setError("");

      onClaimCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create claim. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="claim-create-form" onSubmit={handleSubmit} noValidate>
      <h2>Create Claim</h2>

      <div className="claim-form-grid">
        {/* Claim Number */}
        <div className="claim-field">
          <label htmlFor="claimNumber">Claim Number</label>

          <input
            id="claimNumber"
            type="text"
            placeholder="Enter claim number"
            maxLength={50}
            required
            value={formData.claimNumber}
            aria-invalid={Boolean(fieldErrors.claimNumber)}
            aria-describedby={
              fieldErrors.claimNumber ? "claimNumber-error" : undefined
            }
            onChange={(e) => updateField("claimNumber", e.target.value)}
          />

          {fieldErrors.claimNumber && (
            <span id="claimNumber-error" className="field-error" role="alert">
              {fieldErrors.claimNumber}
            </span>
          )}
        </div>

        {/* Claim Amount */}
        <div className="claim-field">
          <label htmlFor="claimAmount">Claim Amount ($)</label>

          <input
            id="claimAmount"
            type="number"
            placeholder="Enter claim amount"
            min="0.01"
            step="0.01"
            required
            value={formData.claimAmount || ""}
            aria-invalid={Boolean(fieldErrors.claimAmount)}
            aria-describedby={
              fieldErrors.claimAmount ? "claimAmount-error" : undefined
            }
            onChange={(e) =>
              updateField(
                "claimAmount",
                e.target.value === "" ? 0 : Number(e.target.value),
              )
            }
          />

          {fieldErrors.claimAmount && (
            <span id="claimAmount-error" className="field-error" role="alert">
              {fieldErrors.claimAmount}
            </span>
          )}
        </div>

        {/* Claim Date */}
        <div className="claim-field">
          <label htmlFor="claimDate">Claim Date</label>

          <input
            id="claimDate"
            type="date"
            required
            max={getToday()}
            value={formData.claimDate}
            aria-invalid={Boolean(fieldErrors.claimDate)}
            aria-describedby={
              fieldErrors.claimDate ? "claimDate-error" : undefined
            }
            onChange={(e) => updateField("claimDate", e.target.value)}
          />

          {fieldErrors.claimDate && (
            <span id="claimDate-error" className="field-error" role="alert">
              {fieldErrors.claimDate}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="claim-field">
          <label htmlFor="claimDescription">Description</label>

          <input
            id="claimDescription"
            type="text"
            placeholder="Describe the claim"
            required
            value={formData.description}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={
              fieldErrors.description ? "claimDescription-error" : undefined
            }
            onChange={(e) => updateField("description", e.target.value)}
          />

          {fieldErrors.description && (
            <span
              id="claimDescription-error"
              className="field-error"
              role="alert"
            >
              {fieldErrors.description}
            </span>
          )}
        </div>

        {/* Claim Status */}
        <div className="claim-field">
          <label htmlFor="claimStatus">Claim Status</label>

          <select id="claimStatus" value="PENDING" disabled>
            <option value="PENDING">PENDING</option>
          </select>
        </div>

        {/* Select Policy */}
        <div className="claim-field">
          <label htmlFor="policyId">Select Policy</label>

          <select
            id="policyId"
            required
            disabled={loadingPolicies}
            value={formData.policyId || ""}
            aria-invalid={Boolean(fieldErrors.policyId)}
            aria-describedby={
              fieldErrors.policyId ? "policyId-error" : undefined
            }
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
            <span id="policyId-error" className="field-error" role="alert">
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

      <div className="claim-form-actions">
        <button
          type="submit"
          className="btn-create-claim"
          disabled={saving || loadingPolicies || policies.length === 0}
        >
          {saving ? "Creating..." : "Create Claim"}
        </button>
      </div>
    </form>
  );
}

export default ClaimForm;
