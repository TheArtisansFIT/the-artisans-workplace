import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Save } from 'lucide-react'
import Avatar from '../ui/Avatar.jsx'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Modal from '../ui/Modal.jsx'
import Notice from '../ui/Notice.jsx'
import { useData } from '../../context/DataContext.jsx'
import { getMember, getMembers } from '../../services/memberService.js'
import { formatVND, todayInputValue } from '../../utils/format.js'
import { splitEqually } from '../../utils/split.js'

export default function ExpenseFormModal() {
  const { groupId, expenseId } = useParams()
  const navigate = useNavigate()
  const { getGroup, expenses, addExpense, updateExpense, currentUserId } = useData()
  const group = getGroup(groupId)
  const existing = expenses.find((expense) => expense.id === expenseId)
  const isEditing = Boolean(expenseId)

  const members = getMembers(group?.memberIds)
  const defaultParticipants = existing?.participantIds ?? group?.memberIds ?? []
  const [values, setValues] = useState({
    description: existing?.description ?? '',
    amount: existing ? String(existing.amount) : '',
    date: existing?.date ?? todayInputValue(),
    paidBy: existing?.paidBy ?? currentUserId,
    participantIds: [...defaultParticipants],
  })
  const [errors, setErrors] = useState({})

  const close = () => navigate(`/groups/${groupId}?tab=expenses`)

  const shares = useMemo(
    () => splitEqually(Number(values.amount) || 0, values.participantIds),
    [values.amount, values.participantIds],
  )
  const remainder = values.participantIds.length
    ? (Math.max(0, Math.floor(Number(values.amount) || 0)) % values.participantIds.length)
    : 0

  const update = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const toggleParticipant = (memberId) => {
    setValues((current) => {
      const selected = current.participantIds.includes(memberId)
      return {
        ...current,
        participantIds: selected
          ? current.participantIds.filter((id) => id !== memberId)
          : [...current.participantIds, memberId],
      }
    })
    setErrors((current) => ({ ...current, participants: '' }))
  }

  const selectAll = () => {
    setValues((current) => ({
      ...current,
      participantIds: current.participantIds.length === members.length ? [] : members.map((m) => m.id),
    }))
    setErrors((current) => ({ ...current, participants: '' }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const amount = Number(values.amount)
    const nextErrors = {}
    if (!values.description.trim()) nextErrors.description = 'Add a short description.'
    if (!values.amount) {
      nextErrors.amount = 'Enter an amount.'
    } else if (!Number.isInteger(amount) || amount <= 0) {
      nextErrors.amount = 'Enter whole đồng only, greater than 0.'
    }
    if (!values.date) nextErrors.date = 'Choose a date.'
    if (!values.paidBy) nextErrors.paidBy = 'Choose who paid.'
    if (values.participantIds.length === 0) {
      nextErrors.participants = 'Select at least one participant.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (isEditing) {
      updateExpense(existing.id, values)
    } else {
      addExpense(groupId, values)
    }
    close()
  }

  if (!group) {
    return (
      <Modal title="Group not found" onClose={() => navigate('/groups')}>
        <Notice tone="error">This group is no longer available.</Notice>
      </Modal>
    )
  }

  if (isEditing && !existing) {
    return (
      <Modal title="Expense not found" onClose={close}>
        <Notice tone="error">This expense is no longer available.</Notice>
      </Modal>
    )
  }

  if (isEditing && existing?.locked) {
    return (
      <Modal
        title="Expense is locked"
        description="A repayment request exists for this expense."
        onClose={close}
        footer={
          <Button as={Link} to={`/groups/${groupId}/expenses/${existing.id}`} variant="outline">
            View expense
          </Button>
        }
      >
        <Notice tone="warning">
          This expense cannot be edited once any repayment request exists, even if that request is later rejected.
        </Notice>
      </Modal>
    )
  }

  return (
    <Modal
      title={isEditing ? 'Edit expense' : 'Add a shared expense'}
      description="Record who paid and who shares the cost."
      onClose={close}
      size="full"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" icon={Save}>
            {isEditing ? 'Save changes' : 'Save expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} noValidate>
        <div className="expense-layout">
          <div>
            <Field
              label="Description"
              htmlFor="expense-description"
              error={errors.description}
              hint="Something everyone will recognise."
              hintId="expense-description-help"
            >
              <input
                id="expense-description"
                name="description"
                className={`input ${errors.description ? 'input--error' : ''}`}
                value={values.description}
                onChange={update}
                placeholder="e.g. Dinner at Bánh Xèo 46A"
                autoFocus
                maxLength={120}
                aria-invalid={Boolean(errors.description) || undefined}
                aria-describedby="expense-description-help"
              />
            </Field>

            <div className="form-grid">
              <Field
                label="Amount"
                htmlFor="expense-amount"
                error={errors.amount}
                hint="Whole đồng, greater than 0."
                hintId="expense-amount-help"
              >
                <div className="input-wrap">
                  <input
                    id="expense-amount"
                    name="amount"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    className={`input ${errors.amount ? 'input--error' : ''}`}
                    value={values.amount}
                    onChange={update}
                    placeholder="100000"
                    aria-invalid={Boolean(errors.amount) || undefined}
                    aria-describedby="expense-amount-help"
                  />
                  <span className="input-suffix">VND</span>
                </div>
              </Field>

              <Field label="Date" htmlFor="expense-date" error={errors.date}>
                <input
                  id="expense-date"
                  name="date"
                  type="date"
                  className={`input ${errors.date ? 'input--error' : ''}`}
                  value={values.date}
                  onChange={update}
                  aria-invalid={Boolean(errors.date) || undefined}
                />
              </Field>
            </div>

            <Field label="Paid by" htmlFor="expense-payer" error={errors.paidBy}>
              <select
                id="expense-payer"
                name="paidBy"
                className="select"
                value={values.paidBy}
                onChange={update}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.id === currentUserId ? ' (you)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Split equally between"
              error={errors.participants}
              hintId="expense-participants-help"
              legend
            >
              <div className="inline" style={{ justifyContent: 'space-between', marginBottom: 2 }}>
                <span className="help">Choose everyone who shares this cost.</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={selectAll}
                  style={{ minHeight: 28, padding: '0 4px' }}
                >
                  {values.participantIds.length === members.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="participant-grid" id="expense-participants">
                {members.map((member) => (
                  <label className="participant-check" key={member.id}>
                    <input
                      type="checkbox"
                      checked={values.participantIds.includes(member.id)}
                      onChange={() => toggleParticipant(member.id)}
                    />
                    <Avatar member={member} size="sm" />
                    <span>
                      {member.name}
                      {member.id === currentUserId ? ' (you)' : ''}
                    </span>
                    {values.participantIds.includes(member.id) && (
                      <Check size={14} aria-hidden="true" style={{ marginLeft: 'auto' }} />
                    )}
                  </label>
                ))}
              </div>
            </Field>

            {values.paidBy && !values.participantIds.includes(values.paidBy) && (
              <Notice tone="neutral">
                The payer is not included in the split, so they will not owe a share to themselves.
              </Notice>
            )}
          </div>

          <aside
            className={`split-preview ${
              values.participantIds.length === 0 || Number(values.amount) <= 0
                ? 'split-preview--empty'
                : ''
            }`}
            aria-live="polite"
          >
            <h3>Split preview</h3>
            {values.participantIds.length === 0 || Number(values.amount) <= 0 ? (
              <p className="split-preview__intro">
                Enter a valid amount and select at least one participant to calculate each member’s share.
              </p>
            ) : (
              <>
                <p className="split-preview__intro">
                  {formatVND(Number(values.amount))} ÷ {values.participantIds.length} ={' '}
                  {formatVND(Math.floor(Number(values.amount) / values.participantIds.length))} each
                  {remainder > 0 && ', with leftover đồng assigned in member order'}.
                </p>
                {values.participantIds.map((memberId) => {
                  const member = getMember(memberId)
                  const extra = remainder > 0 && values.participantIds.indexOf(memberId) < remainder
                  return (
                    <div className="split-preview__line" key={memberId}>
                      <span>
                        {member?.name ?? 'Member'}
                        {memberId === currentUserId ? ' (you)' : ''}
                        {extra && <span className="split-preview__tag">+1 VND</span>}
                      </span>
                      <strong>{formatVND(shares[memberId] ?? 0)}</strong>
                    </div>
                  )
                })}
                <div className="split-preview__total">
                  <span>Total</span>
                  <span>{formatVND(Number(values.amount))}</span>
                </div>
              </>
            )}
          </aside>
        </div>

        {isEditing && (
          <Notice tone="warning" style={{ marginTop: 18 }}>
            Saving is only possible while no repayment request exists for this expense.
          </Notice>
        )}
      </form>
    </Modal>
  )
}
