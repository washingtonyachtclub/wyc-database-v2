import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from './form-context'
import {
  TextField,
  TextAreaField,
  NumberField,
  SelectField,
  GroupedSelectField,
  BooleanSelectField,
  CheckboxField,
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
    GroupedSelectField,
    BooleanSelectField,
    CheckboxField,
  },
  formComponents: {
    SubmitButton,
  },
})
