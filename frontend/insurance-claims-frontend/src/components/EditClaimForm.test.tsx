import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import EditClaimForm from "./EditClaimForm";

import {
  updateClaim,
  getAllClaims,
  type CreateClaimRequest,
} from "../services/claimService";

import { getAllPolicies } from "../services/policyService";

import type { Claim } from "../types/Claim";
import type { Policy } from "../types/Policy";

// =====================================
// MOCK SERVICES
// =====================================

vi.mock("../services/claimService", () => ({
  updateClaim: vi.fn(),
  getAllClaims: vi.fn(),
}));

vi.mock("../services/policyService", () => ({
  getAllPolicies: vi.fn(),
}));

const mockUpdateClaim = vi.mocked(updateClaim);
const mockGetAllClaims = vi.mocked(getAllClaims);
const mockGetAllPolicies = vi.mocked(getAllPolicies);

const mockOnUpdated = vi.fn();
const mockOnCancel = vi.fn();

// =====================================
// MOCK DATA
// =====================================

const firstPolicy: Policy = {
  id: 1,
  policyNumber: "POL-001",
  policyHolderName: "John Smith",
  policyType: "HEALTH",
  premiumAmount: 1500,
  startDate: "2026-01-01",
  endDate: "2027-01-01",
  status: "ACTIVE",
};

const secondPolicy: Policy = {
  id: 2,
  policyNumber: "POL-002",
  policyHolderName: "Jane Smith",
  policyType: "AUTO",
  premiumAmount: 2500,
  startDate: "2026-01-01",
  endDate: "2027-01-01",
  status: "INACTIVE",
};

const existingClaim: Claim = {
  id: 1,
  claimNumber: "CLM-001",
  claimAmount: 1800,
  claimDate: "2026-11-10",
  description: "Medical expense claim",
  status: "PENDING",
  policyId: 1,
};

const anotherClaim: Claim = {
  ...existingClaim,
  id: 2,
  claimNumber: "CLM-002",
  policyId: 2,
};

const { id: claimId, ...originalPayload } = existingClaim;

// =====================================
// HELPER FUNCTIONS
// =====================================

function renderForm(overrides: Partial<Claim> = {}) {
  return render(
    <EditClaimForm
      claim={{
        ...existingClaim,
        ...overrides,
      }}
      onUpdated={mockOnUpdated}
      onCancel={mockOnCancel}
    />,
  );
}

async function renderLoadedForm(overrides: Partial<Claim> = {}) {
  const result = renderForm(overrides);

  await screen.findByRole("option", {
    name: "POL-001 - John Smith",
  });

  return result;
}

function changeField(label: string, value: string | number) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  });
}

function getUpdateButton() {
  return screen.getByRole("button", {
    name: "Update Claim",
  });
}

function getCancelButton() {
  return screen.getByRole("button", {
    name: "Cancel",
  });
}

function submitForm() {
  fireEvent.click(getUpdateButton());
}

// =====================================
// EDIT CLAIM FORM COMPONENT TESTS
// =====================================

