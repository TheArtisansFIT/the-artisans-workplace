export default function StatCard({ label, value, hint, tone = '' }) {
  return (
    <div className={`stat-card ${tone ? `stat-card--${tone}` : ''}`.trim()}>
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
      {hint && <span className="stat-card__hint">{hint}</span>}
    </div>
  )
}
