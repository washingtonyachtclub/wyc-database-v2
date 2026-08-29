import { spawnSync } from 'node:child_process'

const drizzleKit = process.platform === 'win32' ? 'drizzle-kit.cmd' : 'drizzle-kit'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, options)
  if (result.error) throw result.error
  return result
}

const check = run(process.execPath, ['scripts/check-drizzle-baseline.mjs'], {
  stdio: 'ignore',
})

if (check.status === 0) process.exit(0)

const diff = run(drizzleKit, ['push', '--explain', '--verbose', '--force'], {
  encoding: 'utf8',
})

process.stdout.write(diff.stdout)
process.stderr.write(diff.stderr)

if (diff.status !== 0) process.exit(diff.status ?? 1)

if (!`${diff.stdout}\n${diff.stderr}`.includes('No changes detected')) {
  throw new Error('The database must match schema.ts before its baseline can be recorded')
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is required')

const databaseName = new URL(databaseUrl).pathname.slice(1)
const baseline = run(process.execPath, ['scripts/baseline-drizzle.mjs'], {
  env: { ...process.env, CONFIRM_DATABASE: databaseName },
  stdio: 'inherit',
})

if (baseline.status !== 0) process.exit(baseline.status ?? 1)
