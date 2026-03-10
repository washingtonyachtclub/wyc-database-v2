import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from './form-context'
import {
  TextField,
  TextAreaField,
  NumberField,
  SelectField,
  BooleanSelectField,
  SubmitButton,
} from '../components/ui/app-form-fields'

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    TextAreaField,
    NumberField,
    SelectField,
    BooleanSelectField,
  },
  formComponents: {
    SubmitButton,
  },
})
