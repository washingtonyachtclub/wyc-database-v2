import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import type { Member } from 'src/db/schema'
import { addMember } from '../../lib/members-server-fns'
import {
  getCategoriesQueryOptions,
  getMostRecentWycNumberQueryOptions,
  getQuartersQueryOptions,
} from '../../lib/members-query-options'

export function AddMemberForm({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const { data: mostRecentNumber } = useQuery(
    getMostRecentWycNumberQueryOptions(),
  )
  const { data: categories = [] } = useQuery(getCategoriesQueryOptions())
  const { data: quartersData = [] } = useQuery(getQuartersQueryOptions())

  const addMemberMutation = useMutation({
    mutationFn: addMember,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['members'],
      })
      queryClient.invalidateQueries(getMostRecentWycNumberQueryOptions())
      onSuccess()
      onClose()
    },
  })

  const [formData, setFormData] = useState<Partial<Member>>({
    wycNumber: 1,
    category: undefined,
    expireQtr: undefined,
    outToSea: 0,
    joinDate: new Date().toISOString().slice(0, 16),
    password: '',
  })

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && mostRecentNumber) {
      setFormData((prev) => ({
        ...prev,
        wycNumber: mostRecentNumber + 1,
      }))
    }
  }, [mostRecentNumber, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const memberData: Member = {
        wycNumber: formData.wycNumber!,
        first: formData.first || null,
        last: formData.last || null,
        streetAddress: formData.streetAddress || null,
        city: formData.city || null,
        state: formData.state || null,
        zipCode: formData.zipCode || null,
        phone1: formData.phone1 || null,
        phone2: formData.phone2 || null,
        email: formData.email || null,
        category: formData.category ?? null,
        expireQtr: formData.expireQtr ?? 0,
        studentId: formData.studentId ?? null,
        password: formData.password || null,
        outToSea: formData.outToSea ?? 0,
        joinDate: formData.joinDate
          ? new Date(formData.joinDate).toISOString()
          : new Date().toISOString(),
        imageName: formData.imageName || null,
      }

      await addMemberMutation.mutateAsync({ data: memberData })
    } catch (err: any) {
      setError(err.message || 'Failed to add member. Please try again.')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'wycNumber' ||
        name === 'category' ||
        name === 'expireQtr' ||
        name === 'studentId' ||
        name === 'outToSea'
          ? value === '' || value === 'null'
            ? null
            : Number(value)
          : value === ''
            ? null
            : value,
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add New Member</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="wycNumber"
                className="block text-sm font-medium mb-1"
              >
                WYC ID *
              </label>
              <input
                id="wycNumber"
                name="wycNumber"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={formData.wycNumber ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="joinDate"
                className="block text-sm font-medium mb-1"
              >
                Join Date *
              </label>
              <input
                id="joinDate"
                name="joinDate"
                type="datetime-local"
                required
                value={formData.joinDate?.slice(0, 16) ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="first" className="block text-sm font-medium mb-1">
                First Name
              </label>
              <input
                id="first"
                name="first"
                type="text"
                maxLength={50}
                value={formData.first ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="last" className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                id="last"
                name="last"
                type="text"
                maxLength={50}
                value={formData.last ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                maxLength={50}
                value={formData.email ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="phone1"
                className="block text-sm font-medium mb-1"
              >
                Phone 1
              </label>
              <input
                id="phone1"
                name="phone1"
                type="text"
                maxLength={50}
                value={formData.phone1 ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="phone2"
                className="block text-sm font-medium mb-1"
              >
                Phone 2
              </label>
              <input
                id="phone2"
                name="phone2"
                type="text"
                maxLength={50}
                value={formData.phone2 ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                maxLength={50}
                value={formData.password ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="streetAddress"
                className="block text-sm font-medium mb-1"
              >
                Street Address
              </label>
              <input
                id="streetAddress"
                name="streetAddress"
                type="text"
                maxLength={100}
                value={formData.streetAddress ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium mb-1">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                maxLength={50}
                value={formData.city ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium mb-1">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                maxLength={20}
                value={formData.state ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="zipCode"
                className="block text-sm font-medium mb-1"
              >
                Zip Code
              </label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                maxLength={10}
                value={formData.zipCode ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium mb-1"
              >
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.index} value={cat.index}>
                    {cat.text || `Category ${cat.index}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="expireQtr"
                className="block text-sm font-medium mb-1"
              >
                Expire Quarter *
              </label>
              <select
                id="expireQtr"
                name="expireQtr"
                required
                value={formData.expireQtr ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select Quarter</option>
                {quartersData.map((qtr) => (
                  <option key={qtr.index} value={qtr.index}>
                    {qtr.school || qtr.text || `Quarter ${qtr.index}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="studentId"
                className="block text-sm font-medium mb-1"
              >
                Student ID
              </label>
              <input
                id="studentId"
                name="studentId"
                type="number"
                value={formData.studentId ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label
                htmlFor="outToSea"
                className="block text-sm font-medium mb-1"
              >
                Out to Sea
              </label>
              <select
                id="outToSea"
                name="outToSea"
                value={formData.outToSea ?? 0}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="imageName"
                className="block text-sm font-medium mb-1"
              >
                Image Name
              </label>
              <input
                id="imageName"
                name="imageName"
                type="text"
                maxLength={50}
                value={formData.imageName ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-accent"
              disabled={addMemberMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
              disabled={addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
