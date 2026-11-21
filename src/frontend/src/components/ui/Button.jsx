import { LoaderCircle } from 'lucide-react'

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  block = false,
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  className = '',
  children,
  type,
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size !== 'md' ? `btn--${size}` : '',
    block ? 'btn--block' : '',
    !children ? 'btn--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component
      className={classes}
      {...(Component === 'button' ? { type: type ?? 'button' } : {})}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="btn__spinner" size={17} aria-hidden="true" />
      ) : (
        Icon && <Icon size={17} aria-hidden="true" />
      )}
      {children}
      {IconRight && <IconRight size={17} aria-hidden="true" />}
    </Component>
  )
}
