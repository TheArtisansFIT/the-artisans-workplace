import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Check, UsersRound } from 'lucide-react'
import Brand from '../components/layout/Brand.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { findGroupByInviteToken } from '../services/groupService.js'
import { getMember } from '../services/memberService.js'

export default function JoinGroupPage() {
  const { inviteToken } = useParams()
  const { isAuthenticated, user } = useAuth()
  const { groups, currentUserId, joinGroup } = useData()
  const navigate = useNavigate()

  const group = findGroupByInviteToken(groups, inviteToken)
  const isMember = group?.memberIds.includes(currentUserId) ?? false
  const currentPath = `/join/${inviteToken}`
  const authLink = `/login?redirect=${encodeURIComponent(currentPath)}`
  const registerLink = `/register?redirect=${encodeURIComponent(currentPath)}`

  const handleJoin = () => {
    if (!group) return
    joinGroup(group.id)
    navigate(`/groups/${group.id}?tab=expenses`, { replace: true })
  }

  return (
    <main className="join-page">
      <div className="join-page__brand">
        <Brand to={isAuthenticated ? '/groups' : '/login'} />
      </div>

      <div className="join-page__wrap">
        {!group ? (
          <section className="join-card">
            <span className="join-card__icon join-card__icon--warning" aria-hidden="true">
              <AlertTriangle size={30} />
            </span>
            <h1>This invite link is not valid</h1>
            <p>
              The link may be mistyped or no longer exist. Ask a group member to send you a new invitation.
            </p>
            <Button as={Link} to={isAuthenticated ? '/groups' : '/login'} block size="lg">
              {isAuthenticated ? 'Go to my groups' : 'Go to sign in'}
            </Button>
            <p className="join-card__foot">No group information is shown for invalid links.</p>
          </section>
        ) : !isAuthenticated ? (
          <section className="join-card">
            <span className="join-card__icon" aria-hidden="true">
              <UsersRound size={30} />
            </span>
            <h1>Sign in to join</h1>
            <p>
              You need a SplitNest account to join this private group. After signing in, you will return to this invitation.
            </p>

            <div className="join-card__group">
              <Avatar name={group.name} group size="lg" />
              <div>
                <strong>{group.name}</strong>
                <span>
                  Private group · {group.memberIds.length} members · Invited by{' '}
                  {getMember(group.organizerId)?.name ?? group.organizerId}
                </span>
              </div>
            </div>

            <Button as={Link} to={authLink} block size="lg" iconRight={ArrowRight}>
              Sign in to continue
            </Button>
            <Button as={Link} to={registerLink} variant="outline" block>
              Create an account
            </Button>
            <p className="join-card__foot">Your invite link is kept as the return address.</p>
          </section>
        ) : isMember ? (
          <section className="join-card">
            <span className="join-card__icon" aria-hidden="true">
              <Check size={30} />
            </span>
            <h1>You are already in this group</h1>
            <p>You can open it now and continue to its shared expenses and balances.</p>

            <div className="join-card__group">
              <Avatar name={group.name} group size="lg" />
              <div>
                <strong>{group.name}</strong>
                <span>{group.description}</span>
              </div>
            </div>

            <Button as={Link} to={`/groups/${group.id}?tab=expenses`} block size="lg" iconRight={ArrowRight}>
              Open group
            </Button>
            <Button as={Link} to="/groups" variant="ghost" block>
              Not now
            </Button>
          </section>
        ) : (
          <section className="join-card">
            <span className="join-card__icon" aria-hidden="true">
              <UsersRound size={30} />
            </span>
            <h1>Join this group?</h1>
            <p>
              You have been invited to a private SplitNest group. After joining, you can view its members, expenses and balances.
            </p>

            <div className="join-card__group">
              <Avatar name={group.name} group size="lg" />
              <div>
                <strong>{group.name}</strong>
                <span>
                  {group.description} · {group.memberIds.length} members
                </span>
              </div>
            </div>

            <span className="join-card__label">Signed in as</span>
            <div className="join-card__signed">
              <Avatar name={user?.name ?? 'Minh'} size="sm" />
              <div className="person__copy">
                <span className="person__name">{user?.name ?? 'Minh'}</span>
                <span className="person__meta">{user?.email ?? 'minh.le@example.com'}</span>
              </div>
            </div>

            <Button block size="lg" onClick={handleJoin} iconRight={ArrowRight}>
              Join group
            </Button>
            <Button as={Link} to="/groups" variant="ghost" block>
              Not now
            </Button>
            <p className="join-card__foot">
              Group details become fully available after you join.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
