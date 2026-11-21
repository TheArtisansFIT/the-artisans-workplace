const TONES = {
  neutral: '',
  primary: 'badge--primary',
  accent: 'badge--accent',
  butter: 'badge--butter',
  unpaid: 'badge--unpaid',
  pending: 'badge--pending',
  settled: 'badge--settled',
  locked: 'badge--locked',
  danger: 'badge--danger',
}

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span className={`badge ${TONES[tone] ?? ''} ${className}`.trim()}>{children}</span>
  )
}
