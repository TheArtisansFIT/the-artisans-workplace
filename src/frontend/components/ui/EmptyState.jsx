export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-state__icon">
          <Icon size={30} aria-hidden="true" />
        </span>
      )}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
