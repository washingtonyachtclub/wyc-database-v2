import type { TestDefinition } from '@/domains/written-tests/types'

export const sailboardNoviceTest = {
  id: 'sailboard-novice',
  title: 'Sailboard Novice Test',
  description: 'Sailboard parts, sailing, safety, and club policies.',
  passingPercentage: 90,
  questions: [
    {
      title: 'Sailboard Part (1)',
      category: 'Parts & Equipment',
      prompt:
        'Using the diagram below, fill out the sailboard part that corresponds to the number. What is sailboard part 1?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Board', 'Sailboard', 'Windsurf Board', 'Windsurfing Board'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (2)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 2?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Centerboard', 'Daggerboard'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (3)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 3?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Fin', 'Skeg'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (4)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 4?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Universal Joint', 'UJ', 'Universal', 'U-joint', 'Mast Base', 'Mast Foot'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (5)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 5?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Head', 'Sail Head'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (6)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 6?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Clew', 'Sail Clew'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (7)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 7?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Tack', 'Sail Tack'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (8)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 8?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Boom', 'Wishbone Boom'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (9)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 9?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Leech', 'Sail Leech'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (10)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 10?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Luff', 'Sail Luff'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (11)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 11?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Foot', 'Sail Foot'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Part (12)',
      category: 'Parts & Equipment',
      prompt: 'What is sailboard part 12?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Batten', 'Sail Batten', 'Battens', 'Sail Battens'],
      placeholder: '',
      image: {
        src: '/test-images/sailboard-parts.png',
        alt: 'Sailboard parts numbered 1 through 12',
      },
    },
    {
      title: 'Sailboard Easiest Part to Break',
      category: 'Parts & Equipment',
      prompt: 'The easiest part of a board to break is the _____________.',
      points: 3.0,
      type: 'single',
      options: [
        {
          label: 'Boom',
          correct: false,
        },
        {
          label: 'Fin (Skeg)',
          correct: true,
        },
        {
          label: 'Sail',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard Storage: Cunningham',
      category: 'Parts & Equipment',
      prompt: 'The downhaul (cunningham) should always be ______.',
      points: 3.0,
      type: 'single',
      options: [
        {
          label: 'Removed before going sailing.',
          correct: false,
        },
        {
          label: 'Loosened when putting the sail away.',
          correct: true,
        },
        {
          label: 'Tightened when putting the sail away.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard Starting Technique',
      category: 'Points of Sail & Maneuvers',
      prompt:
        'In order to start sailing the sailboard, you should plant your feet ___________ when you begin pulling the sail out of the water.',
      points: 2.0,
      type: 'single',
      options: [
        {
          label: 'Aft (behind) of the mast',
          correct: false,
        },
        {
          label: 'Fore (in front of) of the mast',
          correct: false,
        },
        {
          label: 'On either side of the mast',
          correct: true,
        },
      ],
    },
    {
      title: 'Sailboard: Sailing Upwind & Downwind',
      category: 'Points of Sail & Maneuvers',
      prompt: "To steer/adjust the sailboard's direction of travel, _________________.",
      points: 3.0,
      type: 'single',
      options: [
        {
          label:
            'Tilt the sail forward (Archer pose) to fall off/move downwind and tilt the sail back (Torro pose) to head upwind.',
          correct: true,
        },
        {
          label:
            'Tilt the sail forward (Archer pose) to head upwind and tilt the sail back (Torro pose) to fall off/move downwind.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard: Downwind Sailing to Starboard',
      category: 'Points of Sail & Maneuvers',
      prompt:
        'If you are sailing downwind, you may turn to the starboard direction by ________________.',
      points: 3.0,
      type: 'single',
      options: [
        {
          label: 'Leaning the sail far forward.',
          correct: false,
        },
        {
          label: 'Leaning the sail backward.',
          correct: false,
        },
        {
          label: 'Tilting the sail to port.',
          correct: true,
        },
      ],
    },
    {
      title: 'Sailboard: Archer Pose',
      category: 'Points of Sail & Maneuvers',
      prompt: 'Archer pose will do what?',
      points: 3.0,
      type: 'single',
      options: [
        {
          label: 'Make you faster.',
          correct: false,
        },
        {
          label: 'Help you go to weather.',
          correct: false,
        },
        {
          label: 'Make the board turn downwind.',
          correct: true,
        },
      ],
    },
    {
      title: 'Sailboard: Launching',
      category: 'Points of Sail & Maneuvers',
      prompt: 'When you’re launching, you should ________________.',
      points: 3.0,
      type: 'single',
      options: [
        {
          label:
            'Launch as far upwind as you can and make upwind progress at the start of your session.',
          correct: true,
        },
        {
          label:
            'Launch as far downwind as you can and go straight downwind to start your session.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard: No Go Zone',
      category: 'Points of Sail & Maneuvers',
      prompt:
        'On the wind clock, where can’t you sail (also known as in chains/in irons or the splash zone)?',
      points: 3.0,
      type: 'single',
      options: [
        {
          label: '10:30 to 1:30',
          correct: true,
        },
        {
          label: '9:00 to 5:00',
          correct: false,
        },
        {
          label: '4:30 to 7:30',
          correct: false,
        },
        {
          label: 'It’s 5 o’clock somewhere!',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard: Strong Downwind',
      category: 'Points of Sail & Maneuvers',
      prompt:
        'If you are sailing downwind in strong wind, you should move your body towards the stern of the sailboard.',
      points: 2.0,
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
      title: 'Boat A Tack',
      category: 'Points of Sail & Maneuvers',
      prompt: 'What tack is Boat A on?',
      points: 1.0,
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
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Sailboats A, B, and C showing their positions relative to the wind',
      },
    },
    {
      title: 'Boat B Tack',
      category: 'Points of Sail & Maneuvers',
      prompt: 'What tack is Boat B on?',
      points: 1.0,
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
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Sailboats A, B, and C showing their positions relative to the wind',
      },
    },
    {
      title: 'Boat C Tack',
      category: 'Points of Sail & Maneuvers',
      prompt: 'What tack is Boat C on?',
      points: 1.0,
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
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Sailboats A, B, and C showing their positions relative to the wind',
      },
    },
    {
      title: 'Boat A Point of Sail',
      category: 'Points of Sail & Maneuvers',
      prompt: 'What point of sail is Boat A on?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Beam Reach', 'Beam Reaching'],
      placeholder: '',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Sailboats A, B, and C showing their positions relative to the wind',
      },
    },
    {
      title: 'Boat B Point of Sail',
      category: 'Points of Sail & Maneuvers',
      prompt: 'What point of sail is Boat B on?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Running', 'Run', 'Dead Run', 'Running Downwind'],
      placeholder: '',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Sailboats A, B, and C showing their positions relative to the wind',
      },
    },
    {
      title: 'Boat C Point of Sail',
      category: 'Points of Sail & Maneuvers',
      prompt: 'What point of sail is Boat C on?',
      points: 1.0,
      type: 'text',
      acceptedAnswers: ['Close Hauled', 'Close Haul', 'Beating'],
      placeholder: '',
      image: {
        src: '/test-images/sailboat-positions.png',
        alt: 'Sailboats A, B, and C showing their positions relative to the wind',
      },
    },
    {
      title: 'Sailboard Maneuver 1',
      category: 'Points of Sail & Maneuvers',
      prompt:
        'Determine whether the board tacked or jibed in each of the four drawings going from left to right. Sailboard #1:',
      points: 4.0,
      type: 'single',
      options: [
        {
          label: 'Tacked',
          correct: true,
        },
        {
          label: 'Jibed',
          correct: false,
        },
      ],
      image: {
        src: '/test-images/sailboard-maneuvers.png',
        alt: 'Four sailboard maneuvers numbered 1 through 4',
      },
    },
    {
      title: 'Sailboard Maneuver 2',
      category: 'Points of Sail & Maneuvers',
      prompt:
        'Determine whether the board tacked or jibed in each of the four drawings going from left to right. Sailboard #2:',
      points: 4.0,
      type: 'single',
      options: [
        {
          label: 'Tacked',
          correct: true,
        },
        {
          label: 'Jibed',
          correct: false,
        },
      ],
      image: {
        src: '/test-images/sailboard-maneuvers.png',
        alt: 'Four sailboard maneuvers numbered 1 through 4',
      },
    },
    {
      title: 'Sailboard Maneuver 3',
      category: 'Points of Sail & Maneuvers',
      prompt:
        'Determine whether the board tacked or jibed in each of the four drawings going from left to right. Sailboard #3:',
      points: 4.0,
      type: 'single',
      options: [
        {
          label: 'Tacked',
          correct: false,
        },
        {
          label: 'Jibed',
          correct: true,
        },
      ],
      image: {
        src: '/test-images/sailboard-maneuvers.png',
        alt: 'Four sailboard maneuvers numbered 1 through 4',
      },
    },
    {
      title: 'Sailboard Maneuver 4',
      category: 'Points of Sail & Maneuvers',
      prompt:
        'Determine whether the board tacked or jibed in each of the four drawings going from left to right. Sailboard #4:',
      points: 4.0,
      type: 'single',
      options: [
        {
          label: 'Tacked',
          correct: true,
        },
        {
          label: 'Jibed',
          correct: false,
        },
      ],
      image: {
        src: '/test-images/sailboard-maneuvers.png',
        alt: 'Four sailboard maneuvers numbered 1 through 4',
      },
    },
    {
      title: 'Sailboard: Docking',
      category: 'Points of Sail & Maneuvers',
      prompt: 'When docking or beaching, your board should __________.',
      points: 4.0,
      type: 'single',
      options: [
        {
          label: 'Be pointed downwind with the sail luffing.',
          correct: false,
        },
        {
          label: 'Be pointed into the dock to stop the board.',
          correct: false,
        },
        {
          label: 'Be pointed upwind with the sail luffing.',
          correct: true,
        },
      ],
    },
    {
      title: 'Sailboard Wetsuit Policy',
      category: 'Club Policies',
      prompt: 'You must wear wetsuits from ________ to ________.',
      points: 3.0,
      type: 'single',
      options: [
        {
          label: 'June - August',
          correct: false,
        },
        {
          label: 'September 15 - June 15',
          correct: true,
        },
        {
          label: 'August 15 - May 15',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard Lifejacket Policy',
      category: 'Club Policies',
      prompt: 'What is the WYC rule concerning use of life jackets when riding sailboards?',
      points: 4.0,
      type: 'single',
      options: [
        {
          label: 'Life jackets should be worn in heavy winds, otherwise not needed.',
          correct: false,
        },
        {
          label: 'Life jackets must always be worn.',
          correct: true,
        },
        {
          label: 'You must bring a life jacket with you.',
          correct: false,
        },
        {
          label: 'Only Non-swimmers only need life jackets.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard Skipper Sailing Locations',
      category: 'Club Policies',
      prompt: 'Sailboard Skippers may sail in _______________. Best Answer only.',
      points: 3.0,
      type: 'single',
      options: [
        {
          label: 'All interconnecting waters East of the Aurora Street Bridge.',
          correct: false,
        },
        {
          label:
            'Lake Washington north of the Evergreen Point Floating Bridge, Green Lake, Lake Ballinger, and the Hook at Hood River.',
          correct: true,
        },
        {
          label: 'Union Bay only.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard Novice & Intermediate Sailing Locations',
      category: 'Club Policies',
      prompt: 'Sailboard novices and intermediates may sail in ____________.',
      points: 3.0,
      type: 'single',
      options: [
        {
          label: 'All interconnecting waters East of the Aurora Street Bridge.',
          correct: false,
        },
        {
          label: 'Union Bay and designated areas of Lake Washington.',
          correct: false,
        },
        {
          label:
            'Sail Sand Point, within the approved novice and intermediate boundaries for the wind direction.',
          correct: true,
        },
      ],
    },
    {
      title: 'Sailboard: Sailing Hours',
      category: 'Club Policies',
      prompt: 'Club dinghies and sailboards may be sailed:',
      points: 2.0,
      type: 'single',
      options: [
        {
          label: 'From 9 AM to 5 PM.',
          correct: false,
        },
        {
          label: 'Anytime.',
          correct: false,
        },
        {
          label: 'Anytime a Chief is present.',
          correct: false,
        },
        {
          label: 'During daylight hours.',
          correct: true,
        },
      ],
    },
    {
      title: 'Novice Max Wind Speed',
      category: 'Club Policies',
      prompt: 'With a novice rating you may sail unsupervised in winds up to:',
      points: 3.0,
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
      category: 'Club Policies',
      prompt:
        'With an intermediate windsurf rating, when may you sail unsupervised at Sail Sand Point?',
      points: 3.0,
      type: 'single',
      options: [
        {
          label:
            'In winds up to 15 knots, except in southerly conditions when steady winds exceed 11 knots or intermittent or frequent whitecaps appear offshore toward Kirkland.',
          correct: true,
        },
        {
          label: 'In winds up to 15 knots regardless of wind direction.',
          correct: false,
        },
        {
          label: 'In winds up to 25 knots.',
          correct: false,
        },
        {
          label: 'In any conditions while an SSP employee is present.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard: About to Ram Something',
      category: 'Safety & Rescue',
      prompt: 'If you are about to ram something, _______________.',
      points: 4.0,
      type: 'single',
      options: [
        {
          label: 'Drop the sail into the water.',
          correct: true,
        },
        {
          label: 'Sheet in.',
          correct: false,
        },
        {
          label: 'Yell “Oh my Goodness”.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard: Overpowered',
      category: 'Safety & Rescue',
      prompt: 'When overpowered, you should ____________________.',
      points: 3.0,
      type: 'single',
      options: [
        {
          label: 'Fill the sail as quickly as you can by falling backwards into the wind.',
          correct: false,
        },
        {
          label: 'Gradually fill the sail with air and don’t fully sheet in.',
          correct: true,
        },
        {
          label: 'Never pull the sail up all the way vertical.',
          correct: false,
        },
      ],
    },
    {
      title: 'Sailboard: Separated from Rig',
      category: 'Safety & Rescue',
      prompt: 'If the rig, board, and you all become separated, ____________.',
      points: 4.0,
      type: 'single',
      options: [
        {
          label: 'Swim to the rig and then pull it to the board.',
          correct: false,
        },
        {
          label: 'Swim to the board and then paddle it to the rig.',
          correct: true,
        },
        {
          label: 'Don’t move because the board will always drift to you.',
          correct: false,
        },
      ],
    },
    {
      title: 'Returning to shore',
      category: 'Safety & Rescue',
      prompt: 'When you can’t get back to shore:',
      type: 'statements',
      statements: [
        {
          prompt: 'When you can’t get back to shore: Keep on trying until you exhaust yourself.',
          correct: false,
          points: 1.0,
        },
        {
          prompt:
            'When you can’t get back to shore: You may separate the rig from the universal joint, place the rig on the board, and paddle back with the rig on the board under you.',
          correct: true,
          points: 1.0,
        },
        {
          prompt:
            'When you can’t get back to shore: You may leave the sail rig in the water and paddle on the board to nearest shore.',
          correct: true,
          points: 1.0,
        },
        {
          prompt: 'When you can’t get back to shore: Float on the sail until help comes.',
          correct: false,
          points: 1.0,
        },
        {
          prompt:
            'When you can’t get back to shore: Abandon the sail rig and the board in the water and swim to shore.',
          correct: false,
          points: 1.0,
        },
      ],
    },
    {
      title: 'Sailboard: Notifying Others (Safety)',
      category: 'Safety & Rescue',
      prompt: 'Notifying someone that you are going out on the water is a good habit to develop.',
      points: 2.0,
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
      title: 'Immersion Self Assistance',
      category: 'Safety & Rescue',
      prompt:
        'About how long would a moderately dressed person immersed in Union Bay in winter be capable of self-assistance?',
      points: 4.0,
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
      title: 'Sailboard: By the Lee',
      category: 'Safety & Rescue',
      prompt: 'Windsurfing near a lee shore can be bad for what two reasons?',
      points: 1.5,
      type: 'multiple',
      options: [
        {
          label: 'The wind is stronger and you may fall.',
          correct: false,
        },
        {
          label: 'Navigational rules require 300 ft. clearance on lee shores.',
          correct: false,
        },
        {
          label: 'Driftwood gets blown onto lee shores and you may bang up or crack your board.',
          correct: true,
        },
        {
          label: 'You may run aground and be unable to sail upwards to get away.',
          correct: true,
        },
      ],
    },
    {
      title: 'Right of Way: Sailing Tack',
      category: 'Safety & Rescue',
      prompt:
        'By International Regulations for Avoiding Collisions at Sea (COLREGS), in general, given two sailboats sailing and all other things equal, which boat has right-of-way?',
      points: 2.0,
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
  ],
} as const satisfies TestDefinition
