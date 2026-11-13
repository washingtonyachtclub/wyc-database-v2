import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  buildOfficerChart,
  getOfficerPositionCategory,
  getOfficerPositionLabel,
} from '@/domains/officers/org-chart'
import type { Officer } from '@/domains/officers/schema'
import type { Position } from '@/domains/positions/schema'
import { cn } from '@/lib/utils'

const CATEGORY_CLASSES = {
  officer: 'bg-org-officer',
  position: 'bg-org-position',
  fleet: 'bg-org-fleet text-org-fleet-foreground',
} as const

const CONNECTOR_CLASSES =
  "before:absolute before:-top-[25px] before:left-1/2 before:h-6 before:w-0.5 before:bg-org-connector before:content-['']"

const BRANCH_CLASSES = 'row-start-1 flex min-w-0 flex-col items-center @max-[900px]:w-full'
const BRANCH_CARD_CLASSES =
  'w-[calc((100cqi-70px)/6)] max-w-[180px] @max-[900px]:w-full @max-[900px]:max-w-none'
const HOLDER_NAME_CLASSES =
  'min-w-0 flex-1 text-[0.8125rem] leading-[1.4] [overflow-wrap:anywhere] @max-[900px]:py-[5px] @max-[900px]:text-sm @max-[480px]:py-2.5'
const SWATCH_CLASSES = 'size-3.5 rounded-[3px] border border-border'

type OfficersOrgChartProps = {
  positions: Position[]
  officers: Officer[]
  isUpdating: boolean
  onDeactivate?: (officer: Officer) => void
}

