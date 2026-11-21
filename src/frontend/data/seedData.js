/**
 * Seed data for the local mock layer. Every collection is shaped so that it can
 * later be replaced by responses from the Flask REST API without changing the
 * screens. Access it through `services/` instead of importing it directly.
 */

export const CURRENT_USER_ID = 'minh'

export const members = [
  {
    id: 'minh',
    name: 'Minh',
    email: 'minh.le@example.com',
    color: '#5a4a87',
    joinedAt: '2026-10-20',
  },
  {
    id: 'lan',
    name: 'Lan',
    email: 'lan@example.com',
    color: '#b05b7b',
    joinedAt: '2026-10-20',
  },
  {
    id: 'huy',
    name: 'Huy',
    email: 'huy@example.com',
    color: '#b5722f',
    joinedAt: '2026-10-21',
  },
  {
    id: 'thu',
    name: 'Thu',
    email: 'thu@example.com',
    color: '#367b78',
    joinedAt: '2026-10-21',
  },
]

export const memberBankDetails = {
  minh: {
    bankName: 'Vietcombank',
    accountNumber: '0123456789',
    accountHolder: 'LE QUANG MINH',
  },
  lan: {
    bankName: 'MB Bank',
    accountNumber: '1903567890123',
    accountHolder: 'NGUYEN THI LAN',
  },
  huy: {
    bankName: 'Techcombank',
    accountNumber: '1903678901234',
    accountHolder: 'TRAN QUOC HUY',
  },
  thu: {
    bankName: 'ACB',
    accountNumber: '123456789',
    accountHolder: 'PHAM MINH THU',
  },
}

export const initialGroups = [
  {
    id: 'dalat-2026',
    name: 'Đà Lạt trip 2026',
    description: 'A long weekend, shared food and plenty of coffee.',
    currency: 'VND',
    organizerId: 'minh',
    memberIds: ['minh', 'lan', 'huy', 'thu'],
    createdAt: '2026-10-20',
    inviteToken: 'Xk3p9Qa2',
  },
  {
    id: 'phong-3b',
    name: 'Phòng 3B',
    description: 'Rent, internet and everyday things for the flat.',
    currency: 'VND',
    organizerId: 'lan',
    memberIds: ['minh', 'lan', 'huy'],
    createdAt: '2026-09-02',
    inviteToken: 'P3b-join',
  },
]

// A group that only appears after the user accepts an invitation.
export const invitedGroups = [
  {
    id: 'hoi-an-2026',
    name: 'Hội An weekend',
    description: 'A small getaway with lanterns, bánh mì and shared costs.',
    currency: 'VND',
    organizerId: 'lan',
    memberIds: ['lan', 'huy'],
    createdAt: '2026-11-02',
    inviteToken: 'HoiAn2026',
  },
]

export const inviteTokenLookup = {
  Xk3p9Qa2: 'dalat-2026',
  'P3b-join': 'phong-3b',
  HoiAn2026: 'hoi-an-2026',
}

export const initialExpenses = [
  {
    id: 'exp-dinner',
    groupId: 'dalat-2026',
    description: 'Dinner at Bánh Xèo 46A',
    amount: 150000,
    date: '2026-10-25',
    paidBy: 'minh',
    participantIds: ['minh', 'lan', 'huy'],
    createdBy: 'minh',
    createdAt: '2026-10-25T19:42:00',
    locked: false,
  },
  {
    id: 'exp-fuel',
    groupId: 'dalat-2026',
    description: 'Fuel for two scooters',
    amount: 180000,
    date: '2026-10-24',
    paidBy: 'huy',
    participantIds: ['minh', 'lan', 'huy'],
    createdBy: 'huy',
    createdAt: '2026-10-24T16:08:00',
    locked: false,
  },
  {
    id: 'exp-groceries',
    groupId: 'dalat-2026',
    description: 'Groceries for the homestay',
    amount: 245000,
    date: '2026-10-22',
    paidBy: 'lan',
    participantIds: ['minh', 'lan', 'huy', 'thu'],
    createdBy: 'lan',
    createdAt: '2026-10-22T10:24:00',
    locked: false,
  },
  {
    id: 'exp-snacks',
    groupId: 'dalat-2026',
    description: 'Cabin snacks and coffee',
    amount: 100000,
    date: '2026-10-26',
    paidBy: 'minh',
    participantIds: ['minh', 'thu'],
    createdBy: 'minh',
    createdAt: '2026-10-26T08:30:00',
    locked: true,
  },
  {
    id: 'exp-rent',
    groupId: 'phong-3b',
    description: 'October rent',
    amount: 1000000,
    date: '2026-10-01',
    paidBy: 'minh',
    participantIds: ['minh', 'lan', 'huy'],
    createdBy: 'minh',
    createdAt: '2026-10-01T09:00:00',
    locked: false,
  },
  {
    id: 'exp-internet',
    groupId: 'phong-3b',
    description: 'Internet bill',
    amount: 240000,
    date: '2026-10-03',
    paidBy: 'lan',
    participantIds: ['minh', 'lan', 'huy'],
    createdBy: 'lan',
    createdAt: '2026-10-03T18:10:00',
    locked: false,
  },
]

export const initialDebts = [
  {
    id: 'debt-fuel-huy',
    groupId: 'dalat-2026',
    expenseId: 'exp-fuel',
    from: 'minh',
    to: 'huy',
    amount: 60000,
    status: 'unpaid',
  },
  {
    id: 'debt-dinner-lan',
    groupId: 'dalat-2026',
    expenseId: 'exp-dinner',
    from: 'lan',
    to: 'minh',
    amount: 50000,
    status: 'unpaid',
  },
  {
    id: 'debt-groceries-lan',
    groupId: 'dalat-2026',
    expenseId: 'exp-groceries',
    from: 'minh',
    to: 'lan',
    amount: 61250,
    status: 'unpaid',
  },
  {
    id: 'debt-groceries-huy',
    groupId: 'dalat-2026',
    expenseId: 'exp-groceries',
    from: 'huy',
    to: 'lan',
    amount: 61250,
    status: 'unpaid',
  },
  {
    id: 'debt-snacks-thu',
    groupId: 'dalat-2026',
    expenseId: 'exp-snacks',
    from: 'thu',
    to: 'minh',
    amount: 50000,
    status: 'pending',
    reportedAt: '2026-10-26T20:15:00',
    paymentDate: '2026-10-26',
    method: 'Bank transfer',
    reference: 'DALAT-THU-50K',
  },
  {
    id: 'debt-rent-lan',
    groupId: 'phong-3b',
    expenseId: 'exp-rent',
    from: 'lan',
    to: 'minh',
    amount: 333334,
    status: 'unpaid',
  },
  {
    id: 'debt-internet-minh',
    groupId: 'phong-3b',
    expenseId: 'exp-internet',
    from: 'minh',
    to: 'lan',
    amount: 80000,
    status: 'unpaid',
  },
]

export const initialProfile = {
  displayName: 'Minh',
  email: 'minh.le@example.com',
  memberSince: '2026-10-20',
  bankDetails: {
    bankName: 'Vietcombank',
    accountNumber: '0123456789',
    accountHolder: 'LE QUANG MINH',
  },
}
