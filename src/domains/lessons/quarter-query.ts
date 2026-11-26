import { sql } from 'drizzle-orm'
import { lessonSessions, lessons, quarters } from '@/db/schema'
import { FIRST_LESSON_QUARTER } from './quarter-rules'

// Sessionless historical lessons have only CalendarDate.
export const lessonQuarterIndex = sql<number | null>`(
  select case when q."endDate" = final.day or prev."endDate" < final.day then q."_index" end
  from (select coalesce(
    (select max(s.ends_at)::date from ${lessonSessions} s
     where s.lesson_id = ${lessons}."_index"),
    ${lessons}."CalendarDate"
  ) as day) as final
  join ${quarters} q on q."endDate" >= final.day
  left join ${quarters} prev on prev."_index" = q."_index" - 1
  where q."_index" >= ${sql.raw(String(FIRST_LESSON_QUARTER))}
  order by q."_index"
  limit 1
)`
