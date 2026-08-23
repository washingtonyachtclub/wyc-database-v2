import { useQuery } from '@tanstack/react-query'
import { getWindHistoryQueryOptions } from '@/domains/checkouts/query-options'

const WIDTH = 720
const HEIGHT = 360
const LEFT = 52
const RIGHT = 18
const TOP = 24
const BOTTOM = 48
const PLOT_WIDTH = WIDTH - LEFT - RIGHT
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM

const xTicks = [
  { minute: 0, label: '12 AM' },
  { minute: 360, label: '6 AM' },
  { minute: 720, label: '12 PM' },
  { minute: 1080, label: '6 PM' },
  { minute: 1440, label: '12 AM' },
]

export function WindHistoryChart() {
  const { data, isPending, error } = useQuery(getWindHistoryQueryOptions())
  const maxReading = Math.max(
    0,
    ...(data?.readings.flatMap((reading) => [reading.windKnots, reading.gustKnots]) ?? []),
  )
  const yMax = Math.max(20, Math.ceil(maxReading / 5) * 5)
  const yTicks = Array.from({ length: yMax / 5 + 1 }, (_, index) => index * 5)
  const point = (minute: number, knots: number) =>
    `${LEFT + (minute / 1440) * PLOT_WIDTH},${TOP + PLOT_HEIGHT - (knots / yMax) * PLOT_HEIGHT}`
  const windPoints = data?.readings
    .map((reading) => point(reading.minute, reading.windKnots))
    .join(' ')
  const gustPoints = data?.readings
    .map((reading) => point(reading.minute, reading.gustKnots))
    .join(' ')
  return (
    <aside className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="shrink-0 text-xl font-semibold">Today&apos;s wind history</h2>
        <p className="text-xs text-muted-foreground sm:text-right sm:whitespace-nowrap">
          Check the forecast and ensure the wind is appropriate for your rating.
        </p>
      </div>
      {isPending ? (
        <div className="mt-3 flex min-h-48 items-center justify-center rounded-lg border bg-muted/30 px-5 text-sm text-muted-foreground lg:min-h-64">
          Loading wind observations...
        </div>
      ) : error || !data || data.readings.length === 0 ? (
        <div className="mt-3 flex min-h-48 items-center justify-center rounded-lg border bg-muted/30 px-5 text-center text-sm text-muted-foreground lg:min-h-64">
          Wind history is currently unavailable.
        </div>
      ) : (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-primary" /> Average wind
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-destructive" /> Gust
            </span>
          </div>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full overflow-visible"
            role="img"
            aria-label="Average and gust wind speed observations from midnight through the latest reading"
          >
            {yTicks.map((tick) => {
              const y = TOP + PLOT_HEIGHT - (tick / yMax) * PLOT_HEIGHT
              return (
                <g key={tick}>
                  <line
                    x1={LEFT}
                    x2={WIDTH - RIGHT}
                    y1={y}
                    y2={y}
                    className="stroke-border"
                    strokeWidth="1"
                  />
                  <text
                    x={LEFT - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[11px]"
                  >
                    {tick}
                  </text>
                </g>
              )
            })}
            {xTicks.map((tick) => {
              const x = LEFT + (tick.minute / 1440) * PLOT_WIDTH
              return (
                <g key={tick.minute}>
                  <line
                    x1={x}
                    x2={x}
                    y1={TOP}
                    y2={TOP + PLOT_HEIGHT}
                    className="stroke-border"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={TOP + PLOT_HEIGHT + 22}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[11px]"
                  >
                    {tick.label}
                  </text>
                </g>
              )
            })}
            <line
              x1={LEFT}
              x2={WIDTH - RIGHT}
              y1={TOP + PLOT_HEIGHT - (7 / yMax) * PLOT_HEIGHT}
              y2={TOP + PLOT_HEIGHT - (7 / yMax) * PLOT_HEIGHT}
              className="stroke-muted-foreground"
              strokeWidth="2"
              strokeDasharray="8 6"
            />
            <line
              x1={LEFT}
              x2={WIDTH - RIGHT}
              y1={TOP + PLOT_HEIGHT - (15 / yMax) * PLOT_HEIGHT}
              y2={TOP + PLOT_HEIGHT - (15 / yMax) * PLOT_HEIGHT}
              className="stroke-foreground"
              strokeWidth="2"
              strokeDasharray="8 6"
            />
            <text
              x={WIDTH - RIGHT - 4}
              y={TOP + PLOT_HEIGHT - (7 / yMax) * PLOT_HEIGHT - 6}
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              Novice limit
            </text>
            <text
              x={WIDTH - RIGHT - 4}
              y={TOP + PLOT_HEIGHT - (15 / yMax) * PLOT_HEIGHT - 6}
              textAnchor="end"
              className="fill-foreground text-[11px]"
            >
              Intermediate limit
            </text>
            <polyline
              points={windPoints}
              fill="none"
              className="stroke-primary"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={gustPoints}
              fill="none"
              className="stroke-destructive"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <text
              x="14"
              y={TOP + PLOT_HEIGHT / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${TOP + PLOT_HEIGHT / 2})`}
              className="fill-muted-foreground text-[11px]"
            >
              Wind speed (knots)
            </text>
          </svg>
        </div>
      )}
    </aside>
  )
}
