import { spawnSync } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(script) {
  const result = spawnSync(npm, ['run', script], { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const isProductionDeployment = process.env.VERCEL_ENV === 'production'
const isDevProject = process.env.VITE_APP_ENV === 'dev'

if (isProductionDeployment && isDevProject) {
  run('build')
  run('db:reset:deployed-dev')
  run('db:migrate')
  process.exit(0)
}

if (isProductionDeployment) {
  run('db:baseline:ensure')
  run('db:migrate')
}

run('build')
