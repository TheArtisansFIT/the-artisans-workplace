import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, Mail, UserRound } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Button from '../components/ui/Button.jsx'
import Field from '../components/ui/Field.jsx'
import PasswordInput from '../components/ui/PasswordInput.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getRedirect(searchParams) {
  const redirect = searchParams.get('redirect')
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) return redirect
  return '/groups'
}

export default function RegisterPage() {
  const { isAuthenticated, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = getRedirect(searchParams)
  const [values, setValues] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const update = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setFormError('')
  }

  const validate = () => {
    const nextErrors = {}
    if (values.displayName.trim().length < 2) {
      nextErrors.displayName = 'Enter a display name with at least 2 characters.'
    }
    if (!values.email.trim()) {
      nextErrors.email = 'Enter your email address.'
    } else if (!EMAIL_PATTERN.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address, for example minh@example.com.'
    }
    if (!values.password) {
      nextErrors.password = 'Create a password.'
    } else if (values.password.length < 6) {
      nextErrors.password = 'Use at least 6 characters.'
    }
    if (!values.confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password.'
    } else if (values.confirmPassword !== values.password) {
      nextErrors.confirmPassword = 'The passwords do not match.'
    }
    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await register({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      const fields = error.fields || {}
      setErrors((current) => ({
        ...current,
        ...(fields.displayName ? { displayName: fields.displayName } : {}),
        ...(fields.email ? { email: fields.email } : {}),
        ...(fields.password ? { password: fields.password } : {}),
      }))
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout mode="register">
      <p className="auth-card__switch">
        Already have an account? <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`}>Sign in</Link>
      </p>

      <h2>Create your account</h2>
      <p className="auth-card__intro">Start a group or join one with an invitation.</p>

      {formError && (
        <div className="form-error-summary" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Display name"
          htmlFor="register-name"
          error={errors.displayName}
          hint="Other group members will see this name."
          hintId="register-name-help"
        >
          <div className="input-wrap">
            <input
              id="register-name"
              name="displayName"
              className={`input ${errors.displayName ? 'input--error' : ''}`}
              value={values.displayName}
              onChange={update}
              autoComplete="name"
              placeholder="Your name"
              aria-invalid={Boolean(errors.displayName) || undefined}
              aria-describedby="register-name-help"
              style={{ paddingLeft: 42 }}
            />
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '50%',
                left: 14,
                transform: 'translateY(-50%)',
                color: 'var(--ink-3)',
                display: 'grid',
              }}
            >
              <UserRound size={17} />
            </span>
          </div>
        </Field>

        <Field
          label="Email address"
          htmlFor="register-email"
          error={errors.email}
          hintId="register-email-help"
        >
          <div className="input-wrap">
            <input
              id="register-email"
              name="email"
              type="email"
              className={`input ${errors.email ? 'input--error' : ''}`}
              value={values.email}
              onChange={update}
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email) || undefined}
              aria-describedby={errors.email ? 'register-email-help' : undefined}
              style={{ paddingLeft: 42 }}
            />
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '50%',
                left: 14,
                transform: 'translateY(-50%)',
                color: 'var(--ink-3)',
                display: 'grid',
              }}
            >
              <Mail size={17} />
            </span>
          </div>
        </Field>

        <div className="form-grid">
          <Field
            label="Password"
            htmlFor="register-password"
            error={errors.password}
            hint="At least 6 characters."
            hintId="register-password-help"
          >
            <PasswordInput
              id="register-password"
              name="password"
              value={values.password}
              onChange={update}
              autoComplete="new-password"
              placeholder="Create a password"
              error={Boolean(errors.password)}
              describedBy="register-password-help"
            />
          </Field>

          <Field
            label="Confirm password"
            htmlFor="register-confirm"
            error={errors.confirmPassword}
            hintId="register-confirm-help"
          >
            <PasswordInput
              id="register-confirm"
              name="confirmPassword"
              value={values.confirmPassword}
              onChange={update}
              autoComplete="new-password"
              placeholder="Repeat your password"
              error={Boolean(errors.confirmPassword)}
              describedBy={errors.confirmPassword ? 'register-confirm-help' : undefined}
            />
          </Field>
        </div>

        <Button type="submit" block size="lg" iconRight={ArrowRight} loading={submitting} disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="auth-card__foot">
        Bank details are optional and can be added later from Profile. Group information is only visible to group members.
      </p>
    </AuthLayout>
  )
}
