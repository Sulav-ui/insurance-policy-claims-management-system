import { useState, type FormEvent } from "react";
import {
  createPolicy,
  getAllPolicies,
  type CreatePolicyRequest,
} from "../services/policyService";

type PolicyFormProps = {
  onPolicyCreated: () => void;
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

const initialFormData: CreatePolicyRequest = {
  policyNumber: "",
  policyHolderName: "",
  policyType: "",
  premiumAmount: 0,
  startDate: "",
  endDate: "",
  status: "ACTIVE",
};

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

function PolicyForm({ onPolicyCreated }: PolicyFormProps) {
  const [formData, setFormData] = useState<CreatePolicyRequest>({
    ...initialFormData,
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

      if (field === "startDate") {
        delete updated.endDate;
      }

      return updated;
    });

    setError("");
  }

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {};

    const policyNumber = formData.policyNumber.trim();
    const holderName = formData.policyHolderName.trim();
    const policyType = formData.policyType.trim();

    // Policy number
    if (!policyNumber) {
      errors.policyNumber = "Policy number is required.";
    } else if (policyNumber.length < 3 || policyNumber.length > 50) {
      errors.policyNumber = "Policy number must contain 3 to 50 characters.";
    }

    // Policy holder
    if (!holderName) {
      errors.policyHolderName = "Policy holder name is required.";
    } else if (holderName.length > 100) {
      errors.policyHolderName =
        "Policy holder name cannot exceed 100 characters.";
    }

    // Policy type
    if (!policyType) {
      errors.policyType = "Policy type is required.";
    } else if (policyType.length > 50) {
      errors.policyType = "Policy type cannot exceed 50 characters.";
    }

    // Premium amount
    const premium = formData.premiumAmount;

    if (!Number.isFinite(premium) || premium <= 0) {
      errors.premiumAmount = "Premium amount must be greater than $0.";
    } else if (!/^\d+(\.\d{1,2})?$/.test(String(premium))) {
      errors.premiumAmount =
        "Premium amount can have at most 2 decimal places.";
    }

    // Start date
    if (!formData.startDate) {
      errors.startDate = "Start date is required.";
    } else if (!isValidDate(formData.startDate)) {
      errors.startDate = "Enter a valid start date.";
    }

    // End date
    if (!formData.endDate) {
      errors.endDate = "End date is required.";
    } else if (!isValidDate(formData.endDate)) {
      errors.endDate = "Enter a valid end date.";
    } else if (
      isValidDate(formData.startDate) &&
      formData.endDate <= formData.startDate
    ) {
      errors.endDate = "End date must be after the start date.";
    }

    // Status
    if (!["ACTIVE", "INACTIVE"].includes(formData.status)) {
      errors.status = "Please select a valid status.";
    }

    return errors;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
      const normalizedNumber = formData.policyNumber.trim().toLowerCase();

      // Preserve duplicate policy-number validation
      const existingPolicies = await getAllPolicies();

      const duplicateExists = existingPolicies.some(
        (policy) =>
          policy.policyNumber.trim().toLowerCase() === normalizedNumber,
      );

      if (duplicateExists) {
        setFieldErrors({
          policyNumber:
            "This policy number already exists. Please use another.",
        });
        return;
      }

      await createPolicy({
        ...formData,
        policyNumber: formData.policyNumber.trim(),
        policyHolderName: formData.policyHolderName.trim(),
        policyType: formData.policyType.trim(),
      });

      setFormData({ ...initialFormData });
      setFieldErrors({});
      setError("");

      onPolicyCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create policy. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="claim-create-form" onSubmit={handleSubmit} noValidate>
      <h2>Create Policy</h2>

      <div className="claim-form-grid">
        <div className="claim-field">
          <label htmlFor="policyNumber">Policy Number</label>
          <input
            id="policyNumber"
            type="text"
            placeholder="Enter policy number"
            maxLength={50}
            required
            value={formData.policyNumber}
            aria-invalid={Boolean(fieldErrors.policyNumber)}
            aria-describedby={
              fieldErrors.policyNumber ? "policyNumber-error" : undefined
            }
            onChange={(e) => updateField("policyNumber", e.target.value)}
          />
          {fieldErrors.policyNumber && (
            <span id="policyNumber-error" className="field-error" role="alert">
              {fieldErrors.policyNumber}
            </span>
          )}
        </div>

        <div className="claim-field">
          <label htmlFor="policyHolderName">Policy Holder Name</label>
          <input
            id="policyHolderName"
            type="text"
            placeholder="Enter policy holder name"
            maxLength={100}
            required
            value={formData.policyHolderName}
            aria-invalid={Boolean(fieldErrors.policyHolderName)}
            aria-describedby={
              fieldErrors.policyHolderName
                ? "policyHolderName-error"
                : undefined
            }
            onChange={(e) => updateField("policyHolderName", e.target.value)}
          />
          {fieldErrors.policyHolderName && (
            <span
              id="policyHolderName-error"
              className="field-error"
              role="alert"
            >
              {fieldErrors.policyHolderName}
            </span>
          )}
        </div>

        <div className="claim-field">
          <label htmlFor="policyType">Policy Type</label>
          <input
            id="policyType"
            type="text"
            placeholder="e.g. AUTO, HOME, HEALTH"
            maxLength={50}
            required
            value={formData.policyType}
            aria-invalid={Boolean(fieldErrors.policyType)}
            aria-describedby={
              fieldErrors.policyType ? "policyType-error" : undefined
            }
            onChange={(e) => updateField("policyType", e.target.value)}
          />
          {fieldErrors.policyType && (
            <span id="policyType-error" className="field-error" role="alert">
              {fieldErrors.policyType}
            </span>
          )}
        </div>

        <div className="claim-field">
          <label htmlFor="premiumAmount">Premium Amount ($)</label>
          <input
            id="premiumAmount"
            type="number"
            placeholder="Enter premium amount"
            min="0.01"
            step="0.01"
            required
            value={formData.premiumAmount || ""}
            aria-invalid={Boolean(fieldErrors.premiumAmount)}
            aria-describedby={
              fieldErrors.premiumAmount ? "premiumAmount-error" : undefined
            }
            onChange={(e) =>
              updateField(
                "premiumAmount",
                e.target.value === "" ? 0 : Number(e.target.value),
              )
            }
          />
          {fieldErrors.premiumAmount && (
            <span id="premiumAmount-error" className="field-error" role="alert">
              {fieldErrors.premiumAmount}
            </span>
          )}
        </div>

        <div className="claim-field">
          <label htmlFor="startDate">Start Date</label>
          <input
            id="startDate"
            type="date"
            required
            value={formData.startDate}
            aria-invalid={Boolean(fieldErrors.startDate)}
            aria-describedby={
              fieldErrors.startDate ? "startDate-error" : undefined
            }
            onChange={(e) => updateField("startDate", e.target.value)}
          />
          {fieldErrors.startDate && (
            <span id="startDate-error" className="field-error" role="alert">
              {fieldErrors.startDate}
            </span>
          )}
        </div>

        <div className="claim-field">
          <label htmlFor="endDate">End Date</label>
          <input
            id="endDate"
            type="date"
            required
            min={formData.startDate || undefined}
            value={formData.endDate}
            aria-invalid={Boolean(fieldErrors.endDate)}
            aria-describedby={fieldErrors.endDate ? "endDate-error" : undefined}
            onChange={(e) => updateField("endDate", e.target.value)}
          />
          {fieldErrors.endDate && (
            <span id="endDate-error" className="field-error" role="alert">
              {fieldErrors.endDate}
            </span>
          )}
        </div>

        <div className="claim-field">
          <label htmlFor="policyStatus">Policy Status</label>
          <select
            id="policyStatus"
            value={formData.status}
            aria-invalid={Boolean(fieldErrors.status)}
            aria-describedby={
              fieldErrors.status ? "policyStatus-error" : undefined
            }
            onChange={(e) => updateField("status", e.target.value)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          {fieldErrors.status && (
            <span id="policyStatus-error" className="field-error" role="alert">
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

      <div className="claim-form-actions">
        <button type="submit" className="btn-create-claim" disabled={saving}>
          {saving ? "Creating..." : "Create Policy"}
        </button>
      </div>
    </form>
  );
}

export default PolicyForm;