function RoleCard({
  position,
  holders,
  isUpdating,
  onDeactivate,
  className,
  compact,
}: {
  position: Position
  holders: Officer[]
  isUpdating: boolean
  onDeactivate?: (officer: Officer) => void
  className?: string
  compact?: 'report' | 'fleet'
}) {
  return (
    <section
      className={cn(
        'relative z-1 flex w-full min-w-0 flex-col justify-center gap-[5px] rounded-md border border-border px-3 py-2.5',
        compact === 'report'
          ? 'min-h-[78px]'
          : compact === 'fleet'
            ? 'min-h-[74px]'
            : 'min-h-[90px] @max-[900px]:min-h-[86px]',
        CATEGORY_CLASSES[getOfficerPositionCategory(position)],
        className,
      )}
      aria-label={position.name}
      data-position-id={position.index}
    >
      <h3
        className="text-[0.8125rem] leading-[1.35] font-semibold [overflow-wrap:anywhere] @max-[480px]:text-sm"
        title={position.name}
      >
        {getOfficerPositionLabel(position)}
      </h3>
      {holders.length === 0 ? (
        <p
          className={cn(
            'text-[0.8125rem] italic',
            getOfficerPositionCategory(position) === 'fleet'
              ? 'text-org-fleet-muted'
              : 'text-muted-foreground',
          )}
        >
          Vacant
        </p>
      ) : (
        <ul className="grid gap-0.5">
          {holders.map((officer) => (
            <li key={officer.index} className="flex min-w-0 items-center gap-1">
              {onDeactivate ? (
                <Link
                  to="/members/$wycNumber"
                  params={{ wycNumber: String(officer.wycNumber) }}
                  className={cn(HOLDER_NAME_CLASSES, 'hover:underline')}
                >
                  {officer.memberName}
                </Link>
              ) : (
                <span className={HOLDER_NAME_CLASSES}>{officer.memberName}</span>
              )}
              {onDeactivate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 text-inherit opacity-65 hover:text-destructive hover:opacity-100 [&>svg]:size-[13px] @max-[900px]:size-9 @max-[480px]:size-11"
                      aria-label={`Mark ${officer.memberName} inactive as ${position.name}`}
                      disabled={isUpdating}
                      onClick={() => onDeactivate(officer)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark inactive</TooltipContent>
                </Tooltip>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Reports({
  children,
  single,
  hasParent,
}: {
  children: ReactNode
  single: boolean
  hasParent: boolean
}) {
  return (
    <div
      className={cn(
        'relative mt-6 grid w-full gap-3 @max-[480px]:grid-cols-1',
        single
          ? 'grid-cols-1'
          : 'grid-cols-2 rounded-lg border border-org-group-border bg-org-position-group p-2.5',
        hasParent && CONNECTOR_CLASSES,
      )}
    >
      {children}
    </div>
  )
}

export function OfficersOrgChart({
  positions,
  officers,
  isUpdating,
  onDeactivate,
}: OfficersOrgChartProps) {
  const chart = buildOfficerChart(positions)
  const holders = new Map<number, Officer[]>()
  for (const officer of officers) {
    if (!officer.active) continue
    const list = holders.get(officer.positionId) ?? []
    list.push(officer)
    holders.set(officer.positionId, list)
  }

  function card(position: Position | undefined, className?: string, compact?: 'report' | 'fleet') {
    return position ? (
      <RoleCard
        key={position.index}
        position={position}
        holders={holders.get(position.index) ?? []}
        isUpdating={isUpdating}
        onDeactivate={onDeactivate}
        className={className}
        compact={compact}
      />
    ) : null
  }

  return (
    <div className="@container text-foreground">
      <div
        className="grid max-w-[1150px] grid-cols-[repeat(6,minmax(0,180px))] items-start gap-x-3.5 gap-y-[22px] pt-12 @max-[900px]:mx-auto @max-[900px]:flex @max-[900px]:max-w-[640px] @max-[900px]:flex-col @max-[900px]:gap-6 @max-[900px]:pt-0"
        aria-label="Club organization"
      >
        {chart.commodore && (
          <div className="col-start-3 row-start-1 [transform:translate(calc(25%+3.5px),-50%)] @max-[900px]:order-0 @max-[900px]:w-full @max-[900px]:transform-none">
            {card(chart.commodore)}
          </div>
        )}
        {chart.secretary && (
          <div className="col-start-1 row-start-1 @max-[900px]:order-1 @max-[900px]:w-full">
            {card(chart.secretary)}
          </div>
        )}
        <div className={cn(BRANCH_CLASSES, 'col-start-2 @max-[900px]:order-3')}>
          {card(chart.viceCommodore, BRANCH_CARD_CLASSES)}
          {chart.viceReports.length > 0 && (
            <Reports single={chart.viceReports.length === 1} hasParent={!!chart.viceCommodore}>
              {chart.viceReports.map((position) => card(position, undefined, 'report'))}
            </Reports>
          )}
        </div>
        <div className={cn(BRANCH_CLASSES, 'col-start-4 col-end-6 @max-[900px]:order-4')}>
          {card(chart.rearCommodore, BRANCH_CARD_CLASSES)}
          {chart.rearReports.length > 0 && (
            <Reports single={chart.rearReports.length === 1} hasParent={!!chart.rearCommodore}>
              {chart.rearReports.map((position) => card(position, undefined, 'report'))}
            </Reports>
          )}
        </div>
        <div className="col-start-6 row-start-1 grid gap-5 @max-[900px]:order-2 @max-[900px]:w-full">
          {card(chart.treasurer)}
          {chart.fundraising && (
            <div
              className={cn(
                'relative',
                chart.treasurer && CONNECTOR_CLASSES,
                chart.treasurer && 'before:-top-5 before:h-5',
              )}
            >
              {card(chart.fundraising)}
            </div>
          )}
        </div>
        {(chart.systemAdministrator || chart.webmaster) && (
          <div
            className="col-start-1 col-end-3 row-start-2 grid -translate-y-[86px] grid-cols-2 gap-3 pl-5 @max-[900px]:order-5 @max-[900px]:w-full @max-[900px]:translate-y-0 @max-[900px]:p-0 @max-[480px]:grid-cols-1"
            aria-label="Independent positions"
          >
            {card(chart.systemAdministrator)}
            {card(chart.webmaster)}
          </div>
        )}
        <div className="col-start-2 col-end-7 row-start-2 w-full min-w-0 max-w-[962px] justify-self-end @max-[900px]:order-6">
          {(chart.headFleetCaptain || chart.quartermaster) && (
            <div
              className={cn(
                'mb-6 grid justify-center gap-3.5 @max-[480px]:gap-3',
                chart.quartermaster
                  ? 'grid-cols-[repeat(2,minmax(0,180px))] @max-[900px]:grid-cols-2 @max-[480px]:grid-cols-1'
                  : 'grid-cols-[minmax(0,180px)]',
              )}
            >
              {card(chart.headFleetCaptain)}
              {card(chart.quartermaster)}
            </div>
          )}
          {chart.fleetCaptains.length > 0 && (
            <div
              className={cn(
                'relative grid grid-cols-5 gap-2.5 rounded-lg border border-org-fleet-border bg-org-fleet-group p-2.5 @max-[900px]:grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] @max-[480px]:grid-cols-1',
                chart.headFleetCaptain && CONNECTOR_CLASSES,
                chart.headFleetCaptain &&
                  (chart.quartermaster
                    ? 'before:left-[calc(50%-97px)] @max-[900px]:before:left-1/4'
                    : 'before:left-1/2'),
                '@max-[480px]:before:hidden',
              )}
              aria-label="Fleet captains"
            >
              {chart.fleetCaptains.map((position) => card(position, undefined, 'fleet'))}
            </div>
          )}
        </div>
      </div>
      {chart.otherPositions.length > 0 && (
        <div
          className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),180px))] gap-3"
          aria-label="Other positions"
        >
          {chart.otherPositions.map((position) => card(position))}
        </div>
      )}
      <ul
        className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-[0.8125rem] text-muted-foreground"
        aria-label="Role colors"
      >
        <li className="flex items-center gap-[7px]">
          <span className={cn(SWATCH_CLASSES, CATEGORY_CLASSES.officer)} />
          Officers
        </li>
        <li className="flex items-center gap-[7px]">
          <span className={cn(SWATCH_CLASSES, CATEGORY_CLASSES.position)} />
          Position Holders
        </li>
        <li className="flex items-center gap-[7px]">
          <span className={cn(SWATCH_CLASSES, CATEGORY_CLASSES.fleet)} />
          Fleet Captains
        </li>
      </ul>
    </div>
  )
}
