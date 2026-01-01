import { createFileRoute } from '@tanstack/react-router'
import { desc } from 'drizzle-orm'
import { wycDatabase } from 'src/db/schema'
import { createServerFn } from '@tanstack/react-start'
import db from '../db/index'

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => {
    const members = await getMembers()
    return { members }
  },
  errorComponent: ({ error }) => {
    return <div>Failed to load members: {error.message}</div>
  },
})

export const getMembers = createServerFn({ method: 'GET' }).handler(
  async () => {
    const members = await db
      .select()
      .from(wycDatabase)
      .orderBy(desc(wycDatabase.joinDate))
      .limit(100)
    return members
  },
)

export const addMember = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      last: string | null
      first: string | null
      streetAddress: string | null
      city: string | null
      state: string | null
      zipCode: string | null
      phone1: string | null
      phone2: string | null
      email: string | null
      category: number | null
      wycNumber: number
      expireQtr: number
      studentId: number | null
      password: string | null
      outToSea: number | null
      joinDate: string
      imageName: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    const newMember = await db.insert(wycDatabase).values(data).$returningId()
    return newMember
  })

function App() {
  const members = Route.useLoaderData().members

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">WYC Members</h2>
      <button
        onClick={async () => {
          await addMember({
            data: {
              last: 'Test',
              first: 'Member',
              streetAddress: '123 Main St',
              city: 'Boston',
              state: 'MA',
              zipCode: '02101',
              phone1: '555-0123',
              phone2: null,
              email: 'test@example.com',
              category: 1,
              wycNumber: 100000,
              expireQtr: 4,
              studentId: null,
              password: 'test123',
              outToSea: 0,
              joinDate: new Date().toISOString(),
              imageName: null,
            },
          })
        }}
      >
        Add Member
      </button>
      <ul className="space-y-2">
        {members.map((member) => (
          <li key={member.wycNumber} className="p-4 border rounded shadow">
            <h3 className="text-xl font-semibold">
              {member.first} {member.last}
            </h3>
            <p className="text-gray-600">ID: {member.wycNumber}</p>
            <p className="text-gray-600">
              Joined: {new Date(member.joinDate).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
