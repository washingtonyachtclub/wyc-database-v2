import { AddRatingTypeModal } from '@/components/rating-types/AddRatingTypeModal'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getDistinctTypeNamesQueryOptions,
  getRatingTypesAllQueryOptions,
} from '@/lib/rating-types-query-options'
import { requirePrivilegeForRoute } from '@/lib/route-guards'
import type { RatingType } from '@/db/rating-type-schema'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/rating-types')({
  beforeLoad: ({ context }) => {
    requirePrivilegeForRoute(context, '/rating-types')
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(getDistinctTypeNamesQueryOptions())
    return context.queryClient.ensureQueryData(getRatingTypesAllQueryOptions())
  },
  component: RatingTypesPage,
})

function RatingTypesPage() {
  const { data: ratingTypes } = useSuspenseQuery(getRatingTypesAllQueryOptions())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, RatingType[]>()
    for (const rt of ratingTypes) {
      const group = map.get(rt.type) || []
      group.push(rt)
      map.set(rt.type, group)
    }
    return map
  }, [ratingTypes])

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Rating Types</h2>

      <Button onClick={() => setIsAddModalOpen(true)} className="mb-4">
        <Plus className="h-4 w-4" />
        New Rating Type
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from(grouped.entries()).map(([type, items]) => (
          <div key={type} className="border rounded-lg p-3">
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">
              {type || '<No Type>'}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2 text-xs">Rating</TableHead>
                  <TableHead className="h-8 px-2 text-xs w-16">Degree</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) =>
                  item.expires ? (
                    <TooltipProvider key={item.index} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TableRow className="bg-yellow-50 dark:bg-yellow-950/30">
                            <TableCell className="py-1.5 px-2 text-sm">{item.text}</TableCell>
                            <TableCell className="py-1.5 px-2 text-sm">{item.degree}</TableCell>
                          </TableRow>
                        </TooltipTrigger>
                        <TooltipContent>Expires</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TableRow key={item.index}>
                      <TableCell className="py-1.5 px-2 text-sm">{item.text}</TableCell>
                      <TableCell className="py-1.5 px-2 text-sm">{item.degree}</TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>

      {isAddModalOpen && (
        <AddRatingTypeModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  )
}
