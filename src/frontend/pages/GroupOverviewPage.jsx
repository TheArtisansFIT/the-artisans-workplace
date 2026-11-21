import { Link, Outlet, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Plus, UserPlus, UsersRound } from 'lucide-react'
import Avatar from '../components/ui/Avatar.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import DebtsTab from '../components/groups/DebtsTab.jsx'
import ExpensesTab from '../components/groups/ExpensesTab.jsx'
import MembersTab from '../components/groups/MembersTab.jsx'
import { useData } from '../context/DataContext.jsx'

const TABS = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'debts', label: 'Debts & Settlements' },
  { id: 'members', label: 'Members & Invite' },
]

export default function GroupOverviewPage() {
  const { groupId } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { groups, expenses, debts, currentUserId } = useData()
  const group = groups.find((item) => item.id === groupId)

  if (!group) {
    return (
      <div className="page-container">
        <PageHeader
          eyebrow="Group workspace"
          title="Group not found"
          description="This group may have been removed, or you may not have access to it."
          actions={
            <Button as={Link} to="/groups" variant="outline">
              Back to my groups
            </Button>
          }
        />
        <EmptyState
          icon={UsersRound}
          title="We could not open this group"
          description="Check the address or return to My groups and choose a shared space."
          action={
            <Button as={Link} to="/groups">
              Go to my groups
            </Button>
          }
        />
      </div>
    )
  }

  if (!group.memberIds.includes(currentUserId)) {
    return (
      <div className="page-container">
        <PageHeader
          eyebrow="Group workspace"
          title="This group is private"
          description="Only group members can view its expenses, debts and member list. Open the invitation again to join."
          actions={
            <Button as={Link} to={`/join/${group.inviteToken}`}>
              Open invitation
            </Button>
          }
        />
        <EmptyState
          icon={UsersRound}
          title="Members only"
          description="Group information stays private to its members."
          action={
            <Button as={Link} to="/groups" variant="outline">
              Back to my groups
            </Button>
          }
        />
      </div>
    )
  }

  const tabParam = searchParams.get('tab')
  const isExpensePath = location.pathname.includes('/expenses')
  const isDebtPath = location.pathname.includes('/debts')
  const activeTab = isDebtPath
    ? 'debts'
    : isExpensePath
      ? 'expenses'
      : TABS.some((tab) => tab.id === tabParam)
        ? tabParam
        : 'expenses'

  return (
    <div className="page-container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/groups">My groups</Link>
        <span>/</span>
        <span>{group.name}</span>
      </nav>

      <header className="group-head">
        <div className="group-head__title">
          <Avatar name={group.name} group size="lg" />
          <div>
            <h1>{group.name}</h1>
            <div className="group-head__meta">
              <Badge tone={group.organizerId === currentUserId ? 'primary' : 'neutral'}>
                {group.organizerId === currentUserId ? 'Organizer' : 'Member'}
              </Badge>
              <span>Private group</span>
              <span aria-hidden="true">·</span>
              <span>{group.memberIds.length} members</span>
              {group.description && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{group.description}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="group-head__actions">
          <Button
            as={Link}
            to={`/groups/${group.id}?tab=members#invite`}
            variant="outline"
            icon={UserPlus}
          >
            Invite members
          </Button>
          {activeTab === 'expenses' && (
            <Button as={Link} to={`/groups/${group.id}/expenses/new`} icon={Plus}>
              Add expense
            </Button>
          )}
        </div>
      </header>

      <nav className="tabs" aria-label="Group sections">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            to={`/groups/${group.id}?tab=${tab.id}`}
            className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === 'expenses' && (
        <ExpensesTab
          group={group}
          expenses={expenses}
          debts={debts}
          currentUserId={currentUserId}
          memberCount={group.memberIds.length}
        />
      )}

      {activeTab === 'debts' && (
        <DebtsTab
          group={group}
          expenses={expenses}
          debts={debts}
          currentUserId={currentUserId}
        />
      )}

      {activeTab === 'members' && (
        <MembersTab group={group} expenses={expenses} currentUserId={currentUserId} />
      )}

      <Outlet />
    </div>
  )
}
