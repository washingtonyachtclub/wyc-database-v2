import type { ExpireQtrFilter } from './member-filter-types'

export type LessonFilters = {
  classTypeId?: number
  instructor?: number // wycNumber — matches instructor1 OR instructor2
  expireQtrFilter?: ExpireQtrFilter
  display?: boolean // true = only display=1
}
