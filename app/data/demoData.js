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

export const schoolSwimmingCriteria = {
  'Stage 1': [
    'Enter the water safely',
    'Move forwards, backwards and sideways - feet may be on the floor',
    'Scoop the water and wash face and be comfortable with water showered overhead',
    'Blow bubbles 3 times with mouth and nose submerged',
    'Take part in a movement game',
    'Exit the water safely'
  ],
  'Stage 2': [
    'Float on the back and return to standing',
    'Float on the front and return to standing',
    'Push and glide on front and remain in horizontal position',
    'Push and glide on back and remain in horizontal position',
    'Travel 5m on the back',
    'Travel 5m on the front',
    'Perform a relaxed float on the back'
  ],
  'Stage 3': [
    'Jump in from poolside and fully submerge',
    'Fully submerge to pick up an object',
    'Perform and hold a mushroom float for 5 seconds',
    'Push and glide on front with face in, arms extended',
    'Push and glide on the back with arms extended',
    'Whilst floating, perform a rotation from front to back before returning to standing',
    'Whilst floating, perform a rotation from back to front before returning to standing',
    'Water safety - provide pool rules, describe water hazards and identify beach flags',
    'Progression outcome - completed all criteria from Stage 1-3',
    'Progression outcome - swim one width on front using arms and legs without putting feet down',
    'Progression outcome - swim one width on back using arms and legs without putting feet down',
    'Progression outcome - shown understanding and awareness of water safety'
  ],
  'Stage 4': [
    'Jump in, submerge, surface and swim back to point of entry',
    'Push and glide towards pool floor with arms extended',
    'Perform a floating sequence - minimum of 3',
    'Push and glide on front with arms extended, then log roll on to back',
    'Push and glide on back with arms extended, then log roll on to front',
    'Swim 5m on front, perform a tuck, rotate on to back and swim back to the side',
    'Swim 10m on front',
    'Swim 10m on back',
    'Perform a shout and signal rescue',
    'Safely climb out of the water without using the steps'
  ],
  'Stage 5': [
    'Jump in, submerge, surface and swim back to point of entry - full reach depth',
    'Perform a stationary scull on the back',
    'Kick 10m backstroke',
    'Kick 10m front crawl',
    'Kick 10m butterfly or breaststroke - floats may only be used for breaststroke',
    'Travel on back and log roll in one continuous movement on to front',
    'Travel on front and log roll in one continuous movement on to back',
    'Swim 10m with sound technique - choice of stroke is optional',
    'Exit the water safely',
    'Water safety - explain how you would get help in the water',
    'Water safety - give an example of where it is safe to swim and why',
    'Progression outcome - 15m distance achieved on front with recognised stroke technique',
    'Progression outcome - 15m distance achieved on back with recognised stroke technique',
    'Progression outcome - treading water for 30 seconds'
  ],
  'Stage 6': [
    'Include three different shaped jumps into deep water including straddle entry',
    'Perform a head-first scull for 5m',
    'Complete 10m front crawl using sound technique',
    'Complete 10m backstroke using sound technique',
    'Complete 10m breaststroke using sound technique',
    'Tread water for 30 seconds',
    'Perform a handstand or tucked forward somersault in the water',
    'Swim 25m - choice of stroke optional',
    'Swim 10m wearing clothes - shorts and t-shirt minimum',
    'Exit deep water without using steps',
    'Progression outcome - 25m distance achieved on front with recognised stroke technique',
    'Progression outcome - 25m distance achieved on back with recognised stroke technique',
    'Progression outcome - 10m breaststroke',
    'Progression outcome - 10m butterfly',
    'Progression outcome - National Curriculum requirements achieved'
  ],
  'Self Rescue Award': [
    'Enter the water using a fall-in entry',
    'Float on the back or scull',
    'Tread water for 20 seconds with one arm in the air and shout for help',
    'Swim 15m on front, rotate, swim 15m on back to a floating object',
    'Demonstrate the Heat Escape Lessening Position - HELP',
    'Swim 10m retaining a floating object',
    'Demonstrate the Huddle position',
    'Swim using a long-arm front paddle survival stroke to the side',
    'Climb out of the water without using the steps',
    'Discuss when these skills might be used to self rescue in different water-based situations'
  ]
};

export const eveningSwimCriteria = {
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
  ]
};

export const stageCriteria = schoolSwimmingCriteria;

export const schoolGroupTemplates = [
  { id: 'g1', name: 'Group 1', detail: 'Stages 1-3', stages: ['Stage 1', 'Stage 2', 'Stage 3'], colour: 'blue' },
  { id: 'g2', name: 'Group 2', detail: 'Stages 4-5', stages: ['Stage 4', 'Stage 5'], colour: 'orange' },
  { id: 'g3', name: 'Group 3', detail: 'Stage 6 + Self Rescue', stages: ['Stage 6', 'Self Rescue Award'], colour: 'gold' }
];

export const eveningGroupTemplates = [
  { id: 'eg1', name: 'Evening Group 1', detail: 'Stages 1-3', stages: ['Stage 1', 'Stage 2', 'Stage 3'], colour: 'blue' },
  { id: 'eg2', name: 'Evening Group 2', detail: 'Stages 4-5', stages: ['Stage 4', 'Stage 5'], colour: 'orange' },
  { id: 'eg3', name: 'Evening Group 3', detail: 'Stages 6-7', stages: ['Stage 6', 'Stage 7'], colour: 'gold' }
];

export const groupTemplates = schoolGroupTemplates;

export const eveningSwimFramework = {
  name: 'Evening Swim Lessons - Swim England Aligned',
  area: 'Evening Swim Lessons',
  mode: 'Stages + National Curriculum',
  scoringSystem: 'privateLessons',
  stages: Object.keys(eveningSwimCriteria),
  criteria: eveningSwimCriteria,
  nationalCurriculum,
  groupTemplates: eveningGroupTemplates,
  groups: eveningGroupTemplates.map(g => `${g.name}: ${g.detail}`)
};

export const demoFramework = {
  name: 'Swim at School',
  area: 'School Swimming',
  mode: 'Stages + National Curriculum',
  scoringSystem: 'schoolSwimming',
  stages: Object.keys(schoolSwimmingCriteria),
  criteria: schoolSwimmingCriteria,
  nationalCurriculum,
  groupTemplates: schoolGroupTemplates,
  groups: schoolGroupTemplates.map(g => `${g.name}: ${g.detail}`)
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
