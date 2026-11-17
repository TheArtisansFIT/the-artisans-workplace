import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordInput({ id, error = false, describedBy, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="input-wrap">
      <input
        id={id}
        className={`input ${error ? 'input--error' : ''}`}
        type={visible ? 'text' : 'password'}
        aria-invalid={error || undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  )
}
