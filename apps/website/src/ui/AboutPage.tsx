import { links, withBase } from '../lib/site';
import { BenefitCard, BenefitList } from './BenefitList';
import { ButtonLink } from './ButtonLink';
import { Section, SectionLede, SectionTitle } from './Section';
import { PageShell } from './PageShell';

interface CaseStudy {
  id: string;
  title: string;
  context: string;
  problem: string;
  responsibility: string;
  decisions: string[];
  outcome: string;
}

const caseStudies: CaseStudy[] = [
  {
    id: 'idiomatic-performance',
    title: 'Idiomatic: from a slow analytics app to a fast one',
    context:
      'Idiomatic, 2022 to 2024. An AI Voice-of-Customer analytics product with interactive charts and customer-specific views.',
    problem:
      'The application was highly dynamic and visualization-heavy, and typical screens took 40 to 60 seconds to load because expensive data aggregation happened in the browser.',
    responsibility:
      'Rethinking the performance architecture end to end, while the product stayed flexible and interactive for customers.',
    decisions: [
      'Moved aggregation from the browser into Elasticsearch aggregations.',
      'Redesigned the APIs so each component could fetch focused data on its own.',
      'Added request caching and de-duplication.',
      'Kept Web Workers for the computation that still belonged on the client.',
      'Built the organization’s design system and removed legacy dependencies.',
    ],
    outcome:
      'Reduced typical loading times from 40–60 seconds to approximately 0.5–1 second. Dependency cleanup cut the bundle by about 35%, and the design system helped deliver a major rebrand in approximately 20% of the estimated time.',
  },
  {
    id: 'rematter-mobile-architecture',
    title: 'ReMatter: one reusable core for two mobile apps',
    context:
      'ReMatter, 2021 to 2022. A startup modernizing the scrap-metal recycling industry, with web and mobile products.',
    problem:
      'Two mobile applications had different product goals but overlapping business logic, UI and infrastructure. Maintaining two implementations would have duplicated work and drifted apart.',
    responsibility:
      'Designing the shared foundation and leading the start of the driver application built on it.',
    decisions: [
      'Organized both apps in an Nx monorepo with a shared core of components, hooks and application logic.',
      'Made React composition the architectural basis: small, semantic primitives that combine into different workflows.',
      'Introduced stable TypeScript contracts so teams could work in parallel.',
      'Established unit testing as a standard requirement.',
    ],
    outcome:
      'Gave both mobile apps a shared foundation for business logic, UI and infrastructure. Engineers could build features from tested, reusable components and apply improvements across both products.',
  },
  {
    id: 'jumpcloud-incremental-modernization',
    title: 'JumpCloud: modernizing without stopping the roadmap',
    context:
      'JumpCloud, 2019 to 2020, through the consultancy Gorilla Logic. A cloud directory and identity platform.',
    problem:
      'Large parts of the product were built on Backbone and needed to move to Vue, but a rewrite would have competed with customer-facing work.',
    responsibility:
      'Defining the migration strategy, and improving how the team built its preconfigured SAML integrations.',
    decisions: [
      'Designed an incremental path so architectural migration and new features shipped together.',
      'Redesigned parts of the architecture and delivery process behind SAML connector creation to remove friction for the whole team.',
      'Reorganized responsibilities and trained an engineer who had mostly built repetitive connectors, widening what the team could take on.',
    ],
    outcome:
      'Saved approximately 7–8 months of engineering effort through incremental migration. Improvements to SAML connector development contributed to an approximately 350% increase in connector output over five months.',
  },
];

const approach = [
  {
    title: 'Own the problem, not just the ticket',
    body: 'Understand the problem, define the solution, architect it, build it, validate it and iterate. I am comfortable challenging assumptions and working through ambiguity.',
  },
  {
    title: 'Do the right work in the right place',
    body: 'Performance often comes from moving work, not doing less of it: aggregation to the database, computation to a worker, caching at the request layer.',
  },
  {
    title: 'Build the foundation once',
    body: 'Shared primitives, typed contracts and design systems let a team deliver more without adding complexity. My open-source libraries come from the same instinct.',
  },
  {
    title: 'Make quality part of the system',
    body: 'If correctness depends on everyone remembering every edge case, the process is fragile. I turn those risks into tests, validation and delivery controls.',
  },
  {
    title: 'Use AI with verification',
    body: 'I build AI workflows around clear constraints, code review and automated tests, with engineering ownership of every decision and release.',
  },
];

const history = [
  {
    years: 'May 2025 to present',
    role: 'Vonage',
    note: 'Senior product engineer on the Video Developer Platform. Authored the product and architecture strategy for a system to build and deploy video applications at several levels of integration: ready-to-use apps, no-code deployment, and reusable npm packages on the same core. Hands-on across a React reference app, API and domain design, reusable packages, generated OpenAPI contracts, integration testing, monorepo architecture and CI/CD.',
  },
  {
    years: 'Nov 2024 to Feb 2025',
    role: 'Front',
    note: 'Senior software engineer after the acquisition of Idiomatic: AI product integration and customer-intelligence work.',
  },
  {
    years: '2022 to 2024',
    role: 'Idiomatic',
    note: 'Senior product engineer: Report Builder, performance architecture, Nx monorepo and design system.',
  },
  {
    years: '2021 to 2022',
    role: 'ReMatter',
    note: 'Senior product engineer: shared mobile architecture and the driver app foundation.',
  },
  {
    years: '2020 to 2021',
    role: 'OMNi (Costa Rica)',
    note: 'Started as a part-time React Native consultant, then Technical Lead of two teams of roughly 15–20 people. Feature flags, hot fixes and idempotent request processing for unreliable mobile networks.',
  },
  {
    years: '2019 to 2020',
    role: 'Gorilla Logic, on the JumpCloud engagement',
    note: 'Consultancy work embedded in JumpCloud’s directory platform team. This ran partly in parallel with the OMNi consulting above.',
  },
  {
    years: '2019',
    role: 'Intertec International',
    note: 'Consulting: education-platform integrations with Google services, and MuleSoft sync services for an e-commerce platform.',
  },
  { years: '2018 to 2019', role: 'Agilence', note: 'Retail analytics and reporting platform.' },
  {
    years: '2017 to 2018',
    role: 'Fragomen',
    note: 'Enterprise systems: database performance and Web Worker data processing, which later inspired easy-web-worker.',
  },
  {
    years: '2015 to 2017',
    role: 'MDG Developers Group',
    note: 'An internal ASP.NET application framework, and client platforms including a business system for Televisora de Costa Rica.',
  },
];

