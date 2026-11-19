import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import ClaimForm from "./ClaimForm";

import {
  createClaim,
  getAllClaims,
  type CreateClaimRequest,
} from "../services/claimService";

import { getAllPolicies } from "../services/policyService";

import type { Policy } from "../types/Policy";
import type { Claim } from "../types/Claim";

// =====================================
// MOCK SERVICES
// =====================================

vi.mock("../services/claimService", () => ({
  createClaim: vi.fn(),
  getAllClaims: vi.fn(),
}));

vi.mock("../services/policyService", () => ({
  getAllPolicies: vi.fn(),
}));

const mockCreateClaim = vi.mocked(createClaim);
const mockGetAllClaims = vi.mocked(getAllClaims);
const mockGetAllPolicies = vi.mocked(getAllPolicies);

const mockOnClaimCreated = vi.fn();

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
  premiumAmount: 2000,
  startDate: "2026-01-01",
  endDate: "2027-01-01",
  status: "INACTIVE",
};

const validClaim: CreateClaimRequest = {
  claimNumber: "CLM-001",
  claimAmount: 1800,
  claimDate: "2026-11-10",
  description: "Medical expense claim",
  status: "PENDING",
  policyId: 1,
};

const existingClaim: Claim = {
  id: 1,
  ...validClaim,
};

// =====================================
// HELPER FUNCTIONS
// =====================================

function renderForm() {
  return render(<ClaimForm onClaimCreated={mockOnClaimCreated} />);
}

async function renderLoadedForm() {
  const result = renderForm();

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

function fillValidForm(overrides: Partial<CreateClaimRequest> = {}) {
  const claim = {
    ...validClaim,
    ...overrides,
  };

  changeField("Claim Number", claim.claimNumber);

  changeField("Claim Amount ($)", claim.claimAmount);

  changeField("Claim Date", claim.claimDate);

  changeField("Description", claim.description);

  changeField("Select Policy", claim.policyId || "");
}

function submitForm() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Create Claim",
    }),
  );
}

function getCreateButton() {
  return screen.getByRole("button", {
    name: "Create Claim",
  });
}

// =====================================
// CLAIM FORM COMPONENT TESTS
// =====================================

