import { links, withBase } from '../lib/site';

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
      'Built the organization design system, and removed legacy dependencies.',
    ],
    outcome:
      'By my account, typical loading times went from roughly 40–60 seconds to 0.5–1 second. Dependency cleanup contributed to about a 35% smaller bundle, and a major rebrand took approximately 20% of the original estimate. These are figures from my résumé for that product, not benchmarks of this website or of this library.',
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
      'Common problems were solved once, and less experienced engineers could assemble production-quality features from the same building blocks. The aim was for the architecture to multiply the team’s output without hurting consistency.',
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
      'By my account, the incremental approach saved approximately 7–8 months of engineering effort, and the connector work contributed to approximately a 350% increase in connector output over five months. These are my résumé’s figures, given with the same approximations.',
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
    body: 'AI is a force multiplier, not a substitute for engineering judgment. I keep ownership of decisions and quality, and rely on constraints, review and tests rather than trusting output.',
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
    note: 'Senior software engineer after the acquisition of Idiomatic: AI product integration and customer-intelligence work (about four months).',
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
    <div className="container about">
      <header className="about__hero">
        <div className="about__portrait">
          <img
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
          <p className="about__eyebrow">About the author</p>
          <h1>Johnny Quesada</h1>
          <p className="about__lede">
            Senior product engineer, also published as J. Esteban Quesada, currently working on Vonage&rsquo;s
            video developer platform. I work across the whole path from understanding a problem to shipping
            and improving the solution: full-stack architecture, React and TypeScript, performance, and
            developer tooling. Based in Spain. I have twelve-plus years of experience, as stated in my
            profile.
          </p>
          <p className="about__links">
            <a className="button button--secondary" href={links.githubProfile} rel="noopener">
              GitHub
            </a>
            <a className="button button--secondary" href="https://www.npmjs.com/~johnny-qc" rel="noopener">
              npm
            </a>
            <a className="button button--secondary" href={links.linkedin} rel="noopener">
              LinkedIn
            </a>
          </p>
        </div>
      </header>

      <section className="about__section" aria-labelledby="cases">
        <h2 id="cases">Selected engineering case studies</h2>
        <p className="section__lede">
          Three pieces of work, described as problem, responsibility, decisions and outcome. Figures are my
          own historical claims from those roles, kept with their approximations.
        </p>
        {caseStudies.map((study) => (
          <article className="case" key={study.id} id={study.id}>
            <h3>{study.title}</h3>
            <p className="case__context">{study.context}</p>
            <dl>
              <dt>Problem</dt>
              <dd>{study.problem}</dd>
              <dt>My responsibility</dt>
              <dd>{study.responsibility}</dd>
              <dt>Decisions</dt>
              <dd>
                <ul>
                  {study.decisions.map((decision) => (
                    <li key={decision}>{decision}</li>
                  ))}
                </ul>
              </dd>
              <dt>Outcome</dt>
              <dd>{study.outcome}</dd>
            </dl>
          </article>
        ))}
      </section>

      <section className="about__section" aria-labelledby="approach">
        <h2 id="approach">Engineering approach</h2>
        <ul className="benefits">
          {approach.map((item) => (
            <li className="benefit" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="about__section" aria-labelledby="open-source">
        <h2 id="open-source">Open source</h2>
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
      </section>

      <section className="about__section" aria-labelledby="history">
        <h2 id="history">Career history, curated</h2>
        <p className="section__lede">
          Some engagements overlapped: consultancy and part-time work ran alongside other roles, so the years
          below are not a list of concurrent full-time jobs. Roles are summarized from my résumé. This site
          and my open-source projects are my own work and are not endorsed by any employer.
        </p>
        <ol className="history">
          {history.map((item) => (
            <li key={item.role}>
              <span className="history__years">{item.years}</span>
              <div>
                <strong>{item.role}</strong>
                <p>{item.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
