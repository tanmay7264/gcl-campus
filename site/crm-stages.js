// Challenge pipeline stages, shared by the Command Centre (admin/) and the company tracker (track/).
// Keep keys in sync with STAGES in apps-script/Crm.gs (dev/test.js checks this).
export const STAGES = [
  { key: 'new', label: 'New', group: 'intake', color: '#E8892B', next: 'Our team reviews your challenge for fit and scope.', you: 'Nothing yet. We will be in touch.' },
  { key: 'review', label: 'Under review', group: 'intake', color: '#E8892B', next: 'We may call you to fine-tune the problem statement.', you: 'Be available for a short scoping call.' },
  { key: 'accepted', label: 'Accepted', group: 'intake', color: '#7AA342', next: 'A diverse student team is formed and a faculty mentor assigned.', you: 'Share any data or context you are happy to share.' },
  { key: 'team', label: 'Team formed', group: 'live', color: '#3FA796', next: 'Kick-off with the team to fine-tune the challenge.', you: 'Touchpoint: a kick-off session with the team.' },
  { key: 'stakeholders', label: 'Stakeholder mapping', group: 'live', color: '#3FA796', next: 'The team maps everyone your challenge touches.', you: 'Suggest people we could speak to.' },
  { key: 'journey', label: 'Customer journey', group: 'live', color: '#3FA796', next: 'The team maps the journey step by step to find pain points.', you: 'Nothing needed, unless we reach out.' },
  { key: 'insights', label: 'Insights', group: 'live', color: '#66518A', next: 'Three opportunity spaces are presented to you (Phase I).', you: 'Touchpoint: give feedback on the opportunity spaces.' },
  { key: 'prototype', label: 'Prototype', group: 'live', color: '#66518A', next: 'The team builds a prototype with new-age tech.', you: 'Touchpoint: review the prototype and share feedback.' },
  { key: 'final', label: 'Final presentation', group: 'live', color: '#66518A', next: 'The team presents a commercially feasible solution.', you: 'Touchpoint: attend the final presentation.' },
  { key: 'completed', label: 'Completed', group: 'closed', color: '#5E8430', next: 'Done. The deck and prototype are yours.', you: 'Tell us how it went, and bring a new challenge next cycle.' },
  { key: 'hold', label: 'On hold', group: 'closed', color: '#9A95AD', next: 'Paused for now. We will be in touch before the next cycle.', you: 'Nothing needed.' },
  { key: 'declined', label: 'Declined', group: 'closed', color: '#C0504D', next: 'Not taken up this cycle.', you: 'You are welcome to share a new challenge.' },
];
export const ST = Object.fromEntries(STAGES.map((s, i) => [s.key, { ...s, i }]));
export const PATH = STAGES.filter(s => !['hold', 'declined'].includes(s.key)); // the happy path, for steppers
export const TYPES = ['Industry challenge', 'Social challenge', 'Sustainability / SDG', 'Specific business issue', 'Survey / research work', 'Process needing innovative intervention'];
