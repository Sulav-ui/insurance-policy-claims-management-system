import { useState } from "react";
import {
  updatePolicy,
  getAllPolicies,
  type CreatePolicyRequest,
} from "../services/policyService";
import type { Policy } from "../types/Policy";

type EditPolicyFormProps = {
  policy: Policy;
  onUpdated: () => void;
  onCancel: () => void;
};

type FieldName =
  | "policyNumber"
  | "policyHolderName"
  | "policyType"
  | "premiumAmount"
  | "startDate"
  | "endDate"
  | "status";

type FieldErrors = Partial<Record<FieldName, string>>;

function EditPolicyForm({ policy, onUpdated, onCancel }: EditPolicyFormProps) {
  const [formData, setFormData] = useState<CreatePolicyRequest>({
    policyNumber: policy.policyNumber,
    policyHolderName: policy.policyHolderName,
    policyType: policy.policyType,
    premiumAmount: policy.premiumAmount,
    startDate: policy.startDate,
    endDate: policy.endDate,
    status: policy.status,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function updateField<K extends keyof CreatePolicyRequest>(
    field: K,
    value: CreatePolicyRequest[K],
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

    const policyNumber = formData.policyNumber.trim();
    const policyHolderName = formData.policyHolderName.trim();
    const policyType = formData.policyType.trim();

    if (!policyNumber) {
      errors.policyNumber = "Policy number is required.";
    } else if (policyNumber.length < 3 || policyNumber.length > 50) {
      errors.policyNumber =
        "Policy number must contain between 3 and 50 characters.";
    }

    if (!policyHolderName) {
      errors.policyHolderName = "Policy holder name is required.";
    } else if (policyHolderName.length > 100) {
      errors.policyHolderName =
        "Policy holder name cannot exceed 100 characters.";
    }

    if (!policyType) {
      errors.policyType = "Policy type is required.";
    } else if (policyType.length > 50) {
      errors.policyType = "Policy type cannot exceed 50 characters.";
    }

    if (
      !Number.isFinite(formData.premiumAmount) ||
      formData.premiumAmount <= 0
    ) {
      errors.premiumAmount = "Premium amount must be greater than $0.";
    } else if (!/^\d+(\.\d{1,2})?$/.test(String(formData.premiumAmount))) {
      errors.premiumAmount =
        "Premium amount can have at most 2 decimal places.";
    }

    if (!formData.startDate) {
      errors.startDate = "Start date is required.";
    }

    if (!formData.endDate) {
      errors.endDate = "End date is required.";
    } else if (formData.startDate && formData.endDate <= formData.startDate) {
      errors.endDate = "End date must be after the start date.";
    }

    // Preserve supported existing statuses during editing.
    if (
      !["ACTIVE", "INACTIVE", "EXPIRED", "CANCELLED"].includes(formData.status)
    ) {
      errors.status = "Please select a valid policy status.";
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
      const existingPolicies = await getAllPolicies();

      const normalizedPolicyNumber = formData.policyNumber.trim().toLowerCase();

      // Exclude the policy currently being edited.
      const duplicateExists = existingPolicies.some(
        (existingPolicy) =>
          existingPolicy.id !== policy.id &&
          existingPolicy.policyNumber.trim().toLowerCase() ===
            normalizedPolicyNumber,
      );

      if (duplicateExists) {
        setFieldErrors({
          policyNumber:
            "This policy number already exists. Please use another.",
        });
        return;
      }

      await updatePolicy(policy.id, {
        ...formData,
        policyNumber: formData.policyNumber.trim(),
        policyHolderName: formData.policyHolderName.trim(),
        policyType: formData.policyType.trim(),
      });

      onUpdated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update policy. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="claim-create-form" onSubmit={handleSubmit} noValidate>
      <h2>Edit Policy: {policy.policyNumber}</h2>

      <div className="claim-form-grid">
        {/* Policy Number */}
        <div className="claim-field">
          <input
            type="text"
            placeholder="Policy Number"
            aria-label="Policy Number"
            aria-invalid={Boolean(fieldErrors.policyNumber)}
            required
            value={formData.policyNumber}
            onChange={(e) => updateField("policyNumber", e.target.value)}
          />

          {fieldErrors.policyNumber && (
            <span className="field-error" role="alert">
              {fieldErrors.policyNumber}
            </span>
          )}
        </div>

        {/* Policy Holder Name */}
        <div className="claim-field">
          <input
            type="text"
            placeholder="Policy Holder Name"
            aria-label="Policy Holder Name"
            aria-invalid={Boolean(fieldErrors.policyHolderName)}
            required
            value={formData.policyHolderName}
            onChange={(e) => updateField("policyHolderName", e.target.value)}
          />

          {fieldErrors.policyHolderName && (
            <span className="field-error" role="alert">
              {fieldErrors.policyHolderName}
            </span>
          )}
        </div>

        {/* Policy Type */}
        <div className="claim-field">
          <input
            type="text"
            placeholder="Policy Type"
            aria-label="Policy Type"
            aria-invalid={Boolean(fieldErrors.policyType)}
            required
            value={formData.policyType}
            onChange={(e) => updateField("policyType", e.target.value)}
          />

          {fieldErrors.policyType && (
            <span className="field-error" role="alert">
              {fieldErrors.policyType}
            </span>
          )}
        </div>

        {/* Premium Amount */}
        <div className="claim-field">
          <input
            type="number"
            placeholder="Premium Amount"
            aria-label="Premium Amount"
            aria-invalid={Boolean(fieldErrors.premiumAmount)}
            required
            min="0.01"
            step="0.01"
            value={formData.premiumAmount || ""}
            onChange={(e) =>
              updateField(
                "premiumAmount",
                e.target.value === "" ? 0 : Number(e.target.value),
              )
            }
          />

          {fieldErrors.premiumAmount && (
            <span className="field-error" role="alert">
              {fieldErrors.premiumAmount}
            </span>
          )}
        </div>

        {/* Start Date */}
        <div className="claim-field">
          <input
            type="date"
            aria-label="Start Date"
            aria-invalid={Boolean(fieldErrors.startDate)}
            required
            value={formData.startDate}
            onChange={(e) => updateField("startDate", e.target.value)}
          />

          {fieldErrors.startDate && (
            <span className="field-error" role="alert">
              {fieldErrors.startDate}
            </span>
          )}
        </div>

        {/* End Date */}
        <div className="claim-field">
          <input
            type="date"
            aria-label="End Date"
            aria-invalid={Boolean(fieldErrors.endDate)}
            required
            min={formData.startDate || undefined}
            value={formData.endDate}
            onChange={(e) => updateField("endDate", e.target.value)}
          />

          {fieldErrors.endDate && (
            <span className="field-error" role="alert">
              {fieldErrors.endDate}
            </span>
          )}
        </div>

        {/* Policy Status */}
        <div className="claim-field">
          <select
            aria-label="Policy Status"
            aria-invalid={Boolean(fieldErrors.status)}
            value={formData.status}
            onChange={(e) => updateField("status", e.target.value)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {fieldErrors.status && (
            <span className="field-error" role="alert">
              {fieldErrors.status}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="claim-form-error" role="alert">
          {error}
        </p>
      )}

      {/* Form Actions */}
      <div className="claim-form-actions">
        <button type="submit" className="btn-create-claim" disabled={saving}>
          {saving ? "Updating..." : "Update Policy"}
        </button>

        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default EditPolicyForm;
