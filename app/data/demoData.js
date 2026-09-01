export const programmeAreas = ['School Swimming', 'Evening Swim 1:1', 'Evening Swim Group', 'Private Lessons', 'School PE', 'Gymnastics', 'Custom'];

export const nationalCurriculum = [
  '25m front crawl',
  '25m backstroke',
  '10m butterfly or breaststroke',
  'Water Safety Award completed'
];

export const assessmentLevels = [
  { label: 'Not assessed', value: 'no', pass: false },
  { label: 'Almost there', value: 'float', pass: false },
  { label: 'Passed', value: 'pass', pass: true }
];

export const scoringSystems = {
  schoolSwimming: assessmentLevels,
  privateLessons: assessmentLevels,
  jbSwimming: assessmentLevels
};

export const jbSwimmingCriteria = {
  'Stage 1': [
    'Enter the water safely from poolside',
    'Exit the water safely without using the steps if able',
    'Move forwards, backwards and sideways with confidence',
    'Scoop water and wash face confidently',
    'Blow bubbles with mouth and nose in the water',
    'Float on front with support and return to standing',
    'Float on back with support and return to standing',
    'Travel 5m on front with support if needed',
    'Travel 5m on back with support if needed',
    'Show safe pool rules and listening skills'
  ],
  'Stage 2': [
    'Jump in safely from poolside and return to the wall',
    'Float on front without support and return to standing',
    'Float on back without support and return to standing',
    'Push and glide on front with face in the water',
    'Push and glide on back with arms extended',
    'Travel 5m front crawl action',
    'Travel 5m backstroke action',
    'Rotate from front to back and recover',
    'Rotate from back to front and recover',
    'Tread water or vertical scull for 10 seconds'
  ],
  'Stage 3': [
    'Submerge fully and regain standing position',
    'Pick up an object from shallow water',
    'Perform and hold a mushroom float for 5 seconds',
    'Push and glide then swim 10m on front',
    'Push and glide then swim 10m on back',
    'Swim 10m front crawl with face in and breathing attempt',
    'Swim 10m backstroke with relaxed body position',
    'Kick 10m breaststroke legs with float if needed',
    'Kick 10m butterfly legs with float if needed',
    'Tread water for 20 seconds',
    'Explain how to get help if in difficulty'
  ],
  'Stage 4': [
    'Jump in, submerge, surface and swim back to the side',
    'Push and glide towards the pool floor with control',
    'Perform a floating sequence of at least 3 shapes',
    'Swim 15m front crawl with recognisable technique',
    'Swim 15m backstroke with recognisable technique',
    'Swim 10m breaststroke with recognisable leg action',
    'Swim 10m butterfly or butterfly kick with rhythm',
    'Swim 5m on front, tuck, rotate onto back and return to the side',
    'Perform a shout and signal rescue',
    'Climb out safely without using steps'
  ],
  'Stage 5': [
    'Jump into full reach depth, surface and return to point of entry',
    'Perform a stationary scull on the back',
    'Swim 25m front crawl with consistent breathing attempt',
    'Swim 25m backstroke with consistent body position',
    'Swim 15m breaststroke with timing attempt',
    'Swim 15m butterfly or butterfly kick with rhythm',
    'Kick 10m front crawl with good body position',
    'Kick 10m backstroke with good body position',
    'Travel on front and log roll onto back in one continuous movement',
    'Travel on back and log roll onto front in one continuous movement',
    'Tread water for 30 seconds',
    'Explain where it is safe to swim and why'
  ],
  'Stage 6': [
    'Perform three different shaped jumps into deep water',
    'Perform a head-first scull for 5m',
    'Swim 50m front crawl with controlled breathing',
    'Swim 50m backstroke with good body position',
    'Swim 25m breaststroke with rhythm and timing',
    'Swim 15m butterfly with rhythm or strong butterfly kick',
    'Swim 100m continuously using at least two strokes',
    'Tread water for 60 seconds',
    'Swim 10m wearing shorts and t-shirt',
    'Exit deep water without using steps',
    'Complete all National Curriculum swimming requirements'
  ],
  'Stage 7': [
    'Swim 100m continuously using a minimum of three strokes',
    'Swim 50m front crawl with consistent technique',
    'Swim 50m backstroke with consistent technique',
    'Swim 50m breaststroke with consistent technique',
    'Swim 25m butterfly or butterfly kick with rhythm',
    'Perform a streamlined push and glide into stroke',
    'Perform a legal turn for at least two strokes',
    'Tread water for 90 seconds',
    'Perform a racing start or controlled deep-water entry where appropriate',
    'Complete a longer water safety and self-rescue challenge'
  ],
  'Self Rescue Award': [
    'Enter the water using a safe fall-in entry',
    'Float on back or scull calmly to control breathing',
    'Tread water for 20 seconds with one arm raised and shout for help',
    'Swim 15m on front, rotate, then swim 15m on back to a floating object',
    'Demonstrate the Heat Escape Lessening Position - HELP',
    'Swim 10m while retaining a floating object',
    'Demonstrate the Huddle position with a group',
    'Swim using a long-arm front paddle survival stroke to the side',
    'Climb out of the water without using steps',
    'Explain when these self-rescue skills could be used in real situations'
  ]
};

