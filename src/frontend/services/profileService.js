import { initialProfile } from '../data/seedData.js'

export function buildProfile(user) {
  if (!user) return initialProfile
  return {
    displayName: user.displayName ?? user.name,
    email: user.email,
    memberSince: user.memberSince,
    bankDetails: user.bankDetails ?? null,
  }
}
