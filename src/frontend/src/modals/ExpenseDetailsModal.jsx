import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import Avatar from '../components/ui/Avatar.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import Notice from '../components/ui/Notice.jsx'
import { useData } from '../context/DataContext.jsx'
import { memberLookup } from '../data/mockData.js'
import { formatDate, formatVND } from '../utils/format.js'
import { debtStatusMeta } from '../utils/selectors.js'

export default function ExpenseDetailsModal() {
  const { groupId, expenseId } = useParams()
  const navigate = useNavigate()
  const { getGroup, expenses, debts, deleteExpense, currentUserId } = useData()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const group = getGroup(groupId)
  const expense = expenses.find((item) => item.id === expenseId)

  const close = () => navigate(`/groups/${groupId}?tab=expenses`)

  if (!expense) {
    return (
      <Modal title="Expense not found" onClose={close}>
        <Notice tone="error">This expense is no longer available.</Notice>
      </Modal>
    )
  }

  const payer = memberLookup[expense.paidBy]
  const participantDebts = debts.filter(
    (debt) => debt.expenseId === expense.id && debt.to === expense.paidBy,
  )
  const isCreator = expense.createdBy === currentUserId
  const equalShare = Math.floor(expense.amount / expense.participantIds.length)
  const unpaidCount = participantDebts.filter((debt) => debt.status !== 'settled').length

  const handleDelete = () => {
    deleteExpense(expense.id)
    close()
  }

  if (confirmDelete) {
    return (
      <Modal
        title="Delete this expense?"
        description="This action cannot be undone."
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDelete}>
              Delete expense
            </Button>
          </>
        }
      >
        <p style={{ marginTop: 0, color: 'var(--ink-2)' }}>
          Deleting <strong>“{expense.description}”</strong> also removes the{' '}
          {participantDebts.length} linked debt{participantDebts.length === 1 ? '' : 's'} it created.
        </p>
        <Notice tone="warning">
          Delete is only available while the expense is unlocked and you are its creator.
        </Notice>
      </Modal>
    )
  }

  return (
    <Modal
      title="Expense details"
      description={`${group?.name ?? 'Group'} · ${formatDate(expense.date)}`}
      onClose={close}
      size="wide"
      footer={
        <Button variant="outline" onClick={close}>
          Close
        </Button>
      }
    >
      <div className="expense-detail__hero">
        <div>
          <h3>{expense.description}</h3>
          <p>
            Paid by {expense.paidBy === currentUserId ? 'you' : payer?.name ?? 'a member'} ·{' '}
            {expense.participantIds.length} participants
          </p>
        </div>
        <span className="expense-detail__amount">{formatVND(expense.amount)}</span>
      </div>

      {isCreator && (
        <div className="expense-detail__actions">
          {expense.locked ? (
            <Button variant="outline" icon={Pencil} disabled>
              Edit
            </Button>
          ) : (
            <Button
              as={Link}
              to={`/groups/${groupId}/expenses/${expense.id}/edit`}
              variant="outline"
              icon={Pencil}
            >
              Edit
            </Button>
          )}
          <Button
            variant="danger-ghost"
            icon={Trash2}
            onClick={() => setConfirmDelete(true)}
            disabled={expense.locked}
          >
            Delete
          </Button>
        </div>
      )}

      <section className="table-wrap" aria-label="Participant shares">
        <table className="table">
          <thead>
            <tr>
              <th>Participant</th>
              <th>Share</th>
              <th>Repayment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {expense.participantIds.map((memberId) => {
              const member = memberLookup[memberId]
              const debt = participantDebts.find((item) => item.from === memberId)
              const isPayer = memberId === expense.paidBy
              const meta = debt ? debtStatusMeta(debt.status) : null

              return (
                <tr key={memberId}>
                  <td>
                    <div className="person">
                      <Avatar member={member} size="sm" />
                      <span className="member-name">
                        {member?.name ?? 'Member'}
                        {memberId === currentUserId && <span className="you">(you)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="amount">{formatVND(debt?.amount ?? equalShare)}</td>
                  <td>
                    {isPayer ? 'Payer' : debt ? `Owes ${payer?.name ?? 'the payer'}` : 'No debt recorded'}
                  </td>
                  <td>
                    {isPayer ? (
                      <Badge tone="primary">Payer</Badge>
                    ) : meta ? (
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    ) : (
                      <Badge>No debt</Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <div className="expense-detail__summary">
        {expense.locked ? (
          <Notice tone="warning">
            A repayment request exists. This expense is locked and cannot be edited or deleted, even if the request is rejected.
          </Notice>
        ) : isCreator ? (
          <Notice tone="info">
            Edit and delete are available because you created this expense and no repayment request exists.
          </Notice>
        ) : (
          <Notice tone="neutral">
            Only the expense creator can edit or delete it. You can still review everyone’s share here.
          </Notice>
        )}

        <div className="panel" style={{ marginTop: 14 }}>
          <div className="summary-row">
            <span>Participants</span>
            <strong>{expense.participantIds.length} people</strong>
          </div>
          <div className="summary-row">
            <span>Equal share</span>
            <strong>{formatVND(equalShare)}</strong>
          </div>
          <div className="summary-row">
            <span>Unsettled debts</span>
            <strong>{unpaidCount}</strong>
          </div>
        </div>
      </div>
    </Modal>
  )
}
