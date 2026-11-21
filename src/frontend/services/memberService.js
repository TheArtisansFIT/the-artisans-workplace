import { CURRENT_USER_ID, memberBankDetails, members } from '../data/seedData.js'

export { CURRENT_USER_ID }

const memberLookup = Object.fromEntries(
  members.map((member) => [member.id, member]),
)

export function getMember(memberId) {
  return memberLookup[memberId] ?? null
}

export function getMembers(memberIds = []) {
  return memberIds.map((id) => memberLookup[id]).filter(Boolean)
}

export function getMemberBankDetails(memberId) {
  return memberBankDetails[memberId] ?? null
}
