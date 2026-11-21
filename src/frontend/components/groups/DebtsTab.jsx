import { Link } from 'react-router-dom'
import { ArrowRight, QrCode, Wallet } from 'lucide-react'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Notice from '../ui/Notice.jsx'
import StatCard from '../ui/StatCard.jsx'
import { getMember } from '../../services/memberService.js'
import { formatDate, formatVND } from '../../utils/format.js'
import { debtStatusMeta, visibleDebts } from '../../utils/selectors.js'

function actionForDebt(debt, groupId, currentUserId) {
  const base = `/groups/${groupId}/debts/${debt.id}`
  const isDebtor = debt.from === currentUserId

  if (debt.status === 'pending' && !isDebtor) {
    return { label: 'Review repayment', to: `${base}?view=review`, variant: 'primary' }
  }
  if (debt.status === 'unpaid' && isDebtor) {
    return { label: 'Report repayment', to: `${base}?view=report`, variant: 'primary' }
  }
  if (debt.status === 'unpaid' && !isDebtor) {
    return { label: 'VietQR', to: `${base}?view=vietqr`, variant: 'outline', icon: QrCode }
  }
  if (debt.status === 'settled') {
    return { label: 'View', to: base, variant: 'outline' }
  }
  return { label: 'View repayment', to: base, variant: 'outline' }
}

export default function DebtsTab({ group, expenses, debts, currentUserId }) {
  const list = visibleDebts(debts, group.id, currentUserId)
  const youOwe = list
    .filter((debt) => debt.from === currentUserId && debt.status !== 'settled')
    .reduce((sum, debt) => sum + debt.amount, 0)
  const owedToYou = list
    .filter((debt) => debt.to === currentUserId && debt.status !== 'settled')
    .reduce((sum, debt) => sum + debt.amount, 0)
  const pending = list.filter((debt) => debt.status === 'pending').length

  return (
    <>
      <div className="stat-grid">
        <StatCard label="You owe" value={formatVND(youOwe)} tone="peach" hint="Unsettled debts" />
        <StatCard label="Owed to you" value={formatVND(owedToYou)} tone="success" hint="Waiting to settle" />
        <StatCard label="Pending confirmation" value={pending} tone="lavender" hint="Reports to review" />
      </div>

      <Notice tone="info" className="debts-notice">
        Repayments happen outside SplitNest. A debt is settled only after the receiver confirms the payment.
      </Notice>

      <div className="group-panels" style={{ marginTop: 18 }}>
        <div>
          {list.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nothing to settle right now"
              description="When you record expenses, SplitNest will show the debts that involve you."
            />
          ) : (
            <section className="table-wrap" aria-label="Debts and settlements">
              <table className="table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Debt direction</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((debt) => {
                    const expense = expenses.find((item) => item.id === debt.expenseId)
                    const from = getMember(debt.from)
                    const to = getMember(debt.to)
                    const meta = debtStatusMeta(debt.status)
                    const action = actionForDebt(debt, group.id, currentUserId)
                    const youAreDebtor = debt.from === currentUserId

                    return (
                      <tr key={debt.id}>
                        <td>
                          {expense ? (
                            <Link
                              className="table__link"
                              to={`/groups/${group.id}/expenses/${expense.id}`}
                            >
                              {expense.description}
                            </Link>
                          ) : (
                            <span className="table__link">Expense removed</span>
                          )}
                          <div className="table__sub">{formatDate(expense?.date)}</div>
                        </td>
                        <td>
                          <div className="debt-direction">
                            <Avatar member={from} size="sm" />
                            <span>{youAreDebtor ? 'You' : from?.name}</span>
                            <ArrowRight size={14} aria-hidden="true" />
                            <Avatar member={to} size="sm" />
                            <span>{debt.to === currentUserId ? 'You' : to?.name}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`debt-amount ${
                              youAreDebtor ? 'is-owed' : 'is-receivable'
                            }`}
                          >
                            {youAreDebtor
                              ? `You owe ${formatVND(debt.amount)}`
                              : `${from?.name} owes you ${formatVND(debt.amount)}`}
                            <small>{youAreDebtor ? `to ${to?.name}` : 'Receivable'}</small>
                          </span>
                        </td>
                        <td>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                        <td>
                          <Button
                            as={Link}
                            to={action.to}
                            size="sm"
                            variant={action.variant}
                            icon={action.icon}
                          >
                            {action.label}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <aside className="group-side">
          <section className="panel">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">How settling works</h2>
              </div>
            </div>
            <ol className="steps">
              <li className="step">
                <span className="step__number">1</span>
                <div>
                  <strong>The debtor pays</strong>
                  <p>Bank transfer or cash, outside SplitNest.</p>
                </div>
              </li>
              <li className="step">
                <span className="step__number">2</span>
                <div>
                  <strong>The debtor reports it</strong>
                  <p>The debt becomes Pending confirmation.</p>
                </div>
              </li>
              <li className="step">
                <span className="step__number">3</span>
                <div>
                  <strong>The receiver confirms</strong>
                  <p>Only then is the debt marked Settled.</p>
                </div>
              </li>
            </ol>
          </section>

          <Notice tone="neutral">
            Pending reports are separate from confirmed payments so the decision trail stays clear.
          </Notice>
        </aside>
      </div>
    </>
  )
}
