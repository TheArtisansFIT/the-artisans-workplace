import { useMemo } from 'react'
import { buildQrMatrix } from '../../utils/qr.js'

/**
 * A deterministic, clearly labelled illustrative QR. The production version
 * will render the backend-generated VietQR payload.
 */
export default function QrPlaceholder({ value = 'SplitNest', label = 'Illustrative QR code' }) {
  const cells = useMemo(() => buildQrMatrix(value), [value])

  return (
    <div className="qr-frame">
      <div className="qr-grid" role="img" aria-label={`${label} for ${value}`}>
        {cells.map((dark, index) => (
          <span key={index} className={dark ? 'is-dark' : ''} />
        ))}
      </div>
    </div>
  )
}
