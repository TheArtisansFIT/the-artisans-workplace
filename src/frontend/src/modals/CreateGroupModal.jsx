import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import Field from '../components/ui/Field.jsx'
import Modal from '../components/ui/Modal.jsx'
import Notice from '../components/ui/Notice.jsx'
import { useData } from '../context/DataContext.jsx'

export default function CreateGroupModal() {
  const navigate = useNavigate()
  const { createGroup } = useData()
  const [values, setValues] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState({})

  const close = () => navigate('/groups')

  const update = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!values.name.trim()) {
      nextErrors.name = 'Give your group a name.'
    } else if (values.name.trim().length < 2) {
      nextErrors.name = 'Use at least 2 characters.'
    }
    if (values.description.length > 200) {
      nextErrors.description = 'Keep the description under 200 characters.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const group = createGroup(values)
    navigate(`/groups/${group.id}?tab=members`, { replace: true })
  }

  return (
    <Modal
      title="Create a private group"
      description="Set up one shared space for a trip, your home or any activity."
      onClose={close}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="create-group-form" icon={Plus}>
            Create group
          </Button>
        </>
      }
    >
      <form id="create-group-form" onSubmit={handleSubmit} noValidate>
        <Field
          label="Group name"
          htmlFor="group-name"
          error={errors.name}
          hint="Only members of this group can see its information."
          hintId="group-name-help"
        >
          <input
            id="group-name"
            name="name"
            className={`input ${errors.name ? 'input--error' : ''}`}
            value={values.name}
            onChange={update}
            placeholder="e.g. Đà Lạt trip 2026"
            autoFocus
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby="group-name-help"
            maxLength={80}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="group-description"
          error={errors.description}
          hint={`${values.description.length}/200 characters`}
          hintId="group-description-help"
        >
          <textarea
            id="group-description"
            name="description"
            className={`textarea ${errors.description ? 'textarea--error' : ''}`}
            value={values.description}
            onChange={update}
            placeholder="A short note about what this group is for."
            aria-invalid={Boolean(errors.description) || undefined}
            aria-describedby="group-description-help"
          />
        </Field>

        <Field label="Currency" htmlFor="group-currency">
          <select className="select" id="group-currency" name="currency" defaultValue="VND" disabled>
            <option value="VND">VND — Vietnamese đồng</option>
          </select>
        </Field>

        <Notice tone="lavender">
          You will become the organizer and the first member. You can invite other people after creating the group.
        </Notice>
      </form>
    </Modal>
  )
}
