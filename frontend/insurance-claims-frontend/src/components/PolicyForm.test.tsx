import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import PolicyForm from "./PolicyForm";

import {
  createPolicy,
  getAllPolicies,
  type CreatePolicyRequest,
} from "../services/policyService";

// =====================================
// MOCK SERVICES
// =====================================

vi.mock("../services/policyService", () => ({
  createPolicy: vi.fn(),
  getAllPolicies: vi.fn(),
}));

const mockCreatePolicy = vi.mocked(createPolicy);
const mockGetAllPolicies = vi.mocked(getAllPolicies);

const mockOnPolicyCreated = vi.fn();

// =====================================
// MOCK DATA
// =====================================

const validPolicy: CreatePolicyRequest = {
  policyNumber: "POL-001",
  policyHolderName: "John Smith",
  policyType: "HEALTH",
  premiumAmount: 1500,
  startDate: "2030-01-01",
  endDate: "2031-01-01",
  status: "ACTIVE",
};

const createdPolicy = {
  id: 1,
  ...validPolicy,
};

// =====================================
// HELPER FUNCTIONS
// =====================================

function renderForm() {
  return render(<PolicyForm onPolicyCreated={mockOnPolicyCreated} />);
}

function changeField(label: string, value: string | number) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  });
}

function fillValidForm(overrides: Partial<CreatePolicyRequest> = {}) {
  const policy = {
    ...validPolicy,
    ...overrides,
  };

  changeField("Policy Number", policy.policyNumber);

  changeField("Policy Holder Name", policy.policyHolderName);

  changeField("Policy Type", policy.policyType);

  changeField("Premium Amount ($)", policy.premiumAmount);

  changeField("Start Date", policy.startDate);

  changeField("End Date", policy.endDate);

  changeField("Policy Status", policy.status);
}

function submitForm() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Create Policy",
    }),
  );
}

// =====================================
// POLICY FORM COMPONENT TESTS
// =====================================