export const schoolSwimmingCriteria = jbSwimmingCriteria;
export const eveningSwimCriteria = jbSwimmingCriteria;
export const stageCriteria = jbSwimmingCriteria;

const combinedSwimCriteria = jbSwimmingCriteria;

export const allSwimStageNames = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6', 'Stage 7', 'Self Rescue Award'];

export const schoolGroupTemplates = [
  { id: 'g1', name: 'School Group 1', detail: 'Stages 1-3', stages: ['Stage 1', 'Stage 2', 'Stage 3'], colour: 'blue', programme: 'School Swimming' },
  { id: 'g2', name: 'School Group 2', detail: 'Stages 4-5', stages: ['Stage 4', 'Stage 5'], colour: 'orange', programme: 'School Swimming' },
  { id: 'g3', name: 'School Group 3', detail: 'Stage 6 + Self Rescue', stages: ['Stage 6', 'Self Rescue Award'], colour: 'gold', programme: 'School Swimming' }
];

export const eveningGroupTemplates = [
  { id: 'eg1', name: 'Evening Swim Group 1', detail: 'Stages 1-3', stages: ['Stage 1', 'Stage 2', 'Stage 3'], colour: 'blue', programme: 'Evening Swim Group' },
  { id: 'eg2', name: 'Evening Swim Group 2', detail: 'Stages 4-5', stages: ['Stage 4', 'Stage 5'], colour: 'orange', programme: 'Evening Swim Group' },
  { id: 'eg3', name: 'Evening Swim Group 3', detail: 'Stages 6-7', stages: ['Stage 6', 'Stage 7'], colour: 'gold', programme: 'Evening Swim Group' }
];

export const eveningOneToOneTemplate = {
  id: 'eg121',
  name: 'Evening Swim 1:1',
  detail: 'All stages visible',
  stages: allSwimStageNames,
  colour: 'gold',
  programme: 'Evening Swim 1:1',
  allStages: true
};

export const groupTemplates = [...schoolGroupTemplates, ...eveningGroupTemplates, eveningOneToOneTemplate];

export const eveningSwimFramework = {
  name: 'JB Swimming Assessment Framework',
  area: 'Evening Swim Group',
  mode: 'Stages + National Curriculum',
  scoringSystem: 'jbSwimming',
  stages: allSwimStageNames,
  criteria: combinedSwimCriteria,
  nationalCurriculum,
  groupTemplates: [...eveningGroupTemplates, eveningOneToOneTemplate],
  groups: [...eveningGroupTemplates, eveningOneToOneTemplate].map(g => `${g.name}: ${g.detail}`)
};

export const demoFramework = {
  name: 'JB Swimming Assessment Framework',
  area: 'School Swimming',
  mode: 'Stages + National Curriculum',
  scoringSystem: 'jbSwimming',
  stages: allSwimStageNames,
  criteria: combinedSwimCriteria,
  nationalCurriculum,
  groupTemplates,
  groups: groupTemplates.map(g => `${g.name}: ${g.detail}`)
};

export const demoLessons = [
  { id: 'l1', day: 'Tuesday', time: '09:30', duration: 30, school: 'Greenfield Primary', year: 'Year 5', className: 'Oak', coach: 'Lewis', name: 'Year 5 School Group 1', programme: 'School Swimming', groupTemplateId: 'g1', mode: 'Stages + National Curriculum' },
  { id: 'l2', day: 'Tuesday', time: '10:00', duration: 30, school: 'Greenfield Primary', year: 'Year 5', className: 'Oak', coach: 'Sarah', name: 'Year 5 School Group 2', programme: 'School Swimming', groupTemplateId: 'g2', mode: 'Stages + National Curriculum' },
  { id: 'l3', day: 'Wednesday', time: '17:00', duration: 30, school: 'Evening Swim Group', year: 'Junior beginners', className: 'Stage 1-3', coach: 'Lewis', name: 'Evening Swim Group 1', programme: 'Evening Swim Group', groupTemplateId: 'eg1', mode: 'Stages + National Curriculum' },
  { id: 'l4', day: 'Wednesday', time: '17:30', duration: 30, school: 'Evening Swim 1:1', year: '1:1 swimmer', className: 'All stages', coach: 'Lewis', name: 'Evening Swim 1:1', programme: 'Evening Swim 1:1', groupTemplateId: 'eg121', mode: 'Stages + National Curriculum' }
];

export const demoLearners = [
  { id: 'p1', lesson: 'l1', name: 'Alex Smith', stage: 'Stage 1', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} },
  { id: 'p2', lesson: 'l1', name: 'Mia Jones', stage: 'Stage 2', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} },
  { id: 'p3', lesson: 'l4', name: '1:1 Example Swimmer', stage: 'Stage 3', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} }
];