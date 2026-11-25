import { ArrowUpRight, Plus, Sparkles, UsersRound } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import Avatar from '../components/ui/Avatar.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { memberLookup } from '../data/mockData.js'
import { formatVND } from '../utils/format.js'
import { groupTotal, personalBalance } from '../utils/selectors.js'

function BalanceCopy({ balance }) {
  if (balance.net > 0) {
    return (
      <div className="group-card__balance">
        <span>You are owed</span>
        <strong className="is-positive">{formatVND(balance.net)}</strong>
      </div>
    )
  }
  if (balance.net < 0) {
    return (
      <div className="group-card__balance">
        <span>You owe</span>
        <strong className="is-negative">{formatVND(Math.abs(balance.net))}</strong>
      </div>
    )
  }
  return (
    <div className="group-card__balance">
      <span>Balance</span>
      <strong>All settled</strong>
    </div>
  )
}

export default function GroupsPage() {
  const { user } = useAuth()
  const { groups, expenses, debts, currentUserId } = useData()
  const myGroups = groups.filter((group) => group.memberIds.includes(currentUserId))
  const memberCount = new Set(myGroups.flatMap((group) => group.memberIds)).size

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Your workspace"
        title={`Good to see you, ${user?.name || 'Minh'}.`}
        description="Here are the shared spaces you belong to. Open a group to record expenses or settle a balance."
        actions={
          <Button as={Link} to="/groups/new" icon={Plus}>
            Create group
          </Button>
        }
      />

      <div className="stat-grid">
        <StatCard label="Active groups" value={myGroups.length} tone="lavender" hint="Private to their members" />
        <StatCard label="People in your groups" value={memberCount} tone="butter" hint="Across all shared spaces" />
        <StatCard label="Currency" value="VND" tone="peach" hint="Whole Vietnamese đồng" />
      </div>

      {myGroups.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No groups yet"
          description="Create a group for your next trip or shared home, or open an invitation link to join one."
          action={
            <Button as={Link} to="/groups/new" icon={Plus}>
              Create your first group
            </Button>
          }
        />
      ) : (
        <div className="group-grid">
          {myGroups.map((group) => {
            const balance = personalBalance(debts, group.id, currentUserId)
            const groupMembers = group.memberIds.map((id) => memberLookup[id]).filter(Boolean)
            const total = groupTotal(expenses, group.id)
            const expenseCount = expenses.filter((expense) => expense.groupId === group.id).length

            return (
              <Link
                className="group-card"
                key={group.id}
                to={`/groups/${group.id}?tab=expenses`}
                aria-label={`Open ${group.name}`}
              >
                <div className="group-card__head">
                  <Avatar name={group.name} group size="lg" />
                  <div className="group-card__title">
                    <h2>{group.name}</h2>
                    <p>
                      {group.memberIds.length} members · {expenseCount}{' '}
                      {expenseCount === 1 ? 'expense' : 'expenses'}
                    </p>
                  </div>
                  <Badge tone={group.organizerId === currentUserId ? 'primary' : 'neutral'}>
                    {group.organizerId === currentUserId ? 'Organizer' : 'Member'}
                  </Badge>
                </div>

                <div className="group-card__foot">
                  <div className="avatar-stack" aria-label={groupMembers.map((member) => member.name).join(', ')}>
                    {groupMembers.slice(0, 5).map((member) => (
                      <Avatar key={member.id} member={member} size="sm" />
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span className="muted small" style={{ display: 'block', fontSize: 10 }}>
                        Total recorded
                      </span>
                      <span className="amount" style={{ fontSize: 12 }}>
                        {formatVND(total)}
                      </span>
                    </div>
                    <BalanceCopy balance={balance} />
                    <ArrowUpRight size={16} className="muted" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {myGroups.length > 0 && (
        <p className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18 }}>
          <Sparkles size={14} aria-hidden="true" />
          A group stays private to the people in it.
        </p>
      )}

      <Outlet />
    </div>
  )
}