export function AboutPage() {
  return (
    <PageShell className="pt-8 pb-0">
      <header className="grid items-end gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8">
        <div className="w-48 overflow-hidden rounded-md border border-[#c2dfcb] bg-mint leading-[0]">
          <img
            className="block h-auto w-48"
            src={withBase('img/johnny-512.png')}
            srcSet={`${withBase('img/johnny-256.png')} 256w, ${withBase('img/johnny-512.png')} 512w`}
            sizes="192px"
            width={192}
            height={228}
            alt="Portrait of Johnny Quesada"
            decoding="async"
          />
        </div>
        <div>
          <p className="mt-0 mr-0 mb-1 ml-0 text-sm font-bold text-primary">About the author</p>
          <h1 className="text-3xl leading-heading">Johnny Quesada</h1>
          <p className="my-3 max-w-[44rem] text-lg text-text-muted">
            Senior product engineer, also published as J. Esteban Quesada, currently working on Vonage&rsquo;s
            video developer platform. I work across the whole path from understanding a problem to shipping
            and improving the solution: full-stack architecture, React and TypeScript, performance, and
            developer tooling. Based in Spain, with more than twelve years of engineering experience.
          </p>
          <p className="m-0 flex flex-wrap gap-3">
            <ButtonLink variant="secondary" href={links.githubProfile} rel="noopener">
              GitHub
            </ButtonLink>
            <ButtonLink variant="secondary" href="https://www.npmjs.com/~johnny-qc" rel="noopener">
              npm
            </ButtonLink>
            <ButtonLink variant="secondary" href={links.linkedin} rel="noopener">
              LinkedIn
            </ButtonLink>
          </p>
        </div>
      </header>

      <Section shell={false} aria-labelledby="cases">
        <SectionTitle id="cases">Selected engineering case studies</SectionTitle>
        <SectionLede>
          Faster analytics, shared mobile architecture and incremental modernization: three projects where
          engineering decisions improved product performance and team delivery.
        </SectionLede>
        {caseStudies.map((study) => (
          <article className="mt-6 max-w-[52rem] rounded-md border border-line p-6 shadow-sm" key={study.id} id={study.id}>
            <h3 className="text-xl leading-heading">{study.title}</h3>
            <p className="mt-2 mr-0 mb-3 ml-0 text-text-muted">{study.context}</p>
            <dl>
              <dt className="mt-3 font-bold text-primary">Problem</dt>
              <dd className="mt-1 mr-0 mb-0 ml-0">{study.problem}</dd>
              <dt className="mt-3 font-bold text-primary">My responsibility</dt>
              <dd className="mt-1 mr-0 mb-0 ml-0">{study.responsibility}</dd>
              <dt className="mt-3 font-bold text-primary">Decisions</dt>
              <dd className="mt-1 mr-0 mb-0 ml-0">
                <ul className="m-0 pl-[1.2rem]">
                  {study.decisions.map((decision) => (
                    <li key={decision}>{decision}</li>
                  ))}
                </ul>
              </dd>
              <dt className="mt-3 font-bold text-primary">Outcome</dt>
              <dd className="mt-1 mr-0 mb-0 ml-0">{study.outcome}</dd>
            </dl>
          </article>
        ))}
      </Section>

      <Section shell={false} aria-labelledby="approach">
        <SectionTitle id="approach">Engineering approach</SectionTitle>
        <BenefitList>
          {approach.map((item) => (
            <BenefitCard title={item.title} key={item.title}>
              {item.body}
            </BenefitCard>
          ))}
        </BenefitList>
      </Section>

      <Section shell={false} aria-labelledby="open-source">
        <SectionTitle id="open-source">Open source</SectionTitle>
        <p>
          <a href={links.repo} rel="noopener">
            react-global-state-hooks
          </a>{' '}
          is the subject of this site.{' '}
          <a href={links.easyWebWorker} rel="noopener">
            easy-web-worker
          </a>{' '}
          makes Web Worker concurrency easier to apply through a reusable API. It grew out of moving heavy
          chart data work off the main thread at Fragomen.
        </p>
      </Section>

      <Section shell={false} aria-labelledby="history">
        <SectionTitle id="history">Career history</SectionTitle>
        <SectionLede>
          Product engineering and technical leadership across analytics, mobile applications, identity
          platforms and developer tools. Consulting engagements are identified below.
        </SectionLede>
        <ol className="mt-4 mr-0 mb-0 ml-0 grid max-w-[52rem] list-none gap-3 p-0">
          {history.map((item) => (
            <li className="grid gap-x-4 gap-y-1 border-b border-line pb-3 sm:grid-cols-[9rem_minmax(0,1fr)]" key={item.role}>
              <span className="text-sm font-bold text-text-muted">{item.years}</span>
              <div>
                <strong>{item.role}</strong>
                <p className="mt-1 mr-0 mb-0 ml-0 text-sm text-text-muted">{item.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </PageShell>
  );
}
