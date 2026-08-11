export type TestImage = {
  src: string
  alt: string
}

export type TestQuestionOption = {
  id: string
  label: string
  correct: boolean
}

type TestQuestionBase = {
  id: string
  sourceId: string
  number: number
  title: string
  category: string
  prompt: string
  image?: TestImage
}

export type TextTestQuestion = TestQuestionBase & {
  type: 'text'
  acceptedAnswers: string[]
  placeholder: string
}

export type ChoiceTestQuestion = TestQuestionBase & {
  type: 'single' | 'multiple'
  options: TestQuestionOption[]
}

export type TestQuestion = TextTestQuestion | ChoiceTestQuestion

export const dinghyNoviceTest = {
  id: 'dinghy-novice',
  title: 'Dinghy Novice Test',
  description: 'Club policies, safety, sailing fundamentals, and right-of-way rules.',
  estimatedMinutes: '30–45 min',
  questions: [
    {
      id: 'dinghy-154',
      sourceId: '154',
      number: 1,
      title: 'Sailboat Diagram (A)',
      category: 'Dinghy Novice',
      prompt:
        'Using the diagram below, fill in sailboat part that corresponds to the letter. What is sailboat part A?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Centerboard', 'Daggerboard'],
      placeholder: 'A',
    },
    {
      id: 'dinghy-155',
      sourceId: '155',
      number: 2,
      title: 'Sailboat Diagram (B)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part B?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Rudder'],
      placeholder: 'B',
    },
    {
      id: 'dinghy-156',
      sourceId: '156',
      number: 3,
      title: 'Sailboat Diagram (C)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part C?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Tiller'],
      placeholder: 'C',
    },
    {
      id: 'dinghy-157',
      sourceId: '157',
      number: 4,
      title: 'Sailboat Diagram (D)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part D?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Tiller Extension'],
      placeholder: 'D',
    },
    {
      id: 'dinghy-158',
      sourceId: '158',
      number: 5,
      title: 'Sailboat Diagram (E)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part E?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Boom'],
      placeholder: 'E',
    },
    {
      id: 'dinghy-159',
      sourceId: '159',
      number: 6,
      title: 'Sailboat Diagram (F)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part F?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Mast'],
      placeholder: 'F',
    },
    {
      id: 'dinghy-160',
      sourceId: '160',
      number: 7,
      title: 'Sailboat Diagram (G)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part G?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Jib (Sail)', 'Jib'],
      placeholder: 'G',
    },
    {
      id: 'dinghy-161',
      sourceId: '161',
      number: 8,
      title: 'Sailboat Diagram (H)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part H?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Main (Sail)', 'Main'],
      placeholder: 'H',
    },
    {
      id: 'dinghy-162',
      sourceId: '162',
      number: 9,
      title: 'Sailboat Diagram (I)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part I?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Head'],
      placeholder: 'I',
    },
    {
      id: 'dinghy-163',
      sourceId: '163',
      number: 10,
      title: 'Sailboat Diagram (J)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part J?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Luff'],
      placeholder: 'J',
    },
    {
      id: 'dinghy-164',
      sourceId: '164',
      number: 11,
      title: 'Sailboat Diagram (K)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part K?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Tack'],
      placeholder: 'K',
    },
    {
      id: 'dinghy-165',
      sourceId: '165',
      number: 12,
      title: 'Sailboat Diagram (L)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part L?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Foot'],
      placeholder: 'L',
    },
    {
      id: 'dinghy-166',
      sourceId: '166',
      number: 13,
      title: 'Sailboat Diagram (M)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part M?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Clew'],
      placeholder: 'M',
    },
    {
      id: 'dinghy-167',
      sourceId: '167',
      number: 14,
      title: 'Sailboat Diagram (N)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part N?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Leech'],
      placeholder: 'N',
    },
    {
      id: 'dinghy-168',
      sourceId: '168',
      number: 15,
      title: 'Sailboat Diagram (O)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part O?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Battens'],
      placeholder: 'O',
    },
    {
      id: 'dinghy-169',
      sourceId: '169',
      number: 16,
      title: 'Sailboat Diagram (P)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part P?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Shroud'],
      placeholder: 'P',
    },
    {
      id: 'dinghy-170',
      sourceId: '170',
      number: 17,
      title: 'Sailboat Diagram (Q)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part Q?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Forestay'],
      placeholder: 'Q',
    },
    {
      id: 'dinghy-171',
      sourceId: '171',
      number: 18,
      title: 'Sailboat Diagram (R)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part R?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Cunningham', 'Downhaul'],
      placeholder: 'R',
    },
    {
      id: 'dinghy-172',
      sourceId: '172',
      number: 19,
      title: 'Sailboat Diagram (S)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part S?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Boomvang'],
      placeholder: 'S',
    },
    {
      id: 'dinghy-173',
      sourceId: '173',
      number: 20,
      title: 'Sailboat Diagram (T)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part T?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Jib Sheet(s)', 'Jib Sheet'],
      placeholder: 'T',
    },
    {
      id: 'dinghy-174',
      sourceId: '174',
      number: 21,
      title: 'Sailboat Diagram (U)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part U?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Mainsheet'],
      placeholder: 'U',
    },
    {
      id: 'dinghy-175',
      sourceId: '175',
      number: 22,
      title: 'Sailboat Diagram (V)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part V?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Outhaul'],
      placeholder: 'V',
    },
    {
      id: 'dinghy-176',
      sourceId: '176',
      number: 23,
      title: 'Sailboat Diagram (W)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part W?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Main Halyard'],
      placeholder: 'W',
    },
    {
      id: 'dinghy-177',
      sourceId: '177',
      number: 24,
      title: 'Sailboat Diagram (X)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part X?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Jib Halyard'],
      placeholder: 'X',
    },
    {
      id: 'dinghy-8',
      sourceId: '8',
      number: 25,
      title: 'Boat A Tack',
      category: 'Points of Sail & Tacks',
      prompt: 'What tack is Boat A on?',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
      type: 'single',
      options: [
        {
          id: '39',
          label: 'Port',
          correct: false,
        },
        {
          id: '40',
          label: 'Starboard',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-9',
      sourceId: '9',
      number: 26,
      title: 'Boat B Tack',
      category: 'Points of Sail & Tacks',
      prompt: 'What tack is Boat B on?',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
      type: 'single',
      options: [
        {
          id: '42',
          label: 'Port',
          correct: true,
        },
        {
          id: '43',
          label: 'Starboard',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-10',
      sourceId: '10',
      number: 27,
      title: 'Boat C Tack',
      category: 'Points of Sail & Tacks',
      prompt: 'What tack is Boat C on?',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
      type: 'single',
      options: [
        {
          id: '44',
          label: 'Port',
          correct: true,
        },
        {
          id: '45',
          label: 'Starboard',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-11',
      sourceId: '11',
      number: 28,
      title: 'Boat A Point of Sail',
      category: 'Points of Sail & Tacks',
      prompt: 'What point of sail is Boat A on?',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
      type: 'text',
      acceptedAnswers: ['Beam Reach', 'beam reach'],
      placeholder: 'Type your answer',
    },
    {
      id: 'dinghy-12',
      sourceId: '12',
      number: 29,
      title: 'Boat B Point of Sail',
      category: 'Points of Sail & Tacks',
      prompt: 'What point of sail is Boat B on?',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
      type: 'text',
      acceptedAnswers: ['Running', 'running', 'Run', 'run'],
      placeholder: 'Type your answer',
    },
    {
      id: 'dinghy-13',
      sourceId: '13',
      number: 30,
      title: 'Boat C Point of Sail',
      category: 'Points of Sail & Tacks',
      prompt: 'What point of sail is Boat C on?',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
      type: 'text',
      acceptedAnswers: ['Close Hauled', 'close hauled', 'Close Haul', 'close haul'],
      placeholder: 'Type your answer',
    },
    {
      id: 'dinghy-14',
      sourceId: '14',
      number: 31,
      title: 'Dinghy Sailing Hours',
      category: 'WYC Policies',
      prompt: 'Club dinghies may be sailed:',
      type: 'single',
      options: [
        {
          id: '50',
          label: 'from 9 AM to 5 PM.',
          correct: false,
        },
        {
          id: '51',
          label: 'any time.',
          correct: false,
        },
        {
          id: '52',
          label: 'any time a Chief is present',
          correct: false,
        },
        {
          id: '53',
          label: 'only during daylight hours.',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-15',
      sourceId: '15',
      number: 32,
      title: 'Boat Unattended at Docks',
      category: 'Dinghy Novice',
      prompt: 'Prior to leaving a boat unattended at the docks, one needs to:',
      type: 'single',
      options: [
        {
          id: '54',
          label: 'tie the bow and stern to the dock.',
          correct: false,
        },
        {
          id: '55',
          label: 'raise the sails and tie only the bow to the dock.',
          correct: false,
        },
        {
          id: '56',
          label: 'cleat all the lines and raise the sails.',
          correct: false,
        },
        {
          id: '57',
          label:
            'tie the boat to the dock with mainsail dropped (DH) or boat capsized on the dock (SH).',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-16',
      sourceId: '16',
      number: 33,
      title: 'Novice & Intermediate Sailing Locations',
      category: 'WYC Policies',
      prompt: 'Novices and Intermediates may sail in the following locations:',
      type: 'single',
      options: [
        {
          id: '58',
          label: 'Union Bay and Portage Bay only.',
          correct: false,
        },
        {
          id: '59',
          label: 'Union Bay only.',
          correct: true,
        },
        {
          id: '60',
          label: 'Union Bay and Lake Washington only.',
          correct: false,
        },
        {
          id: '61',
          label: 'any fresh water east of the Aurora Bridge.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-17',
      sourceId: '17',
      number: 34,
      title: 'Novice Max Wind Speed',
      category: 'WYC Policies',
      prompt: 'With a novice rating you may sail unsupervised in winds up to:',
      type: 'single',
      options: [
        {
          id: '62',
          label: '7 knots',
          correct: true,
        },
        {
          id: '63',
          label: '10 knots',
          correct: false,
        },
        {
          id: '64',
          label: '15 knots',
          correct: false,
        },
        {
          id: '65',
          label: '25 knots',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-18',
      sourceId: '18',
      number: 35,
      title: 'Intermediate Max Wind Speed',
      category: 'WYC Policies',
      prompt: 'With an intermediate rating you may sail unsupervised in winds up to:',
      type: 'single',
      options: [
        {
          id: '66',
          label: '7 knots',
          correct: false,
        },
        {
          id: '67',
          label: '10 knots',
          correct: false,
        },
        {
          id: '68',
          label: '15 knots',
          correct: true,
        },
        {
          id: '69',
          label: '25 knots',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-19',
      sourceId: '19',
      number: 36,
      title: 'Wind Speed Responsibility',
      category: 'WYC Policies',
      prompt: 'The responsibility for knowing the current wind speed lies with:',
      type: 'single',
      options: [
        {
          id: '70',
          label: 'Chiefs.',
          correct: false,
        },
        {
          id: '71',
          label: 'all members going sailing.',
          correct: true,
        },
        {
          id: '72',
          label: 'the WAC staff.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-20',
      sourceId: '20',
      number: 37,
      title: 'Rescue Whaler Use',
      category: 'WYC Policies',
      prompt: 'The rescue whaler may be used by:',
      type: 'single',
      options: [
        {
          id: '73',
          label: 'Chiefs and Instructors.',
          correct: false,
        },
        {
          id: '74',
          label: 'any member in case of emergency, other use only by Skippers.',
          correct: false,
        },
        {
          id: '75',
          label:
            'any member in case of emergency, other use only by Chiefs, Instructors, and members with a whaler rating.',
          correct: true,
        },
        {
          id: '76',
          label: 'any trained member.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-21',
      sourceId: '21',
      number: 38,
      title: 'Life Vest Regulation',
      category: 'WYC Policies',
      prompt: 'What is a federal regulation concerning Coast Guard approved life vests?',
      type: 'single',
      options: [
        {
          id: '77',
          label: 'Life vests should be worn in heavy winds, otherwise not needed.',
          correct: false,
        },
        {
          id: '78',
          label: 'Bring one life vest per person on board.',
          correct: true,
        },
        {
          id: '79',
          label: 'Only non-swimmers need life vests.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-22',
      sourceId: '22',
      number: 39,
      title: 'Life Vest Non-Swimmer & Guest',
      category: 'WYC Policies',
      prompt: 'Non-swimmers and guests are required to:',
      type: 'single',
      options: [
        {
          id: '80',
          label: 'wear ski belts while on Club boats.',
          correct: false,
        },
        {
          id: '81',
          label: 'wear Coast Guard approved life vests at all times.',
          correct: true,
        },
        {
          id: '82',
          label: 'have float cushions in the boat.',
          correct: false,
        },
        {
          id: '83',
          label: 'have Coast Guard approved life vests in the boat.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-23',
      sourceId: '23',
      number: 40,
      title: 'Immersion Self Assistance',
      category: 'Sailing Safety',
      prompt:
        'About how long would a moderately dressed person immersed in Union Bay in winter be capable of self-assistance?',
      type: 'single',
      options: [
        {
          id: '84',
          label: '3 – 10 minutes',
          correct: true,
        },
        {
          id: '85',
          label: '45 minutes',
          correct: false,
        },
        {
          id: '86',
          label: '2 hours',
          correct: false,
        },
        {
          id: '87',
          label: '10 hours',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-24',
      sourceId: '24',
      number: 41,
      title: 'Sailing Lee Shore',
      category: 'Dinghy Novice',
      prompt: 'Sailing near a lee shore is dangerous because:',
      type: 'single',
      options: [
        {
          id: '88',
          label: 'the wind is stronger there and you may capsize.',
          correct: false,
        },
        {
          id: '89',
          label: 'navigational rules require 300 ft. clearance on lee shores.',
          correct: false,
        },
        {
          id: '90',
          label:
            'driftwood blows onto lee shores and you may bang up or crack the bottom of your boat.',
          correct: false,
        },
        {
          id: '91',
          label: 'you may run aground and be unable to sail upwind to get away.',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-25',
      sourceId: '25',
      number: 42,
      title: 'Main Sail Raise',
      category: 'Dinghy Novice',
      prompt: 'Main sail(s) should be raised:',
      type: 'single',
      options: [
        {
          id: '92',
          label: 'as soon as you reach the boat.',
          correct: false,
        },
        {
          id: '93',
          label: 'after the boat is in the water, but before leaving the dock.',
          correct: true,
        },
        {
          id: '94',
          label: 'while the boat is on the dock.',
          correct: false,
        },
        {
          id: '95',
          label: 'after you have left the dock.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-26',
      sourceId: '26',
      number: 43,
      title: 'Docking',
      category: 'Dinghy Novice',
      prompt: 'When docking, your boat should:',
      type: 'single',
      options: [
        {
          id: '96',
          label: 'point downwind with the sails luffing.',
          correct: false,
        },
        {
          id: '97',
          label: 'point into the dock to stop the boat.',
          correct: false,
        },
        {
          id: '98',
          label: 'point upwind with the sails luffing.',
          correct: true,
        },
        {
          id: '99',
          label: 'have the jib filled to maintain steerageway.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-27',
      sourceId: '27',
      number: 44,
      title: 'Sail Storage',
      category: 'Dinghy Novice',
      prompt: 'Wet dacron sails are:',
      type: 'single',
      options: [
        {
          id: '100',
          label: 'hung to dry.',
          correct: false,
        },
        {
          id: '101',
          label: 'laid flat to dry.',
          correct: false,
        },
        {
          id: '102',
          label: 'rolled and put away.',
          correct: true,
        },
        {
          id: '103',
          label: 'stuffed into sailbags.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-28',
      sourceId: '28',
      number: 45,
      title: 'Sail Rolling Location',
      category: 'Dinghy Novice',
      prompt: 'Sails should be rolled only:',
      type: 'single',
      options: [
        {
          id: '104',
          label: 'on the asphalt.',
          correct: false,
        },
        {
          id: '105',
          label: 'on the wooden part of the docks.',
          correct: true,
        },
        {
          id: '106',
          label: 'in the WAC hallway.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-29',
      sourceId: '29',
      number: 46,
      title: 'Close Hauled Trim',
      category: 'Dinghy Novice',
      prompt: 'When sailing upwind, the best sail trim is when:',
      type: 'single',
      options: [
        {
          id: '107',
          label: 'the sails are on the verge of luffing.',
          correct: true,
        },
        {
          id: '108',
          label: 'you can sit comfortably on the side.',
          correct: false,
        },
        {
          id: '109',
          label: 'you sheet in until the boat heels about 15 degrees.',
          correct: false,
        },
        {
          id: '110',
          label: 'the boom is sheeted to the centerline.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-30',
      sourceId: '30',
      number: 47,
      title: 'Running Trim',
      category: 'Dinghy Novice',
      prompt: 'In general, when running downwind, the best sail trim is when:',
      type: 'single',
      options: [
        {
          id: '111',
          label: 'the boom is pulled in close to the centerline to prevent the sail from luffing.',
          correct: false,
        },
        {
          id: '112',
          label: 'the mainsail is let out so the wind strikes the sail at a 90 degree angle.',
          correct: true,
        },
        {
          id: '113',
          label: 'the boom is parallel with the telltales on the shroud.',
          correct: false,
        },
        {
          id: '114',
          label: 'you have six feet of mainsheet coiled in the bottom of the boat.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-31',
      sourceId: '31',
      number: 48,
      title: 'Right of Way: Wind Position',
      category: 'Sailing Safety',
      prompt:
        'By International Regulations for Avoiding Collisions at Sea (COLREGS), in general, given two sailboats sailing and all other things equal, which boat has right-of-way?',
      type: 'single',
      options: [
        {
          id: '115',
          label: 'The windward boat.',
          correct: false,
        },
        {
          id: '116',
          label: 'The leeward boat.',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-32',
      sourceId: '32',
      number: 49,
      title: 'Right of Way: Sailing Tack',
      category: 'Sailing Safety',
      prompt:
        'By International Regulations for Avoiding Collisions at Sea (COLREGS), in general, given two sailboats sailing and all other things equal, which boat has right-of-way?',
      type: 'single',
      options: [
        {
          id: '117',
          label: 'One sailing on port tack.',
          correct: false,
        },
        {
          id: '118',
          label: 'One sailing on starboard tack.',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-33',
      sourceId: '33',
      number: 50,
      title: 'Sailing Maneuver 1',
      category: 'Dinghy Novice',
      prompt:
        "Determine if the boat in the diagram below tacked or jibed. For this question, assume the wind is running from the top of the diagram (12 o'clock) to the bottom of the diagram (6 o'clock).",
      image: {
        src: '/test-images/sailing-maneuver-1.png',
        alt: 'Sailing maneuver diagram 1',
      },
      type: 'single',
      options: [
        {
          id: '119',
          label: 'Jibe',
          correct: false,
        },
        {
          id: '120',
          label: 'Tack',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-34',
      sourceId: '34',
      number: 51,
      title: 'Sailing Maneuver 2',
      category: 'Dinghy Novice',
      prompt:
        "Determine if the boat in the diagram below tacked or jibed. For this question, assume the wind is running from the top of the diagram (12 o'clock) to the bottom of the diagram (6 o'clock).",
      image: {
        src: '/test-images/sailing-maneuver-2.png',
        alt: 'Sailing maneuver diagram 2',
      },
      type: 'single',
      options: [
        {
          id: '121',
          label: 'Jibe',
          correct: false,
        },
        {
          id: '122',
          label: 'Tack',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-35',
      sourceId: '35',
      number: 52,
      title: 'Sailing Maneuver 3',
      category: 'Dinghy Novice',
      prompt:
        "Determine if the boat in the diagram below tacked or jibed. For this question, assume the wind is running from the top of the diagram (12 o'clock) to the bottom of the diagram (6 o'clock).",
      image: {
        src: '/test-images/sailing-maneuver-3.png',
        alt: 'Sailing maneuver diagram 3',
      },
      type: 'single',
      options: [
        {
          id: '123',
          label: 'Jibe',
          correct: true,
        },
        {
          id: '124',
          label: 'Tack',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-36',
      sourceId: '36',
      number: 53,
      title: 'Sailing Maneuver 4',
      category: 'Dinghy Novice',
      prompt:
        "Determine if the boat in the diagram below tacked or jibed. For this question, assume the wind is running from the top of the diagram (12 o'clock) to the bottom of the diagram (6 o'clock).",
      image: {
        src: '/test-images/sailing-maneuver-4.png',
        alt: 'Sailing maneuver diagram 4',
      },
      type: 'single',
      options: [
        {
          id: '125',
          label: 'Jibe',
          correct: false,
        },
        {
          id: '126',
          label: 'Tack',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-37',
      sourceId: '37',
      number: 54,
      title: 'Definition: Sailing By the Lee',
      category: 'Dinghy Novice',
      prompt: 'Sailing ‘by the lee’ means:',
      type: 'single',
      options: [
        {
          id: '127',
          label: 'sailing to the leeward of land.',
          correct: false,
        },
        {
          id: '128',
          label: 'sailing downwind with the boom on the windward side.',
          correct: true,
        },
        {
          id: '129',
          label: 'sailing towards a lee shore.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-38',
      sourceId: '38',
      number: 55,
      title: 'Guest Policy',
      category: 'WYC Policies',
      prompt: 'What is the rule concerning taking out guests?',
      type: 'single',
      options: [
        {
          id: '130',
          label: 'only by permission of a Chief.',
          correct: false,
        },
        {
          id: '131',
          label: 'not permitted: only members may sail Club boats.',
          correct: false,
        },
        {
          id: '132',
          label:
            'guests must prove IMA membership and sign the Participant’s Agreement on the website.',
          correct: true,
        },
        {
          id: '133',
          label: 'only skippers may take a non-member sailing.',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-39',
      sourceId: '39',
      number: 56,
      title: 'Boat Maintenance',
      category: 'WYC Policies',
      prompt: 'Who is responsible for the repair and general maintenance of WYC boats?',
      type: 'single',
      options: [
        {
          id: '134',
          label: 'Fleet Captains.',
          correct: false,
        },
        {
          id: '135',
          label: 'Chiefs.',
          correct: false,
        },
        {
          id: '136',
          label: 'Intermediates & Skippers',
          correct: false,
        },
        {
          id: '137',
          label: 'Novices & Intermediates',
          correct: false,
        },
        {
          id: '138',
          label: 'All Members',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-40',
      sourceId: '40',
      number: 57,
      title: 'Locking Sail Locker',
      category: 'WYC Policies',
      prompt: 'Who is responsible for locking the Sail Locker if no other member is present?',
      type: 'single',
      options: [
        {
          id: '139',
          label: 'The last Skipper or Novice to leave.',
          correct: false,
        },
        {
          id: '140',
          label: 'The last Chief to leave.',
          correct: false,
        },
        {
          id: '141',
          label: 'The last Fleet Captain to leave.',
          correct: false,
        },
        {
          id: '142',
          label: 'Each member.',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-41',
      sourceId: '41',
      number: 58,
      title: 'Boat Damage',
      category: 'WYC Policies',
      prompt:
        'What should you do if you damage a boat or find damage (choose the best 2 answers) ?',
      type: 'multiple',
      options: [
        {
          id: '143',
          label: 'Contact the WYC Faculty Advisor.',
          correct: false,
        },
        {
          id: '144',
          label:
            'Fill out the electronic damage form on the website and contact the Fleet Captain.',
          correct: true,
        },
        {
          id: '145',
          label: 'Leave it alone; the Fleet Captain will repair it.',
          correct: false,
        },
        {
          id: '146',
          label: 'Attempt to repair it if the repair is within your capabilities.',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-42',
      sourceId: '42',
      number: 59,
      title: 'COB: Leeward',
      category: 'Sailing Safety',
      prompt: 'In the event of a crew overboard: approach the person from their leeward side.',
      type: 'single',
      options: [
        {
          id: '147',
          label: 'True',
          correct: true,
        },
        {
          id: '148',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-43',
      sourceId: '43',
      number: 60,
      title: 'COB: Yelling Crew Overboard!',
      category: 'Sailing Safety',
      prompt: 'In the event of a crew overboard: yell “Crew Overboard!”',
      type: 'single',
      options: [
        {
          id: '149',
          label: 'True',
          correct: true,
        },
        {
          id: '150',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-44',
      sourceId: '44',
      number: 61,
      title: 'COB: Floatation Device',
      category: 'Sailing Safety',
      prompt: 'In the event of a crew overboard: throw them a floatation device.',
      type: 'single',
      options: [
        {
          id: '151',
          label: 'True',
          correct: true,
        },
        {
          id: '152',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-45',
      sourceId: '45',
      number: 62,
      title: 'COB: Windward',
      category: 'Sailing Safety',
      prompt: 'In the event of a crew overboard: approach the person from their windward side.',
      type: 'single',
      options: [
        {
          id: '153',
          label: 'True',
          correct: false,
        },
        {
          id: '154',
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-46',
      sourceId: '46',
      number: 63,
      title: 'COB: Luffing',
      category: 'Sailing Safety',
      prompt:
        'In the event of a crew overboard: sail up to the person with sails luffing to slow the boat.',
      type: 'single',
      options: [
        {
          id: '155',
          label: 'True',
          correct: true,
        },
        {
          id: '156',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-47',
      sourceId: '47',
      number: 64,
      title: 'COB: Swim to Boat',
      category: 'Sailing Safety',
      prompt:
        'In the event of a crew overboard: stop well short of the person and have them swim to the boat.',
      type: 'single',
      options: [
        {
          id: '157',
          label: 'True',
          correct: false,
        },
        {
          id: '158',
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-48',
      sourceId: '48',
      number: 65,
      title: 'Infraction',
      category: 'WYC Policies',
      prompt: 'Infraction of the Club’s By-Laws is grounds for suspension.',
      type: 'single',
      options: [
        {
          id: '159',
          label: 'True',
          correct: true,
        },
        {
          id: '160',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-49',
      sourceId: '49',
      number: 66,
      title: 'Capsize: Daggerboard',
      category: 'Dinghy Novice',
      prompt:
        'Assume that you are in a self-rescuing boat that is capsizing: You can try to get on the centerboard as the boat goes over.',
      type: 'single',
      options: [
        {
          id: '161',
          label: 'True',
          correct: true,
        },
        {
          id: '162',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-51',
      sourceId: '51',
      number: 67,
      title: 'Capsize: Mud',
      category: 'Dinghy Novice',
      prompt:
        'Assume that you are in a self-rescuing boat that is capsizing: If your boat turtles and the mast becomes stuck in the mud, bounce on the centerboard to free the mast from the bottom.',
      type: 'single',
      options: [
        {
          id: '165',
          label: 'True',
          correct: false,
        },
        {
          id: '166',
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-50',
      sourceId: '50',
      number: 68,
      title: 'Capsize: Hull Climb',
      category: 'Dinghy Novice',
      prompt:
        'Assume that you are in a self-rescuing boat that is capsizing: If you do not make it on the centerboard before the mast hits the water, you should try to climb over the hull of the boat from inside the cockpit.',
      type: 'single',
      options: [
        {
          id: '163',
          label: 'True',
          correct: false,
        },
        {
          id: '164',
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-52',
      sourceId: '52',
      number: 69,
      title: 'Right of Way: Tugboats',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Tugboats with barges.',
      type: 'single',
      options: [
        {
          id: '167',
          label: 'True',
          correct: true,
        },
        {
          id: '168',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-53',
      sourceId: '53',
      number: 70,
      title: 'Right of Way: Waterskiiers',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Boat towing water-skiers.',
      type: 'single',
      options: [
        {
          id: '169',
          label: 'True',
          correct: false,
        },
        {
          id: '170',
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-54',
      sourceId: '54',
      number: 71,
      title: 'Right of Way: Powered Vessels',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: All powered vessels.',
      type: 'single',
      options: [
        {
          id: '171',
          label: 'True',
          correct: false,
        },
        {
          id: '172',
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-55',
      sourceId: '55',
      number: 72,
      title: 'Right of Way: Draft Restricted Vessels',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Vessels in the channel restricted by draft.',
      type: 'single',
      options: [
        {
          id: '173',
          label: 'True',
          correct: true,
        },
        {
          id: '174',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-56',
      sourceId: '56',
      number: 73,
      title: 'Right of Way: Seaplanes',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Seaplanes.',
      type: 'single',
      options: [
        {
          id: '175',
          label: 'True',
          correct: false,
        },
        {
          id: '176',
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      id: 'dinghy-57',
      sourceId: '57',
      number: 74,
      title: 'Right of Way: Overtaken Vessels',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: (Slower) Vessels being overtaken.',
      type: 'single',
      options: [
        {
          id: '177',
          label: 'True',
          correct: true,
        },
        {
          id: '178',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-58',
      sourceId: '58',
      number: 75,
      title: 'Right of Way: Swimmers',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Swimmers',
      type: 'single',
      options: [
        {
          id: '179',
          label: 'True',
          correct: true,
        },
        {
          id: '180',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-59',
      sourceId: '59',
      number: 76,
      title: 'Avoid Channel: Draft Restricted Boats',
      category: 'Sailing Safety',
      prompt:
        'Sailing in or near the shipping channel may be inappropriate when: There are boats limited by draft or weight in the channel.',
      type: 'single',
      options: [
        {
          id: '181',
          label: 'True',
          correct: true,
        },
        {
          id: '182',
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      id: 'dinghy-60',
      sourceId: '60',
      number: 77,
      title: 'Avoid Channel: Busy',
      category: 'Sailing Safety',
      prompt:
        'Sailing in or near the shipping channel may be inappropriate when: The channel is busy.',
      type: 'single',
      options: [
        {
          id: '183',
          label: 'True',
          correct: true,
        },
        {
          id: '184',
          label: 'False',
          correct: false,
        },
      ],
    },
  ],
} as const satisfies {
  id: string
  title: string
  description: string
  estimatedMinutes: string
  questions: readonly TestQuestion[]
}
