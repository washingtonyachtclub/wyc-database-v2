import { doorCodeFormSchema } from '@/domains/door-codes/schema'
import { useAppForm } from '../../hooks/form'
import { Button } from '../ui/button'
import { Modal } from '../ui/Modal'

type EditDoorCodeModalProps = {
  name: string
  currentCode: string
  onClose: () => void
  /** Hands the new code back for confirmation; the mutation fires after the user confirms. */
  onSubmit: (code: string) => void
}

export function EditDoorCodeModal({
  name,
  currentCode,
  onClose,
  onSubmit,
}: EditDoorCodeModalProps) {
  const form = useAppForm({
    defaultValues: { code: currentCode },
    validators: { onSubmit: doorCodeFormSchema },
    onSubmit: ({ value }) => {
      onSubmit(value.code.trim())
    },
  })

  return (
    <Modal onClose={onClose} title={`Edit ${name} Code`}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="p-6 space-y-4"
      >
        <form.AppField
          name="code"
          children={(field) => <field.TextField label="Code" required />}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Modal>
  )
}
