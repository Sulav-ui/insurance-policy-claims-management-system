import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, within } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import DeleteConfirmModal from "./DeleteConfirmModal";

// =====================================
// MOCK DATA
// =====================================

const mockOnConfirm = vi.fn();
const mockOnCancel = vi.fn();

const defaultProps = {
  itemName: "POL-001",
  onConfirm: mockOnConfirm,
  onCancel: mockOnCancel,
};

// =====================================
// DELETE CONFIRM MODAL TESTS
// =====================================

describe("DeleteConfirmModal Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // =====================================
  // RENDERING TESTS
  // =====================================

  // 1. Render modal

  it("should render the delete confirmation modal", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // 2. Render modal title

  it("should display the confirmation title", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Confirm Deletion",
      }),
    ).toBeInTheDocument();
  });

  // 3. Display confirmation message

  it("should display the confirmation message", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Are you sure you want to delete POL-001?",
    );
  });

  // 4. Display item name

  it("should display the provided item name in bold", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    const itemName = screen.getByText("POL-001");

    expect(itemName).toBeInTheDocument();

    expect(itemName.tagName).toBe("STRONG");
  });

  // 5. Display warning message

  it("should display the irreversible deletion warning", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
  });

  // 6. Display warning icon

  it("should display the warning icon", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(screen.getByText("⚠️")).toBeInTheDocument();

    expect(screen.getByText("⚠️")).toHaveClass("delete-modal-icon");
  });

  // =====================================
  // BUTTON RENDERING TESTS
  // =====================================

  // 7. Render Cancel button

  it("should render the Cancel button", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", {
      name: "Cancel",
    });

    expect(cancelButton).toBeInTheDocument();

    expect(cancelButton).toBeEnabled();

    expect(cancelButton).toHaveAttribute("type", "button");
  });

  // 8. Render Delete button

  it("should render the Delete button", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    const deleteButton = screen.getByRole("button", {
      name: /delete/i,
    });

    expect(deleteButton).toBeInTheDocument();

    expect(deleteButton).toBeEnabled();

    expect(deleteButton).toHaveAttribute("type", "button");
  });

  // =====================================
  // CSS CLASS TESTS
  // =====================================

  // 9. Overlay styling

  it("should render the correct modal overlay class", () => {
    const { container } = render(<DeleteConfirmModal {...defaultProps} />);

    expect(container.querySelector(".modal-overlay")).toBeInTheDocument();
  });

  // 10. Modal styling

  it("should apply the correct dialog CSS class", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(screen.getByRole("dialog")).toHaveClass("delete-modal");
  });

  // 11. Warning styling

  it("should apply the correct warning CSS class", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(screen.getByText("This action cannot be undone.")).toHaveClass(
      "delete-warning",
    );
  });

  // 12. Button styling

  it("should apply the correct action button CSS classes", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(
      screen.getByRole("button", {
        name: "Cancel",
      }),
    ).toHaveClass("btn-cancel");

    expect(
      screen.getByRole("button", {
        name: /delete/i,
      }),
    ).toHaveClass("btn-delete");
  });

  // =====================================
  // ACCESSIBILITY TESTS
  // =====================================

  // 13. Modal accessibility attribute

  it("should identify the dialog as a modal", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  // 14. Accessible dialog title

  it("should associate the dialog with its accessible title", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    const dialog = screen.getByRole("dialog", {
      name: "Confirm Deletion",
    });

    const heading = within(dialog).getByRole("heading", {
      name: "Confirm Deletion",
      level: 2,
    });

    expect(dialog).toHaveAttribute("aria-labelledby", "delete-modal-title");

    expect(heading).toHaveAttribute("id", "delete-modal-title");
  });

  // =====================================
  // USER INTERACTION TESTS
  // =====================================

  // 15. No callbacks on initial render

  it("should not call either callback when the modal first renders", () => {
    render(<DeleteConfirmModal {...defaultProps} />);

    expect(mockOnConfirm).not.toHaveBeenCalled();

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  // 16. Confirm deletion

  it("should call onConfirm when the Delete button is clicked", async () => {
    const user = userEvent.setup();

    render(<DeleteConfirmModal {...defaultProps} />);

    await user.click(
      screen.getByRole("button", {
        name: /delete/i,
      }),
    );

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  // 17. Cancel deletion

  it("should call onCancel when the Cancel button is clicked", async () => {
    const user = userEvent.setup();

    render(<DeleteConfirmModal {...defaultProps} />);

    await user.click(
      screen.getByRole("button", {
        name: "Cancel",
      }),
    );

    expect(mockOnCancel).toHaveBeenCalledTimes(1);

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  // 18. Keyboard interaction

  it("should support confirming deletion using the keyboard", async () => {
    const user = userEvent.setup();

    render(<DeleteConfirmModal {...defaultProps} />);

    await user.tab();

    expect(
      screen.getByRole("button", {
        name: "Cancel",
      }),
    ).toHaveFocus();

    await user.tab();

    expect(
      screen.getByRole("button", {
        name: /delete/i,
      }),
    ).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  // =====================================
  // DYNAMIC PROPS TESTS
  // =====================================

  // 19. Display claim name

  it("should support displaying a claim number", () => {
    render(<DeleteConfirmModal {...defaultProps} itemName="CLM-001" />);

    expect(screen.getByText("CLM-001")).toBeInTheDocument();

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Are you sure you want to delete CLM-001?",
    );

    expect(screen.queryByText("POL-001")).not.toBeInTheDocument();
  });

  // 20. Updated item name

  it("should update the confirmation message when itemName changes", () => {
    const { rerender } = render(<DeleteConfirmModal {...defaultProps} />);

    expect(screen.getByText("POL-001")).toBeInTheDocument();

    rerender(<DeleteConfirmModal {...defaultProps} itemName="POL-002" />);

    expect(screen.getByText("POL-002")).toBeInTheDocument();

    expect(screen.queryByText("POL-001")).not.toBeInTheDocument();

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Are you sure you want to delete POL-002?",
    );
  });
});
