import { spawnSync } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const { MIGRATION_DATABASE_URL: migrationUrl, ...appEnv } = process.env

function run(script, env) {
  const result = spawnSync(npm, ['run', script], { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (appEnv.VERCEL_ENV === 'production') {
  if (!migrationUrl) {
    console.error('MIGRATION_DATABASE_URL is required for production deployments.')
    process.exit(1)
  }
  run('db:migrate', { ...appEnv, DATABASE_URL: migrationUrl })
}

run('build', appEnv)
