import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Check,
  CircleCheck,
  Clock3,
  Download,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Modal from '../ui/Modal.jsx'
import Notice from '../ui/Notice.jsx'
import QrPlaceholder from '../ui/QrPlaceholder.jsx'
import { useData } from '../../context/DataContext.jsx'
import { getMember, getMemberBankDetails } from '../../services/memberService.js'
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatVND,
  todayInputValue,
} from '../../utils/format.js'
import { downloadQrSvg } from '../../utils/qr.js'
import { debtStatusMeta } from '../../utils/selectors.js'

const VIEWS = ['detail', 'report', 'review', 'vietqr', 'qr', 'result']

const RESULT_COPY = {
  reported: {
    tone: 'pending',
    icon: Clock3,
    title: 'Repayment reported',
    description:
      'The receiver has been asked to confirm your payment. The debt stays pending until they respond.',
  },
  confirmed: {
    tone: 'success',
    icon: CircleCheck,
    title: 'Repayment confirmed',
    description: 'The receiver confirmed the payment. The linked debt is now settled.',
  },
  rejected: {
    tone: 'warning',
    icon: AlertTriangle,
    title: 'Repayment rejected',
    description:
      'The receiver could not confirm the payment. The debt is Unpaid again and the expense stays locked.',
  },
}

