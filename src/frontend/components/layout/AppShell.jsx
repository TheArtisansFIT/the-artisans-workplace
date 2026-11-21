import { useState } from 'react'
import { LogOut, ReceiptText, Sparkles, UserRound, UsersRound, Wallet } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import Avatar from '../ui/Avatar.jsx'
import Brand from './Brand.jsx'

function navClass(isActive) {
  return `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const { groups, currentUserId } = useData()
  const location = useLocation()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const myGroups = groups.filter((group) => group.memberIds.includes(currentUserId))
  const activeGroup = myGroups[0]
  const activeGroupId = activeGroup?.id ?? 'dalat-2026'
  const tab = new URLSearchParams(location.search).get('tab')
  const isGroupPath = location.pathname.startsWith('/groups/')
  const isExpensePath = isGroupPath && location.pathname.includes('/expenses')
  const isDebtPath = isGroupPath && location.pathname.includes('/debts')
  const isGroupsPage = location.pathname === '/groups' || location.pathname === '/groups/new'
  const isExpensesPage = isExpensePath || (isGroupPath && (tab === 'expenses' || !tab))
  const isDebtsPage = isDebtPath || (isGroupPath && tab === 'debts')

  const handleSignOut = async () => {
    setSignOutError('')
    setIsSigningOut(true)
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      setSignOutError(error.message || 'Could not sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand to="/groups" />
        <span className="topbar__context">Personal workspace</span>
        <div className="topbar__actions">
          {signOutError && (
            <span role="alert" className="help">
              {signOutError}
            </span>
          )}
          <NavLink className="topbar__user" to="/profile" aria-label="Open profile and bank details">
            <span className="topbar__user-copy">
              <strong>{user?.name ?? 'Minh'}</strong>
              <small>{user?.email ?? 'minh.le@example.com'}</small>
            </span>
            <Avatar
              name={user?.name ?? 'Minh'}
              color="#5a4a87"
              size="sm"
              className="topbar__avatar"
            />
          </NavLink>
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <p className="nav-label">Workspace</p>
        <nav className="nav-list" aria-label="Main navigation">
          <NavLink to="/groups" className={navClass(isGroupsPage)}>
            <UsersRound aria-hidden="true" />
            <span>My groups</span>
          </NavLink>
          <NavLink
            to={`/groups/${activeGroupId}?tab=expenses`}
            className={navClass(isExpensesPage)}
          >
            <ReceiptText aria-hidden="true" />
            <span>Expenses</span>
          </NavLink>
          <NavLink
            to={`/groups/${activeGroupId}?tab=debts`}
            className={navClass(isDebtsPage)}
          >
            <Wallet aria-hidden="true" />
            <span>Debts</span>
          </NavLink>
        </nav>

        <p className="nav-label">Settings</p>
        <nav className="nav-list" aria-label="Settings navigation">
          <NavLink to="/profile" className={navClass(location.pathname === '/profile')}>
            <UserRound aria-hidden="true" />
            <span>Profile</span>
          </NavLink>
        </nav>

        <div className="sidebar__tip">
          <span className="sidebar__tip-icon" aria-hidden="true">
            <Sparkles size={17} />
          </span>
          <strong>A little tip</strong>
          <p>Record the expense first, then settle up. Everyone can see the same story.</p>
        </div>
        <span className="sidebar__foot">SplitNest · Web application</span>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
