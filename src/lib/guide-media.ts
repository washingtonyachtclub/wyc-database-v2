// TODO: Replace this R2 address when the permanent public-media domain is available.
const publicMediaBaseUrl = 'https://pub-5a3e3c50b33c4b70b19b652343752a89.r2.dev'

export function guideImageUrl(guide: 'fj' | 'knots', file: string) {
  return `${publicMediaBaseUrl}/website/guides/${guide}/${file}`
}