describe("PolicyForm Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockGetAllPolicies.mockResolvedValue([]);

    mockCreatePolicy.mockResolvedValue(createdPolicy);
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Form heading

  it("should render the Create Policy heading", () => {
    renderForm();

    expect(
      screen.getByRole("heading", {
        name: "Create Policy",
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
      "Premium Amount ($)",
      "Start Date",
      "End Date",
      "Policy Status",
    ];

    labels.forEach((label) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
  });

  // 3. Initial field values

  it("should initialize the form with empty values", () => {
    renderForm();

    expect(screen.getByLabelText("Policy Number")).toHaveValue("");

    expect(screen.getByLabelText("Policy Holder Name")).toHaveValue("");

    expect(screen.getByLabelText("Policy Type")).toHaveValue("");

    expect(screen.getByLabelText("Premium Amount ($)")).toHaveValue(null);

    expect(screen.getByLabelText("Start Date")).toHaveValue("");

    expect(screen.getByLabelText("End Date")).toHaveValue("");
  });

  // 4. Default status

  it("should default the policy status to ACTIVE", () => {
    renderForm();

    expect(screen.getByLabelText("Policy Status")).toHaveValue("ACTIVE");
  });

  // 5. Available status options

  it("should provide only ACTIVE and INACTIVE status options", () => {
    renderForm();

    const select = screen.getByLabelText("Policy Status");

    const options = within(select).getAllByRole("option");

    expect(options).toHaveLength(2);

    expect(options[0]).toHaveValue("ACTIVE");

    expect(options[1]).toHaveValue("INACTIVE");
  });

  // 6. Submit button

  it("should render an enabled Create Policy button", () => {
    renderForm();

    const button = screen.getByRole("button", {
      name: "Create Policy",
    });

    expect(button).toBeEnabled();

    expect(button).toHaveAttribute("type", "submit");
  });

  // 7. Input constraints

  it("should render the correct input constraints", () => {
    renderForm();

    expect(screen.getByLabelText("Policy Number")).toHaveAttribute(
      "maxlength",
      "50",
    );

    expect(screen.getByLabelText("Policy Holder Name")).toHaveAttribute(
      "maxlength",
      "100",
    );

    expect(screen.getByLabelText("Policy Type")).toHaveAttribute(
      "maxlength",
      "50",
    );

    const premium = screen.getByLabelText("Premium Amount ($)");

    expect(premium).toHaveAttribute("min", "0.01");

    expect(premium).toHaveAttribute("step", "0.01");
  });

  // =====================================
  // INPUT INTERACTION TESTS
  // =====================================

  // 8. Update text fields

  it("should update policy text fields", () => {
    renderForm();

    changeField("Policy Number", "POL-002");

    changeField("Policy Holder Name", "Jane Smith");

    changeField("Policy Type", "AUTO");

    expect(screen.getByLabelText("Policy Number")).toHaveValue("POL-002");

    expect(screen.getByLabelText("Policy Holder Name")).toHaveValue(
      "Jane Smith",
    );

    expect(screen.getByLabelText("Policy Type")).toHaveValue("AUTO");
  });

  // 9. Update premium amount

  it("should update the premium amount as a number", () => {
    renderForm();

    changeField("Premium Amount ($)", "1250.50");

    expect(screen.getByLabelText("Premium Amount ($)")).toHaveValue(1250.5);
  });

  // 10. Clear premium amount

  it("should support clearing the premium amount", () => {
    renderForm();

    changeField("Premium Amount ($)", "1500");

    changeField("Premium Amount ($)", "");

    expect(screen.getByLabelText("Premium Amount ($)")).toHaveValue(null);
  });

  // 11. Update dates

  it("should update the policy start and end dates", () => {
    renderForm();

    changeField("Start Date", "2030-01-01");

    changeField("End Date", "2031-01-01");

    expect(screen.getByLabelText("Start Date")).toHaveValue("2030-01-01");

    expect(screen.getByLabelText("End Date")).toHaveValue("2031-01-01");
  });

  // 12. Dynamic minimum end date

  it("should update the minimum end date when the start date changes", () => {
    renderForm();

    const endDate = screen.getByLabelText("End Date");

    expect(endDate).not.toHaveAttribute("min");

    changeField("Start Date", "2030-01-01");

    expect(endDate).toHaveAttribute("min", "2030-01-01");

    changeField("Start Date", "2030-02-01");

    expect(endDate).toHaveAttribute("min", "2030-02-01");

    changeField("Start Date", "");

    expect(endDate).not.toHaveAttribute("min");
  });

  // 13. Change status

  it("should allow changing the status to INACTIVE", () => {
    renderForm();

    changeField("Policy Status", "INACTIVE");

    expect(screen.getByLabelText("Policy Status")).toHaveValue("INACTIVE");
  });

  // =====================================
  // REQUIRED FIELD VALIDATION
  // =====================================

  // 14. Empty form

  it("should display validation errors when submitting an empty form", () => {
    renderForm();

    submitForm();

    const errors = [
      "Policy number is required.",
      "Policy holder name is required.",
      "Policy type is required.",
      "Premium amount must be greater than $0.",
      "Start date is required.",
      "End date is required.",
    ];

    errors.forEach((message) => {
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    expect(screen.getAllByRole("alert")).toHaveLength(6);

    expect(mockGetAllPolicies).not.toHaveBeenCalled();

    expect(mockCreatePolicy).not.toHaveBeenCalled();

    expect(mockOnPolicyCreated).not.toHaveBeenCalled();
  });

  // 15. Whitespace policy number

  it("should reject a whitespace-only policy number", () => {
    renderForm();

    fillValidForm({
      policyNumber: "   ",
    });

    submitForm();

    expect(screen.getByText("Policy number is required.")).toBeInTheDocument();

    expect(mockCreatePolicy).not.toHaveBeenCalled();
  });

  // 16. Whitespace policy holder name

  it("should reject a whitespace-only policy holder name", () => {
    renderForm();

    fillValidForm({
      policyHolderName: "   ",
    });

    submitForm();

    expect(
      screen.getByText("Policy holder name is required."),
    ).toBeInTheDocument();
  });

  // 17. Whitespace policy type

  it("should reject a whitespace-only policy type", () => {
    renderForm();

    fillValidForm({
      policyType: "   ",
    });

    submitForm();

    expect(screen.getByText("Policy type is required.")).toBeInTheDocument();
  });

  // =====================================
  // LENGTH VALIDATION TESTS
  // =====================================

  // 18. Short policy number

  it("should reject a policy number shorter than three characters", () => {
    renderForm();

    fillValidForm({
      policyNumber: "AB",
    });

    submitForm();

    expect(
      screen.getByText("Policy number must contain 3 to 50 characters."),
    ).toBeInTheDocument();
  });

  // 19. Long policy number

  it("should reject a policy number longer than 50 characters", () => {
    renderForm();

    fillValidForm({
      policyNumber: "A".repeat(51),
    });

    submitForm();

    expect(
      screen.getByText("Policy number must contain 3 to 50 characters."),
    ).toBeInTheDocument();
  });

  // 20. Long policy holder name

  it("should reject a policy holder name longer than 100 characters", () => {
    renderForm();

    fillValidForm({
      policyHolderName: "A".repeat(101),
    });

    submitForm();

    expect(
      screen.getByText("Policy holder name cannot exceed 100 characters."),
    ).toBeInTheDocument();
  });

  // 21. Long policy type

  it("should reject a policy type longer than 50 characters", () => {
    renderForm();

    fillValidForm({
      policyType: "A".repeat(51),
    });

    submitForm();

    expect(
      screen.getByText("Policy type cannot exceed 50 characters."),
    ).toBeInTheDocument();
  });

  // =====================================
  // PREMIUM VALIDATION TESTS
  // =====================================

  // 22. Zero premium

  it("should reject a zero premium amount", () => {
    renderForm();

    fillValidForm({
      premiumAmount: 0,
    });

    submitForm();

    expect(
      screen.getByText("Premium amount must be greater than $0."),
    ).toBeInTheDocument();
  });

  // 23. Negative premium

  it("should reject a negative premium amount", () => {
    renderForm();

    fillValidForm({
      premiumAmount: -100,
    });

    submitForm();

    expect(
      screen.getByText("Premium amount must be greater than $0."),
    ).toBeInTheDocument();
  });

  // 24. Decimal precision

  it("should reject premiums with more than two decimal places", () => {
    renderForm();

    fillValidForm({
      premiumAmount: 100.123,
    });

    submitForm();

    expect(
      screen.getByText("Premium amount can have at most 2 decimal places."),
    ).toBeInTheDocument();
  });

  // 25. Valid decimal premium

  it("should accept a premium with two decimal places", async () => {
    renderForm();

    fillValidForm({
      premiumAmount: 1500.25,
    });

    submitForm();

    await waitFor(() => {
      expect(mockCreatePolicy).toHaveBeenCalledWith({
        ...validPolicy,
        premiumAmount: 1500.25,
      });
    });

    await waitFor(() => {
      expect(mockOnPolicyCreated).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================
  // DATE VALIDATION TESTS
  // =====================================

  // 26. End date before start date

  it("should reject an end date before the start date", () => {
    renderForm();

    fillValidForm({
      startDate: "2030-06-01",
      endDate: "2030-01-01",
    });

    submitForm();

    expect(
      screen.getByText("End date must be after the start date."),
    ).toBeInTheDocument();

    expect(mockCreatePolicy).not.toHaveBeenCalled();
  });

  // 27. Equal dates

  it("should reject identical start and end dates", () => {
    renderForm();

    fillValidForm({
      startDate: "2030-01-01",
      endDate: "2030-01-01",
    });

    submitForm();

    expect(
      screen.getByText("End date must be after the start date."),
    ).toBeInTheDocument();
  });

  // 28. Missing start date

  it("should reject a missing start date even when the end date is present", () => {
    renderForm();

    fillValidForm({
      startDate: "",
    });

    submitForm();

    expect(screen.getByText("Start date is required.")).toBeInTheDocument();

    expect(mockCreatePolicy).not.toHaveBeenCalled();
  });

  // 29. Clear end date error

  it("should clear the end date error when the start date changes", () => {
    renderForm();

    fillValidForm({
      startDate: "2030-06-01",
      endDate: "2030-01-01",
    });

    submitForm();

    expect(
      screen.getByText("End date must be after the start date."),
    ).toBeInTheDocument();

    changeField("Start Date", "2029-01-01");

    expect(
      screen.queryByText("End date must be after the start date."),
    ).not.toBeInTheDocument();
  });

  // =====================================
  // ACCESSIBILITY AND ERROR STATE TESTS
  // =====================================

  // 30. Accessible field error

  it("should associate field validation errors with their inputs", () => {
    renderForm();

    submitForm();

    const input = screen.getByLabelText("Policy Number");

    expect(input).toHaveAttribute("aria-invalid", "true");

    expect(input).toHaveAttribute("aria-describedby", "policyNumber-error");

    expect(screen.getByText("Policy number is required.")).toHaveAttribute(
      "id",
      "policyNumber-error",
    );
  });

  // 31. Clear field-specific errors

  it("should clear only the relevant field error when an input changes", () => {
    renderForm();

    submitForm();

    changeField("Policy Number", "POL-001");

    expect(
      screen.queryByText("Policy number is required."),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("Policy holder name is required."),
    ).toBeInTheDocument();

    const input = screen.getByLabelText("Policy Number");

    expect(input).toHaveAttribute("aria-invalid", "false");

    expect(input).not.toHaveAttribute("aria-describedby");
  });

  // =====================================
  // DUPLICATE POLICY VALIDATION
  // =====================================

  // 32. Duplicate policy number

  it("should reject an existing policy number", async () => {
    mockGetAllPolicies.mockResolvedValue([createdPolicy]);

    renderForm();

    fillValidForm();

    submitForm();

    expect(
      await screen.findByText(
        "This policy number already exists. Please use another.",
      ),
    ).toBeInTheDocument();

    expect(mockCreatePolicy).not.toHaveBeenCalled();

    expect(mockOnPolicyCreated).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", {
        name: "Create Policy",
      }),
    ).toBeEnabled();
  });

  // 33. Case-insensitive duplicate

  it("should detect duplicate policy numbers regardless of case and whitespace", async () => {
    mockGetAllPolicies.mockResolvedValue([
      {
        ...createdPolicy,
        policyNumber: "  pol-001  ",
      },
    ]);

    renderForm();

    fillValidForm({
      policyNumber: "  POL-001  ",
    });

    submitForm();

    expect(
      await screen.findByText(
        "This policy number already exists. Please use another.",
      ),
    ).toBeInTheDocument();

    expect(mockCreatePolicy).not.toHaveBeenCalled();
  });

  // =====================================
  // SUCCESSFUL SUBMISSION TESTS
  // =====================================

  // 34. Create policy successfully

  it("should create a valid policy and notify the parent component", async () => {
    renderForm();

    fillValidForm();

    submitForm();

    await waitFor(() => {
      expect(mockOnPolicyCreated).toHaveBeenCalledTimes(1);
    });

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);

    expect(mockCreatePolicy).toHaveBeenCalledTimes(1);

    expect(mockCreatePolicy).toHaveBeenCalledWith(validPolicy);
  });

  // 35. Trim input values

  it("should trim text fields before sending the policy to the API", async () => {
    renderForm();

    fillValidForm({
      policyNumber: "  POL-001  ",
      policyHolderName: "  John Smith  ",
      policyType: "  HEALTH  ",
    });

    submitForm();

    await waitFor(() => {
      expect(mockCreatePolicy).toHaveBeenCalledWith(validPolicy);

      expect(mockOnPolicyCreated).toHaveBeenCalledTimes(1);
    });
  });

  // 36. Reset form after success

  it("should reset all form fields after successful creation", async () => {
    renderForm();

    fillValidForm({
      status: "INACTIVE",
    });

    submitForm();

    await waitFor(() => {
      expect(mockOnPolicyCreated).toHaveBeenCalledTimes(1);
    });

    expect(mockCreatePolicy).toHaveBeenCalledWith({
      ...validPolicy,
      status: "INACTIVE",
    });

    expect(screen.getByLabelText("Policy Number")).toHaveValue("");

    expect(screen.getByLabelText("Policy Holder Name")).toHaveValue("");

    expect(screen.getByLabelText("Policy Type")).toHaveValue("");

    expect(screen.getByLabelText("Premium Amount ($)")).toHaveValue(null);

    expect(screen.getByLabelText("Start Date")).toHaveValue("");

    expect(screen.getByLabelText("End Date")).toHaveValue("");

    expect(screen.getByLabelText("Policy Status")).toHaveValue("ACTIVE");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // =====================================
  // API ERROR HANDLING TESTS
  // =====================================

  // 37. Duplicate check API failure

  it("should display an error when fetching existing policies fails", async () => {
    mockGetAllPolicies.mockRejectedValue(
      new Error("Unable to retrieve policies."),
    );

    renderForm();

    fillValidForm();

    submitForm();

    expect(
      await screen.findByText("Unable to retrieve policies."),
    ).toBeInTheDocument();

    expect(mockCreatePolicy).not.toHaveBeenCalled();

    expect(mockOnPolicyCreated).not.toHaveBeenCalled();
  });

  // 38. Create policy API failure

  it("should display the API error and preserve the form data when creation fails", async () => {
    mockCreatePolicy.mockRejectedValue(
      new Error("Server error. Please try again."),
    );

    renderForm();

    fillValidForm();

    submitForm();

    const error = await screen.findByText("Server error. Please try again.");

    expect(error).toHaveClass("claim-form-error");

    expect(error).toHaveAttribute("role", "alert");

    expect(screen.getByLabelText("Policy Number")).toHaveValue("POL-001");

    expect(
      screen.getByRole("button", {
        name: "Create Policy",
      }),
    ).toBeEnabled();

    expect(mockOnPolicyCreated).not.toHaveBeenCalled();

    // Changing a field should clear the API error.

    changeField("Policy Number", "POL-002");

    expect(
      screen.queryByText("Server error. Please try again."),
    ).not.toBeInTheDocument();
  });

  // 39. Non-Error exception

  it("should display a fallback message for non-Error exceptions", async () => {
    mockCreatePolicy.mockRejectedValue("Unexpected failure");

    renderForm();

    fillValidForm();

    submitForm();

    expect(
      await screen.findByText("Failed to create policy. Please try again."),
    ).toBeInTheDocument();

    expect(mockOnPolicyCreated).not.toHaveBeenCalled();
  });

  // =====================================
  // LOADING AND DUPLICATE SUBMISSION
  // =====================================

  // 40. Loading state

  it("should display a loading state and prevent duplicate submissions", async () => {
    let resolveCreation!: (value: typeof createdPolicy) => void;

    mockCreatePolicy.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreation = resolve;
      }),
    );

    renderForm();

    fillValidForm();

    submitForm();

    await waitFor(() => {
      expect(mockCreatePolicy).toHaveBeenCalledTimes(1);
    });

    const loadingButton = screen.getByRole("button", {
      name: "Creating...",
    });

    expect(loadingButton).toBeDisabled();

    // Attempt another button click.

    fireEvent.click(loadingButton);

    // Attempt direct form submission to test
    // the saving guard inside handleSubmit.

    const form = loadingButton.closest("form");

    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    expect(mockGetAllPolicies).toHaveBeenCalledTimes(1);

    expect(mockCreatePolicy).toHaveBeenCalledTimes(1);

    expect(mockOnPolicyCreated).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreation(createdPolicy);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Create Policy",
        }),
      ).toBeEnabled();

      expect(mockOnPolicyCreated).toHaveBeenCalledTimes(1);
    });
  });
});
