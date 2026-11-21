import { Check, ReceiptText, Sparkles } from 'lucide-react'
import Brand from './Brand.jsx'

const STORY_COPY = {
  login: {
    kicker: 'Welcome back',
    title: (
      <>
        Every shared cost,
        <br />
        <em>in one cozy place.</em>
      </>
    ),
    lead: 'Pick up where you left off and see exactly who owes whom, without scrolling through chat history.',
    benefits: [
      'Up-to-date group expense records',
      'Clear repayment status for every member',
      'Private spaces for the people you trust',
    ],
  },
  register: {
    kicker: 'Shared expenses, simplified',
    title: (
      <>
        Shared costs.
        <br />
        <em>Clear balances.</em>
      </>
    ),
    lead: 'One reliable place for your group’s expenses, shares and repayments — made for friends in Vietnam.',
    benefits: [
      'Private groups for the people you trust',
      'Equal splitting in whole VND',
      'Clear, confirmed repayment status',
    ],
  },
}

export default function AuthLayout({ mode = 'login', children }) {
  const copy = STORY_COPY[mode] ?? STORY_COPY.login

  return (
    <main className="auth-shell">
      <aside className="auth-story" aria-label="About SplitNest">
        <Brand to="/login" />
        <div className="auth-story__content">
          <p className="auth-story__kicker">
            <Sparkles size={12} aria-hidden="true" />
            {copy.kicker}
          </p>
          <h1>{copy.title}</h1>
          <p className="auth-story__lead">{copy.lead}</p>

          <ul className="auth-story__benefits">
            {copy.benefits.map((benefit) => (
              <li className="auth-story__benefit" key={benefit}>
                <span className="auth-story__check" aria-hidden="true">
                  <Check size={14} strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="auth-story__note-card" aria-hidden="true">
            <div className="auth-story__note-top">
              <span className="auth-story__note-icon">
                <ReceiptText size={17} />
              </span>
              <div>
                <strong>Đà Lạt trip 2026</strong>
                <span>4 members · 3 expenses</span>
              </div>
            </div>
            <div className="auth-story__note-row">
              <span>Dinner at Bánh Xèo 46A</span>
              <strong>150,000 VND</strong>
            </div>
            <div className="auth-story__note-row">
              <span>You are owed</span>
              <strong>50,000 VND</strong>
            </div>
          </div>
        </div>
        <span className="auth-story__foot">Made for shared expenses in Vietnam.</span>
      </aside>

      <div className="auth-panel">
        <div className="auth-card">{children}</div>
      </div>
    </main>
  )
}
