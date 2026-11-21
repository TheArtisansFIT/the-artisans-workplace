import { useEffect, useState } from 'react'
import { CreditCard, Pencil, Save, Trash2 } from 'lucide-react'
import Avatar from '../components/ui/Avatar.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Field from '../components/ui/Field.jsx'
import Notice from '../components/ui/Notice.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { formatDate } from '../utils/format.js'

const EMPTY_BANK = { bankName: '', accountNumber: '', accountHolder: '' }

export default function ProfilePage() {
  const { user } = useAuth()
  const { profile, groups, currentUserId, saveBankDetails, removeBankDetails } = useData()
  const myGroups = groups.filter((group) => group.memberIds.includes(currentUserId))
  const [editing, setEditing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [values, setValues] = useState(profile.bankDetails ?? EMPTY_BANK)
  const [errors, setErrors] = useState({})
  const [justSaved, setJustSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const hasSavedDetails = Boolean(profile.bankDetails)
  const isComplete = Object.values(values).every((value) => value.trim())

  useEffect(() => {
    if (!editing) setValues(profile.bankDetails ?? EMPTY_BANK)
  }, [editing, profile.bankDetails])

  const startEditing = () => {
    setValues(profile.bankDetails ?? EMPTY_BANK)
    setEditing(true)
    setConfirmRemove(false)
    setJustSaved(false)
    setFormError('')
  }

  const update = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setJustSaved(false)
    setFormError('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!values.bankName.trim()) nextErrors.bankName = 'Enter the bank name.'
    if (!values.accountNumber.trim()) nextErrors.accountNumber = 'Enter the account number.'
    if (!values.accountHolder.trim()) nextErrors.accountHolder = 'Enter the account holder name.'
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      await saveBankDetails({
        bankName: values.bankName.trim(),
        accountNumber: values.accountNumber.trim(),
        accountHolder: values.accountHolder.trim().toUpperCase(),
      })
      setEditing(false)
      setJustSaved(true)
    } catch (error) {
      const fields = error.fields || {}
      if (Object.keys(fields).length > 0) {
        setErrors(fields)
      }
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setFormError('')
    setSaving(true)
    try {
      await removeBankDetails()
      setValues(EMPTY_BANK)
      setConfirmRemove(false)
      setEditing(false)
      setJustSaved(false)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Settings"
        title="Profile & bank details"
        description="Manage how you appear in groups and the payment reference details you share for repayments."
      />

      <div className="profile-layout">
        <section className="panel profile-card">
          <div className="profile-card__identity">
            <Avatar name={user?.name ?? profile.displayName} color="#5a4a87" size="lg" />
            <h2>{user?.name ?? profile.displayName}</h2>
            <p>{user?.email ?? profile.email}</p>
          </div>

          <div className="profile-meta">
            <div className="summary-row">
              <span>Member since</span>
              <strong>{formatDate(profile.memberSince)}</strong>
            </div>
            <div className="summary-row">
              <span>Groups</span>
              <strong>{myGroups.length} active</strong>
            </div>
            <div className="summary-row">
              <span>Bank details</span>
              <Badge tone={hasSavedDetails ? 'settled' : 'neutral'}>
                {hasSavedDetails ? 'Saved' : 'Not saved'}
              </Badge>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">
                Bank details <span className="muted small">(optional)</span>
              </h2>
              <p className="panel__subtitle">
                Used only as a payment reference when generating a VietQR code.
              </p>
            </div>
            <Badge tone={hasSavedDetails ? 'settled' : 'neutral'}>
              {hasSavedDetails ? 'Saved' : 'Not saved'}
            </Badge>
          </div>

          <Notice tone="neutral" className="bank-form__notice" style={{ marginBottom: 20 }}>
            SplitNest does not connect to your bank, verify these details or move money. Transfers always happen outside SplitNest.
          </Notice>

          {formError && (
            <Notice tone="error" className="bank-form__notice" style={{ marginBottom: 18 }}>
              {formError}
            </Notice>
          )}

          {justSaved && (
            <Notice tone="success" className="bank-form__notice" style={{ marginBottom: 18 }}>
              Your bank details were saved for future VietQR payment references.
            </Notice>
          )}

          {hasSavedDetails && !editing ? (
            <>
              <dl className="saved-bank">
                <div className="saved-bank__row">
                  <span>Bank name</span>
                  <strong>{profile.bankDetails.bankName}</strong>
                </div>
                <div className="saved-bank__row">
                  <span>Account number</span>
                  <strong>{profile.bankDetails.accountNumber}</strong>
                </div>
                <div className="saved-bank__row">
                  <span>Account holder name</span>
                  <strong>{profile.bankDetails.accountHolder}</strong>
                </div>
              </dl>

              {confirmRemove ? (
                <Notice tone="warning" style={{ marginBottom: 16 }}>
                  <strong>Remove saved bank details?</strong> VietQR generation will need them again before it can be used.
                  <div className="inline" style={{ marginTop: 10 }}>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={handleRemove}
                      icon={Trash2}
                      loading={saving}
                      disabled={saving}
                    >
                      Yes, remove
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmRemove(false)}
                      disabled={saving}
                    >
                      Keep details
                    </Button>
                  </div>
                </Notice>
              ) : (
                <div className="form-actions form-actions--split">
                  <Button
                    variant="danger-ghost"
                    icon={Trash2}
                    onClick={() => setConfirmRemove(true)}
                    disabled={saving}
                  >
                    Remove bank details
                  </Button>
                  <Button variant="outline" icon={Pencil} onClick={startEditing}>
                    Edit bank details
                  </Button>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSave} noValidate>
              <div className="bank-fields">
                <Field label="Bank name" htmlFor="bank-name" error={errors.bankName}>
                  <input
                    id="bank-name"
                    name="bankName"
                    className={`input ${errors.bankName ? 'input--error' : ''}`}
                    value={values.bankName}
                    onChange={update}
                    placeholder="e.g. Vietcombank"
                    autoComplete="organization"
                    aria-invalid={Boolean(errors.bankName) || undefined}
                  />
                </Field>

                <div className="form-grid">
                  <Field label="Account number" htmlFor="bank-account" error={errors.accountNumber}>
                    <input
                      id="bank-account"
                      name="accountNumber"
                      className={`input ${errors.accountNumber ? 'input--error' : ''}`}
                      value={values.accountNumber}
                      onChange={update}
                      placeholder="e.g. 0123456789"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-invalid={Boolean(errors.accountNumber) || undefined}
                    />
                  </Field>

                  <Field
                    label="Account holder name"
                    htmlFor="bank-holder"
                    error={errors.accountHolder}
                    hint="Use the name printed on the bank account."
                  >
                    <input
                      id="bank-holder"
                      name="accountHolder"
                      className={`input ${errors.accountHolder ? 'input--error' : ''}`}
                      value={values.accountHolder}
                      onChange={update}
                      placeholder="e.g. LE QUANG MINH"
                      autoComplete="name"
                      aria-invalid={Boolean(errors.accountHolder) || undefined}
                    />
                  </Field>
                </div>
              </div>

              <div className="form-actions">
                <span className="help">
                  <CreditCard size={13} aria-hidden="true" style={{ display: 'inline', marginRight: 5 }} />
                  Fill in all three fields to save.
                </span>
                {editing && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(false)
                      setErrors({})
                      setFormError('')
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  icon={Save}
                  disabled={!isComplete || saving}
                  loading={saving}
                >
                  Save bank details
                </Button>
              </div>
            </form>
          )}

          <div style={{ marginTop: 18 }}>
            <Notice tone="info">
              A complete set of bank details is required before SplitNest can generate a VietQR code.
            </Notice>
          </div>
        </section>
      </div>
    </div>
  )
}
