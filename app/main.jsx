import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { demoFramework, demoLearners, demoLessons, nationalCurriculum, stageCriteria } from './data/demoData.js';
import { loadAppState, saveAppState, clearAppState } from './lib/localStore.js';

const starter = {
  screen: 'home', step: 'list', tab: 'framework', selected: '', active: 'l1',
  lessons: demoLessons, learners: demoLearners, framework: demoFramework,
  certificates: [
    { id: 'cert1', name: 'Highest Stage Certificate', rule: 'Highest achieved stage', font: 'Serif', size: 34, groupBy: 'Year group' },
    { id: 'cert2', name: 'National Curriculum Certificate', rule: 'National Curriculum achieved', font: 'Sans Serif', size: 28, groupBy: 'Award' }
  ],
  staff: [
    { id: 's1', name: 'Lewis', role: 'Lead Coach', sessions: true, groups: true, learners: true, assess: true, export: false, framework: false, certificates: false },
    { id: 's2', name: 'Sarah', role: 'Coach', sessions: true, groups: false, learners: true, assess: true, export: false, framework: false, certificates: false },
    { id: 's3', name: 'Admin User', role: 'Admin', sessions: true, groups: true, learners: true, assess: true, export: true, framework: true, certificates: true }
  ],
  pack: { reports: true, certificates: true, registers: true, nc: true, support: true, raw: false, email: 'office@greenfieldprimary.co.uk', cc: 'manager@example.com', method: 'Secure download link' },
  audit: ['MVP v2 structure restored']
};

function App() {
  const [s, setS] = useState(() => loadAppState(starter));
  function up(x) { const n = typeof x === 'function' ? x(s) : { ...s, ...x }; setS(n); saveAppState(n); }
  const lesson = s.lessons.find(l => l.id === s.active);
  const screens = ['home', 'timetable', 'reports', 'settings'];
  return <><div className='top'><div className='brand'>StageFlow</div><button className='btn' onClick={() => { clearAppState(); location.reload(); }}>Reset</button></div><div className='wrap'><nav className='rail'>{screens.map(x => <button key={x} className={s.screen === x ? 'on' : ''} onClick={() => up({ screen: x, step: 'list' })}>{x[0].toUpperCase()}</button>)}</nav><main>{s.screen === 'home' && <Home s={s} up={up} />}{s.screen === 'timetable' && s.step === 'list' && <Timetable s={s} up={up} />}{s.screen === 'timetable' && s.step !== 'list' && lesson && <Lesson s={s} up={up} lesson={lesson} />}{s.screen === 'reports' && <Reports s={s} up={up} />}{s.screen === 'settings' && <Settings s={s} up={up} />}</main></div></>;
}

function Home({ s, up }) {
  const next = s.lessons[0];
  const ncDone = s.learners.filter(p => nationalCurriculum.every(item => p.nc?.[item])).length;
  const needs = s.learners.filter(p => p.att !== 'Absent' && !p.stage).length;
  return <><section className='hero'><p>StageFlow MVP</p><h1>Today starts from the timetable.</h1><p>Open the lesson, register, assess, save, export.</p></section><section className='card lesson'><div className='time'>{next.time}</div><div><h2>{next.name}</h2><p className='muted'>{next.school} · {next.year} · {next.mode}</p><span className='pill'>Next action</span><span className='pill'>Register → Assess → Save</span></div><button className='btn org' onClick={() => up({ screen: 'timetable', active: next.id, step: 'register' })}>Open lesson</button></section><div className='grid'><div className='card'><h2>{s.lessons.length}</h2><p className='muted'>Lessons</p></div><div className='card'><h2>{s.learners.length}</h2><p className='muted'>Learners</p></div><div className='card'><h2>{ncDone}</h2><p className='muted'>NC achieved</p></div></div><section className='card'><h2>Admin watchlist</h2><p className='muted'>{needs ? `${needs} learner(s) need allocating` : 'No unallocated learners in this demo state.'}</p></section></>;
}

