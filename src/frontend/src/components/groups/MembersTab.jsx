import { useState } from 'react'
import { Check, Copy, Link2, Share2, UsersRound } from 'lucide-react'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Notice from '../ui/Notice.jsx'
import QrPlaceholder from '../ui/QrPlaceholder.jsx'
import { memberLookup } from '../../data/mockData.js'
import { formatDate, formatVND } from '../../utils/format.js'
import { groupExpenses } from '../../utils/selectors.js'

export default function MembersTab({ group, expenses, currentUserId }) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState('')
  const inviteUrl = `${window.location.origin}/join/${group.inviteToken}`
  const groupMembers = group.memberIds.map((id) => memberLookup[id]).filter(Boolean)
  const list = groupExpenses(expenses, group.id)
  const total = list.reduce((sum, expense) => sum + expense.amount, 0)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setShared('Link copied to the clipboard.')
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setShared('Copy the link from the field above.')
    }
  }

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on SplitNest`,
          text: `You are invited to ${group.name} on SplitNest.`,
          url: inviteUrl,
        })
        setShared('Invitation shared.')
      } catch {
        // The user closed the share sheet; no error message is needed.
      }
      return
    }
    await copyLink()
  }

  return (
    <>
      <div className="group-panels">
        <section className="table-wrap" aria-label="Group members">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {groupMembers.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="person">
                      <Avatar member={member} size="sm" />
                      <span className="member-name">
                        {member.name}
                        {member.id === currentUserId && <span className="you">(you)</span>}
                      </span>
                    </div>
                  </td>
                  <td>{member.email}</td>
                  <td>
                    <Badge tone={member.id === group.organizerId ? 'primary' : 'neutral'}>
                      {member.id === group.organizerId ? 'Organizer' : 'Member'}
                    </Badge>
                  </td>
                  <td>{formatDate(member.joinedAt ?? group.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="group-side">
          <section className="panel">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">Group overview</h2>
              </div>
            </div>
            <span className="muted small">Total recorded</span>
            <div className="group-side__amount">{formatVND(total)}</div>
            <div className="summary-row">
              <span>Shared expenses</span>
              <strong>{list.length}</strong>
            </div>
            <div className="summary-row">
              <span>Created by</span>
              <strong>{memberLookup[group.organizerId]?.name ?? 'Member'}</strong>
            </div>
            <div className="summary-row">
              <span>Created on</span>
              <strong>{formatDate(group.createdAt)}</strong>
            </div>
            <Notice tone="neutral">
              Only group members can view this information.
            </Notice>
          </section>
        </aside>
      </div>

      <section className="panel" id="invite" style={{ marginTop: 20 }}>
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Invite members</h2>
            <p className="panel__subtitle">
              Share a join link or let friends scan its QR code. The QR opens the same web invitation.
            </p>
          </div>
          <Badge tone="primary">Private invite</Badge>
        </div>

        <div className="invite-layout">
          <div>
            <QrPlaceholder
              value={inviteUrl}
              label={`Invitation QR code for ${group.name}`}
            />
            <p className="qr-caption">Scan with a phone camera to open the web join page.</p>
          </div>

          <div className="invite-copy">
            <span className="label">Invite link</span>
            <div className="link-box">
              <Link2 size={15} aria-hidden="true" className="muted" />
              <span>{inviteUrl}</span>
            </div>

            <div className="invite-actions">
              <Button variant="outline" icon={copied ? Check : Copy} onClick={copyLink}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button icon={Share2} onClick={shareLink}>
                Share
              </Button>
            </div>

            {shared && (
              <p className="help" role="status">
                {shared}
              </p>
            )}

            <Notice tone="warning">
              Anyone who signs in with this link can join. Share it only with people you trust.
            </Notice>

            <div className="inline" style={{ gap: 7 }}>
              <UsersRound size={14} aria-hidden="true" className="muted" />
              <span className="muted small">{groupMembers.length} people already in this group</span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
