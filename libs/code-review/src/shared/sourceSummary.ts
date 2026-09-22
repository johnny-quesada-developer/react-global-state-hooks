import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const MAX_SIGNATURE_LENGTH = 160;
const FALLBACK_LINES = 40;

const isExported = (statement: ts.Statement) =>
  ts.canHaveModifiers(statement) &&
  (ts.getModifiers(statement) ?? []).some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword);

const firstLine = (text: string) => {
  const signature = text
    .split('\n')[0]
    .replace(/\s*=>\s*\{$/, '')
    .replace(/\s*\{$/, '')
    .trim();
  return signature.length > MAX_SIGNATURE_LENGTH
    ? `${signature.slice(0, MAX_SIGNATURE_LENGTH - 1)}…`
    : signature;
};

export function summarizeExports(file: string): string {
  const content = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(path.basename(file), content, ts.ScriptTarget.Latest, false);
  const signatures = sourceFile.statements
    .filter(
      (statement) =>
        isExported(statement) || ts.isExportAssignment(statement) || ts.isExportDeclaration(statement),
    )
    .map((statement) => firstLine(statement.getText(sourceFile)));

  if (signatures.length === 0) return content.split('\n').slice(0, FALLBACK_LINES).join('\n');
  return signatures.join('\n');
}
