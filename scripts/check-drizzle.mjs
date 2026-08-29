import { spawnSync } from 'node:child_process'

const drizzleKit = process.platform === 'win32' ? 'drizzle-kit.cmd' : 'drizzle-kit'

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function drizzleStatus() {
  const result = spawnSync(
    'git',
    ['status', '--porcelain', '--untracked-files=all', '--', 'drizzle'],
    { encoding: 'utf8' },
  )
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
  return result.stdout
}

const before = drizzleStatus()

run(drizzleKit, ['check'])
run(drizzleKit, ['generate', '--name=ci_check'])

if (drizzleStatus() !== before) {
  console.error('Drizzle schema changes must include the generated migration files.')
  process.exit(1)
}
