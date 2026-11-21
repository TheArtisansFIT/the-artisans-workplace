import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

export default function NotFoundPage() {
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="404"
        title="This page has wandered off"
        description="The address may be mistyped, or the page may have moved."
        actions={
          <Button as={Link} to="/groups">
            Back to my groups
          </Button>
        }
      />
      <div className="not-found">
        <div>
          <Compass size={48} aria-hidden="true" className="muted" style={{ margin: '0 auto 16px' }} />
          <h1>Nothing to split here</h1>
          <p>Try opening My groups and choosing a shared space from there.</p>
          <Button as={Link} to="/groups" variant="outline">
            Go to My groups
          </Button>
        </div>
      </div>
    </div>
  )
}
