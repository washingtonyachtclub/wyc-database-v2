/**
 * Split an ordered list of signups into enrolled and waitlisted.
 * Signups must already be ordered by signup index (ASC).
 */
export function splitEnrollment<T>(signups: T[], lessonSize: number) {
  return {
    enrolled: signups.slice(0, lessonSize),
    waitlisted: signups.slice(lessonSize),
  }
}

/**
 * Determine enrollment status for a single student given their
 * 0-based position in the ordered signup list.
 */
export function enrollmentStatus(position: number, lessonSize: number): 'enrolled' | 'waitlisted' {
  return position < lessonSize ? 'enrolled' : 'waitlisted'
}
