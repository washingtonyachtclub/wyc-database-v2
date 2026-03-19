import { useEffect, useState } from 'react'
import {
  EXPIRE_QTR_MODES,
  parseExpireQtrMode,
  type ExpireQtrFilter,
  type MemberFilters,
} from '../../db/member-filter-types'

const expireQtrModeLabels = {
  exactly: 'Exactly',
  atLeast: 'At least',
} as const

export function FilterControls({
  wycId,
  name,
  category,
  expireQtrFilter,
  categories,
  quarters,
  onFilterChange,
  onClearFilters,
}: {
  wycId?: string
  name?: string
  category?: number
  expireQtrFilter?: ExpireQtrFilter
  categories: Array<{ index: number; text: string | null }>
  quarters: Array<{ index: number; text: string | null; school: string | null }>
  onFilterChange: (changes: Partial<MemberFilters>) => void
  onClearFilters: () => void
}) {
  const [localName, setLocalName] = useState(name || '')
  const [localWycId, setLocalWycId] = useState(wycId || '')

  useEffect(() => {
    setLocalName(name || '')
    setLocalWycId(wycId || '')
  }, [name, wycId])

  const hasFilters = wycId || name || category !== undefined || expireQtrFilter

  const handleSearch = () => {
    const trimmedWycId = localWycId.trim()
    const trimmedName = localName.trim()
    onFilterChange({
      wycId: trimmedWycId || undefined,
      name: trimmedName || undefined,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClear = () => {
    setLocalName('')
    setLocalWycId('')
    onClearFilters()
  }

  return (
    <div className="mb-4 p-4 border-2 rounded-lg bg-muted/50">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor="filter-name"
            className="block text-sm font-medium mb-1"
          >
            Name
          </label>
          <input
            id="filter-name"
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name"
            className={`px-3 py-2 border-2 rounded text-sm w-48 ${
              name
                ? 'bg-primary/10 border-primary'
                : 'bg-background border-border'
            }`}
          />
        </div>

        <div>
          <label
            htmlFor="filter-wyc-id"
            className="block text-sm font-medium mb-1"
          >
            WYC ID
          </label>
          <input
            id="filter-wyc-id"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={localWycId}
            onChange={(e) => setLocalWycId(e.target.value.replace(/\D/g, ''))}
            onKeyDown={handleKeyDown}
            placeholder="Search by WYC ID"
            className={`px-3 py-2 border-2 rounded text-sm w-32 ${
              wycId
                ? 'bg-primary/10 border-primary'
                : 'bg-background border-border'
            }`}
          />
        </div>

        <div>
          <label
            htmlFor="filter-category"
            className="block text-sm font-medium mb-1"
          >
            Category
          </label>
          <select
            id="filter-category"
            value={category ?? ''}
            onChange={(e) =>
              onFilterChange({
                category: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={`px-3 py-2 border-2 rounded text-sm ${
              category !== undefined
                ? 'bg-primary/10 border-primary'
                : 'bg-background border-border'
            }`}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.index} value={cat.index}>
                {cat.text || `Category ${cat.index}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-expire-qtr-mode"
            className="block text-sm font-medium mb-1"
          >
            Expire Quarter
          </label>
          <div className="flex gap-2">
            <select
              id="filter-expire-qtr-mode"
              value={expireQtrFilter?.mode ?? 'exactly'}
              onChange={(e) => {
                const mode = parseExpireQtrMode(e.target.value)
                if (mode && expireQtrFilter) {
                  onFilterChange({
                    expireQtrFilter: { ...expireQtrFilter, mode },
                  })
                }
              }}
              className={`px-2 py-2 border-2 rounded text-sm ${
                expireQtrFilter
                  ? 'bg-primary/10 border-primary'
                  : 'bg-background border-border'
              }`}
            >
              {EXPIRE_QTR_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {expireQtrModeLabels[mode]}
                </option>
              ))}
            </select>
            <select
              id="filter-expire-qtr"
              value={expireQtrFilter?.quarter ?? ''}
              onChange={(e) =>
                onFilterChange({
                  expireQtrFilter: e.target.value
                    ? {
                        quarter: Number(e.target.value),
                        mode: expireQtrFilter?.mode ?? 'exactly',
                      }
                    : undefined,
                })
              }
              className={`px-3 py-2 border-2 rounded text-sm ${
                expireQtrFilter
                  ? 'bg-primary/10 border-primary'
                  : 'bg-background border-border'
              }`}
            >
              <option value="">All Quarters</option>
              {quarters.map((qtr) => (
                <option key={qtr.index} value={qtr.index}>
                  {qtr.school || qtr.text || `Quarter ${qtr.index}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 text-sm font-medium border-2 border-primary rounded bg-primary text-primary-foreground hover:opacity-90 transition-colors"
          >
            Search
          </button>
        </div>

        {hasFilters && (
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium border-2 border-destructive/50 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  )
}
