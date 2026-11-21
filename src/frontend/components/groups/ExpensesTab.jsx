import { Link } from 'react-router-dom'
import { Plus, ReceiptText } from 'lucide-react'
import Avatar from '../ui/Avatar.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Notice from '../ui/Notice.jsx'
import StatCard from '../ui/StatCard.jsx'
import { getMember } from '../../services/memberService.js'
import { formatDate, formatVND } from '../../utils/format.js'
import { groupExpenses, groupTotal, personalBalance, userShare } from '../../utils/selectors.js'

export default function ExpensesTab({ group, expenses, debts, currentUserId, memberCount }) {
  const list = groupExpenses(expenses, group.id)
  const total = groupTotal(expenses, group.id)
  const yourShare = list.reduce((sum, expense) => sum + userShare(expense, currentUserId), 0)
  const balance = personalBalance(debts, group.id, currentUserId)
  const unpaidExpenses = list.filter((expense) => !expense.locked).length

  return (
    <>
      <div className="stat-grid">
        <StatCard label="Total recorded" value={formatVND(total)} tone="lavender" hint={`${list.length} expenses`} />
        <StatCard label="Your total share" value={formatVND(yourShare)} tone="butter" hint="Across this group" />
        <StatCard
          label="Your current balance"
          value={balance.net >= 0 ? formatVND(balance.net) : `-${formatVND(Math.abs(balance.net))}`}
          tone={balance.net >= 0 ? 'success' : 'peach'}
          hint={balance.net >= 0 ? 'Owed to you' : 'You owe the group'}
        />
      </div>

      <div className="group-panels">
        <div>
          {list.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No expenses recorded yet"
              description="Add the first shared cost and SplitNest will work out everyone’s equal share."
              action={
                <Button as={Link} to={`/groups/${group.id}/expenses/new`} icon={Plus}>
                  Add expense
                </Button>
              }
            />
          ) : (
            <section className="table-wrap" aria-label="Group expenses">
              <table className="table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Date</th>
                    <th>Paid by</th>
                    <th>Participants</th>
                    <th>Your share</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((expense) => {
                    const payer = getMember(expense.paidBy)
                    return (
                      <tr key={expense.id}>
                        <td>
                          <Link
                            className="table__link"
                            to={`/groups/${group.id}/expenses/${expense.id}`}
                          >
                            {expense.description}
                          </Link>
                          {expense.locked && (
                            <div className="table__sub">Locked by a repayment request</div>
                          )}
                        </td>
                        <td>{formatDate(expense.date)}</td>
                        <td>
                          <div className="person">
                            <Avatar member={payer} size="sm" />
                            <span style={{ fontSize: 12 }}>
                              {expense.paidBy === currentUserId ? 'You' : payer?.name ?? 'Member'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="participant-count">
                            {expense.participantIds.length}{' '}
                            {expense.participantIds.length === 1 ? 'person' : 'people'}
                          </span>
                        </td>
                        <td className="amount">{formatVND(userShare(expense, currentUserId))}</td>
                        <td className="amount">{formatVND(expense.amount)}</td>
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
                <h2 className="panel__title">Group pulse</h2>
                <p className="panel__subtitle">A quick look at this shared space.</p>
              </div>
            </div>
            <div className="summary-row">
              <span>Members</span>
              <strong>{memberCount}</strong>
            </div>
            <div className="summary-row">
              <span>Expenses</span>
              <strong>{list.length}</strong>
            </div>
            <div className="summary-row">
              <span>Open for editing</span>
              <strong>{unpaidExpenses}</strong>
            </div>
            <div className="summary-row">
              <span>Locked</span>
              <strong>{list.length - unpaidExpenses}</strong>
            </div>
          </section>

          <Notice tone="lavender">
            An expense is split equally between the people selected. Leftover đồng are shared one by one in a fixed order.
          </Notice>
        </aside>
      </div>
    </>
  )
}
