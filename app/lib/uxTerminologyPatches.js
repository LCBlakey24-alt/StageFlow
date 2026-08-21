const replacements = new Map([
  ['My Groups', 'Group Criteria'],
  ['assessment groups', 'criteria groups'],
  ['Group templates', 'Criteria groups'],
  ['+ Add group', '+ Add criteria group'],
  ['Add group lesson', 'Add class/session'],
  ['+ Add group lesson', '+ Add class/session'],
  ['New Group Lesson', 'New Class / Session'],
  ['Add names to this group', 'Add names to this session'],
  ['These swimmers will all use', 'These swimmers will use'],
  ['Filtered by programme and organised by lesson group.', 'Filtered by programme and organised by class/session.'],
  ['Go to Timetable and create your first group session.', 'Go to Timetable and create your first class/session.'],
  ['Add a group lesson to start building the timetable.', 'Add a class/session to start building the timetable.']
]);

function textOnly(element) {
  return element.childNodes.length === 1 && element.firstChild?.nodeType === Node.TEXT_NODE;
}

function replaceCopy(root = document.body) {
  if (!root) return;
  root.querySelectorAll('button, h1, h2, h3, p, small, span, label, option, b').forEach(element => {
    if (!textOnly(element)) return;
    const current = element.textContent.trim();
    if (replacements.has(current)) {
      element.textContent = replacements.get(current);
    }
    if (current.includes('group lesson')) {
      element.textContent = element.textContent.replace(/group lesson/gi, 'class/session');
    }
  });

  root.querySelectorAll('input').forEach(input => {
    if (replacements.has(input.value)) input.value = replacements.get(input.value);
    if (input.value?.includes('Group Lesson')) input.value = input.value.replace('Group Lesson', 'Class / Session');
  });
}

function findCardByHeading(text) {
  return Array.from(document.querySelectorAll('.card')).find(card => card.querySelector('h2')?.textContent?.trim() === text);
}

function addTimetableGuide() {
  const hero = Array.from(document.querySelectorAll('.hero')).find(section => section.textContent.includes('Choose the group first') || section.textContent.includes('Lesson plan'));
  if (!hero || document.querySelector('[data-stageflow-guide="session-flow"]')) return;
  const guide = document.createElement('section');
  guide.className = 'card';
  guide.dataset.stageflowGuide = 'session-flow';
  guide.innerHTML = `
    <h2>Build a class/session</h2>
    <p class="muted">Use this for the real timetable slot. A session has the activity, day, time, venue, coach, swimmers, and the criteria group it will assess.</p>
    <div class="grid2">
      <div class="folder"><strong>1. Pick activity</strong><p class="muted">School Swimming, Gymnastics, Private Lesson, PE or Custom.</p></div>
      <div class="folder"><strong>2. Set day/time</strong><p class="muted">This is the timetable bit: day, start time and duration.</p></div>
      <div class="folder"><strong>3. Choose criteria group</strong><p class="muted">This decides what the swimmers/children are assessed against.</p></div>
      <div class="folder"><strong>4. Add names</strong><p class="muted">No initial placement step — the session uses the selected criteria group.</p></div>
    </div>`;
  hero.insertAdjacentElement('afterend', guide);
}

function addCriteriaGroupHint() {
  const card = findCardByHeading('Criteria groups');
  if (!card || card.querySelector('[data-stageflow-guide="criteria-groups"]')) return;
  const hint = document.createElement('div');
  hint.className = 'folder';
  hint.dataset.stageflowGuide = 'criteria-groups';
  hint.innerHTML = '<strong>Criteria groups are not timetable sessions.</strong><p class="muted">Use this page to build the assessment levels only. Use Timetable → Add class/session to choose activity, day, time and children.</p>';
  const button = card.querySelector('button');
  if (button) button.insertAdjacentElement('afterend', hint);
  else card.prepend(hint);
}

function runStageFlowUxPatch() {
  replaceCopy();
  addTimetableGuide();
  addCriteriaGroupHint();
}

const observer = new MutationObserver(() => runStageFlowUxPatch());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('load', runStageFlowUxPatch);
setTimeout(runStageFlowUxPatch, 250);
