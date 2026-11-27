import { CURRENT_USER_ID, memberBankDetails, members } from '../data/seedData.js'

export { CURRENT_USER_ID }

const memberLookup = Object.fromEntries(
  members.map((member) => [member.id, member]),
)

export function getMember(memberId, fallbackMember) {
  if (memberLookup[memberId]) return memberLookup[memberId]
  if (!memberId) return null
  if (fallbackMember?.id === memberId) {
    return { ...fallbackMember, color: fallbackMember.color ?? '#5a4a87' }
  }
  return { id: memberId, name: memberId, color: '#5a4a87' }
}

export function getMembers(memberIds = [], fallbackMember) {
  return memberIds.map((id) => getMember(id, fallbackMember)).filter(Boolean)
}

export function getMemberBankDetails(memberId) {
  return memberBankDetails[memberId] ?? null
}
