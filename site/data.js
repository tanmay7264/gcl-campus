// GCL journey stages. Each stage is a building on the campus road loop.
// `eg` points at a past project (projects.js) that shows the stage in practice.
export const STAGES = [
  {
    id: 'challenge', short: 'Challenge', num: '★', building: 'Challenge Dock', title: 'Your Challenge', term: 'Trimester I · End', color: '#F0973A',
    rows: [['What happens', 'You share a challenge statement'], ['Allocated to', 'A diverse PG student team'], ['Mentors', 'WeSchool faculty + you'], ['Output', 'A live, scoped brief']],
    role: 'Share a challenge statement on an industry, social, sustainability or business theme.',
    eg: 'deloitte', evidence: [['Deloitte asked', 'How does AI-enabled data collection affect privacy?']],
  },
  {
    id: 'stakeholders', short: 'Stakeholders', num: '1', building: 'Stakeholder Hub', title: 'Stakeholder Mapping', term: 'Trimester II · Module I', color: '#8DBA4E',
    rows: [['What happens', 'Map everyone the challenge touches'], ['Methods', 'Stakeholder & value-chain maps'], ['Mentors', 'Faculty mentor + you'], ['Output', 'Prioritised stakeholder map']],
    role: 'Fine-tune the challenge statement with the faculty mentor.',
    eg: 'kaleidosync', evidence: [['Kaleidosync mapped', 'The whole silk value chain: farmers, reelers, weavers, traders, fashion'], ['Govardhan mapped', '7 segments, from volunteers to donors']],
  },
  {
    id: 'journey', short: 'Journey', num: '2', building: 'Journey Lab', title: 'Customer Journey', term: 'Trimester II · Module I', color: '#8DBA4E',
    rows: [['What happens', 'Walk in the user\'s shoes'], ['Methods', 'Journey maps, personas, storyboards'], ['Mentors', 'Faculty mentor'], ['Output', 'Pain points & moments that matter']],
    role: null,
    eg: 'deloitte', evidence: [['Deloitte personas', 'A tech employee and a privacy-concerned citizen'], ['Kaleidosync storyboard', 'Farmer Mohan: awareness → consideration → decision → delivery']],
  },
  {
    id: 'insights', short: 'Insights', num: '3', building: 'Insights Center', title: 'Observations & Insights', term: 'Trimester II · Module I', color: '#8DBA4E',
    rows: [['What happens', 'Surveys, interviews & desk research'], ['Team', 'PG students · diverse mix'], ['Mentors', 'Faculty + your industry mentor'], ['Output', '3 opportunity spaces']],
    role: 'Review the 3 opportunity spaces and give feedback (Phase I).',
    eg: 'idfc', bars: [['Familiar with ESG', 80, '#66518A'], ['Open to ESG in retail banking', 77, '#7AA342'], ['Want impact insights on transactions', 66, '#F0973A']],
  },
  {
    id: 'prototype', short: 'Prototype', num: '4', building: 'Prototype Studio', title: 'Prototyping', term: 'Trimester III · Modules II & III', color: '#8DBA4E',
    rows: [['What happens', 'Build the chosen opportunity space'], ['Technology', 'AI, apps, chatbots, low-code'], ['Lens', 'Technology + sustainability'], ['Output', 'A working prototype']],
    role: 'Give feedback on the prototype.',
    eg: 'govardhan', evidence: [['Govardhan built', 'Low-code volunteer portal with live dashboard'], ['Kaleidosync built', 'Multilingual WhatsApp advisory chatbot'], ['IDFC built', 'Impact Dashboard app with ESG scores']],
  },
  {
    id: 'solution', short: 'Solution', num: '5', building: 'Solution Launchpad', title: 'Commercially Feasible Solution', term: 'Trimester III · Final', color: '#8DBA4E',
    rows: [['What happens', 'Turn the prototype into a business'], ['Includes', 'Revenue model, GTM, cash needs, ROI'], ['Evaluation', 'Faculty mentor 60% · cross-faculty panel 40%'], ['Output', 'A solution you can act on']],
    role: 'Attend the final solution presentation.',
    eg: 'aurapay', evidence: [['AuraPay proposed', 'Age-segmented app, AI fraud alerts, senior-friendly UI'], ['Deloitte proposed', 'Subscriptions + premium tools + data partnerships']],
  },
];

export const ROLE = STAGES.filter(s => s.role);
