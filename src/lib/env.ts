export function isDevEnvironment(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'dev'
}
