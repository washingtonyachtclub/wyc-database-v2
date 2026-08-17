export type TestImage = {
  src: string
  alt: string
}

export type TestQuestionOption = {
  label: string
  correct: boolean
}

type TestQuestionBase = {
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
  questions: [
    {
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
      title: 'Sailboat Diagram (D)',
      category: 'Dinghy Novice',
      prompt: 'What is sailboat part D?',
      image: {
        src: '/test-images/sailboat-parts.png',
        alt: 'Labeled diagram of dinghy sailboat parts A through X',
      },
      type: 'text',
      acceptedAnswers: ['Tiller Extension', 'Hiking Stick'],
      placeholder: 'D',
    },
    {
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
          label: 'Port',
          correct: false,
        },
        {
          label: 'Starboard',
          correct: true,
        },
      ],
    },
    {
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
          label: 'Port',
          correct: true,
        },
        {
          label: 'Starboard',
          correct: false,
        },
      ],
    },
    {
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
          label: 'Port',
          correct: true,
        },
        {
          label: 'Starboard',
          correct: false,
        },
      ],
    },
    {
      title: 'Boat A Point of Sail',
      category: 'Points of Sail & Tacks',
      prompt: 'What point of sail is Boat A on?',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
      type: 'text',
      acceptedAnswers: ['Beam Reach'],
      placeholder: 'Type your answer',
    },
    {
      title: 'Boat B Point of Sail',
      category: 'Points of Sail & Tacks',
      prompt: 'What point of sail is Boat B on?',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
      type: 'text',
      acceptedAnswers: ['Running', 'Run'],
      placeholder: 'Type your answer',
    },
    {
      title: 'Boat C Point of Sail',
      category: 'Points of Sail & Tacks',
      prompt: 'What point of sail is Boat C on?',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Diagram of three sailboats labeled A, B, and C relative to the wind',
      },
      type: 'text',
      acceptedAnswers: ['Close Hauled', 'Close Haul'],
      placeholder: 'Type your answer',
    },
    {
      title: 'Dinghy Sailing Hours',
      category: 'WYC Policies',
      prompt: 'Club dinghies may be sailed:',
      type: 'single',
      options: [
        {
          label: 'from 9 AM to 5 PM.',
          correct: false,
        },
        {
          label: 'any time.',
          correct: false,
        },
        {
          label: 'any time a Chief is present',
          correct: false,
        },
        {
          label: 'only during daylight hours.',
          correct: true,
        },
      ],
    },
    {
      title: 'Boat Unattended at Docks',
      category: 'Dinghy Novice',
      prompt: 'Prior to leaving a boat unattended at the docks, one needs to:',
      type: 'single',
      options: [
        {
          label: 'tie the bow and stern to the dock.',
          correct: false,
        },
        {
          label: 'raise the sails and tie only the bow to the dock.',
          correct: false,
        },
        {
          label: 'cleat all the lines and raise the sails.',
          correct: false,
        },
        {
          label:
            'tie the boat to the dock with mainsail dropped (DH) or boat capsized on the dock (SH).',
          correct: true,
        },
      ],
    },
    {
      title: 'Novice & Intermediate Sailing Locations',
      category: 'WYC Policies',
      prompt: 'Novices and Intermediates may sail in the following locations:',
      type: 'single',
      options: [
        {
          label: 'Union Bay and Portage Bay only.',
          correct: false,
        },
        {
          label: 'Union Bay only.',
          correct: true,
        },
        {
          label: 'Union Bay and Lake Washington only.',
          correct: false,
        },
        {
          label: 'any fresh water east of the Aurora Bridge.',
          correct: false,
        },
      ],
    },
    {
      title: 'Novice Max Wind Speed',
      category: 'WYC Policies',
      prompt: 'With a novice rating you may sail unsupervised in winds up to:',
      type: 'single',
      options: [
        {
          label: '7 knots',
          correct: true,
        },
        {
          label: '10 knots',
          correct: false,
        },
        {
          label: '15 knots',
          correct: false,
        },
        {
          label: '25 knots',
          correct: false,
        },
      ],
    },
    {
      title: 'Intermediate Max Wind Speed',
      category: 'WYC Policies',
      prompt: 'With an intermediate rating you may sail unsupervised in winds up to:',
      type: 'single',
      options: [
        {
          label: '7 knots',
          correct: false,
        },
        {
          label: '10 knots',
          correct: false,
        },
        {
          label: '15 knots',
          correct: true,
        },
        {
          label: '25 knots',
          correct: false,
        },
      ],
    },
    {
      title: 'Wind Speed Responsibility',
      category: 'WYC Policies',
      prompt: 'The responsibility for knowing the current wind speed lies with:',
      type: 'single',
      options: [
        {
          label: 'Chiefs.',
          correct: false,
        },
        {
          label: 'all members going sailing.',
          correct: true,
        },
        {
          label: 'the WAC staff.',
          correct: false,
        },
      ],
    },
    {
      title: 'Rescue Whaler Use',
      category: 'WYC Policies',
      prompt: 'The rescue whaler may be used by:',
      type: 'single',
      options: [
        {
          label: 'Chiefs and Instructors.',
          correct: false,
        },
        {
          label: 'any member in case of emergency, other use only by Skippers.',
          correct: false,
        },
        {
          label:
            'any member in case of emergency, other use only by Chiefs, Instructors, and members with a whaler rating.',
          correct: true,
        },
        {
          label: 'any trained member.',
          correct: false,
        },
      ],
    },
    {
      title: 'Life Vest Regulation',
      category: 'WYC Policies',
      prompt: 'What is a federal regulation concerning Coast Guard approved life vests?',
      type: 'single',
      options: [
        {
          label: 'Life vests should be worn in heavy winds, otherwise not needed.',
          correct: false,
        },
        {
          label: 'Bring one life vest per person on board.',
          correct: true,
        },
        {
          label: 'Only non-swimmers need life vests.',
          correct: false,
        },
      ],
    },
    {
      title: 'Life Vest Non-Swimmer & Guest',
      category: 'WYC Policies',
      prompt: 'Non-swimmers and guests are required to:',
      type: 'single',
      options: [
        {
          label: 'wear ski belts while on Club boats.',
          correct: false,
        },
        {
          label: 'wear Coast Guard approved life vests at all times.',
          correct: true,
        },
        {
          label: 'have float cushions in the boat.',
          correct: false,
        },
        {
          label: 'have Coast Guard approved life vests in the boat.',
          correct: false,
        },
      ],
    },
    {
      title: 'Immersion Self Assistance',
      category: 'Sailing Safety',
      prompt:
        'About how long would a moderately dressed person immersed in Union Bay in winter be capable of self-assistance?',
      type: 'single',
      options: [
        {
          label: '3 – 10 minutes',
          correct: true,
        },
        {
          label: '45 minutes',
          correct: false,
        },
        {
          label: '2 hours',
          correct: false,
        },
        {
          label: '10 hours',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailing Lee Shore',
      category: 'Dinghy Novice',
      prompt: 'Sailing near a lee shore is dangerous because:',
      type: 'single',
      options: [
        {
          label: 'the wind is stronger there and you may capsize.',
          correct: false,
        },
        {
          label: 'navigational rules require 300 ft. clearance on lee shores.',
          correct: false,
        },
        {
          label:
            'driftwood blows onto lee shores and you may bang up or crack the bottom of your boat.',
          correct: false,
        },
        {
          label: 'you may run aground and be unable to sail upwind to get away.',
          correct: true,
        },
      ],
    },
    {
      title: 'Main Sail Raise',
      category: 'Dinghy Novice',
      prompt: 'Main sail(s) should be raised:',
      type: 'single',
      options: [
        {
          label: 'as soon as you reach the boat.',
          correct: false,
        },
        {
          label: 'after the boat is in the water, but before leaving the dock.',
          correct: true,
        },
        {
          label: 'while the boat is on the dock.',
          correct: false,
        },
        {
          label: 'after you have left the dock.',
          correct: false,
        },
      ],
    },
    {
      title: 'Docking',
      category: 'Dinghy Novice',
      prompt: 'When docking, your boat should:',
      type: 'single',
      options: [
        {
          label: 'point downwind with the sails luffing.',
          correct: false,
        },
        {
          label: 'point into the dock to stop the boat.',
          correct: false,
        },
        {
          label: 'point upwind with the sails luffing.',
          correct: true,
        },
        {
          label: 'have the jib filled to maintain steerageway.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sail Storage',
      category: 'Dinghy Novice',
      prompt: 'Wet dacron sails are:',
      type: 'single',
      options: [
        {
          label: 'hung to dry.',
          correct: false,
        },
        {
          label: 'laid flat to dry.',
          correct: false,
        },
        {
          label: 'rolled and put away.',
          correct: true,
        },
        {
          label: 'stuffed into sailbags.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sail Rolling Location',
      category: 'Dinghy Novice',
      prompt: 'Sails should be rolled only:',
      type: 'single',
      options: [
        {
          label: 'on the asphalt.',
          correct: false,
        },
        {
          label: 'on the wooden part of the docks.',
          correct: true,
        },
        {
          label: 'in the WAC hallway.',
          correct: false,
        },
      ],
    },
    {
      title: 'Close Hauled Trim',
      category: 'Dinghy Novice',
      prompt: 'When sailing upwind, the best sail trim is when:',
      type: 'single',
      options: [
        {
          label: 'the sails are on the verge of luffing.',
          correct: true,
        },
        {
          label: 'you can sit comfortably on the side.',
          correct: false,
        },
        {
          label: 'you sheet in until the boat heels about 15 degrees.',
          correct: false,
        },
        {
          label: 'the boom is sheeted to the centerline.',
          correct: false,
        },
      ],
    },
    {
      title: 'Running Trim',
      category: 'Dinghy Novice',
      prompt: 'In general, when running downwind, the best sail trim is when:',
      type: 'single',
      options: [
        {
          label: 'the boom is pulled in close to the centerline to prevent the sail from luffing.',
          correct: false,
        },
        {
          label: 'the mainsail is let out so the wind strikes the sail at a 90 degree angle.',
          correct: true,
        },
        {
          label: 'the boom is parallel with the telltales on the shroud.',
          correct: false,
        },
        {
          label: 'you have six feet of mainsheet coiled in the bottom of the boat.',
          correct: false,
        },
      ],
    },
    {
      title: 'Right of Way: Wind Position',
      category: 'Sailing Safety',
      prompt:
        'By International Regulations for Avoiding Collisions at Sea (COLREGS), in general, given two sailboats sailing and all other things equal, which boat has right-of-way?',
      type: 'single',
      options: [
        {
          label: 'The windward boat.',
          correct: false,
        },
        {
          label: 'The leeward boat.',
          correct: true,
        },
      ],
    },
    {
      title: 'Right of Way: Sailing Tack',
      category: 'Sailing Safety',
      prompt:
        'By International Regulations for Avoiding Collisions at Sea (COLREGS), in general, given two sailboats sailing and all other things equal, which boat has right-of-way?',
      type: 'single',
      options: [
        {
          label: 'One sailing on port tack.',
          correct: false,
        },
        {
          label: 'One sailing on starboard tack.',
          correct: true,
        },
      ],
    },
    {
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
          label: 'Jibe',
          correct: false,
        },
        {
          label: 'Tack',
          correct: true,
        },
      ],
    },
    {
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
          label: 'Jibe',
          correct: false,
        },
        {
          label: 'Tack',
          correct: true,
        },
      ],
    },
    {
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
          label: 'Jibe',
          correct: true,
        },
        {
          label: 'Tack',
          correct: false,
        },
      ],
    },
    {
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
          label: 'Jibe',
          correct: false,
        },
        {
          label: 'Tack',
          correct: true,
        },
      ],
    },
    {
      title: 'Definition: Sailing By the Lee',
      category: 'Dinghy Novice',
      prompt: 'Sailing ‘by the lee’ means:',
      type: 'single',
      options: [
        {
          label: 'sailing to the leeward of land.',
          correct: false,
        },
        {
          label: 'sailing downwind with the boom on the windward side.',
          correct: true,
        },
        {
          label: 'sailing towards a lee shore.',
          correct: false,
        },
      ],
    },
    {
      title: 'Guest Policy',
      category: 'WYC Policies',
      prompt: 'What is the rule concerning taking out guests?',
      type: 'single',
      options: [
        {
          label: 'only by permission of a Chief.',
          correct: false,
        },
        {
          label: 'not permitted: only members may sail Club boats.',
          correct: false,
        },
        {
          label:
            'guests must prove IMA membership and sign the Participant’s Agreement on the website.',
          correct: true,
        },
        {
          label: 'only skippers may take a non-member sailing.',
          correct: false,
        },
      ],
    },
    {
      title: 'Boat Maintenance',
      category: 'WYC Policies',
      prompt: 'Who is responsible for the repair and general maintenance of WYC boats?',
      type: 'single',
      options: [
        {
          label: 'Fleet Captains.',
          correct: false,
        },
        {
          label: 'Chiefs.',
          correct: false,
        },
        {
          label: 'Intermediates & Skippers',
          correct: false,
        },
        {
          label: 'Novices & Intermediates',
          correct: false,
        },
        {
          label: 'All Members',
          correct: true,
        },
      ],
    },
    {
      title: 'Locking Sail Locker',
      category: 'WYC Policies',
      prompt: 'Who is responsible for locking the Sail Locker if no other member is present?',
      type: 'single',
      options: [
        {
          label: 'The last Skipper or Novice to leave.',
          correct: false,
        },
        {
          label: 'The last Chief to leave.',
          correct: false,
        },
        {
          label: 'The last Fleet Captain to leave.',
          correct: false,
        },
        {
          label: 'Each member.',
          correct: true,
        },
      ],
    },
    {
      title: 'Boat Damage',
      category: 'WYC Policies',
      prompt:
        'What should you do if you damage a boat or find damage (choose the best 2 answers) ?',
      type: 'multiple',
      options: [
        {
          label: 'Contact the WYC Faculty Advisor.',
          correct: false,
        },
        {
          label:
            'Fill out the electronic damage form on the website and contact the Fleet Captain.',
          correct: true,
        },
        {
          label: 'Leave it alone; the Fleet Captain will repair it.',
          correct: false,
        },
        {
          label: 'Attempt to repair it if the repair is within your capabilities.',
          correct: true,
        },
      ],
    },
    {
      title: 'COB: Leeward',
      category: 'Sailing Safety',
      prompt: 'In the event of a crew overboard: approach the person from their leeward side.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'COB: Yelling Crew Overboard!',
      category: 'Sailing Safety',
      prompt: 'In the event of a crew overboard: yell “Crew Overboard!”',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'COB: Floatation Device',
      category: 'Sailing Safety',
      prompt: 'In the event of a crew overboard: throw them a floatation device.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'COB: Windward',
      category: 'Sailing Safety',
      prompt: 'In the event of a crew overboard: approach the person from their windward side.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: false,
        },
        {
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      title: 'COB: Luffing',
      category: 'Sailing Safety',
      prompt:
        'In the event of a crew overboard: sail up to the person with sails luffing to slow the boat.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'COB: Swim to Boat',
      category: 'Sailing Safety',
      prompt:
        'In the event of a crew overboard: stop well short of the person and have them swim to the boat.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: false,
        },
        {
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      title: 'Infraction',
      category: 'WYC Policies',
      prompt: 'Infraction of the Club’s By-Laws is grounds for suspension.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'Capsize: Daggerboard',
      category: 'Dinghy Novice',
      prompt:
        'Assume that you are in a self-rescuing boat that is capsizing: You can try to get on the centerboard as the boat goes over.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'Capsize: Mud',
      category: 'Dinghy Novice',
      prompt:
        'Assume that you are in a self-rescuing boat that is capsizing: If your boat turtles and the mast becomes stuck in the mud, bounce on the centerboard to free the mast from the bottom.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: false,
        },
        {
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      title: 'Capsize: Hull Climb',
      category: 'Dinghy Novice',
      prompt:
        'Assume that you are in a self-rescuing boat that is capsizing: If you do not make it on the centerboard before the mast hits the water, you should try to climb over the hull of the boat from inside the cockpit.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: false,
        },
        {
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      title: 'Right of Way: Tugboats',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Tugboats with barges.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'Right of Way: Waterskiiers',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Boat towing water-skiers.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: false,
        },
        {
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      title: 'Right of Way: Powered Vessels',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: All powered vessels.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: false,
        },
        {
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      title: 'Right of Way: Draft Restricted Vessels',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Vessels in the channel restricted by draft.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'Right of Way: Seaplanes',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Seaplanes.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: false,
        },
        {
          label: 'False',
          correct: true,
        },
      ],
    },
    {
      title: 'Right of Way: Overtaken Vessels',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: (Slower) Vessels being overtaken.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'Right of Way: Swimmers',
      category: 'Sailing Safety',
      prompt:
        'The following vessels have right-of-way over sailboats in the Club’s Novice and Intermediate sailing waters: Swimmers',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'Avoid Channel: Draft Restricted Boats',
      category: 'Sailing Safety',
      prompt:
        'Sailing in or near the shipping channel may be inappropriate when: There are boats limited by draft or weight in the channel.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
          label: 'False',
          correct: false,
        },
      ],
    },
    {
      title: 'Avoid Channel: Busy',
      category: 'Sailing Safety',
      prompt:
        'Sailing in or near the shipping channel may be inappropriate when: The channel is busy.',
      type: 'single',
      options: [
        {
          label: 'True',
          correct: true,
        },
        {
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
  questions: readonly TestQuestion[]
}