describe("ClaimForm Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Freeze the date without replacing timer functions.
    vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));

    mockGetAllPolicies.mockResolvedValue([firstPolicy, secondPolicy]);

    mockGetAllClaims.mockResolvedValue([]);

    mockCreateClaim.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Form heading

  it("should render the Create Claim heading", async () => {
    await renderLoadedForm();

    expect(
      screen.getByRole("heading", {
        name: "Create Claim",
      }),
    ).toBeInTheDocument();
  });

  // 2. Render all fields

  it("should render all claim form fields", async () => {
    await renderLoadedForm();

    const labels = [
      "Claim Number",
      "Claim Amount ($)",
      "Claim Date",
      "Description",
      "Claim Status",
      "Select Policy",
    ];

    labels.forEach((label) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
  });

  // 3. Initial values

  it("should initialize the form with empty values", async () => {
    await renderLoadedForm();

    expect(screen.getByLabelText("Claim Number")).toHaveValue("");

    expect(screen.getByLabelText("Claim Amount ($)")).toHaveValue(null);

    expect(screen.getByLabelText("Claim Date")).toHaveValue("");

    expect(screen.getByLabelText("Description")).toHaveValue("");

    expect(screen.getByLabelText("Select Policy")).toHaveValue("");
  });

  // 4. Default claim status

  it("should default the claim status to PENDING", async () => {
    await renderLoadedForm();

    expect(screen.getByLabelText("Claim Status")).toHaveValue("PENDING");
  });

  // 5. Disabled status field

  it("should prevent users from modifying the initial claim status", async () => {
    await renderLoadedForm();

    const status = screen.getByLabelText("Claim Status");

    expect(status).toBeDisabled();

    expect(within(status).getAllByRole("option")).toHaveLength(1);
  });

  // 6. Input constraints

  it("should render the correct input constraints", async () => {
    await renderLoadedForm();

    expect(screen.getByLabelText("Claim Number")).toHaveAttribute(
      "maxlength",
      "50",
    );

    const amount = screen.getByLabelText("Claim Amount ($)");

    expect(amount).toHaveAttribute("min", "0.01");

    expect(amount).toHaveAttribute("step", "0.01");

    expect(screen.getByLabelText("Claim Date")).toHaveAttribute(
      "max",
      "2026-11-18",
    );
  });

  // 7. Submit button

  it("should enable the Create Claim button when policies are loaded", async () => {
    await renderLoadedForm();

    expect(getCreateButton()).toBeEnabled();

    expect(getCreateButton()).toHaveAttribute("type", "submit");
  });

  // =====================================
  // POLICY LOADING TESTS
  // =====================================

  // 8. Fetch policies on mount

  it("should fetch available policies when the component mounts", async () => {
    await renderLoadedForm();

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);

    expect(mockGetAllClaims).not.toHaveBeenCalled();
  });

  // 9. Loading state

  it("should disable policy selection and submission while policies are loading", async () => {
    let resolvePolicies!: (policies: Policy[]) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((resolve) => {
        resolvePolicies = resolve;
      }),
    );

    renderForm();

    expect(screen.getByText("Loading policies...")).toBeInTheDocument();

    expect(screen.getByLabelText("Select Policy")).toBeDisabled();

    expect(getCreateButton()).toBeDisabled();

    await act(async () => {
      resolvePolicies([firstPolicy]);
    });

    expect(screen.getByLabelText("Select Policy")).toBeEnabled();

    expect(getCreateButton()).toBeEnabled();

    expect(screen.queryByText("Loading policies...")).not.toBeInTheDocument();
  });

  // 10. Populate policy options

  it("should populate the dropdown with available policies", async () => {
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

  // 11. Empty policies

  it("should disable claim creation when no policies are available", async () => {
    mockGetAllPolicies.mockResolvedValue([]);

    renderForm();

    await waitFor(() => {
      expect(screen.getByLabelText("Select Policy")).toBeEnabled();
    });

    expect(screen.getByText("Select a Policy")).toBeInTheDocument();

    expect(getCreateButton()).toBeDisabled();
  });

  // 12. Policy loading error

  it("should display an error when loading policies fails", async () => {
    mockGetAllPolicies.mockRejectedValue(
      new Error("Unable to retrieve policies."),
    );

    renderForm();

    const error = await screen.findByText("Unable to retrieve policies.");

    expect(error).toHaveAttribute("role", "alert");

    expect(error).toHaveClass("claim-form-error");

    expect(getCreateButton()).toBeDisabled();
  });

  // 13. Non-Error loading exception

  it("should display a fallback message for non-Error policy loading failures", async () => {
    mockGetAllPolicies.mockRejectedValue("Unexpected failure");

    renderForm();

    expect(
      await screen.findByText("Failed to load policies."),
    ).toBeInTheDocument();

    expect(getCreateButton()).toBeDisabled();
  });

  // 14. Prevent submission while loading

  it("should prevent direct form submission while policies are loading", async () => {
    let resolvePolicies!: (policies: Policy[]) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((resolve) => {
        resolvePolicies = resolve;
      }),
    );

    renderForm();

    const form = getCreateButton().closest("form");

    fireEvent.submit(form!);

    expect(mockGetAllClaims).not.toHaveBeenCalled();

    expect(mockCreateClaim).not.toHaveBeenCalled();

    await act(async () => {
      resolvePolicies([firstPolicy]);
    });
  });

  // 15. Unmount before successful fetch

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
        name: "Create Claim",
      }),
    ).not.toBeInTheDocument();

    expect(mockOnClaimCreated).not.toHaveBeenCalled();
  });

  // 16. Unmount before failed fetch

  it("should safely handle a policy loading failure after unmounting", async () => {
    let rejectPolicies!: (reason: Error) => void;

    mockGetAllPolicies.mockReturnValueOnce(
      new Promise<Policy[]>((_, reject) => {
        rejectPolicies = reject;
      }),
    );

    const { unmount } = renderForm();

    unmount();

    await act(async () => {
      rejectPolicies(new Error("Policy loading failed."));
    });

    expect(
      screen.queryByText("Policy loading failed."),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // SELECTED POLICY DETAILS
  // =====================================

  // 17. No initial policy details

  it("should not display policy details before a policy is selected", async () => {
    await renderLoadedForm();

    expect(
      screen.queryByText("Selected Policy Details"),
    ).not.toBeInTheDocument();
  });

  // 18. Selected policy details

  it("should display the selected policy information", async () => {
    const { container } = await renderLoadedForm();

    changeField("Select Policy", "1");

    expect(
      screen.getByRole("heading", {
        name: "Selected Policy Details",
      }),
    ).toBeInTheDocument();

    const details = container.querySelector(".selected-policy-details");

    expect(details).toHaveTextContent("Policy Number: POL-001");

    expect(details).toHaveTextContent("Policyholder: John Smith");

    expect(details).toHaveTextContent("Policy Type: HEALTH");

    expect(within(details as HTMLElement).getByText("ACTIVE")).toHaveClass(
      "status-badge",
      "active",
    );
  });

  // 19. Change selected policy

  it("should update policy details when another policy is selected", async () => {
    const { container } = await renderLoadedForm();

    changeField("Select Policy", "1");

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

  // 20. Clear selected policy

  it("should remove policy details when the selected policy is cleared", async () => {
    await renderLoadedForm();

    changeField("Select Policy", "1");

    expect(screen.getByText("Selected Policy Details")).toBeInTheDocument();

    changeField("Select Policy", "");

    expect(
      screen.queryByText("Selected Policy Details"),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // INPUT INTERACTION TESTS
  // =====================================

  // 21. Update text fields

  it("should allow editing claim number and description", async () => {
    await renderLoadedForm();

    changeField("Claim Number", "CLM-002");

    changeField("Description", "Vehicle accident claim");

    expect(screen.getByLabelText("Claim Number")).toHaveValue("CLM-002");

    expect(screen.getByLabelText("Description")).toHaveValue(
      "Vehicle accident claim",
    );
  });

  // 22. Update claim amount

  it("should update the claim amount as a number", async () => {
    await renderLoadedForm();

    changeField("Claim Amount ($)", "2500.75");

    expect(screen.getByLabelText("Claim Amount ($)")).toHaveValue(2500.75);
  });

  // 23. Clear claim amount

  it("should allow clearing the claim amount", async () => {
    await renderLoadedForm();

    changeField("Claim Amount ($)", "1800");

    changeField("Claim Amount ($)", "");

    expect(screen.getByLabelText("Claim Amount ($)")).toHaveValue(null);
  });

  // 24. Update claim date

  it("should allow selecting a claim date", async () => {
    await renderLoadedForm();

    changeField("Claim Date", "2026-11-12");

    expect(screen.getByLabelText("Claim Date")).toHaveValue("2026-11-12");
  });

  // =====================================
  // REQUIRED FIELD VALIDATION
  // =====================================

  // 25. Empty form

  it("should display all required validation errors for an empty form", async () => {
    await renderLoadedForm();

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

    expect(mockCreateClaim).not.toHaveBeenCalled();
  });

  // 26–27. Whitespace validation

  it.each([
    ["Claim Number", "Claim number is required."],
    ["Description", "Claim description is required."],
  ])(
    "should reject whitespace-only values for %s",
    async (label, errorMessage) => {
      await renderLoadedForm();

      fillValidForm();

      changeField(label, "   ");

      submitForm();

      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      expect(mockCreateClaim).not.toHaveBeenCalled();
    },
  );

  // =====================================
  // LENGTH VALIDATION TESTS
  // =====================================

  // 28–29. Invalid claim number lengths

  it.each(["AB", "A".repeat(51)])(
    "should reject an invalid claim number length",
    async (claimNumber) => {
      await renderLoadedForm();

      fillValidForm({ claimNumber });

      submitForm();

      expect(
        screen.getByText("Claim number must contain 3 to 50 characters."),
      ).toBeInTheDocument();

      expect(mockCreateClaim).not.toHaveBeenCalled();
    },
  );

  // 30. Short description

  it("should reject a description shorter than five characters", async () => {
    await renderLoadedForm();

    fillValidForm({
      description: "Test",
    });

    submitForm();

    expect(
      screen.getByText("Description must contain at least 5 characters."),
    ).toBeInTheDocument();

    expect(mockCreateClaim).not.toHaveBeenCalled();
  });

  // =====================================
  // CLAIM AMOUNT VALIDATION
  // =====================================

  // 31–33. Invalid claim amounts

  it.each([
    [0, "Claim amount must be greater than $0."],
    [-100, "Claim amount must be greater than $0."],
    [100.123, "Claim amount can have at most 2 decimal places."],
  ] as const)(
    "should reject an invalid claim amount of %s",
    async (claimAmount, errorMessage) => {
      await renderLoadedForm();

      fillValidForm({ claimAmount });

      submitForm();

      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      expect(mockCreateClaim).not.toHaveBeenCalled();
    },
  );

  // =====================================
  // DATE VALIDATION TESTS
  // =====================================

  // 34. Future claim date

  it("should reject a claim date in the future", async () => {
    await renderLoadedForm();

    fillValidForm({
      claimDate: "2026-11-19",
    });

    submitForm();

    expect(
      screen.getByText("Claim date cannot be in the future."),
    ).toBeInTheDocument();

    expect(mockCreateClaim).not.toHaveBeenCalled();
  });

  // 35. Today's claim date

  it("should accept a claim date equal to today", async () => {
    await renderLoadedForm();

    fillValidForm({
      claimDate: "2026-11-18",
    });

    submitForm();

    await waitFor(() => {
      expect(mockCreateClaim).toHaveBeenCalledWith({
        ...validClaim,
        claimDate: "2026-11-18",
      });

      expect(mockOnClaimCreated).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================
  // POLICY VALIDATION TESTS
  // =====================================

  // 36. Missing policy selection

  it("should reject a claim without a selected policy", async () => {
    await renderLoadedForm();

    fillValidForm({
      policyId: 0,
    });

    submitForm();

    expect(
      screen.getByText("Please select a valid policy."),
    ).toBeInTheDocument();

    expect(mockCreateClaim).not.toHaveBeenCalled();
  });

  // 37. Unknown policy ID

  it("should reject a policy ID that does not exist in the loaded policies", async () => {
    await renderLoadedForm();

    fillValidForm();

    const select = screen.getByLabelText("Select Policy") as HTMLSelectElement;

    // Simulate an unsupported policy ID.
    const invalidOption = document.createElement("option");

    invalidOption.value = "999";
    invalidOption.textContent = "Unknown policy";

    select.appendChild(invalidOption);

    changeField("Select Policy", "999");

    submitForm();

    expect(
      screen.getByText("Please select a valid policy."),
    ).toBeInTheDocument();

    expect(mockCreateClaim).not.toHaveBeenCalled();
  });

  // =====================================
  // ACCESSIBILITY AND FIELD ERRORS
  // =====================================

  // 38. Accessible error attributes

  it("should associate validation errors with their corresponding inputs", async () => {
    await renderLoadedForm();

    submitForm();

    const fields = [
      ["Claim Number", "claimNumber-error"],
      ["Claim Amount ($)", "claimAmount-error"],
      ["Claim Date", "claimDate-error"],
      ["Description", "claimDescription-error"],
      ["Select Policy", "policyId-error"],
    ];

    fields.forEach(([label, errorId]) => {
      const field = screen.getByLabelText(label);

      expect(field).toHaveAttribute("aria-invalid", "true");

      expect(field).toHaveAttribute("aria-describedby", errorId);

      expect(document.getElementById(errorId)).toHaveAttribute("role", "alert");
    });
  });

  // 39. Clear field-specific errors

  it("should clear only the relevant error when a field changes", async () => {
    await renderLoadedForm();

    submitForm();

    changeField("Claim Number", "CLM-001");

    expect(
      screen.queryByText("Claim number is required."),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("Claim description is required."),
    ).toBeInTheDocument();

    const input = screen.getByLabelText("Claim Number");

    expect(input).toHaveAttribute("aria-invalid", "false");

    expect(input).not.toHaveAttribute("aria-describedby");
  });

  // =====================================
  // DUPLICATE CLAIM VALIDATION
  // =====================================

  // 40. Duplicate claim number

  it("should reject an existing claim number", async () => {
    mockGetAllClaims.mockResolvedValue([existingClaim]);

    await renderLoadedForm();

    fillValidForm();

    submitForm();

    expect(
      await screen.findByText(
        "This claim number already exists. Please use another.",
      ),
    ).toBeInTheDocument();

    expect(mockCreateClaim).not.toHaveBeenCalled();

    expect(mockOnClaimCreated).not.toHaveBeenCalled();

    expect(getCreateButton()).toBeEnabled();
  });

  // 41. Case-insensitive duplicate

  it("should detect duplicates regardless of case and whitespace", async () => {
    mockGetAllClaims.mockResolvedValue([
      {
        ...existingClaim,
        claimNumber: "  clm-001  ",
      },
    ]);

    await renderLoadedForm();

    fillValidForm({
      claimNumber: "  CLM-001  ",
    });

    submitForm();

    expect(
      await screen.findByText(
        "This claim number already exists. Please use another.",
      ),
    ).toBeInTheDocument();

    expect(mockCreateClaim).not.toHaveBeenCalled();
  });

  // =====================================
  // SUCCESSFUL SUBMISSION TESTS
  // =====================================

  // 42. Create claim successfully

  it("should create a valid claim with the correct request payload", async () => {
    mockGetAllClaims.mockResolvedValue([
      {
        ...existingClaim,
        id: 2,
        claimNumber: "CLM-002",
      },
    ]);

    await renderLoadedForm();

    fillValidForm();

    submitForm();

    await waitFor(() => {
      expect(mockOnClaimCreated).toHaveBeenCalledTimes(1);
    });

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);

    expect(mockCreateClaim).toHaveBeenCalledTimes(1);

    expect(mockCreateClaim).toHaveBeenCalledWith(validClaim);
  });

  // 43. Normalize text fields

  it("should trim whitespace before submitting a claim", async () => {
    await renderLoadedForm();

    fillValidForm({
      claimNumber: "  CLM-001  ",
      description: "  Medical expense claim  ",
    });

    submitForm();

    await waitFor(() => {
      expect(mockCreateClaim).toHaveBeenCalledWith(validClaim);

      expect(mockOnClaimCreated).toHaveBeenCalledTimes(1);
    });
  });

  // 44. Correct policy ID and status

  it("should submit a numeric policy ID and PENDING status", async () => {
    await renderLoadedForm();

    fillValidForm({
      policyId: 2,
      claimAmount: 2500.75,
    });

    submitForm();

    await waitFor(() => {
      expect(mockCreateClaim).toHaveBeenCalledWith({
        ...validClaim,
        policyId: 2,
        claimAmount: 2500.75,
        status: "PENDING",
      });

      expect(mockOnClaimCreated).toHaveBeenCalledTimes(1);
    });
  });

  // 45. Reset form after success

  it("should reset the form after successful claim creation", async () => {
    await renderLoadedForm();

    fillValidForm();

    submitForm();

    await waitFor(() => {
      expect(mockOnClaimCreated).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByLabelText("Claim Number")).toHaveValue("");

    expect(screen.getByLabelText("Claim Amount ($)")).toHaveValue(null);

    expect(screen.getByLabelText("Claim Date")).toHaveValue("");

    expect(screen.getByLabelText("Description")).toHaveValue("");

    expect(screen.getByLabelText("Claim Status")).toHaveValue("PENDING");

    expect(screen.getByLabelText("Select Policy")).toHaveValue("");

    expect(
      screen.queryByText("Selected Policy Details"),
    ).not.toBeInTheDocument();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    expect(getCreateButton()).toBeEnabled();
  });

  // =====================================
  // API ERROR HANDLING
  // =====================================

  // 46. Fetch claims failure

  it("should display an error when fetching existing claims fails", async () => {
    mockGetAllClaims.mockRejectedValue(new Error("Unable to retrieve claims."));

    await renderLoadedForm();

    fillValidForm();

    submitForm();

    expect(
      await screen.findByText("Unable to retrieve claims."),
    ).toBeInTheDocument();

    expect(mockCreateClaim).not.toHaveBeenCalled();

    expect(mockOnClaimCreated).not.toHaveBeenCalled();
  });

  // 47. Create claim failure

  it("should preserve form values when claim creation fails", async () => {
    mockCreateClaim.mockRejectedValue(new Error("Unable to create claim."));

    await renderLoadedForm();

    fillValidForm();

    submitForm();

    const error = await screen.findByText("Unable to create claim.");

    expect(error).toHaveClass("claim-form-error");

    expect(error).toHaveAttribute("role", "alert");

    expect(screen.getByLabelText("Claim Number")).toHaveValue("CLM-001");

    expect(screen.getByLabelText("Claim Amount ($)")).toHaveValue(1800);

    expect(screen.getByLabelText("Select Policy")).toHaveValue("1");

    expect(mockOnClaimCreated).not.toHaveBeenCalled();

    expect(getCreateButton()).toBeEnabled();
  });

  // 48. Non-Error exception

  it("should display a fallback message for non-Error exceptions", async () => {
    mockCreateClaim.mockRejectedValue("Unexpected failure");

    await renderLoadedForm();

    fillValidForm();

    submitForm();

    expect(
      await screen.findByText("Failed to create claim. Please try again."),
    ).toBeInTheDocument();

    expect(mockOnClaimCreated).not.toHaveBeenCalled();
  });

  // 49. Clear submission error

  it("should clear a submission error when a field is updated", async () => {
    mockCreateClaim.mockRejectedValue(new Error("Claim creation failed."));

    await renderLoadedForm();

    fillValidForm();

    submitForm();

    expect(
      await screen.findByText("Claim creation failed."),
    ).toBeInTheDocument();

    changeField("Claim Number", "CLM-003");

    expect(
      screen.queryByText("Claim creation failed."),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // LOADING AND DUPLICATE SUBMISSION
  // =====================================

  // 50. Saving guard

  it("should display the saving state and prevent duplicate submissions", async () => {
    let resolveCreation!: () => void;

    mockCreateClaim.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveCreation = resolve;
      }),
    );

    await renderLoadedForm();

    fillValidForm();

    submitForm();

    await waitFor(() => {
      expect(mockCreateClaim).toHaveBeenCalledTimes(1);
    });

    const loadingButton = screen.getByRole("button", {
      name: "Creating...",
    });

    expect(loadingButton).toBeDisabled();

    fireEvent.click(loadingButton);

    const form = loadingButton.closest("form");

    fireEvent.submit(form!);

    expect(mockGetAllClaims).toHaveBeenCalledTimes(1);

    expect(mockCreateClaim).toHaveBeenCalledTimes(1);

    expect(mockOnClaimCreated).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreation();
    });

    await waitFor(() => {
      expect(getCreateButton()).toBeEnabled();

      expect(mockOnClaimCreated).toHaveBeenCalledTimes(1);
    });
  });
});
