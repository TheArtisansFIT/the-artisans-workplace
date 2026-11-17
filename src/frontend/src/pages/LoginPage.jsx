import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Button from '../components/ui/Button.jsx'
import Field from '../components/ui/Field.jsx'
import PasswordInput from '../components/ui/PasswordInput.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function getRedirect(searchParams) {
  const redirect = searchParams.get('redirect')
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) return redirect
  return '/groups'
}

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = getRedirect(searchParams)
  const [values, setValues] = useState({
    identifier: 'minh.le@example.com',
    password: 'password123',
    remember: true,
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const update = (event) => {
    const { name, value, checked, type } = event.target
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setFormError('')
  }

  const validate = () => {
    const nextErrors = {}
    if (!values.identifier.trim()) {
      nextErrors.identifier = 'Enter your email address or username.'
    }
    if (!values.password) {
      nextErrors.password = 'Enter your password.'
    } else if (values.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }
    return nextErrors
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // Placeholder for the future API error response. The demo password makes
    // the error state easy to inspect without a backend.
    if (values.password === 'wrongpass') {
      setFormError('Email or password is incorrect. Please try again.')
      return
    }

    login({ email: values.identifier.includes('@') ? values.identifier : `${values.identifier}@splitnest.local` })
    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthLayout mode="login">
      <p className="auth-card__switch">
        New to SplitNest? <Link to={`/register?redirect=${encodeURIComponent(redirectTo)}`}>Create an account</Link>
      </p>

      <h2>Sign in to SplitNest</h2>
      <p className="auth-card__intro">Enter your account details to pick up where you left off.</p>

      {formError && (
        <div className="form-error-summary" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Email or username"
          htmlFor="login-identifier"
          error={errors.identifier}
          hintId="login-identifier-help"
        >
          <div className="input-wrap">
            <input
              id="login-identifier"
              name="identifier"
              className={`input ${errors.identifier ? 'input--error' : ''}`}
              value={values.identifier}
              onChange={update}
              autoComplete="username"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.identifier) || undefined}
              aria-describedby={errors.identifier ? 'login-identifier-help' : undefined}
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

        <Field
          label="Password"
          htmlFor="login-password"
          error={errors.password}
          hintId="login-password-help"
        >
          <PasswordInput
            id="login-password"
            name="password"
            value={values.password}
            onChange={update}
            autoComplete="current-password"
            placeholder="Enter your password"
            error={Boolean(errors.password)}
            describedBy={errors.password ? 'login-password-help' : undefined}
          />
        </Field>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 22,
          }}
        >
          <label className="checkbox-line">
            <input
              className="checkbox"
              type="checkbox"
              name="remember"
              checked={values.remember}
              onChange={update}
            />
            Remember me
          </label>
          <span className="help" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <LockKeyhole size={13} aria-hidden="true" />
            Private by default
          </span>
        </div>

        <Button type="submit" block size="lg" iconRight={ArrowRight}>
          Sign in
        </Button>
      </form>

      <p className="auth-card__demo">
        Demo skeleton: the sample details are prefilled. Any email and a 6+ character password work.
      </p>
      <p className="auth-card__foot">
        Signed-in users can create and join private groups. Your group information stays private to its members.
      </p>
    </AuthLayout>
  )
}
