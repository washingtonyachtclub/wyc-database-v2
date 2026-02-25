import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import type { LessonRow } from '../../lib/lessons-server-fns'
import {
  createLesson,
  getClassTypes,
  updateLesson,
} from '../../lib/lessons-server-fns'
import { getQuartersQueryOptions } from '../../lib/members-query-options'
import { MemberCombobox } from '../ui/MemberCombobox'

type LessonFormModalProps = {
  isOpen: boolean
  onClose: () => void
  lesson: LessonRow | null
  currentQuarter: number
  onSuccess: () => void
}

type FormState = {
  typeId: number | null
  subtype: string
  day: string
  time: string
  dates: string
  calendarDate: string
  instructor1: number | null
  instructor2: number | null
  description: string
  size: string
  expire: number | null
  display: '1' | '0'
}


export function LessonFormModal({
  isOpen,
  onClose,
  lesson,
  currentQuarter,
  onSuccess,
}: LessonFormModalProps) {
  const queryClient = useQueryClient()
  const { data: quarters = [] } = useQuery(getQuartersQueryOptions())
  const { data: classTypes = [] } = useQuery({
    queryKey: ['lessonClassTypes'],
    queryFn: getClassTypes,
  })

  const [formState, setFormState] = useState<FormState>(() => ({
    typeId: null,
    subtype: '',
    day: '',
    time: '',
    dates: '',
    calendarDate: '',
    instructor1: 1,
    instructor2: 1,
    description: '',
    size: '',
    expire: null,
    display: '1',
  }))

  const [error, setError] = useState<string | null>(null)

  // Initialize / reset form state when modal opens or lesson changes
  useEffect(() => {
    if (!isOpen) return

    if (lesson) {
      const matchingType =
        classTypes && lesson.type
          ? classTypes.find((ct: any) => ct.text === lesson.type)
          : undefined

      setFormState({
        typeId: matchingType ? matchingType.index : null,
        subtype: lesson.subtype ?? '',
        day: lesson.day ?? '',
        time: lesson.time ?? '',
        dates: lesson.dates ?? '',
        calendarDate: lesson.calendarDate ?? '',
        instructor1: lesson.instructor1 ?? null,
        instructor2: lesson.instructor2 ?? null,
        description: lesson.comments ?? '',
        size: lesson.size != null ? String(lesson.size) : '',
        expire: lesson.expire ?? null,
        display: lesson.display ? '1' : '0',
      })
    } else {
      const defaultQuarter =
        quarters.find((q: any) => q.index === currentQuarter) ?? quarters[0]

      setFormState({
        typeId: null,
        subtype: '',
        day: '',
        time: '',
        dates: '',
        calendarDate: '',
        instructor1: 1,
        instructor2: 1,
        description: '',
        size: '',
        expire: defaultQuarter ? defaultQuarter.index : null,
        display: '1',
      })
    }
    setError(null)
  }, [isOpen, lesson, classTypes, quarters, currentQuarter])

  const createLessonMutation = useMutation({
    mutationFn: createLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      onSuccess()
      onClose()
    },
  })

  const updateLessonMutation = useMutation({
    mutationFn: updateLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      onSuccess()
      onClose()
    },
  })

  if (!isOpen) return null

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target
    setFormState((prev) => {
      if (name === 'typeId') {
        return { ...prev, typeId: value === '' ? null : Number(value) }
      }
      if (name === 'expire') {
        return { ...prev, expire: value === '' ? null : Number(value) }
      }
      if (name === 'display') {
        return { ...prev, display: (value === '1' ? '1' : '0') as '1' | '0' }
      }
      return { ...prev, [name]: value }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (formState.typeId == null) {
        throw new Error('Type is required')
      }
      if (!formState.calendarDate) {
        throw new Error('Calendar Date is required')
      }
      if (!formState.subtype) {
        throw new Error('Title is required')
      }
      if (!formState.day) {
        throw new Error('Day of week is required')
      }
      if (!formState.time) {
        throw new Error('Time is required')
      }
      if (!formState.dates) {
        throw new Error('Dates (display text) is required')
      }
      if (!formState.size) {
        throw new Error('Size is required')
      }
      if (formState.expire == null) {
        throw new Error('Expire is required')
      }

      const payload = {
        type: formState.typeId,
        subtype: formState.subtype || null,
        day: formState.day || null,
        time: formState.time || null,
        dates: formState.dates || null,
        calendarDate: formState.calendarDate,
        instructor1: formState.instructor1,
        instructor2: formState.instructor2,
        description: formState.description || null,
        size: Number(formState.size),
        expire: formState.expire,
        display: formState.display === '1' ? 1 : 0,
      }

      if (lesson) {
        await updateLessonMutation.mutateAsync({
          data: { index: lesson.index, ...payload },
        })
      } else {
        await createLessonMutation.mutateAsync({ data: payload })
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save lesson. Please try again.')
    }
  }

  const isSubmitting =
    createLessonMutation.isPending || updateLessonMutation.isPending

  const modalTitle = lesson ? 'Edit Lesson' : 'New Lesson'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="typeId"
                className="block text-sm font-medium mb-1"
              >
                Type
              </label>
              <select
                id="typeId"
                name="typeId"
                value={formState.typeId ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select type</option>
                {classTypes.map((ct: any) => (
                  <option key={ct.index} value={ct.index}>
                    {ct.text}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="subtype"
                className="block text-sm font-medium mb-1"
              >
                Title *
              </label>
              <input
                id="subtype"
                name="subtype"
                type="text"
                required
                value={formState.subtype}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="day" className="block text-sm font-medium mb-1">
                Day of week *
              </label>
              <input
                id="day"
                name="day"
                type="text"
                required
                value={formState.day}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium mb-1">
                Time *
              </label>
              <input
                id="time"
                name="time"
                type="text"
                required
                value={formState.time}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="dates"
                className="block text-sm font-medium mb-1"
              >
                Dates (display text) *
              </label>
              <input
                id="dates"
                name="dates"
                type="text"
                required
                value={formState.dates}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="calendarDate"
                className="block text-sm font-medium mb-1"
              >
                Calendar Date (Earliest Date if Multiple) *
              </label>
              <input
                id="calendarDate"
                name="calendarDate"
                type="date"
                required
                value={formState.calendarDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <MemberCombobox
                label="Instructor 1"
                value={formState.instructor1}
                onChange={(wycNumber) =>
                  setFormState((prev) => ({ ...prev, instructor1: wycNumber }))
                }
              />
            </div>

            <div>
              <MemberCombobox
                label="Instructor 2"
                value={formState.instructor2}
                onChange={(wycNumber) =>
                  setFormState((prev) => ({ ...prev, instructor2: wycNumber }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formState.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium mb-1">
                Size *
              </label>
              <input
                id="size"
                name="size"
                type="number"
                min={0}
                required
                value={formState.size}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="expire"
                className="block text-sm font-medium mb-1"
              >
                Expire *
              </label>
              <select
                id="expire"
                name="expire"
                required
                value={formState.expire ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select quarter</option>
                {quarters.map((q: any) => (
                  <option key={q.index} value={q.index}>
                    {q.school || q.text || `Quarter ${q.index}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="display"
                className="block text-sm font-medium mb-1"
              >
                Display (show on website) *
              </label>
              <select
                id="display"
                name="display"
                required
                value={formState.display}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-70"
            >
              {isSubmitting ? 'Saving...' : 'Save Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

