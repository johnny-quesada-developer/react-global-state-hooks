import { styleText } from 'node:util';
import type { FileOutcome, FileResult, RuleReport } from '../rules/Rule';

const outcomeIcon: Record<FileOutcome, string> = {
  passed: styleText('green', '✔'),
  skipped: styleText('gray', '○'),
  failed: styleText('red', '✖'),
};

const truncate = (text: string, length: number) =>
  text.length > length ? `${text.slice(0, length - 1)}…` : text;

const countOutcomes = (fileResults: FileResult[]) =>
  (['passed', 'skipped', 'failed'] as FileOutcome[]).map(
    (outcome) => `${fileResults.filter((result) => result.outcome === outcome).length} ${outcome}`,
  );

function renderTable(rows: string[][]): string[] {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map((row) => row.map((cell, column) => cell.padEnd(widths[column])).join('  '));
}

export function renderTerminalSummary(reports: RuleReport[]): string {
  const sections = reports.map((report) => {
    const header = styleText('bold', `\n${report.title} (${report.ruleId})`);
    if (report.crashReason) return `${header}\n${styleText('red', `rule crashed: ${report.crashReason}`)}`;

    const detailKeys = Object.keys(report.fileResults[0]?.details ?? {});
    const rows = [
      ['file', 'status', ...detailKeys],
      ...report.fileResults.map((result) => [
        result.file,
        result.status,
        ...detailKeys.map((key) => String(result.details[key])),
      ]),
    ];
    const [headerRow, ...bodyRows] = renderTable(rows);
    const table = [
      `  ${styleText('gray', headerRow)}`,
      ...bodyRows.map((row, index) => `${outcomeIcon[report.fileResults[index].outcome]} ${row}`),
    ];

    const problems = report.fileResults
      .filter((result) => result.outcome !== 'passed')
      .map((result) => `  ${outcomeIcon[result.outcome]} ${result.file}: ${truncate(result.reason, 220)}`);
    const notes = report.notes.map((note) => `  ${styleText('cyan', '•')} ${note}`);
    const changedOutsideTargets = report.changedOutsideTargets.map(
      (file) => `  ${styleText('yellow', '✎')} ${file}`,
    );

    return [
      header,
      styleText('gray', countOutcomes(report.fileResults).join(' · ')),
      ...table,
      problems.length ? styleText('bold', '\nNot passed / skipped:') : '',
      ...problems,
      notes.length ? styleText('bold', '\nNotes:') : '',
      ...notes,
      changedOutsideTargets.length ? styleText('bold', '\nChanged outside the review targets:') : '',
      ...changedOutsideTargets,
    ]
      .filter((line) => line !== '')
      .join('\n');
  });
  return sections.join('\n');
}

const markdownList = ({ heading, items }: { heading: string; items: string[] }) =>
  items.length ? `\n\n### ${heading}\n\n${items.map((item) => `- ${item}`).join('\n')}` : '';

export function renderMarkdownSummary({
  reports,
  target,
}: {
  reports: RuleReport[];
  target: string;
}): string {
  const sections = reports.map((report) => {
    if (report.crashReason) return `## ${report.title}\n\nRule crashed: ${report.crashReason}`;

    const detailKeys = Object.keys(report.fileResults[0]?.details ?? {});
    const headerRow = `| file | outcome | status | ${detailKeys.join(' | ')} | reason |`;
    const separator = `|${' --- |'.repeat(detailKeys.length + 4)}`;
    const rows = report.fileResults.map(
      (result) =>
        `| \`${result.file}\` | ${result.outcome} | ${result.status} | ${detailKeys.map((key) => result.details[key]).join(' | ')} | ${result.reason.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`,
    );
    const notes = markdownList({ heading: 'Notes', items: report.notes });
    const changedOutsideTargets = markdownList({
      heading: 'Changed outside the review targets',
      items: report.changedOutsideTargets.map((file) => `\`${file}\``),
    });
    return `## ${report.title}\n\n${countOutcomes(report.fileResults).join(' · ')}\n\n${headerRow}\n${separator}\n${rows.join('\n')}${notes}${changedOutsideTargets}`;
  });
  return `# Review summary\n\nTarget: ${target}\n\n${sections.join('\n\n')}\n`;
}