describe("EditClaimForm Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));

    mockGetAllPolicies.mockResolvedValue([firstPolicy, secondPolicy]);

    mockGetAllClaims.mockResolvedValue([existingClaim]);

    mockUpdateClaim.mockResolvedValue(existingClaim);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Heading

  it("should render the Edit Claim heading", async () => {
    await renderLoadedForm();

    expect(
      screen.getByRole("heading", {
        name: "Edit Claim: CLM-001",
      }),
    ).toBeInTheDocument();
  });

  // 2. Form fields

  it("should render all claim form fields", async () => {
    await renderLoadedForm();

    const labels = [
      "Claim Number",
      "Claim Amount",
      "Claim Date",
      "Description",
      "Claim Status",
      "Select Policy",
    ];

    labels.forEach((label) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
  });

  // 3. Existing text values

  it("should populate the existing claim number and description", async () => {
    await renderLoadedForm();

    expect(screen.getByLabelText("Claim Number")).toHaveValue("CLM-001");

    expect(screen.getByLabelText("Description")).toHaveValue(
      "Medical expense claim",
    );
  });

  // 4. Existing amount

  it("should populate the existing claim amount", async () => {
    await renderLoadedForm();

    expect(screen.getByLabelText("Claim Amount")).toHaveValue(1800);
  });

  // 5. Existing date

  it("should populate the existing claim date", async () => {
    await renderLoadedForm();

    expect(screen.getByLabelText("Claim Date")).toHaveValue("2026-11-10");
  });

  // 6. Existing policy

  it("should select the existing claim policy", async () => {
    await renderLoadedForm();

    expect(screen.getByLabelText("Select Policy")).toHaveValue("1");
  });

  // 7. Action buttons

  it("should render enabled Update Claim and Cancel buttons", async () => {
    await renderLoadedForm();

    expect(getUpdateButton()).toBeEnabled();

    expect(getCancelButton()).toBeEnabled();

    expect(getUpdateButton()).toHaveAttribute("type", "submit");

    expect(getCancelButton()).toHaveAttribute("type", "button");
  });

  // 8. Input constraints

  it("should render the correct input constraints", async () => {
    await renderLoadedForm();

    expect(screen.getByLabelText("Claim Number")).toHaveAttribute(
      "maxlength",
      "50",
    );

    expect(screen.getByLabelText("Description")).toHaveAttribute(
      "maxlength",
      "1000",
    );

    const amount = screen.getByLabelText("Claim Amount");

    expect(amount).toHaveAttribute("min", "0.01");

    expect(amount).toHaveAttribute("step", "0.01");

    expect(screen.getByLabelText("Claim Date")).toHaveAttribute(
      "max",
      "2026-11-18",
    );
  });

  // =====================================
  // POLICY LOADING TESTS
  // =====================================

  // 9. Fetch policies

  it("should fetch available policies on mount", async () => {
    await renderLoadedForm();

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);

    expect(mockGetAllClaims).not.toHaveBeenCalled();
  });

  // 10. Loading policies

  it("should disable policy selection and updating while policies are loading", async () => {
    let resolvePolicies!: (policies: Policy[]) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((resolve) => {
        resolvePolicies = resolve;
      }),
    );

    renderForm();

    expect(screen.getByText("Loading policies...")).toBeInTheDocument();

    expect(screen.getByLabelText("Select Policy")).toBeDisabled();

    expect(getUpdateButton()).toBeDisabled();

    expect(getCancelButton()).toBeEnabled();

    await act(async () => {
      resolvePolicies([firstPolicy]);
    });

    expect(screen.getByLabelText("Select Policy")).toBeEnabled();

    expect(getUpdateButton()).toBeEnabled();
  });

  // 11. Policy options

  it("should populate the available policy options", async () => {
    await renderLoadedForm();

    const select = screen.getByLabelText("Select Policy");

    const options = within(select).getAllByRole("option");

    expect(options).toHaveLength(3);

    expect(options[0]).toHaveTextContent("Select a Policy");

    expect(options[1]).toHaveTextContent("POL-001 - John Smith");

    expect(options[1]).toHaveValue("1");

    expect(options[2]).toHaveTextContent("POL-002 - Jane Smith");

    expect(options[2]).toHaveValue("2");
  });

  // 12. Empty policy list

  it("should disable updating when no policies are available", async () => {
    mockGetAllPolicies.mockResolvedValue([]);

    renderForm();

    await waitFor(() => {
      expect(screen.getByLabelText("Select Policy")).toBeEnabled();
    });

    expect(getUpdateButton()).toBeDisabled();

    expect(getCancelButton()).toBeEnabled();
  });

  // 13. Policy loading failure

  it("should display a generic policy loading error", async () => {
    mockGetAllPolicies.mockRejectedValue(new Error("Database unavailable"));

    renderForm();

    const error = await screen.findByText("Failed to load policies.");

    expect(error).toHaveAttribute("role", "alert");

    expect(error).toHaveClass("claim-form-error");

    expect(getUpdateButton()).toBeDisabled();
  });

  // 14. Successful request after unmount

  it("should safely handle policy loading completing after unmounting", async () => {
    let resolvePolicies!: (policies: Policy[]) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((resolve) => {
        resolvePolicies = resolve;
      }),
    );

    const { unmount } = renderForm();

    unmount();

    await act(async () => {
      resolvePolicies([firstPolicy]);
    });

    expect(
      screen.queryByRole("heading", {
        name: "Edit Claim: CLM-001",
      }),
    ).not.toBeInTheDocument();

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });

  // 15. Failed request after unmount

  it("should safely handle policy loading failure after unmounting", async () => {
    let rejectPolicies!: (reason: Error) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((_, reject) => {
        rejectPolicies = reject;
      }),
    );

    const { unmount } = renderForm();

    unmount();

    await act(async () => {
      rejectPolicies(new Error("Loading failed"));
    });

    expect(
      screen.queryByText("Failed to load policies."),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // SELECTED POLICY DETAILS
  // =====================================

  // 16. Existing policy details

  it("should display the existing selected policy details", async () => {
    const { container } = await renderLoadedForm();

    const details = container.querySelector(
      ".selected-policy-details",
    ) as HTMLElement;

    expect(details).toBeInTheDocument();

    expect(details).toHaveTextContent("Policy Number: POL-001");

    expect(details).toHaveTextContent("Policyholder: John Smith");

    expect(details).toHaveTextContent("Policy Type: HEALTH");

    expect(within(details).getByText("ACTIVE")).toHaveClass(
      "status-badge",
      "active",
    );
  });

  // 17. Change selected policy

  it("should update details when another policy is selected", async () => {
    const { container } = await renderLoadedForm();

    changeField("Select Policy", "2");

    const details = container.querySelector(
      ".selected-policy-details",
    ) as HTMLElement;

    expect(details).toHaveTextContent("Policy Number: POL-002");

    expect(details).toHaveTextContent("Policyholder: Jane Smith");

    expect(details).toHaveTextContent("Policy Type: AUTO");

    expect(within(details).getByText("INACTIVE")).toHaveClass(
      "status-badge",
      "inactive",
    );

    expect(details).not.toHaveTextContent("John Smith");
  });

  // 18. Clear selected policy

  it("should remove policy details when the selection is cleared", async () => {
    await renderLoadedForm();

    changeField("Select Policy", "");

    expect(
      screen.queryByText("Selected Policy Details"),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // INPUT INTERACTION TESTS
  // =====================================

  // 19. Edit text fields

  it("should allow editing claim number and description", async () => {
    await renderLoadedForm();

    changeField("Claim Number", "CLM-003");

    changeField("Description", "Updated medical expense claim");

    expect(screen.getByLabelText("Claim Number")).toHaveValue("CLM-003");

    expect(screen.getByLabelText("Description")).toHaveValue(
      "Updated medical expense claim",
    );
  });

  // 20. Edit claim amount

  it("should allow editing the claim amount", async () => {
    await renderLoadedForm();

    changeField("Claim Amount", "2500.75");

    expect(screen.getByLabelText("Claim Amount")).toHaveValue(2500.75);
  });

  // 21. Clear claim amount

  it("should support clearing the claim amount", async () => {
    await renderLoadedForm();

    changeField("Claim Amount", "");

    expect(screen.getByLabelText("Claim Amount")).toHaveValue(null);
  });

  // 22. Edit claim date

  it("should allow editing the claim date", async () => {
    await renderLoadedForm();

    changeField("Claim Date", "2026-11-12");

    expect(screen.getByLabelText("Claim Date")).toHaveValue("2026-11-12");
  });

  // =====================================
  // CLAIM STATUS TESTS
  // =====================================

  // 23. Pending status options

  it("should allow status selection for pending claims", async () => {
    await renderLoadedForm();

    const status = screen.getByLabelText("Claim Status");

    expect(status).toBeEnabled();

    expect(status).toHaveValue("PENDING");

    const options = within(status).getAllByRole("option");

    expect(
      options.map((option) => (option as HTMLOptionElement).value),
    ).toEqual(["PENDING", "APPROVED", "REJECTED"]);
  });

  // 24–25. Pending claim transitions

  it.each(["APPROVED", "REJECTED"] as const)(
    "should allow a pending claim to become %s",
    async (status) => {
      await renderLoadedForm();

      changeField("Claim Status", status);

      expect(screen.getByLabelText("Claim Status")).toHaveValue(status);

      submitForm();

      await waitFor(() => {
        expect(mockUpdateClaim).toHaveBeenCalledWith(claimId, {
          ...originalPayload,
          status,
        });

        expect(mockOnUpdated).toHaveBeenCalledTimes(1);
      });
    },
  );

  // 26–27. Locked statuses

  it.each(["APPROVED", "REJECTED"] as const)(
    "should lock the status dropdown for %s claims",
    async (status) => {
      await renderLoadedForm({ status });

      const select = screen.getByLabelText("Claim Status");

      expect(select).toBeDisabled();

      expect(select).toHaveValue(status);

      expect(within(select).getAllByRole("option")).toHaveLength(1);

      submitForm();

      await waitFor(() => {
        expect(mockUpdateClaim).toHaveBeenCalledWith(claimId, {
          ...originalPayload,
          status,
        });

        expect(mockOnUpdated).toHaveBeenCalledTimes(1);
      });
    },
  );

  // =====================================
  // REQUIRED FIELD VALIDATION
  // =====================================

  // 28. Empty form

  it("should display all required field validation errors", async () => {
    await renderLoadedForm();

    changeField("Claim Number", "");

    changeField("Claim Amount", "");

    changeField("Claim Date", "");

    changeField("Description", "");

    changeField("Select Policy", "");

    submitForm();

    const errors = [
      "Claim number is required.",
      "Claim amount must be greater than $0.",
      "Please select a claim date.",
      "Claim description is required.",
      "Please select a valid policy.",
    ];

    errors.forEach((message) => {
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    expect(screen.getAllByRole("alert")).toHaveLength(5);

    expect(mockGetAllClaims).not.toHaveBeenCalled();

    expect(mockUpdateClaim).not.toHaveBeenCalled();
  });

  // 29–30. Whitespace validation

  it.each([
    ["Claim Number", "Claim number is required."],
    ["Description", "Claim description is required."],
  ])(
    "should reject whitespace-only values for %s",
    async (label, errorMessage) => {
      await renderLoadedForm();

      changeField(label, "   ");

      submitForm();

      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      expect(mockUpdateClaim).not.toHaveBeenCalled();
    },
  );

  // =====================================
  // LENGTH VALIDATION TESTS
  // =====================================

  // 31–32. Invalid claim number lengths

  it.each(["AB", "A".repeat(51)])(
    "should reject an invalid claim number length",
    async (claimNumber) => {
      await renderLoadedForm();

      changeField("Claim Number", claimNumber);

      submitForm();

      expect(
        screen.getByText(
          "Claim number must contain between 3 and 50 characters.",
        ),
      ).toBeInTheDocument();

      expect(mockUpdateClaim).not.toHaveBeenCalled();
    },
  );

  // 33. Description maximum length

  it("should reject descriptions longer than 1000 characters", async () => {
    await renderLoadedForm();

    changeField("Description", "A".repeat(1001));

    submitForm();

    expect(
      screen.getByText("Description cannot exceed 1000 characters."),
    ).toBeInTheDocument();

    expect(mockUpdateClaim).not.toHaveBeenCalled();
  });

  // 34. Description boundary

  it("should accept a description containing exactly 1000 characters", async () => {
    await renderLoadedForm();

    const description = "A".repeat(1000);

    changeField("Description", description);

    submitForm();

    await waitFor(() => {
      expect(mockUpdateClaim).toHaveBeenCalledWith(claimId, {
        ...originalPayload,
        description,
      });

      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================
  // CLAIM AMOUNT VALIDATION
  // =====================================

  // 35–38. Invalid claim amounts

  it.each([
    [0, "Claim amount must be greater than $0."],
    [-100, "Claim amount must be greater than $0."],
    [
      100.123,
      "Amount must have at most 13 integer digits and 2 decimal places.",
    ],
    [
      10000000000000,
      "Amount must have at most 13 integer digits and 2 decimal places.",
    ],
  ] as const)(
    "should reject an invalid claim amount of %s",
    async (amount, errorMessage) => {
      await renderLoadedForm();

      changeField("Claim Amount", amount);

      submitForm();

      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      expect(mockUpdateClaim).not.toHaveBeenCalled();
    },
  );

  // 39. Valid maximum claim amount

  it("should accept an amount with 13 integer digits and two decimal places", async () => {
    await renderLoadedForm();

    const amount = 9999999999999.99;

    changeField("Claim Amount", amount);

    submitForm();

    await waitFor(() => {
      expect(mockUpdateClaim).toHaveBeenCalledWith(claimId, {
        ...originalPayload,
        claimAmount: amount,
      });

      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================
  // CLAIM DATE VALIDATION
  // =====================================

  // 40. Future date

  it("should reject future claim dates", async () => {
    await renderLoadedForm();

    changeField("Claim Date", "2026-11-19");

    submitForm();

    expect(
      screen.getByText("Claim date cannot be in the future."),
    ).toBeInTheDocument();

    expect(mockUpdateClaim).not.toHaveBeenCalled();
  });

  // 41. Today's date

  it("should accept a claim date equal to today", async () => {
    await renderLoadedForm();

    changeField("Claim Date", "2026-11-18");

    submitForm();

    await waitFor(() => {
      expect(mockUpdateClaim).toHaveBeenCalledWith(claimId, {
        ...originalPayload,
        claimDate: "2026-11-18",
      });

      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================
  // POLICY VALIDATION
  // =====================================

  // 42. Missing policy

  it("should reject an empty policy selection", async () => {
    await renderLoadedForm();

    changeField("Select Policy", "");

    submitForm();

    expect(
      screen.getByText("Please select a valid policy."),
    ).toBeInTheDocument();

    expect(mockUpdateClaim).not.toHaveBeenCalled();
  });

  // 43. Unknown policy

  it("should reject a claim referencing an unknown policy", async () => {
    await renderLoadedForm({
      policyId: 999,
    });

    expect(
      screen.queryByText("Selected Policy Details"),
    ).not.toBeInTheDocument();

    submitForm();

    expect(
      screen.getByText("Please select a valid policy."),
    ).toBeInTheDocument();

    expect(mockUpdateClaim).not.toHaveBeenCalled();
  });

  // =====================================
  // ACCESSIBILITY AND FIELD ERRORS
  // =====================================

  // 44. Accessible validation errors

  it("should mark invalid fields with aria-invalid", async () => {
    await renderLoadedForm();

    const labels = [
      "Claim Number",
      "Claim Amount",
      "Claim Date",
      "Description",
      "Select Policy",
    ];

    labels.forEach((label) => {
      changeField(label, "");
    });

    submitForm();

    labels.forEach((label) => {
      expect(screen.getByLabelText(label)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    expect(screen.getAllByRole("alert")).toHaveLength(5);
  });

  // 45. Clear individual field errors

  it("should clear only the relevant validation error when editing a field", async () => {
    await renderLoadedForm();

    changeField("Claim Number", "");

    changeField("Description", "");

    submitForm();

    expect(screen.getByText("Claim number is required.")).toBeInTheDocument();

    expect(
      screen.getByText("Claim description is required."),
    ).toBeInTheDocument();

    changeField("Claim Number", "CLM-003");

    expect(
      screen.queryByText("Claim number is required."),
    ).not.toBeInTheDocument();

    expect(screen.getByLabelText("Claim Number")).toHaveAttribute(
      "aria-invalid",
      "false",
    );

    expect(
      screen.getByText("Claim description is required."),
    ).toBeInTheDocument();
  });

  // =====================================
  // DUPLICATE CLAIM VALIDATION
  // =====================================

  // 46. Exclude current claim

  it("should allow retaining the current claim number", async () => {
    mockGetAllClaims.mockResolvedValue([existingClaim]);

    await renderLoadedForm();

    submitForm();

    await waitFor(() => {
      expect(mockUpdateClaim).toHaveBeenCalledWith(claimId, originalPayload);

      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });
  });

  // 47. Duplicate claim number

  it("should reject a number belonging to another claim", async () => {
    mockGetAllClaims.mockResolvedValue([existingClaim, anotherClaim]);

    await renderLoadedForm();

    changeField("Claim Number", "CLM-002");

    submitForm();

    expect(
      await screen.findByText(
        "This claim number already exists. Please use another.",
      ),
    ).toBeInTheDocument();

    expect(mockUpdateClaim).not.toHaveBeenCalled();

    expect(mockOnUpdated).not.toHaveBeenCalled();

    expect(getUpdateButton()).toBeEnabled();
  });

  // 48. Case-insensitive duplicate

  it("should detect duplicate claim numbers regardless of whitespace and case", async () => {
    mockGetAllClaims.mockResolvedValue([
      existingClaim,
      {
        ...anotherClaim,
        claimNumber: "  clm-002  ",
      },
    ]);

    await renderLoadedForm();

    changeField("Claim Number", "  CLM-002  ");

    submitForm();

    expect(
      await screen.findByText(
        "This claim number already exists. Please use another.",
      ),
    ).toBeInTheDocument();

    expect(mockUpdateClaim).not.toHaveBeenCalled();
  });

  // =====================================
  // SUCCESSFUL UPDATE
  // =====================================

  // 49. Update complete claim details

  it("should update a claim with the correct ID and normalized request payload", async () => {
    mockGetAllClaims.mockResolvedValue([existingClaim, anotherClaim]);

    await renderLoadedForm();

    changeField("Claim Number", "  CLM-003  ");

    changeField("Claim Amount", 2500.75);

    changeField("Claim Date", "2026-11-12");

    changeField("Description", "  Updated vehicle accident claim  ");

    changeField("Claim Status", "APPROVED");

    changeField("Select Policy", "2");

    const expectedPayload: CreateClaimRequest = {
      claimNumber: "CLM-003",
      claimAmount: 2500.75,
      claimDate: "2026-11-12",
      description: "Updated vehicle accident claim",
      status: "APPROVED",
      policyId: 2,
    };

    submitForm();

    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);

    expect(mockUpdateClaim).toHaveBeenCalledTimes(1);

    expect(mockUpdateClaim).toHaveBeenCalledWith(claimId, expectedPayload);

    expect(mockOnCancel).not.toHaveBeenCalled();

    expect(screen.getByLabelText("Claim Number")).toHaveValue("  CLM-003  ");
  });

  // =====================================
  // CANCEL INTERACTION
  // =====================================

  // 50. Cancel claim editing

  it("should call onCancel without updating the claim", async () => {
    await renderLoadedForm();

    changeField("Description", "Unsaved description");

    fireEvent.click(getCancelButton());

    expect(mockOnCancel).toHaveBeenCalledTimes(1);

    expect(mockGetAllClaims).not.toHaveBeenCalled();

    expect(mockUpdateClaim).not.toHaveBeenCalled();

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });

  // =====================================
  // API ERROR HANDLING
  // =====================================

  // 51. Fetch claims failure

  it("should display an error when fetching existing claims fails", async () => {
    mockGetAllClaims.mockRejectedValue(new Error("Unable to retrieve claims."));

    await renderLoadedForm();

    submitForm();

    expect(
      await screen.findByText("Unable to retrieve claims."),
    ).toBeInTheDocument();

    expect(mockUpdateClaim).not.toHaveBeenCalled();

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });

  // 52. Update claim failure

  it("should preserve edited values when the update fails", async () => {
    mockUpdateClaim.mockRejectedValue(new Error("Unable to update claim."));

    await renderLoadedForm();

    changeField("Description", "Updated description");

    changeField("Claim Amount", 2500);

    submitForm();

    const error = await screen.findByText("Unable to update claim.");

    expect(error).toHaveAttribute("role", "alert");

    expect(error).toHaveClass("claim-form-error");

    expect(screen.getByLabelText("Description")).toHaveValue(
      "Updated description",
    );

    expect(screen.getByLabelText("Claim Amount")).toHaveValue(2500);

    expect(getUpdateButton()).toBeEnabled();

    expect(getCancelButton()).toBeEnabled();

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });

  // 53. Non-Error exception

  it("should display a fallback message for non-Error exceptions", async () => {
    mockUpdateClaim.mockRejectedValue("Unexpected failure");

    await renderLoadedForm();

    submitForm();

    expect(
      await screen.findByText("Failed to update claim. Please try again."),
    ).toBeInTheDocument();

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });

  // 54. Clear API error

  it("should clear an API error when a field is edited", async () => {
    mockUpdateClaim.mockRejectedValue(new Error("Update failed."));

    await renderLoadedForm();

    submitForm();

    expect(await screen.findByText("Update failed.")).toBeInTheDocument();

    changeField("Description", "New claim description");

    expect(screen.queryByText("Update failed.")).not.toBeInTheDocument();
  });

  // =====================================
  // LOADING AND DUPLICATE SUBMISSION
  // =====================================

  // 55. Saving guard

  it("should disable action buttons and prevent duplicate submissions while updating", async () => {
    let resolveUpdate!: (claim: Claim) => void;

    mockUpdateClaim.mockReturnValueOnce(
      new Promise<Claim>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    await renderLoadedForm();

    submitForm();

    await waitFor(() => {
      expect(mockUpdateClaim).toHaveBeenCalledTimes(1);
    });

    const updateButton = screen.getByRole("button", {
      name: "Updating...",
    });

    const cancelButton = getCancelButton();

    expect(updateButton).toBeDisabled();

    expect(cancelButton).toBeDisabled();

    fireEvent.click(updateButton);

    fireEvent.click(cancelButton);

    const form = updateButton.closest("form");

    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);

    expect(mockUpdateClaim).toHaveBeenCalledTimes(1);

    expect(mockOnCancel).not.toHaveBeenCalled();

    expect(mockOnUpdated).not.toHaveBeenCalled();

    await act(async () => {
      resolveUpdate(existingClaim);
    });

    await waitFor(() => {
      expect(getUpdateButton()).toBeEnabled();

      expect(getCancelButton()).toBeEnabled();

      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });
  });
});
