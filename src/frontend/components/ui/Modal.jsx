import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  labelledBy,
}) {
  const generatedId = useId()
  const titleId = labelledBy || `modal-title-${generatedId}`
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)

  // Keep the latest handler without re-running the mount effect.
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)

    // Do not steal focus from an `autoFocus` field. Only move focus into the
    // dialog when nothing inside it is focused yet.
    const dialog = dialogRef.current
    const previousActive = document.activeElement
    if (dialog && !dialog.contains(document.activeElement)) {
      const firstFocusable = dialog.querySelector('input, select, textarea, button, [href]')
      ;(firstFocusable ?? dialog).focus()
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousActive?.focus?.()
    }
  }, [])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className={`modal ${size === 'wide' ? 'modal--wide' : ''} ${
          size === 'full' ? 'modal--full' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="modal__head">
          <div>
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {description && <p className="modal__description">{description}</p>}
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
