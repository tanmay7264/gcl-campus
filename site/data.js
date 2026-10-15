// GCL journey stages. Each stage is a building on the college campus.
// `eg` points at a past project (projects.js) that shows the stage in practice.
export const STAGES = [
  {
    id: 'challenge', plain: 'The company explains its real business problem to a WeSchool faculty mentor.', who: ['companies', 'faculty'], you: 'Share your challenge', live: 'Company mentor shares the problem with faculty', short: 'Challenge', num: '★', building: 'Industry Gate', title: 'Your Challenge', term: 'Trimester I · End', color: '#F0973A',
    rows: [['What happens', 'You share a challenge statement'], ['Allocated to', 'A diverse PG student team'], ['Mentors', 'WeSchool faculty + you'], ['Output', 'A live, scoped brief']],
    role: 'Share a challenge statement on an industry, social, sustainability or business theme.',
    eg: 'deloitte', evidence: [['Deloitte asked', 'How does AI-enabled data collection affect privacy?']],
  },
  {
    id: 'stakeholders', plain: 'Students list everyone the problem affects. The company helps sharpen the brief.', who: ['companies', 'faculty', 'students'], you: 'Fine-tune the brief', live: 'Team maps stakeholders · company fine-tunes the brief', short: 'Stakeholders', num: '1', building: 'Stakeholder Studio', title: 'Stakeholder Mapping', term: 'Trimester II · Module I', color: '#8DBA4E',
    rows: [['What happens', 'Map everyone the challenge touches'], ['Methods', 'Stakeholder & value-chain maps'], ['Mentors', 'Faculty mentor + you'], ['Output', 'Prioritised stakeholder map']],
    role: 'Fine-tune the challenge statement with the faculty mentor.',
    eg: 'kaleidosync', evidence: [['Kaleidosync mapped', 'The whole silk value chain: farmers, reelers, weavers, traders, fashion'], ['Govardhan mapped', '7 segments, from volunteers to donors']],
  },
  {
    id: 'journey', plain: 'Students step into the customer\'s shoes to find what frustrates them.', who: ['faculty', 'students'], you: null, live: 'Students map the customer journey', short: 'Journey', num: '2', building: 'Design Lab', title: 'Customer Journey', term: 'Trimester II · Module I', color: '#8DBA4E',
    rows: [['What happens', 'Walk in the user\'s shoes'], ['Methods', 'Journey maps, personas, storyboards'], ['Mentors', 'Faculty mentor'], ['Output', 'Pain points & moments that matter']],
    role: null,
    eg: 'deloitte', evidence: [['Deloitte personas', 'A tech employee and a privacy-concerned citizen'], ['Kaleidosync storyboard', 'Farmer Mohan: awareness → consideration → decision → delivery']],
  },
  {
    id: 'insights', plain: 'Students share 3 promising ideas. The company says which one to build.', who: ['companies', 'faculty', 'students'], you: 'Pick the best idea', live: 'Team presents 3 opportunity spaces to the company', short: 'Insights', num: '3', building: 'Research Library', title: 'Observations & Insights', term: 'Trimester II · Module I', color: '#8DBA4E',
    rows: [['What happens', 'Surveys, interviews & desk research'], ['Team', 'PG students · diverse mix'], ['Mentors', 'Faculty + your industry mentor'], ['Output', '3 opportunity spaces']],
    role: 'Review the 3 opportunity spaces and give feedback (Phase I).',
    eg: 'idfc', bars: [['Familiar with ESG', 80, '#66518A'], ['Open to ESG in retail banking', 77, '#7AA342'], ['Want impact insights on transactions', 66, '#F0973A']],
  },
  {
    id: 'prototype', plain: 'Students build a working prototype. The company tries it and gives feedback.', who: ['companies', 'faculty', 'students'], you: 'Test the prototype', live: 'Company tries the prototype and gives feedback', short: 'Prototype', num: '4', building: 'Innovation Lab', title: 'Prototyping', term: 'Trimester III · Modules II & III', color: '#8DBA4E',
    rows: [['What happens', 'Build the chosen opportunity space'], ['Technology', 'AI, apps, chatbots, low-code'], ['Lens', 'Technology + sustainability'], ['Output', 'A working prototype']],
    role: 'Give feedback on the prototype.',
    eg: 'govardhan', evidence: [['Govardhan built', 'Low-code volunteer portal with live dashboard'], ['Kaleidosync built', 'Multilingual WhatsApp advisory chatbot'], ['IDFC built', 'Impact Dashboard app with ESG scores']],
  },
  {
    id: 'solution', plain: 'Students present a business-ready solution. The problem card turns into a solution.', who: ['companies', 'faculty', 'students'], you: 'Attend Demo Day', live: 'Demo Day: the team presents the solution', short: 'Solution', num: '5', building: 'Demo Day Auditorium', title: 'Commercially Feasible Solution', term: 'Trimester III · Final', color: '#8DBA4E',
    rows: [['What happens', 'Turn the prototype into a business'], ['Includes', 'Revenue model, GTM, cash needs, ROI'], ['Evaluation', 'Faculty mentor 60% · cross-faculty panel 40%'], ['Output', 'A solution you can act on']],
    role: 'Attend the final solution presentation.',
    eg: 'aurapay', evidence: [['AuraPay proposed', 'Age-segmented app, AI fraud alerts, senior-friendly UI'], ['Deloitte proposed', 'Subscriptions + premium tools + data partnerships']],
  },
];

export const ROLE = STAGES.filter(s => s.role);

// The people on campus. Clicking a person (or a legend chip) opens their card.
export const PEOPLE = {
  companies: {
    title: 'Companies & Industry Mentors', kicker: 'INDUSTRY PARTNERS', icon: 'business_center', color: '#E8892B',
    lead: 'You bring a live problem. On campus you will see company mentors arriving through the Industry Gate with an orange problem card, and leaving with a green solution card.',
    rows: [['You share', 'A challenge statement on an industry, social, sustainability or business theme'], ['Your time', 'About 4 touchpoints, online or in person'], ['You get', 'Research insights, a prototype and a feasible solution'], ['Bonus', 'Early access to industry-ready talent']],
    cta: 'form',
  },
  students: {
    title: 'PG Management Students', kicker: 'STUDENT TEAMS', icon: 'school', color: '#3FA796',
    lead: 'Diverse teams (mixed gender, education and work experience) take your problem as a live project across two trimesters.',
    rows: [['Who', 'Post Graduate management students across streams'], ['Mindset', 'Self & socially aware, agile, collaborative'], ['Method', 'Stakeholders → journeys → insights → prototype → solution'], ['Output', 'A commercially feasible solution']],
    cta: 'stakeholders',
  },
  faculty: {
    title: 'WeSchool Faculty Mentors', kicker: 'FACULTY', icon: 'co_present', color: '#66518A',
    lead: 'Every team is guided by a faculty mentor from the first brief to the final presentation, alongside your industry mentor.',
    rows: [['Guide', 'Fine-tune the challenge with you'], ['Teach', 'Theory sessions + break-out sessions'], ['Assess', 'Faculty mentor 60% · cross-faculty panel 40%'], ['Model', 'CCL "Leadership Beyond Boundaries" & Design Impact']],
    cta: 'insights',
  },
};
