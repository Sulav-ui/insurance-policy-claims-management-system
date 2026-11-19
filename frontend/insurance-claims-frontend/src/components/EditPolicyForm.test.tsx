import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import EditPolicyForm from "./EditPolicyForm";

import {
  updatePolicy,
  getAllPolicies,
  type CreatePolicyRequest,
} from "../services/policyService";

import type { Policy } from "../types/Policy";

// =====================================
// MOCK SERVICES
// =====================================

vi.mock("../services/policyService", () => ({
  updatePolicy: vi.fn(),
  getAllPolicies: vi.fn(),
}));

const mockUpdatePolicy = vi.mocked(updatePolicy);
const mockGetAllPolicies = vi.mocked(getAllPolicies);

const mockOnUpdated = vi.fn();
const mockOnCancel = vi.fn();

// =====================================
// MOCK DATA
// =====================================

const existingPolicy: Policy = {
  id: 1,
  policyNumber: "POL-001",
  policyHolderName: "John Smith",
  policyType: "HEALTH",
  premiumAmount: 1500,
  startDate: "2030-01-01",
  endDate: "2031-01-01",
  status: "ACTIVE",
};

const anotherPolicy: Policy = {
  ...existingPolicy,
  id: 2,
  policyNumber: "POL-002",
  policyHolderName: "Jane Smith",
};

const { id: policyId, ...originalPayload } = existingPolicy;

// =====================================
// HELPER FUNCTIONS
// =====================================

function renderForm(overrides: Partial<Policy> = {}) {
  return render(
    <EditPolicyForm
      policy={{
        ...existingPolicy,
        ...overrides,
      }}
      onUpdated={mockOnUpdated}
      onCancel={mockOnCancel}
    />,
  );
}

function changeField(label: string, value: string | number) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  });
}

function submitForm() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Update Policy",
    }),
  );
}

// =====================================
// EDIT POLICY FORM TESTS
// =====================================

