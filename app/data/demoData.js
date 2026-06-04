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
  'Stage 1': ['Enter water safely', 'Blow bubbles', 'Travel 5m on front', 'Travel 5m on back'],
  'Stage 2': ['Float on front', 'Float on back', 'Swim 10m on front', 'Swim 10m on back'],
  'Stage 3': ['Swim 15m on front', 'Swim 15m on back', 'Tread water'],
  'Stage 4': ['Swim 25m front crawl', 'Swim 25m backstroke'],
  'Water Safety Award': ['Signal for help', 'Travel to safety', 'Exit safely']
};

export const demoFramework = {
  name: 'Swim at School',
  area: 'School Swimming',
  mode: 'Stages + National Curriculum',
  scoringSystem: 'schoolSwimming',
  stages: Object.keys(stageCriteria),
  criteria: stageCriteria,
  nationalCurriculum,
  groups: ['Group 1: Stages 1-3', 'Group 2: Stages 4-5', 'Group 3: Stage 6 + Water Safety']
};

export const demoLessons = [
  { id: 'l1', time: '09:30', school: 'Greenfield Primary', year: 'Year 5', name: 'Year 5 Group 1', mode: 'Stages + National Curriculum' },
  { id: 'l2', time: '10:00', school: 'Greenfield Primary', year: 'Year 5', name: 'Year 5 Group 2', mode: 'Stages + National Curriculum' }
];

export const demoLearners = [
  { id: 'p1', lesson: 'l1', name: 'Alex Smith', stage: 'Stage 1', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} },
  { id: 'p2', lesson: 'l1', name: 'Mia Jones', stage: 'Stage 2', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} }
];
