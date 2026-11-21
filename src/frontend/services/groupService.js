import {
  initialGroups,
  inviteTokenLookup,
  invitedGroups,
} from '../data/seedData.js'

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}

export function listInitialGroups() {
  return [...initialGroups, ...invitedGroups]
}

export function findGroup(groups, groupId) {
  return groups.find((group) => group.id === groupId) ?? null
}

export function findGroupByInviteToken(groups, inviteToken) {
  const mappedGroupId = inviteTokenLookup[inviteToken]
  return (
    groups.find(
      (group) => group.id === mappedGroupId || group.inviteToken === inviteToken,
    ) ?? null
  )
}

export function createGroup({ name, description, organizerId }) {
  const base = slugify(name) || 'group'
  return {
    id: `${base}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    description: description.trim(),
    currency: 'VND',
    organizerId,
    memberIds: [organizerId],
    createdAt: new Date().toISOString().slice(0, 10),
    inviteToken: Math.random().toString(36).slice(2, 10),
  }
}

export function addMember(group, memberId) {
  if (group.memberIds.includes(memberId)) return group
  return { ...group, memberIds: [...group.memberIds, memberId] }
}