describe("EditPolicyForm Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockGetAllPolicies.mockResolvedValue([existingPolicy]);

    mockUpdatePolicy.mockResolvedValue(existingPolicy);
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Form heading

  it("should render the Edit Policy heading with the policy number", () => {
    renderForm();

    expect(
      screen.getByRole("heading", {
        name: "Edit Policy: POL-001",
      }),
    ).toBeInTheDocument();
  });

  // 2. Render all fields

  it("should render all policy input fields", () => {
    renderForm();

    const labels = [
      "Policy Number",
      "Policy Holder Name",
      "Policy Type",
      "Premium Amount",
      "Start Date",
      "End Date",
      "Policy Status",
    ];

    labels.forEach((label) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
  });

  // 3. Pre-populate text fields

  it("should populate existing policy text values", () => {
    renderForm();

    expect(screen.getByLabelText("Policy Number")).toHaveValue("POL-001");

    expect(screen.getByLabelText("Policy Holder Name")).toHaveValue(
      "John Smith",
    );

    expect(screen.getByLabelText("Policy Type")).toHaveValue("HEALTH");
  });

  // 4. Pre-populate premium

  it("should populate the existing premium amount", () => {
    renderForm();

    expect(screen.getByLabelText("Premium Amount")).toHaveValue(1500);
  });

  // 5. Pre-populate dates

  it("should populate the existing policy dates", () => {
    renderForm();

    expect(screen.getByLabelText("Start Date")).toHaveValue("2030-01-01");

    expect(screen.getByLabelText("End Date")).toHaveValue("2031-01-01");
  });

  // 6. Pre-populate status

  it("should populate the existing policy status", () => {
    renderForm();

    expect(screen.getByLabelText("Policy Status")).toHaveValue("ACTIVE");
  });

  // 7. Available statuses

  it("should render all four supported policy statuses", () => {
    renderForm();

    const select = screen.getByLabelText("Policy Status");

    const options = within(select).getAllByRole("option");

    expect(options).toHaveLength(4);

    expect(
      options.map((option) => (option as HTMLOptionElement).value),
    ).toEqual(["ACTIVE", "INACTIVE", "EXPIRED", "CANCELLED"]);
  });

  // 8. Form action buttons

  it("should render enabled Update Policy and Cancel buttons", () => {
    renderForm();

    const updateButton = screen.getByRole("button", {
      name: "Update Policy",
    });

    const cancelButton = screen.getByRole("button", {
      name: "Cancel",
    });

    expect(updateButton).toBeEnabled();

    expect(cancelButton).toBeEnabled();

    expect(updateButton).toHaveAttribute("type", "submit");

    expect(cancelButton).toHaveAttribute("type", "button");
  });

  // =====================================
  // INPUT INTERACTION TESTS
  // =====================================

  // 9. Update text fields

  it("should allow editing policy text fields", () => {
    renderForm();

    changeField("Policy Number", "POL-003");

    changeField("Policy Holder Name", "Michael Brown");

    changeField("Policy Type", "AUTO");

    expect(screen.getByLabelText("Policy Number")).toHaveValue("POL-003");

    expect(screen.getByLabelText("Policy Holder Name")).toHaveValue(
      "Michael Brown",
    );

    expect(screen.getByLabelText("Policy Type")).toHaveValue("AUTO");
  });

  // 10. Update premium

  it("should allow editing the premium amount", () => {
    renderForm();

    changeField("Premium Amount", "2500.75");

    expect(screen.getByLabelText("Premium Amount")).toHaveValue(2500.75);
  });

  // 11. Clear premium

  it("should allow clearing the premium amount", () => {
    renderForm();

    changeField("Premium Amount", "");

    expect(screen.getByLabelText("Premium Amount")).toHaveValue(null);
  });

  // 12. Update dates

  it("should allow editing start and end dates", () => {
    renderForm();

    changeField("Start Date", "2030-02-01");

    changeField("End Date", "2031-02-01");

    expect(screen.getByLabelText("Start Date")).toHaveValue("2030-02-01");

    expect(screen.getByLabelText("End Date")).toHaveValue("2031-02-01");
  });

  // 13. Dynamic minimum end date

  it("should update the minimum end date when the start date changes", () => {
    renderForm();

    const endDate = screen.getByLabelText("End Date");

    expect(endDate).toHaveAttribute("min", "2030-01-01");

    changeField("Start Date", "2030-03-01");

    expect(endDate).toHaveAttribute("min", "2030-03-01");

    changeField("Start Date", "");

    expect(endDate).not.toHaveAttribute("min");
  });

  // =====================================
  // STATUS TESTS
  // =====================================

  // 14–17. Preserve supported statuses

  it.each(["ACTIVE", "INACTIVE", "EXPIRED", "CANCELLED"] as const)(
    "should preserve an existing %s policy status",
    async (status) => {
      renderForm({ status });

      expect(screen.getByLabelText("Policy Status")).toHaveValue(status);

      submitForm();

      await waitFor(() => {
        expect(mockUpdatePolicy).toHaveBeenCalledWith(policyId, {
          ...originalPayload,
          status,
        });

        expect(mockOnUpdated).toHaveBeenCalledTimes(1);
      });
    },
  );

  // 18. Change status

  it("should allow changing the policy status", async () => {
    renderForm();

    changeField("Policy Status", "CANCELLED");

    expect(screen.getByLabelText("Policy Status")).toHaveValue("CANCELLED");

    submitForm();

    await waitFor(() => {
      expect(mockUpdatePolicy).toHaveBeenCalledWith(policyId, {
        ...originalPayload,
        status: "CANCELLED",
      });

      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================
  // REQUIRED FIELD VALIDATION
  // =====================================

  // 19–24. Required fields

  it.each([
    ["Policy Number", "Policy number is required."],
    ["Policy Holder Name", "Policy holder name is required."],
    ["Policy Type", "Policy type is required."],
    ["Premium Amount", "Premium amount must be greater than $0."],
    ["Start Date", "Start date is required."],
    ["End Date", "End date is required."],
  ])("should reject an empty %s field", (label, errorMessage) => {
    renderForm();

    changeField(label, "");

    submitForm();

    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    expect(screen.getByLabelText(label)).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    expect(mockGetAllPolicies).not.toHaveBeenCalled();

    expect(mockUpdatePolicy).not.toHaveBeenCalled();

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });

  // =====================================
  // LENGTH VALIDATION TESTS
  // =====================================

  // 25–28. Length validation

  it.each([
    [
      "Policy Number",
      "AB",
      "Policy number must contain between 3 and 50 characters.",
    ],
    [
      "Policy Number",
      "A".repeat(51),
      "Policy number must contain between 3 and 50 characters.",
    ],
    [
      "Policy Holder Name",
      "A".repeat(101),
      "Policy holder name cannot exceed 100 characters.",
    ],
    ["Policy Type", "A".repeat(51), "Policy type cannot exceed 50 characters."],
  ])("should reject an invalid length for %s", (label, value, errorMessage) => {
    renderForm();

    changeField(label, value);

    submitForm();

    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    expect(mockUpdatePolicy).not.toHaveBeenCalled();
  });

  // =====================================
  // PREMIUM VALIDATION TESTS
  // =====================================

  // 29–31. Invalid premiums

  it.each([
    [0, "Premium amount must be greater than $0."],
    [-100, "Premium amount must be greater than $0."],
    [100.123, "Premium amount can have at most 2 decimal places."],
  ] as const)(
    "should reject an invalid premium of %s",
    (premium, errorMessage) => {
      renderForm();

      changeField("Premium Amount", premium);

      submitForm();

      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      expect(mockUpdatePolicy).not.toHaveBeenCalled();
    },
  );

  // =====================================
  // DATE VALIDATION TESTS
  // =====================================

  // 32–33. Invalid date ranges

  it.each(["2029-12-31", "2030-01-01"])(
    "should reject an invalid end date of %s",
    (endDate) => {
      renderForm();

      changeField("End Date", endDate);

      submitForm();

      expect(
        screen.getByText("End date must be after the start date."),
      ).toBeInTheDocument();

      expect(mockUpdatePolicy).not.toHaveBeenCalled();
    },
  );

  // =====================================
  // FIELD ERROR STATE TESTS
  // =====================================

  // 34. Clear individual field errors

  it("should clear only the relevant field error when an input changes", () => {
    renderForm();

    changeField("Policy Number", "");

    changeField("Policy Holder Name", "");

    submitForm();

    expect(screen.getByText("Policy number is required.")).toBeInTheDocument();

    expect(
      screen.getByText("Policy holder name is required."),
    ).toBeInTheDocument();

    changeField("Policy Number", "POL-003");

    expect(
      screen.queryByText("Policy number is required."),
    ).not.toBeInTheDocument();

    expect(screen.getByLabelText("Policy Number")).toHaveAttribute(
      "aria-invalid",
      "false",
    );

    expect(
      screen.getByText("Policy holder name is required."),
    ).toBeInTheDocument();
  });

  // =====================================
  // DUPLICATE POLICY VALIDATION
  // =====================================

  // 35. Exclude current policy

  it("should allow keeping the current policy number", async () => {
    mockGetAllPolicies.mockResolvedValue([existingPolicy]);

    renderForm();

    submitForm();

    await waitFor(() => {
      expect(mockUpdatePolicy).toHaveBeenCalledWith(policyId, originalPayload);

      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.queryByText(
        "This policy number already exists. Please use another.",
      ),
    ).not.toBeInTheDocument();
  });

  // 36. Reject another policy's number

  it("should reject a policy number belonging to another policy", async () => {
    mockGetAllPolicies.mockResolvedValue([existingPolicy, anotherPolicy]);

    renderForm();

    changeField("Policy Number", "POL-002");

    submitForm();

    expect(
      await screen.findByText(
        "This policy number already exists. Please use another.",
      ),
    ).toBeInTheDocument();

    expect(mockUpdatePolicy).not.toHaveBeenCalled();

    expect(mockOnUpdated).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", {
        name: "Update Policy",
      }),
    ).toBeEnabled();
  });

  // 37. Case-insensitive duplicate comparison

  it("should detect duplicates regardless of case and whitespace", async () => {
    mockGetAllPolicies.mockResolvedValue([
      existingPolicy,
      {
        ...anotherPolicy,
        policyNumber: "  pol-002  ",
      },
    ]);

    renderForm();

    changeField("Policy Number", "  POL-002  ");

    submitForm();

    expect(
      await screen.findByText(
        "This policy number already exists. Please use another.",
      ),
    ).toBeInTheDocument();

    expect(mockUpdatePolicy).not.toHaveBeenCalled();
  });

  // =====================================
  // SUCCESSFUL UPDATE TESTS
  // =====================================

  // 38. Update a policy successfully

  it("should update a policy with the correct ID and request payload", async () => {
    mockGetAllPolicies.mockResolvedValue([existingPolicy, anotherPolicy]);

    renderForm();

    changeField("Policy Number", "POL-003");

    changeField("Policy Holder Name", "Michael Brown");

    changeField("Policy Type", "AUTO");

    changeField("Premium Amount", 2500.75);

    changeField("Start Date", "2030-02-01");

    changeField("End Date", "2031-02-01");

    changeField("Policy Status", "INACTIVE");

    const expectedPayload: CreatePolicyRequest = {
      policyNumber: "POL-003",
      policyHolderName: "Michael Brown",
      policyType: "AUTO",
      premiumAmount: 2500.75,
      startDate: "2030-02-01",
      endDate: "2031-02-01",
      status: "INACTIVE",
    };

    submitForm();

    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);

    expect(mockUpdatePolicy).toHaveBeenCalledTimes(1);

    expect(mockUpdatePolicy).toHaveBeenCalledWith(policyId, expectedPayload);

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  // 39. Trim whitespace before updating

  it("should trim text fields before submitting the update", async () => {
    renderForm();

    changeField("Policy Number", "  POL-003  ");

    changeField("Policy Holder Name", "  John Smith  ");

    changeField("Policy Type", "  HEALTH  ");

    submitForm();

    await waitFor(() => {
      expect(mockUpdatePolicy).toHaveBeenCalledWith(policyId, {
        ...originalPayload,
        policyNumber: "POL-003",
      });

      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================
  // CANCEL INTERACTION TESTS
  // =====================================

  // 40. Cancel editing

  it("should call onCancel without updating the policy", async () => {
    const user = userEvent.setup();

    renderForm();

    changeField("Policy Holder Name", "Unsaved Name");

    await user.click(
      screen.getByRole("button", {
        name: "Cancel",
      }),
    );

    expect(mockOnCancel).toHaveBeenCalledTimes(1);

    expect(mockGetAllPolicies).not.toHaveBeenCalled();

    expect(mockUpdatePolicy).not.toHaveBeenCalled();

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });

  // =====================================
  // API ERROR HANDLING TESTS
  // =====================================

  // 41. Fetch policies failure

  it("should display an error when fetching existing policies fails", async () => {
    mockGetAllPolicies.mockRejectedValue(
      new Error("Unable to retrieve policies."),
    );

    renderForm();

    submitForm();

    expect(
      await screen.findByText("Unable to retrieve policies."),
    ).toBeInTheDocument();

    expect(mockUpdatePolicy).not.toHaveBeenCalled();

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });

  // 42. Update policy failure

  it("should display the API error and preserve edited values", async () => {
    mockUpdatePolicy.mockRejectedValue(new Error("Unable to update policy."));

    renderForm();

    changeField("Policy Holder Name", "Michael Brown");

    submitForm();

    const error = await screen.findByText("Unable to update policy.");

    expect(error).toHaveClass("claim-form-error");

    expect(error).toHaveAttribute("role", "alert");

    expect(screen.getByLabelText("Policy Holder Name")).toHaveValue(
      "Michael Brown",
    );

    expect(mockOnUpdated).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", {
        name: "Update Policy",
      }),
    ).toBeEnabled();

    expect(
      screen.getByRole("button", {
        name: "Cancel",
      }),
    ).toBeEnabled();
  });

  // 43. Non-Error exception

  it("should display the fallback error for non-Error exceptions", async () => {
    mockUpdatePolicy.mockRejectedValue("Unexpected failure");

    renderForm();

    submitForm();

    expect(
      await screen.findByText("Failed to update policy. Please try again."),
    ).toBeInTheDocument();

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });

  // 44. Clear API error

  it("should clear the API error when a field is edited", async () => {
    mockUpdatePolicy.mockRejectedValue(new Error("Update failed."));

    renderForm();

    submitForm();

    expect(await screen.findByText("Update failed.")).toBeInTheDocument();

    changeField("Policy Number", "POL-003");

    expect(screen.queryByText("Update failed.")).not.toBeInTheDocument();
  });

  // =====================================
  // LOADING AND DUPLICATE SUBMISSION
  // =====================================

  // 45. Loading state and saving guard

  it("should disable both buttons and prevent duplicate submissions while saving", async () => {
    let resolveUpdate!: (value: Policy) => void;

    mockUpdatePolicy.mockReturnValueOnce(
      new Promise<Policy>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    renderForm();

    submitForm();

    await waitFor(() => {
      expect(mockUpdatePolicy).toHaveBeenCalledTimes(1);
    });

    const updateButton = screen.getByRole("button", {
      name: "Updating...",
    });

    const cancelButton = screen.getByRole("button", {
      name: "Cancel",
    });

    expect(updateButton).toBeDisabled();

    expect(cancelButton).toBeDisabled();

    fireEvent.click(updateButton);

    fireEvent.click(cancelButton);

    const form = updateButton.closest("form");

    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);

    expect(mockUpdatePolicy).toHaveBeenCalledTimes(1);

    expect(mockOnCancel).not.toHaveBeenCalled();

    expect(mockOnUpdated).not.toHaveBeenCalled();

    await act(async () => {
      resolveUpdate(existingPolicy);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Update Policy",
        }),
      ).toBeEnabled();

      expect(
        screen.getByRole("button", {
          name: "Cancel",
        }),
      ).toBeEnabled();

      expect(mockOnUpdated).toHaveBeenCalledTimes(1);
    });
  });
});