function Timetable({ s, up }) {
  function add() { const id = 'l' + Date.now(); up({ lessons: [...s.lessons, { id, time: '09:30', school: 'New School', year: 'Year 5', name: 'New Lesson', mode: s.framework.mode }], audit: ['Created lesson', ...s.audit] }); }
  function edit(id, k, v) { up({ lessons: s.lessons.map(l => l.id === id ? { ...l, [k]: v } : l) }); }
  return <><section className='hero'><h1>Timetable</h1><p>Build the day first, then teach from each lesson.</p></section><button className='btn org' onClick={add}>+ Add timetable session</button>{s.lessons.map(l => <section className='card' key={l.id}><div className='lesson'><div className='time'>{l.time}</div><div><h2>{l.name}</h2><p className='muted'>{l.school} · {l.year} · {l.mode}</p></div><button className='btn org' onClick={() => up({ active: l.id, step: 'register' })}>Open</button></div><div className='grid'><Field label='Time' value={l.time} onChange={v => edit(l.id, 'time', v)} /><Field label='School / Venue' value={l.school} onChange={v => edit(l.id, 'school', v)} /><Field label='Year / Class' value={l.year} onChange={v => edit(l.id, 'year', v)} /><Field label='Lesson name' value={l.name} onChange={v => edit(l.id, 'name', v)} /><div className='field'><label>Mode</label><select value={l.mode} onChange={e => edit(l.id, 'mode', e.target.value)}>{['Stages + National Curriculum', 'National Curriculum only'].map(x => <option key={x}>{x}</option>)}</select></div></div></section>)}</>;
}

function Lesson({ s, up, lesson }) {
  const kids = s.learners.filter(p => p.lesson === lesson.id);
  const present = kids.filter(p => p.att !== 'Absent');
  const sel = s.learners.find(p => p.id === s.selected) || present[0];
  return <><section className='hero'><p>{lesson.time} · {lesson.school}</p><h1>{lesson.name}</h1><div className='steps'><span className={s.step === 'register' ? 'on' : ''}>1 Register</span><span className={s.step === 'assess' ? 'on' : ''}>2 Assess</span><span className={s.step === 'save' ? 'on' : ''}>3 Save</span></div></section>{s.step === 'register' && <Register s={s} up={up} lesson={lesson} kids={kids} />}{s.step === 'assess' && sel && <Assess s={s} up={up} lesson={lesson} kids={present} sel={sel} />}{s.step === 'save' && <><section className='card'><h2>Lesson saved</h2><p>{present.length} present / late</p></section><div className='footer'><button className='btn' onClick={() => up({ step: 'assess' })}>Make changes</button><button className='btn org' onClick={() => up({ step: 'list', screen: 'timetable', audit: ['Saved lesson', ...s.audit] })}>Finish</button></div></>}</>;
}

function Register({ s, up, lesson, kids }) {
  function add() { const names = (document.getElementById('names').value || '').split('\n').map(x => x.trim()).filter(Boolean); up({ learners: [...s.learners, ...names.map((name, i) => ({ id: 'p' + Date.now() + i, lesson: lesson.id, name, stage: 'Stage 1', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {} }))], audit: [`Added ${names.length} learner(s)`, ...s.audit] }); }
  function att(id, v) { up({ learners: s.learners.map(p => p.id === id ? { ...p, att: v } : p) }); }
  return <><section className='card'><h2>Register</h2><p className='muted'>Paste names one per line for any children missing from this lesson.</p><textarea id='names' placeholder={'Derek Jones\nMia Smith'} /><button className='btn' onClick={add}>Add names</button></section>{kids.map(p => <section className='card' key={p.id}><h3>{p.name}</h3>{['Present', 'Absent', 'Late', 'Not Taking Part'].map(v => <button className={'btn ' + (p.att === v ? 'org' : '')} key={v} onClick={() => att(p.id, v)}>{v}</button>)}</section>)}<div className='footer'><button className='btn org' onClick={() => up({ step: 'assess' })}>Confirm register & assess</button></div></>;
}

