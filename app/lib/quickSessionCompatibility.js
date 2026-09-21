const QUICK_SESSION_PRESETS = {
  school: {
    programme: 'School Swimming',
    groupTemplateId: 'g1',
    groupLabel: 'School Group 1 — Stages 1-3',
    name: 'New School Swim Class',
    school: 'New School',
    year: 'Year group',
    className: 'Group 1',
    coach: 'Lewis',
    time: '09:00',
    duration: '30'
  },
  'evening-group': {
    programme: 'Evening Swim Group',
    groupTemplateId: 'eg1',
    groupLabel: 'Evening Swim Group 1 — Stages 1-3',
    name: 'Evening Swim Group',
    school: 'Evening Swim Group',
    year: 'Evening swimmers',
    className: 'Stage 1-3',
    coach: 'Lewis',
    time: '17:00',
    duration: '30'
  },
  'evening-121': {
    programme: 'Evening Swim 1:1',
    groupTemplateId: 'eg121',
    groupLabel: 'Evening Swim 1:1 — All stages visible',
    name: 'Evening Swim 1:1',
    school: 'Evening Swim 1:1',
    year: '1:1 swimmer',
    className: 'All stages',
    coach: 'Lewis',
    time: '17:30',
    duration: '30'
  },
  gymnastics: {
    programme: 'Gymnastics',
    groupTemplateId: 'gym-beg',
    groupLabel: 'Gymnastics Beginners — Foundation shapes, rolls, jumps and safe movement',
    name: 'Gymnastics Beginners',
    school: 'Gymnastics',
    year: 'Class group',
    className: 'Beginners',
    coach: 'Lewis',
    time: '15:30',
    duration: '45'
  }
};

function findField(labels = []) {
  const wanted = new Set(labels);
  return Array.from(document.querySelectorAll('.field')).find((field) => {
    const label = field.querySelector('label')?.textContent?.trim();
    return wanted.has(label);
  });
}

function addOption(select, value, label = value) {
  if (!select || Array.from(select.options).some((option) => option.value === value)) return;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function setSelect(labels, value, label = value) {
  const select = findField(labels)?.querySelector('select');
  if (!select) return false;
  addOption(select, value, label);
  Array.from(select.options).forEach((option) => {
    if (option.value === value) {
      option.hidden = false;
      option.disabled = false;
    }
  });
  if (select.value === value) return false;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setInput(labels, value) {
  const input = findField(labels)?.querySelector('input, textarea');
  if (!input || input.value === value) return false;
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function applyPreset(preset) {
  if (!preset) return;
  setSelect(['Programme', 'Activity / programme'], preset.programme);
  window.setTimeout(() => {
    setSelect(['Assessment group', 'Criteria group'], preset.groupTemplateId, preset.groupLabel || preset.groupTemplateId);
    setInput(['Lesson name'], preset.name);
    setInput(['School / venue'], preset.school);
    setInput(['Year / class'], preset.year);
    setInput(['Coach'], preset.coach);
    setInput(['Start time'], preset.time);
    setSelect(['Duration'], preset.duration, `${preset.duration} minutes`);
  }, 160);
}

function presetFromButton(button) {
  if (!button) return null;
  if (button.dataset.stageflowQuickGymnastics) return QUICK_SESSION_PRESETS.gymnastics;
  const id = button.dataset.stageflowQuickSession;
  return QUICK_SESSION_PRESETS[id] || null;
}

function installQuickSessionGuard() {
  if (window.__stageFlowQuickSessionCompatibility) return;
  window.__stageFlowQuickSessionCompatibility = true;
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-stageflow-quick-session], [data-stageflow-quick-gymnastics]');
    const preset = presetFromButton(button);
    if (!preset) return;
    window.setTimeout(() => applyPreset(preset), 260);
    window.setTimeout(() => applyPreset(preset), 520);
  }, true);
}

installQuickSessionGuard();
