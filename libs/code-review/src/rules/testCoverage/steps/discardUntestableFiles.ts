import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

interface UntestableCheck {
  reason: string;
  matches: (params: {
    file: string;
    fileName: string;
    content: string;
    statements: readonly ts.Statement[];
  }) => boolean;
}

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const CONFIG_FILE = /(\.config\.[cm]?[jt]s|^vitest\.setup.*|^jest\.setup.*|^vite-env\.d\.ts)$/;
const APP_BOOTSTRAP = /createRoot\(|ReactDOM\.render\(|AppRegistry\.registerComponent\(/;

const isTypeOnlyStatement = (statement: ts.Statement) =>
  ts.isInterfaceDeclaration(statement) ||
  ts.isTypeAliasDeclaration(statement) ||
  (ts.isExportDeclaration(statement) && statement.isTypeOnly) ||
  (ts.isModuleDeclaration(statement) &&
    Boolean(statement.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.DeclareKeyword)));

const isReExport = (statement: ts.Statement) =>
  ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined;

const withoutImports = (statements: readonly ts.Statement[]) =>
  statements.filter(
    (statement) => !ts.isImportDeclaration(statement) && !ts.isImportEqualsDeclaration(statement),
  );

const isBarrel = (statements: readonly ts.Statement[]) => {
  const meaningfulStatements = withoutImports(statements);
  return (
    meaningfulStatements.some(isReExport) &&
    meaningfulStatements.every((statement) => isReExport(statement) || isTypeOnlyStatement(statement))
  );
};

const untestableChecks: UntestableCheck[] = [
  { reason: 'type declaration file', matches: ({ fileName }) => fileName.endsWith('.d.ts') },
  {
    reason: 'test file',
    matches: ({ file, fileName }) =>
      TEST_FILE.test(fileName) || file.includes(`${path.sep}__tests__${path.sep}`),
  },
  { reason: 'config or setup file', matches: ({ fileName }) => CONFIG_FILE.test(fileName) },
  { reason: 'story file', matches: ({ fileName }) => fileName.includes('.stories.') },
  {
    reason: 'mock or fixture',
    matches: ({ file }) => /(__mocks__|__fixtures__|\.mocks?\.|\.fixtures?\.)/.test(file),
  },
  {
    reason: 'application bootstrap entry',
    matches: ({ fileName, content }) =>
      /^(main|index)\.[jt]sx?$/.test(fileName) && APP_BOOTSTRAP.test(content),
  },
  { reason: 'barrel file (re-exports only)', matches: ({ statements }) => isBarrel(statements) },
  {
    reason: 'types-only module',
    matches: ({ statements }) => withoutImports(statements).every(isTypeOnlyStatement),
  },
];

export function findUntestableReason(file: string): string | undefined {
  const content = fs.readFileSync(file, 'utf8');
  const fileName = path.basename(file);
  const { statements } = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, false);
  return untestableChecks.find((check) => check.matches({ file, fileName, content, statements }))?.reason;
}