function Assess({ s, up, lesson, kids, sel }) {
  function change(patch) { up({ learners: s.learners.map(p => p.id === sel.id ? { ...p, ...patch } : p) }); }
  function score(c, v) { change({ res: { ...sel.res, [c]: v } }); }
  const crit = lesson.mode === 'National Curriculum only' ? [] : (s.framework.criteria?.[sel.stage] || stageCriteria[sel.stage] || []);
  return <><div className='grid2'><section className='card'>{kids.map(p => <button className={'btn ' + (p.id === sel.id ? 'org' : '')} key={p.id} onClick={() => up({ selected: p.id })}>{p.name}</button>)}</section><section className='card'><h2>{sel.name}</h2>{lesson.mode !== 'National Curriculum only' && <div className='field'><label>Stage</label><select value={sel.stage} onChange={e => change({ stage: e.target.value })}>{s.framework.stages.map(x => <option key={x}>{x}</option>)}</select></div>}<div className='grid2'><Distance label='Distance front' value={sel.dist.front} onChange={v => change({ dist: { ...sel.dist, front: v }, nc: { ...sel.nc, '25m front crawl': parseInt(v) >= 25 } })} /><Distance label='Distance back' value={sel.dist.back} onChange={v => change({ dist: { ...sel.dist, back: v }, nc: { ...sel.nc, '25m backstroke': parseInt(v) >= 25 } })} /></div>{crit.map(c => <div className='criteria' key={c}><b>{c}</b><div>{['no', 'float', 'pass'].map(v => <button className={'btn ' + (sel.res[c] === v ? 'org' : '')} key={v} onClick={() => score(c, v)}>{v}</button>)}</div></div>)}<h3>National Curriculum</h3>{nationalCurriculum.map(item => <label className='pill' key={item}><input type='checkbox' checked={!!sel.nc[item]} onChange={e => change({ nc: { ...sel.nc, [item]: e.target.checked } })} /> {item}</label>)}</section></div><div className='footer'><button className='btn' onClick={() => up({ step: 'register' })}>Back</button><button className='btn org' onClick={() => up({ step: 'save' })}>Save lesson</button></div></>;
}
function Distance({ label, value, onChange }) { return <div className='field'><label>{label}</label><select value={value} onChange={e => onChange(e.target.value)}>{['0m', '5m', '10m', '15m', '20m', '25m', '50m', '100m'].map(x => <option key={x}>{x}</option>)}</select></div>; }
function Field({ label, value, onChange }) { return <div className='field'><label>{label}</label><input value={value} onChange={e => onChange(e.target.value)} /></div>; }

function Reports({ s, up }) {
  return <><section className='hero'><h1>End-of-Term Pack</h1><p>One downloadable pack with reports, certificates, registers and summaries.</p></section><div className='grid2'><section className='card'><h2>Pack options</h2>{Object.keys(s.pack).filter(k => typeof s.pack[k] === 'boolean').map(k => <label className='pill' key={k}><input type='checkbox' checked={s.pack[k]} onChange={e => up({ pack: { ...s.pack, [k]: e.target.checked } })} /> {k}</label>)}<Field label='Send to' value={s.pack.email} onChange={v => up({ pack: { ...s.pack, email: v } })} /><Field label='CC' value={s.pack.cc} onChange={v => up({ pack: { ...s.pack, cc: v } })} /><div className='field'><label>Delivery method</label><select value={s.pack.method} onChange={e => up({ pack: { ...s.pack, method: e.target.value } })}>{['Secure download link', 'Email attachment', 'Download only'].map(x => <option key={x}>{x}</option>)}</select></div><button className='btn org' onClick={() => up({ audit: [`Pack queued for ${s.pack.email}`, ...s.audit] })}>Queue send demo</button></section><section className='card'><h2>School Handover Pack.zip</h2>{Object.keys(s.pack).filter(k => s.pack[k] === true).map(k => <div className='folder' key={k}>📁 {k}</div>)}</section></div></>;
}