export default function DebtModal() {
  const { groupId, debtId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    getGroup,
    debts,
    expenses,
    profile,
    reportRepayment,
    confirmRepayment,
    rejectRepayment,
    currentUserId,
  } = useData()

  const debt = debts.find((item) => item.id === debtId)
  const requestedView = searchParams.get('view')
  const [view, setView] = useState(VIEWS.includes(requestedView) ? requestedView : 'detail')
  const [result, setResult] = useState(null)
  const [report, setReport] = useState({
    date: todayInputValue(),
    method: 'Bank transfer',
    reference: '',
  })
  const [reportError, setReportError] = useState('')
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [message, setMessage] = useState(
    debt ? `SplitNest ${debt.amount} VND` : 'SplitNest repayment',
  )

  const close = () => navigate(`/groups/${groupId}?tab=debts`)

  if (!debt) {
    return (
      <Modal title="Debt not found" onClose={close}>
        <Notice tone="error">This debt is no longer available.</Notice>
      </Modal>
    )
  }

  const expense = expenses.find((item) => item.id === debt.expenseId)
  const group = getGroup(groupId)
  const debtor = getMember(debt.from)
  const receiver = getMember(debt.to)
  const isDebtor = debt.from === currentUserId
  const isReceiver = debt.to === currentUserId
  const meta = debtStatusMeta(debt.status)
  const receiverBank =
    debt.to === currentUserId ? profile.bankDetails : getMemberBankDetails(debt.to)
  const qrValue = `${receiverBank?.bankName ?? 'Bank'}|${receiverBank?.accountNumber ?? ''}|${debt.amount}|${message}`

  const handleReport = (event) => {
    event.preventDefault()
    if (!report.date) {
      setReportError('Choose the date you made the payment.')
      return
    }
    reportRepayment(debt.id, report)
    setResult({
      type: 'reported',
      amount: debt.amount,
      at: new Date().toISOString(),
      method: report.method,
    })
    setView('result')
  }

  const handleConfirm = () => {
    confirmRepayment(debt.id)
    setResult({ type: 'confirmed', amount: debt.amount, at: new Date().toISOString() })
    setView('result')
  }

  const handleReject = () => {
    rejectRepayment(debt.id, rejectReason)
    setResult({
      type: 'rejected',
      amount: debt.amount,
      at: new Date().toISOString(),
      reason: rejectReason,
    })
    setView('result')
  }

  let title = 'Debt details'
  let description = `${expense?.description ?? 'Shared expense'} · ${group?.name ?? 'Private group'}`
  if (view === 'report') {
    title = 'Report a repayment'
    description = `Tell ${receiver?.name ?? 'the receiver'} that you paid outside SplitNest.`
  } else if (view === 'review') {
    title = 'Review a repayment'
    description = 'Confirm only after the money has reached your account.'
  } else if (view === 'vietqr' || view === 'qr') {
    title = view === 'qr' ? 'VietQR ready to share' : 'Generate a VietQR code'
    description = 'Use the receiver’s saved bank details and the debt amount.'
  } else if (view === 'result') {
    title = 'Repayment update'
    description = 'A summary of the latest repayment decision.'
  }

  const footer =
    view === 'report' ? (
      <>
        <Button variant="ghost" onClick={() => setView('detail')}>
          Cancel
        </Button>
        <Button type="submit" form="report-repayment-form" icon={Check}>
          Submit report
        </Button>
      </>
    ) : view === 'review' ? (
      <>
        <Button variant="ghost" onClick={() => setView('detail')}>
          Back
        </Button>
        {!rejectMode && (
          <>
            <Button variant="danger-ghost" icon={X} onClick={() => setRejectMode(true)}>
              Reject
            </Button>
            <Button icon={Check} onClick={handleConfirm}>
              Confirm received
            </Button>
          </>
        )}
      </>
    ) : view === 'vietqr' ? (
      <>
        <Button variant="ghost" onClick={() => setView('detail')}>
          Cancel
        </Button>
        <Button
          icon={QrCode}
          onClick={() => setView('qr')}
          disabled={!receiverBank}
        >
          Generate VietQR
        </Button>
      </>
    ) : view === 'qr' ? (
      <>
        <Button
          variant="outline"
          icon={Download}
          onClick={() => downloadQrSvg(qrValue, `splitnest-${debt.id}.svg`)}
        >
          Download QR
        </Button>
        <Button onClick={close}>Done</Button>
      </>
    ) : view === 'result' ? (
      <>
        <Button variant="outline" onClick={() => setView('detail')}>
          View debt
        </Button>
        <Button onClick={close}>Back to debts</Button>
      </>
    ) : (
      <Button variant="outline" onClick={close}>
        Close
      </Button>
    )

  return (
    <Modal
      title={title}
      description={description}
      onClose={close}
      size="wide"
      footer={footer}
    >
      {view === 'detail' && (
        <>
          <div className="debt-hero">
            <div>
              <div className="debt-hero__direction">
                <Avatar member={debtor} size="sm" />
                <span>{debt.from === currentUserId ? 'You' : debtor?.name}</span>
                <ArrowRight size={15} aria-hidden="true" />
                <Avatar member={receiver} size="sm" />
                <span>{debt.to === currentUserId ? 'You' : receiver?.name}</span>
              </div>
              <h3>{isDebtor ? `You owe ${receiver?.name}` : `${debtor?.name} owes you`}</h3>
              <p>{expense?.description ?? 'Shared expense'} · {formatDate(expense?.date)}</p>
            </div>
            <span className="debt-hero__amount">{formatVND(debt.amount)}</span>
          </div>

          <div className="debt-layout">
            <section className="panel">
              <div className="summary-row">
                <span>Expense</span>
                <strong>{expense?.description ?? 'Removed expense'}</strong>
              </div>
              <div className="summary-row">
                <span>Debtor</span>
                <strong>{debtor?.name}{isDebtor ? ' (you)' : ''}</strong>
              </div>
              <div className="summary-row">
                <span>Receiver</span>
                <strong>{receiver?.name}{isReceiver ? ' (you)' : ''}</strong>
              </div>
              <div className="summary-row">
                <span>Status</span>
                <strong><Badge tone={meta.tone}>{meta.label}</Badge></strong>
              </div>
              {debt.reportedAt && (
                <>
                  <div className="summary-row">
                    <span>Reported</span>
                    <strong>{formatDateTime(debt.reportedAt)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Method</span>
                    <strong>{debt.method}</strong>
                  </div>
                  {debt.reference && (
                    <div className="summary-row">
                      <span>Reference</span>
                      <strong>{debt.reference}</strong>
                    </div>
                  )}
                </>
              )}
            </section>

            <aside className="debt-summary">
              {isDebtor && debt.status === 'unpaid' && (
                <>
                  <Button icon={ArrowRight} onClick={() => setView('report')}>
                    Report repayment
                  </Button>
                  <Button variant="outline" icon={QrCode} onClick={() => setView('vietqr')}>
                    Generate VietQR
                  </Button>
                </>
              )}

              {isReceiver && debt.status === 'unpaid' && (
                <Button variant="outline" icon={QrCode} onClick={() => setView('vietqr')}>
                  Generate VietQR
                </Button>
              )}

              {isReceiver && debt.status === 'pending' && (
                <Button icon={ShieldCheck} onClick={() => setView('review')}>
                  Review repayment
                </Button>
              )}

              {debt.status === 'pending' && isDebtor && (
                <Notice tone="info">
                  Your report is waiting for {receiver?.name} to confirm it. The debt remains Pending confirmation.
                </Notice>
              )}

              {debt.status === 'settled' && (
                <Notice tone="success">
                  This debt was settled on {formatDateTime(debt.confirmedAt)}.
                </Notice>
              )}

              {debt.lastRejection && debt.status === 'unpaid' && (
                <Notice tone="warning">
                  <strong>Last report rejected.</strong> {debt.lastRejection.reason} You can submit a new report after completing the transfer.
                </Notice>
              )}

              <Notice tone="neutral">
                SplitNest does not verify bank transfers. A debt is settled only after the receiver confirms it.
              </Notice>
            </aside>
          </div>
        </>
      )}

      {view === 'report' && (
        <form id="report-repayment-form" onSubmit={handleReport} noValidate>
          <div className="debt-layout">
            <section className="panel">
              <div className="field">
                <label className="label" htmlFor="report-amount">Amount paid</label>
                <div className="input-wrap">
                  <input
                    className="input"
                    id="report-amount"
                    value={formatNumber(debt.amount)}
                    readOnly
                    aria-describedby="report-amount-help"
                  />
                  <span className="input-suffix">VND</span>
                </div>
                <span className="help" id="report-amount-help">Must equal the outstanding debt.</span>
              </div>

              <Field
                label="Payment date"
                htmlFor="report-date"
                error={reportError}
                hintId="report-date-help"
              >
                <input
                  id="report-date"
                  type="date"
                  className={`input ${reportError ? 'input--error' : ''}`}
                  value={report.date}
                  onChange={(event) => {
                    setReport((current) => ({ ...current, date: event.target.value }))
                    setReportError('')
                  }}
                  aria-invalid={Boolean(reportError) || undefined}
                  aria-describedby={reportError ? 'report-date-help' : undefined}
                />
              </Field>

              <div className="field">
                <span className="label">Payment method</span>
                <div className="repayment-methods" role="group" aria-label="Payment method">
                  {[
                    { id: 'Bank transfer', icon: QrCode, detail: 'Sent to the receiver’s bank' },
                    { id: 'Cash', icon: Banknote, detail: 'Paid in person' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      className={`choice ${report.method === method.id ? 'choice--selected' : ''}`}
                      onClick={() => setReport((current) => ({ ...current, method: method.id }))}
                      aria-pressed={report.method === method.id}
                    >
                      <method.icon size={18} aria-hidden="true" />
                      <span className="choice__copy">
                        <strong>{method.id}</strong>
                        <span>{method.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Field
                label="Transfer reference (optional)"
                htmlFor="report-reference"
                hint="A reference helps the receiver find the transfer. No receipt is uploaded."
              >
                <input
                  id="report-reference"
                  className="input"
                  value={report.reference}
                  onChange={(event) =>
                    setReport((current) => ({ ...current, reference: event.target.value }))
                  }
                  placeholder="e.g. DALAT-MINH-60K"
                  maxLength={80}
                />
              </Field>

              <Notice tone="warning">
                Submitting this form does not move money or verify a bank transaction. {receiver?.name} must confirm receipt.
              </Notice>
            </section>

            <aside className="panel debt-summary">
              <h3 className="panel__title">Debt summary</h3>
              <div className="summary-row"><span>Debtor</span><strong>{debtor?.name}{isDebtor ? ' (you)' : ''}</strong></div>
              <div className="summary-row"><span>Receiver</span><strong>{receiver?.name}{isReceiver ? ' (you)' : ''}</strong></div>
              <div className="summary-row"><span>Outstanding</span><strong>{formatVND(debt.amount)}</strong></div>
              <div className="summary-row"><span>After confirmation</span><strong>0 VND</strong></div>
              <Button variant="outline" icon={QrCode} onClick={() => setView('vietqr')}>
                Generate VietQR
              </Button>
            </aside>
          </div>
        </form>
      )}

      {view === 'review' && (
        <div className="debt-layout">
          <section className="panel">
            <div className="person" style={{ marginBottom: 18 }}>
              <Avatar member={debtor} size="lg" />
              <div>
                <h3 className="panel__title flush">{debtor?.name} reported a {debt.method?.toLowerCase()}</h3>
                <p className="panel__subtitle" style={{ margin: '3px 0 0' }}>
                  Submitted {formatDateTime(debt.reportedAt)}
                </p>
              </div>
            </div>

            <dl className="kv">
              <div><dt>Amount reported</dt><dd>{formatVND(debt.amount)}</dd></div>
              <div><dt>Payment date</dt><dd>{debt.paymentDate ? formatDate(debt.paymentDate) : 'Not provided'}</dd></div>
              <div><dt>Transfer reference</dt><dd>{debt.reference || '—'}</dd></div>
            </dl>

            <Notice tone="warning" style={{ marginTop: 16 }}>
              SplitNest cannot verify this transfer. Check your bank account before choosing an action.
            </Notice>

            {rejectMode && (
              <div style={{ marginTop: 16 }}>
                <Field
                  label="Reason for rejection"
                  htmlFor="reject-reason"
                  hint="This is shown to the debtor so they can fix the report."
                >
                  <textarea
                    id="reject-reason"
                    className="textarea"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="e.g. No matching transfer was found in my bank account."
                    maxLength={200}
                    autoFocus
                  />
                </Field>
                <div className="inline">
                  <Button variant="danger" icon={X} onClick={handleReject}>
                    Reject repayment
                  </Button>
                  <Button variant="ghost" onClick={() => setRejectMode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>

          <aside className="panel debt-summary">
            <h3 className="panel__title">Linked debt</h3>
            <div className="summary-row"><span>Expense</span><strong>{expense?.description ?? 'Removed expense'}</strong></div>
            <div className="summary-row"><span>Direction</span><strong>{debtor?.name} → {receiver?.name}</strong></div>
            <div className="summary-row"><span>Outstanding</span><strong>{formatVND(debt.amount)}</strong></div>
            <div className="summary-row"><span>Reported amount</span><strong>{formatVND(debt.amount)}</strong></div>
            <p className="help" style={{ marginTop: 6 }}>
              Confirming settles this debt. Rejecting returns it to Unpaid and keeps the linked expense locked.
            </p>
          </aside>
        </div>
      )}

      {view === 'vietqr' && (
        <div className="qr-layout">
          <section className="panel">
            <div className="panel__head">
              <div>
                <h3 className="panel__title">Payment information</h3>
                <p className="panel__subtitle">
                  {debtor?.name} → {receiver?.name} · {expense?.description ?? 'Shared expense'}
                </p>
              </div>
            </div>

            {receiverBank ? (
              <div className="bank-recipient">
                <div className="summary-row"><span>Bank</span><strong>{receiverBank.bankName}</strong></div>
                <div className="summary-row"><span>Account number</span><strong>{receiverBank.accountNumber}</strong></div>
                <div className="summary-row"><span>Account holder</span><strong>{receiverBank.accountHolder}</strong></div>
              </div>
            ) : (
              <Notice tone="warning">
                {receiver?.name} has not saved complete bank details, so a VietQR code cannot be generated yet.
                {isReceiver && (
                  <> <Link to="/profile">Add your bank details</Link>.</>
                )}
              </Notice>
            )}

            <Field label="Payment amount" htmlFor="vietqr-amount">
              <div className="input-wrap">
                <input
                  id="vietqr-amount"
                  className="input"
                  value={formatNumber(debt.amount)}
                  readOnly
                />
                <span className="input-suffix">VND</span>
              </div>
            </Field>

            <Field
              label="Transfer message"
              htmlFor="vietqr-message"
              hint="A short reference for the bank transfer."
            >
              <input
                id="vietqr-message"
                className="input"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={100}
              />
            </Field>

            <Notice tone="info">
              Saved bank details are used as payment reference only. Transfers happen in a banking app, outside SplitNest.
            </Notice>
          </section>

          <aside className="panel debt-summary">
            <h3 className="panel__title">Before you continue</h3>
            <ol className="steps">
              <li className="step">
                <span className="step__number">1</span>
                <div><strong>Generate the code</strong><p>Check the amount and recipient details.</p></div>
              </li>
              <li className="step">
                <span className="step__number">2</span>
                <div><strong>Share it with {isReceiver ? debtor?.name : receiver?.name}</strong><p>They scan it in a supported banking app.</p></div>
              </li>
              <li className="step">
                <span className="step__number">3</span>
                <div><strong>Report and confirm</strong><p>The payer reports the transfer; the receiver confirms receipt.</p></div>
              </li>
            </ol>
          </aside>
        </div>
      )}

      {view === 'qr' && receiverBank && (
        <div className="qr-layout">
          <section className="qr-payment">
            <QrPlaceholder value={qrValue} label="VietQR payment code" />
            <h3>{formatVND(debt.amount)}</h3>
            <p>{receiverBank.accountHolder} · {receiverBank.bankName} · {receiverBank.accountNumber}</p>
            <span className="badge badge--primary qr-payment__message">{message}</span>
            <div className="qr-payment__actions">
              <Button
                variant="outline"
                icon={Download}
                onClick={() => downloadQrSvg(qrValue, `splitnest-${debt.id}.svg`)}
              >
                Download QR
              </Button>
            </div>
            <p className="qr-caption">Illustrative code. The production build will use a valid VietQR payload.</p>
          </section>

          <aside className="panel debt-summary">
            <h3 className="panel__title">Payment instructions</h3>
            <Notice tone="info">
              This QR is a payment shortcut, not proof of transfer.
            </Notice>
            <ol className="steps">
              <li className="step">
                <span className="step__number">1</span>
                <div><strong>Open a banking app</strong><p>Use an app that supports VietQR.</p></div>
              </li>
              <li className="step">
                <span className="step__number">2</span>
                <div><strong>Scan and check</strong><p>Verify recipient, amount and message before paying.</p></div>
              </li>
              <li className="step">
                <span className="step__number">3</span>
                <div><strong>Return to SplitNest</strong><p>Report the repayment so the receiver can confirm it.</p></div>
              </li>
            </ol>
          </aside>
        </div>
      )}

      {view === 'result' && result && (
        <RepaymentResult result={result} debt={debt} debtor={debtor} receiver={receiver} />
      )}
    </Modal>
  )
}

function RepaymentResult({ result, debt, debtor, receiver }) {
  const copy = RESULT_COPY[result.type]
  const Icon = copy.icon

  return (
    <div className="result-hero">
      <span
        className={`result-hero__icon ${
          copy.tone === 'warning'
            ? 'result-hero__icon--warning'
            : copy.tone === 'pending'
              ? 'result-hero__icon--pending'
              : ''
        }`}
        aria-hidden="true"
      >
        <Icon size={30} />
      </span>
      <Badge tone={result.type === 'confirmed' ? 'settled' : result.type === 'rejected' ? 'unpaid' : 'pending'}>
        {result.type === 'confirmed' ? 'Settled' : result.type === 'rejected' ? 'Unpaid' : 'Pending confirmation'}
      </Badge>
      <h3>{copy.title}</h3>
      <p>{copy.description}</p>
      <strong className="result-hero__amount">{formatVND(result.amount)}</strong>

      <dl className="kv" style={{ textAlign: 'left' }}>
        <div><dt>From</dt><dd>{debtor?.name}</dd></div>
        <div><dt>To</dt><dd>{receiver?.name}</dd></div>
        <div><dt>{result.type === 'reported' ? 'Reported' : 'Recorded'}</dt><dd>{formatDateTime(result.at)}</dd></div>
      </dl>

      {result.type === 'rejected' && (
        <Notice tone="warning" style={{ marginTop: 14, textAlign: 'left' }}>
          <strong>Reason:</strong> {result.reason || 'No matching transfer was found in the receiver’s bank account.'}
        </Notice>
      )}

      <Notice tone="neutral" style={{ marginTop: 12, textAlign: 'left' }}>
        The linked expense remains locked while a repayment request exists. This decision is recorded in the repayment trail.
      </Notice>
    </div>
  )
}


