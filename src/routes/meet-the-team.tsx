import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/meet-the-team')({
  component: MeetTheTeamPage,
})

type Person = {
  name: string
  photo: string
  boat: string
}

type RoleGroup = {
  title: string
  people: (Person & { specificRole?: string })[]
}

const TEAM: RoleGroup[] = [
  {
    title: 'Co‑Commodores',
    people: [
      {
        name: 'Eshan Arora',
        photo: '', // TODO: add photo URL
        boat: 'Deception',
      },
      {
        name: 'Zachary Taylor',
        photo:
          'https://washingtonyachtclub.org/wp-content/uploads/2025/12/zach2.jpeg',
        boat: 'Charlotte',
      },
    ],
  },
  {
    title: 'Vice Commodore',
    people: [
      {
        name: 'Tingyi Yan',
        photo: '', // TODO: add photo URL
        boat: '', // TODO
      },
    ],
  },
  {
    title: 'Co‑Rear Commodores',
    people: [
      {
        name: 'Colby Sharp',
        photo:
          'https://washingtonyachtclub.org/wp-content/uploads/2025/12/colby_.jpeg',
        boat: 'Hobie 16',
      },
      {
        name: 'Harry Huang',
        photo:
          'https://washingtonyachtclub.org/wp-content/uploads/2025/12/harry2.jpeg',
        boat: 'FJs',
      },
    ],
  },
  {
    title: '',
    people: [
      // {
      //   name: '',
      //   photo: '',
      //   boat: '',
      //   specificRole: 'Secretary',
      // },
      {
        name: 'Aidan Smit',
        photo:
          'https://washingtonyachtclub.org/wp-content/uploads/2025/12/aidan2.jpeg',
        boat: 'Lasers',
        specificRole: 'Treasurer',
      },
    ],
  },
]

function MeetTheTeamPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 font-[Helvetica_Neue,Helvetica,Arial,sans-serif] text-[#333]">
      {TEAM.map((group, i) => (
        <div key={i} className="mb-14">
          {group.title && (
            <h3 className="mb-6 border-b-2 border-[#eee] pb-2 text-[1.75rem] font-bold uppercase tracking-wide text-[#111]">
              {group.title}
            </h3>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] items-start gap-10">
            {group.people.map((person) => (
              <div key={person.name} className="flex flex-col">
                {person.specificRole && (
                  <h3 className="mb-4 border-b-2 border-[#eee] pb-2 text-[1.4rem] font-bold uppercase leading-tight tracking-wide text-[#111]">
                    {person.specificRole}
                  </h3>
                )}
                <div className="mb-3 aspect-square w-full overflow-hidden rounded-[5px] bg-[#f0f0f0]">
                  <img
                    src={person.photo}
                    alt={person.name}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <p className="mb-2.5 text-[1.3rem] font-bold leading-tight text-black">
                  {person.name}
                </p>
                <p className="text-[0.95rem] italic leading-tight text-[#666]">
                  Favorite Boat: {person.boat}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
