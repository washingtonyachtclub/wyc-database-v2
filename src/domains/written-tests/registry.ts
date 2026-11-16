import { dinghyNoviceTest } from '@/components/tests/dinghy-test-data'
import { sailboardNoviceTest } from '@/components/tests/sailboard-test-data'
import type { TestDefinition } from './types'

export const writtenTests: readonly TestDefinition[] = [dinghyNoviceTest, sailboardNoviceTest]

export function getWrittenTest(id: string) {
  return writtenTests.find((test) => test.id === id)
}

export function getTestFingerprint(test: TestDefinition) {
  const value = JSON.stringify(test)
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  }
  return (hash >>> 0).toString(16)
}
