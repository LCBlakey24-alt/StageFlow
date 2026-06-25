export const programmeAreas = ['School Swimming', 'Evening Swim Lessons', 'Private Lessons', 'School PE', 'Gymnastics', 'Custom'];

export const nationalCurriculum = [
  '25m front crawl',
  '25m backstroke',
  '10m butterfly or breaststroke',
  'Water Safety Award completed'
];

export const scoringSystems = {
  schoolSwimming: [
    { label: 'Cannot do it', value: 'no', pass: false },
    { label: 'Can do it with float', value: 'float', pass: false },
    { label: 'Passed', value: 'pass', pass: true }
  ],
  privateLessons: [
    { label: 'Needs practice', value: 'practice', pass: false },
    { label: 'Getting there', value: 'getting', pass: false },
    { label: 'Almost there', value: 'almost', pass: false },
    { label: 'Passed', value: 'pass', pass: true }
  ]
};

export const stageCriteria = {
  'Stage 1': [
    'Enter and exit water safely with support if needed',
    'Move forwards, backwards and sideways with support if needed',
    'Scoop water and wash face confidently',
    'Blow bubbles with face in the water',
    'Float on front with support',
    'Float on back with support',
    'Travel 5m on front',
    'Travel 5m on back',
    'Return to standing safely'
  ],
  'Stage 2': [
    'Jump in safely from poolside',
    'Float on front without support',
    'Float on back without support',
    'Push and glide on front',
    'Push and glide on back',
    'Rotate from front to back and recover',
    'Swim 10m on front',
    'Swim 10m on back',
    'Tread water for 15 seconds'
  ],
  'Stage 3': [
    'Submerge fully and regain standing position',
    'Push and glide then swim on front',
    'Push and glide then swim on back',
    'Swim 15m on front',
    'Swim 15m on back',
    'Kick 10m breaststroke legs',
    'Kick 10m butterfly legs',
    'Tread water for 30 seconds',
    'Perform a simple safe self-rescue action'
  ],
  'Stage 4': [
    'Swim 20m on front',
    'Swim 20m on back',
    'Swim 10m breaststroke',
    'Swim 10m butterfly or butterfly kick',
    'Swim 25m front crawl',
    'Swim 25m backstroke',
    'Tread water for 45 seconds',
    'Perform a feet-first surface dive',
    'Perform a safe self-rescue sequence'
  ],
  'Stage 5': [
    'Swim 25m breaststroke',
    'Swim 25m butterfly or butterfly kick',
    'Swim 50m front crawl',
    'Swim 50m backstroke',
    'Show controlled breathing on front crawl',
    'Show good body position on backstroke',
    'Scull head-first for 5m',
    'Tread water for 60 seconds',
    'Demonstrate safe deep-water confidence'
  ],
  'Stage 6': [
    'Swim 100m continuously',
    'Swim 25m front crawl with breathing control',
    'Swim 25m backstroke with good body position',
    'Swim 25m breaststroke with rhythm',
    'Swim 15m butterfly or butterfly kick',
    'Perform a head-first surface dive',
    'Perform a feet-first surface dive',
    'Scull feet-first for 5m',
    'Perform a safe self-rescue sequence'
  ],
  'Stage 7': [
    'Swim 100m using a minimum of three different strokes',
    'Swim 50m front crawl with consistent technique',
    'Swim 50m backstroke with consistent technique',
    'Swim 50m breaststroke with consistent technique',
    'Swim 25m butterfly or butterfly kick with rhythm',
    'Perform a racing start or streamlined push and glide',
    'Perform a legal turn for at least two strokes',
    'Tread water for 90 seconds',
    'Complete a longer safe self-rescue challenge'
  ],
  'Water Safety Award': [
    'Signal for help',
    'Travel to safety',
    'Float or tread water while waiting for help',
    'Exit safely'
  ]
};

export const groupTemplates = [
  { id: 'g1', name: 'Group 1', detail: 'Stages 1-3', stages: ['Stage 1', 'Stage 2', 'Stage 3'], colour: 'blue' },
  { id: 'g2', name: 'Group 2', detail: 'Stages 4-5', stages: ['Stage 4', 'Stage 5'], colour: 'orange' },
  { id: 'g3', name: 'Group 3', detail: 'Stages 6-7 + Water Safety', stages: ['Stage 6', 'Stage 7', 'Water Safety Award'], colour: 'gold' }
];

export const eveningSwimFramework = {
  name: 'Evening Swim Lessons - Swim England Aligned',
  area: 'Evening Swim Lessons',
  mode: 'Stages + National Curriculum',
  scoringSystem: 'privateLessons',
  stages: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6', 'Stage 7'],
  criteria: Object.fromEntries(Object.entries(stageCriteria).filter(([stage]) => stage !== 'Water Safety Award')),
  nationalCurriculum,
  groupTemplates,
  groups: groupTemplates.map(g => `${g.name}: ${g.detail}`)
};

export const demoFramework = {
  name: 'Swim at School',
  area: 'School Swimming',
  mode: 'Stages + National Curriculum',
  scoringSystem: 'schoolSwimming',
  stages: Object.keys(stageCriteria),
  criteria: stageCriteria,
  nationalCurriculum,
  groupTemplates,
  groups: groupTemplates.map(g => `${g.name}: ${g.detail}`)
};

export const demoLessons = [
  { id: 'l1', day: 'Tuesday', time: '09:30', duration: 30, school: 'Greenfield Primary', year: 'Year 5', className: 'Oak', coach: 'Lewis', name: 'Year 5 Group 1', groupTemplateId: 'g1', mode: 'Stages + National Curriculum' },
  { id: 'l2', day: 'Tuesday', time: '10:00', duration: 30, school: 'Greenfield Primary', year: 'Year 5', className: 'Oak', coach: 'Sarah', name: 'Year 5 Group 2', groupTemplateId: 'g2', mode: 'Stages + National Curriculum' },
  { id: 'l3', day: 'Wednesday', time: '17:00', duration: 30, school: 'Evening Swim Lessons', year: 'Junior beginners', className: 'Stage 1-3', coach: 'Lewis', name: 'Evening Swim Group 1', groupTemplateId: 'g1', mode: 'Stages + National Curriculum' }
];

export const demoLearners = [
  { id: 'p1', lesson: 'l1', name: 'Alex Smith', stage: 'Stage 1', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} },
  { id: 'p2', lesson: 'l1', name: 'Mia Jones', stage: 'Stage 2', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} }
];
