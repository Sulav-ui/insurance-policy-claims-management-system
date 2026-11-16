type EmptyStateProps = {
  title: string;
  message: string;
  icon?: string;
};

function EmptyState({ title, message, icon = "📂" }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>

      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export default EmptyState;
