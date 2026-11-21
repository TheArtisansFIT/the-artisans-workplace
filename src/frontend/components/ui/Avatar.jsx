import { initials } from '../../utils/format.js'

export default function Avatar({
  member,
  name,
  color,
  size = 'md',
  group = false,
  className = '',
}) {
  const label = name || member?.name || 'Member'
  const background = color || member?.color

  return (
    <span
      className={`avatar ${size === 'sm' ? 'avatar--sm' : ''} ${
        size === 'lg' ? 'avatar--lg' : ''
      } ${group ? 'avatar--group' : ''} ${className}`.trim()}
      style={background ? { '--avatar-color': background } : undefined}
      aria-hidden="true"
      title={label}
    >
      {initials(label)}
    </span>
  )
}
