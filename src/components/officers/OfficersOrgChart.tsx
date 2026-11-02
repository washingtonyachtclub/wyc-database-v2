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
import './OfficersOrgChart.css'

type OfficersOrgChartProps = {
  positions: Position[]
  officers: Officer[]
  isUpdating: boolean
  onDeactivate: (officer: Officer) => void
}

function RoleCard({
  position,
  holders,
  isUpdating,
  onDeactivate,
}: {
  position: Position
  holders: Officer[]
  isUpdating: boolean
  onDeactivate: (officer: Officer) => void
}) {
  return (
    <section
      className={cn(
        'officer-chart-card',
        `officer-chart-card--${getOfficerPositionCategory(position)}`,
      )}
      aria-label={position.name}
      data-position-id={position.index}
    >
      <h3 className="officer-chart-role" title={position.name}>
        {getOfficerPositionLabel(position)}
      </h3>
      {holders.length === 0 ? (
        <p className="officer-chart-vacancy">Vacant</p>
      ) : (
        <ul className="officer-chart-holders">
          {holders.map((officer) => (
            <li key={officer.index}>
              <Link
                to="/members/$wycNumber"
                params={{ wycNumber: String(officer.wycNumber) }}
                className="officer-chart-member"
              >
                {officer.memberName}
              </Link>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="officer-chart-remove"
                    aria-label={`Mark ${officer.memberName} inactive as ${position.name}`}
                    disabled={isUpdating}
                    onClick={() => onDeactivate(officer)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mark inactive</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Reports({ children, single }: { children: ReactNode; single: boolean }) {
  return (
    <div className={cn('officer-chart-reports', single && 'officer-chart-reports--single')}>
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

  function card(position: Position | undefined) {
    return position ? (
      <RoleCard
        key={position.index}
        position={position}
        holders={holders.get(position.index) ?? []}
        isUpdating={isUpdating}
        onDeactivate={onDeactivate}
      />
    ) : null
  }

  return (
    <div className="officer-chart">
      <div className="officer-chart-layout" aria-label="Club organization">
        {chart.commodore && <div className="officer-chart-commodore">{card(chart.commodore)}</div>}
        {chart.secretary && <div className="officer-chart-secretary">{card(chart.secretary)}</div>}
        <div
          className={cn('officer-chart-vice', chart.viceCommodore && 'officer-chart-has-parent')}
        >
          {card(chart.viceCommodore)}
          {chart.viceReports.length > 0 && (
            <Reports single={chart.viceReports.length === 1}>{chart.viceReports.map(card)}</Reports>
          )}
        </div>
        <div
          className={cn('officer-chart-rear', chart.rearCommodore && 'officer-chart-has-parent')}
        >
          {card(chart.rearCommodore)}
          {chart.rearReports.length > 0 && (
            <Reports single={chart.rearReports.length === 1}>{chart.rearReports.map(card)}</Reports>
          )}
        </div>
        <div className={cn('officer-chart-finance', chart.treasurer && 'officer-chart-has-parent')}>
          {card(chart.treasurer)}
          {chart.fundraising && (
            <div className="officer-chart-fundraising">{card(chart.fundraising)}</div>
          )}
        </div>
        {(chart.systemAdministrator || chart.webmaster) && (
          <div className="officer-chart-support" aria-label="Independent positions">
            {card(chart.systemAdministrator)}
            {card(chart.webmaster)}
          </div>
        )}
        <div
          className={cn(
            'officer-chart-fleet',
            chart.headFleetCaptain && 'officer-chart-has-parent',
            !chart.quartermaster && 'officer-chart-fleet--one-parent',
          )}
        >
          {(chart.headFleetCaptain || chart.quartermaster) && (
            <div className="officer-chart-fleet-parents">
              {card(chart.headFleetCaptain)}
              {card(chart.quartermaster)}
            </div>
          )}
          {chart.fleetCaptains.length > 0 && (
            <div className="officer-chart-fleet-group" aria-label="Fleet captains">
              {chart.fleetCaptains.map(card)}
            </div>
          )}
        </div>
      </div>
      {chart.otherPositions.length > 0 && (
        <div className="officer-chart-other" aria-label="Other positions">
          {chart.otherPositions.map(card)}
        </div>
      )}
      <ul className="officer-chart-key" aria-label="Role colors">
        <li>
          <span className="officer-chart-swatch officer-chart-card--officer" />
          Officers
        </li>
        <li>
          <span className="officer-chart-swatch officer-chart-card--position" />
          Position Holders
        </li>
        <li>
          <span className="officer-chart-swatch officer-chart-card--fleet" />
          Fleet Captains
        </li>
      </ul>
    </div>
  )
}
