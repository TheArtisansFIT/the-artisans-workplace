import { Link } from 'react-router-dom'
import { HandCoins } from 'lucide-react'

export default function Brand({ to = '/groups', className = '' }) {
  return (
    <Link className={`brand ${className}`.trim()} to={to} aria-label="SplitNest home">
      <span className="brand__mark" aria-hidden="true">
        <HandCoins size={20} />
      </span>
      <span className="brand__name">SplitNest</span>
    </Link>
  )
}
