export const programmeAreas = ['School Swimming', 'School PE', 'Private Lessons', 'Gymnastics', 'Custom'];

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
    'Enter water safely',
    'Blow bubbles',
    'Travel 5m on front',
    'Travel 5m on back'
  ],
  'Stage 2': [
    'Float on front',
    'Float on back',
    'Swim 10m on front',
    'Swim 10m on back'
  ],
  'Stage 3': [
    'Swim 15m on front',
    'Swim 15m on back',
    'Tread water for 30 seconds',
    'Rotate from front to back and recover'
  ],
  'Stage 4': [
    'Swim 20m on front',
    'Swim 20m on back',
    'Swim 25m front crawl',
    'Swim 25m backstroke'
  ],
  'Stage 5': [
    'Swim 50m front crawl',
    'Swim 50m backstroke',
    'Swim 25m breaststroke',
    'Demonstrate safe deep-water confidence'
  ],
  'Stage 6': [
    'Swim 100m continuously',
    'Swim 25m front crawl with breathing control',
    'Swim 25m backstroke with good body position',
    'Perform a safe self-rescue sequence'
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
  { id: 'g3', name: 'Group 3', detail: 'Stage 6 + Water Safety', stages: ['Stage 6', 'Water Safety Award'], colour: 'gold' }
];

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
  { id: 'l2', day: 'Tuesday', time: '10:00', duration: 30, school: 'Greenfield Primary', year: 'Year 5', className: 'Oak', coach: 'Sarah', name: 'Year 5 Group 2', groupTemplateId: 'g2', mode: 'Stages + National Curriculum' }
];

export const demoLearners = [
  { id: 'p1', lesson: 'l1', name: 'Alex Smith', stage: 'Stage 1', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} },
  { id: 'p2', lesson: 'l1', name: 'Mia Jones', stage: 'Stage 2', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} }
];