function Settings({ s, up }) {
  return <><section className='hero'><h1>Settings</h1><p>Frameworks, group templates, certificates, permissions and audit log.</p></section><div className='tabs'>{['framework', 'groups', 'certificates', 'permissions', 'audit'].map(t => <button key={t} className={s.tab === t ? 'on' : ''} onClick={() => up({ tab: t })}>{t}</button>)}</div>{(s.tab || 'framework') === 'framework' && <Framework s={s} up={up} />}{s.tab === 'groups' && <Groups s={s} up={up} />}{s.tab === 'certificates' && <Certificates s={s} up={up} />}{s.tab === 'permissions' && <Permissions s={s} up={up} />}{s.tab === 'audit' && <section className='card'><h2>Audit log</h2>{s.audit.map((a, i) => <p key={i}>• {a}</p>)}</section>}</>;
}
function Framework({ s, up }) {
  function setCriteria(stage, text) { up({ framework: { ...s.framework, criteria: { ...s.framework.criteria, [stage]: text.split('\n').map(x => x.trim()).filter(Boolean) } } }); }
  function addStage() { const name = 'New Stage ' + (s.framework.stages.length + 1); up({ framework: { ...s.framework, stages: [...s.framework.stages, name], criteria: { ...s.framework.criteria, [name]: [] } } }); }
  return <section className='card'><h2>Assessment Framework</h2><Field label='Name' value={s.framework.name} onChange={v => up({ framework: { ...s.framework, name: v } })} /><button className='btn org' onClick={addStage}>+ Add stage/section</button><h3>Stages and criteria</h3>{s.framework.stages.map(st => <div className='card' key={st}><h3>{st}</h3><textarea value={(s.framework.criteria?.[st] || []).join('\n')} onChange={e => setCriteria(st, e.target.value)} /></div>)}</section>;
}
function Groups({ s, up }) { function edit(i, v) { const groups = [...s.framework.groups]; groups[i] = v; up({ framework: { ...s.framework, groups } }); } return <section className='card'><h2>Group templates</h2><button className='btn org' onClick={() => up({ framework: { ...s.framework, groups: [...s.framework.groups, 'New Group: choose stages'] } })}>+ Add group</button>{s.framework.groups.map((g, i) => <div className='card' key={i}><Field label={'Group ' + (i + 1)} value={g} onChange={v => edit(i, v)} /></div>)}</section>; }
function Certificates({ s, up }) { function addCert() { up({ certificates: [...s.certificates, { id: 'cert' + Date.now(), name: 'New Certificate Template', rule: 'Highest achieved stage', font: 'Serif', size: 32, groupBy: 'Year group' }] }); } return <section className='card'><h2>Certificate templates</h2><button className='btn org' onClick={addCert}>+ Add certificate template</button>{s.certificates.map(c => <div className='card' key={c.id}><div className='grid'><Field label='Name' value={c.name} onChange={v => up({ certificates: s.certificates.map(x => x.id === c.id ? { ...x, name: v } : x) })} /><div className='field'><label>Rule</label><select value={c.rule} onChange={e => up({ certificates: s.certificates.map(x => x.id === c.id ? { ...x, rule: e.target.value } : x) })}>{['Highest achieved stage', 'National Curriculum achieved', 'Selected award only'].map(x => <option key={x}>{x}</option>)}</select></div><div className='field'><label>Group by</label><select value={c.groupBy} onChange={e => up({ certificates: s.certificates.map(x => x.id === c.id ? { ...x, groupBy: e.target.value } : x) })}>{['Year group', 'Class/group', 'Award', 'All in one PDF'].map(x => <option key={x}>{x}</option>)}</select></div><Field label='Font' value={c.font} onChange={v => up({ certificates: s.certificates.map(x => x.id === c.id ? { ...x, font: v } : x) })} /><Field label='Font size' value={String(c.size)} onChange={v => up({ certificates: s.certificates.map(x => x.id === c.id ? { ...x, size: Number(v) || 32 } : x) })} /></div></div>)}</section>; }
function Permissions({ s, up }) { const keys = ['sessions', 'groups', 'learners', 'assess', 'export', 'framework', 'certificates']; return <section className='card'><h2>Staff permissions</h2>{s.staff.map((p, i) => <div className='card' key={p.id}><h3>{p.name}</h3><p className='muted'>{p.role}</p>{keys.map(k => <label className='pill' key={k}><input type='checkbox' checked={!!p[k]} onChange={e => { const staff = [...s.staff]; staff[i] = { ...staff[i], [k]: e.target.checked }; up({ staff, audit: [`Updated ${p.name} permission: ${k}`, ...s.audit] }); }} /> {k}</label>)}</div>)}</section>; }

createRoot(document.getElementById('root')).render(<App />);
