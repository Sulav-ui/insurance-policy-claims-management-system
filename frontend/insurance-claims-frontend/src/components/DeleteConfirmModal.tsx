type DeleteConfirmModalProps = {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function DeleteConfirmModal({
  itemName,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div className="modal-overlay">
      <div
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className="delete-modal-icon">⚠️</div>

        <h2 id="delete-modal-title">Confirm Deletion</h2>

        <p>
          Are you sure you want to delete
          <strong> {itemName}</strong>?
        </p>

        <p className="delete-warning">This action cannot be undone.</p>

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>

          <button type="button" className="btn-delete" onClick={onConfirm}>
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
