export type Project = {
  slug: string;
  title: string;
  eyebrow: string;
  category: 'Finance' | 'Sustainability' | 'Social impact' | 'Responsible AI';
  organization: string;
  summary: string;
  challenge: string;
  stakeholders: string[];
  insights: string[];
  solution: string;
  capabilities: string[];
  cover: string;
  screenshots: { src: string; alt: string; caption: string }[];
  color: string;
  source: string;
};

export const projects: Project[] = [
  {
    slug: 'aurapay',
    title: 'AuraPay',
    eyebrow: 'Banking around people',
    category: 'Finance',
    organization: 'Student mobile-banking concept',
    summary: 'A personalised payments and banking prototype that considers the needs of different age groups.',
    challenge: 'Understand user preferences, pain points and loyalty drivers to shape a differentiated mobile payments application in an established market.',
    stakeholders: ['Students and young adults', 'Working professionals', 'People planning retirement', 'Senior banking customers'],
    insights: [
      'Financial priorities change with life stage, from student credit to investments and pension management.',
      'Trust, fraud protection and an easy interface are central to digital-banking adoption.',
      'Voice assistance and financial education can help make banking more accessible.',
    ],
    solution: 'The student prototype proposes age-segmented interfaces, voice-assisted banking, fraud alerts, financial education and personalised planning tools. The original screens illustrate a mobile banking home and a senior-oriented experience.',
    capabilities: ['Customer segmentation', 'Experience design', 'Digital inclusion', 'Mobile prototyping'],
    cover: '/weschool-gcl/world/media/aurapay-cover.webp',
    screenshots: [
      { src: '/weschool-gcl/world/media/aurapay-home.webp', alt: 'Original AuraPay mobile home prototype showing payments, services and recent activity.', caption: 'Original student prototype: mobile banking home. All balances and transactions are demonstration content.' },
      { src: '/weschool-gcl/world/media/aurapay-senior.webp', alt: 'Original AuraPay prototype with senior-oriented banking services.', caption: 'Original student prototype: an interface adapted to a different customer segment.' },
    ],
    color: '#8264B5',
    source: 'PG 1 GCL Group 3 (1).pdf',
  },
  {
    slug: 'esg-impact',
    title: 'ESG Impact Dashboard',
    eyebrow: 'Make sustainability visible',
    category: 'Sustainability',
    organization: 'Team Sustain X · retail-banking study',
    summary: 'A retail-banking prototype that brings personal ESG insights, spending analytics and sustainability education together.',
    challenge: 'Assess ESG practices in Indian retail banking, understand consumer expectations and identify opportunities to integrate ESG into banking products.',
    stakeholders: ['Retail banking customers', 'Banking product teams', 'Sustainability teams'],
    insights: [
      'The reference explores literature, competitive analysis and consumer surveys to frame the opportunity.',
      'Transparent ESG scoring and granular analytics can help explain the relationship between banking and sustainability.',
      'Guided onboarding, clear visuals, security and privacy are identified as areas for refinement.',
    ],
    solution: 'The student impact-dashboard prototype presents ESG scoring and spending analytics within a mobile banking experience. The concept also explores sustainability education and incentives; these are proposed features, with no verified adoption or impact results.',
    capabilities: ['Consumer research', 'ESG opportunity mapping', 'Dashboard design', 'Prototype evaluation'],
    cover: '/weschool-gcl/world/media/esg-cover.webp',
    screenshots: [
      { src: '/weschool-gcl/world/media/esg-analytics.webp', alt: 'Original ESG Impact Dashboard mobile prototype with analytics and spending categories.', caption: 'Original student prototype: weekly impact and spending analytics. Values are illustrative interface content.' },
      { src: '/weschool-gcl/world/media/esg-score.webp', alt: 'Original ESG mobile prototype showing report generation and a confidence indicator.', caption: 'Original student prototype: generating an ESG report. The percentage is illustrative interface content.' },
    ],
    color: '#88A85B',
    source: 'Group 3 - GCL Model III - PG1.pdf',
  },
  {
    slug: 'kaleidosync',
    title: 'KaleidoSync / MSSA',
    eyebrow: 'Guidance within reach',
    category: 'Social impact',
    organization: 'Maharashtra Sericulture Association reference project',
    summary: 'A conversational support prototype designed around sericulture farmers and the silk value chain.',
    challenge: 'Explore how to empower sericulture farmers and other silk-value-chain stakeholders to enhance their skills, income and well-being.',
    stakeholders: ['Sericulture farmers', 'Silk-value-chain stakeholders', 'Sericulture association'],
    insights: [
      'The mapped journey follows awareness, access, a farming question, application of guidance and continued engagement.',
      'The prototype starts with language and stakeholder selection to put the conversation in context.',
      'The supplied farmer storyboard illustrates a proposed experience; it is not evidence of realised farm outcomes.',
    ],
    solution: 'The student chatbot prototype provides menu-based language and stakeholder selection, followed by responses to farming-related questions. The original conversation screens show how a farmer could navigate the service and receive suggested guidance.',
    capabilities: ['Stakeholder mapping', 'Customer journey', 'Conversational design', 'Service prototyping'],
    cover: '/weschool-gcl/world/media/kaleidosync-cover.webp',
    screenshots: [
      { src: '/weschool-gcl/world/media/kaleidosync-language.webp', alt: 'Original chatbot prototype asking users to choose a language and stakeholder group.', caption: 'Original student prototype: language selection and farmer onboarding.' },
      { src: '/weschool-gcl/world/media/kaleidosync-advice.webp', alt: 'Original chatbot conversation showing a farming query and suggested actions.', caption: 'Original student prototype: a farming-support response. Shown as a design example, not validated agricultural advice.' },
    ],
    color: '#4F9586',
    source: 'MSSA.pdf',
  },
  {
    slug: 'privacy-scorecard',
    title: 'Privacy Scorecard',
    eyebrow: 'Responsible use of data',
    category: 'Responsible AI',
    organization: 'Deloitte challenge reference',
    summary: 'A student privacy-scorecard concept exploring personal data, analytics and AI through a clearer user experience.',
    challenge: 'Explore the impact of analytics- and artificial-intelligence-enabled collection of personal information on privacy.',
    stakeholders: ['Customers and the public', 'Technology companies and AI developers', 'Employees', 'Government and regulatory bodies', 'Legal experts', 'Partners and service providers'],
    insights: [
      'The stakeholder map spans individuals, organisations, developers, regulators and legal experts.',
      'The user journeys consider both an employee learning responsible AI practices and a member of the public evaluating privacy.',
      'The concept uses visible permissions and a privacy score to make data-sharing choices easier to understand.',
    ],
    solution: 'The student website prototype proposes a personalised privacy scorecard, app-permission overview, recommendations and educational resources. This is a student design exploration from the supplied reference, not an official Deloitte product or endorsement.',
    capabilities: ['Stakeholder analysis', 'Responsible AI exploration', 'User journeys', 'Web prototyping'],
    cover: '/weschool-gcl/world/media/privacy-cover.webp',
    screenshots: [
      { src: '/weschool-gcl/world/media/privacy-landing.webp', alt: 'Original student Privacy Scorecard landing page with the concept explanation and benefits.', caption: 'Original student prototype: Privacy Scorecard landing page, cropped from the supplied poster.' },
      { src: '/weschool-gcl/world/media/privacy-dashboard.webp', alt: 'Original student dashboard with a privacy score, installed-app permissions and recommended actions.', caption: 'Original student prototype: app permissions and privacy dashboard. Values are demonstration content; the source is a raster poster.' },
    ],
    color: '#8B648C',
    source: 'ebiz Group-2-Deloitte-AI-privacy-poster.jfif',
  },
  {
    slug: 'volunteer-connect',
    title: 'Volunteer Connect',
    eyebrow: 'Turn intent into participation',
    category: 'Social impact',
    organization: 'Govardhan Eco Village reference project',
    summary: 'A low-code/no-code portal prototype for volunteer participation in sustainability and community initiatives.',
    challenge: 'Create a scalable way to manage growing volunteer participation, helping people explore ESG projects, register and track their contributions.',
    stakeholders: ['Volunteers and alumni volunteers', 'Partner organisations', 'Internal teams', 'Local communities', 'Government and advocacy groups', 'Donors and supporters'],
    insights: [
      'The stakeholder map links volunteer engagement with partner needs, CSR needs and digital transformation.',
      'Registration needs to capture availability, interests, experience and languages so participation can be coordinated.',
      'The proposed portal brings registration, application status, departments, feedback and a dashboard into one experience.',
    ],
    solution: 'The student low-code/no-code prototype explores volunteer registration, engagement tracking and automated coordination for Govardhan Eco Village. The design proposes clearer workflows and aggregate activity views; it does not establish measured operational improvements.',
    capabilities: ['Process mapping', 'Service design', 'Low-code/no-code prototyping', 'Engagement dashboards'],
    cover: '/weschool-gcl/world/media/volunteer-cover.webp',
    screenshots: [
      { src: '/weschool-gcl/world/media/volunteer-registration.webp', alt: 'Original volunteer portal registration form asking about availability, interests and experience.', caption: 'Original student prototype: volunteer registration. No submitted contact information is shown.' },
      { src: '/weschool-gcl/world/media/volunteer-dashboard.webp', alt: 'Original volunteer portal dashboard with application-status and feedback charts.', caption: 'Original student prototype: aggregate dashboard. Charts are illustrative interface content, not reported program results.' },
      { src: '/weschool-gcl/world/media/volunteer-stakeholders.webp', alt: 'Original stakeholder diagram linking partner needs, digital transformation, CSR and engagement challenges.', caption: 'Original project diagram: the dynamics of volunteer management.' },
    ],
    color: '#8F9C55',
    source: 'EBIZ 1 GCL Project Poster Nexus Nova - GEV.pdf.pdf',
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
