import { AlertTriangle, CircleCheck, Info, LockKeyhole } from 'lucide-react'

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
  success: CircleCheck,
  neutral: Info,
  lavender: Info,
  locked: LockKeyhole,
}

export default function Notice({ tone = 'neutral', icon, children, className = '', ...props }) {
  const Icon = icon || ICONS[tone] || Info
  return (
    <div className={`notice notice--${tone} ${className}`.trim()} {...props}>
      <Icon size={17} aria-hidden="true" />
      <div className="notice__content">{children}</div>
    </div>
  )
}
