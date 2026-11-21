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
  const closeRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousActive = document.activeElement
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousActive?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`modal ${size === 'wide' ? 'modal--wide' : ''} ${
          size === 'full' ? 'modal--full' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal__head">
          <div>
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {description && <p className="modal__description">{description}</p>}
          </div>
          <button
            ref={closeRef}
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
