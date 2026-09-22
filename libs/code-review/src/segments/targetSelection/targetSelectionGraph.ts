import path from 'node:path';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { listWorkingChanges } from '../../shared/git';
import { isPathInside } from '../../shared/isPathInside';
import { discoverNxProjects, type WorkspaceProject } from '../../shared/workspace';
import { describeTargets, detectTarget, type Target, type TargetKind } from './detectTarget';
import { resolveTargetFiles } from './resolveTargetFiles';

const TargetState = Annotation.Root({
  context: Annotation<ReviewContext>(),
  targets: Annotation<Target[]>(),
  files: Annotation<string[]>(),
  confirmed: Annotation<boolean>(),
});
type State = typeof TargetState.State;

const MAX_LISTED_FILES = 25;

/**
 * Projects available for the `project` target: the consumer's explicit `settings.projects`
 * (typed mappings, work in any repo) take precedence, extended with whatever the optional Nx
 * adapter finds when `nx.json` is present — Nx is never required.
 */
function listAvailableProjects(context: ReviewContext): WorkspaceProject[] {
  const explicit = context.settings.projects.map(({ name, root }) => {
    const resolvedRoot = path.resolve(context.workspaceRoot, root);
    return { name, root: resolvedRoot, sourceRoot: resolvedRoot };
  });
  const discovered = discoverNxProjects(context.workspaceRoot).filter(
    (project) => !explicit.some((entry) => entry.name === project.name),
  );
  return [...explicit, ...discovered];
}

const hasTargetArgument = ({ context }: State) => context.options.targets.length > 0;

const detectTargetsFromArguments = async ({ context }: State) => {
  const projects = listAvailableProjects(context);
  const targets = await Promise.all(
    context.options.targets.map(async (value) => {
      const target = await detectTarget({
        value,
        workspaceRoot: context.workspaceRoot,
        invocationDirectory: context.invocationDirectory,
        projects,
      });
      if (!target) throw new Error(`"${value}" is not a file, folder, project, commit, glob or "changes"`);
      return target;
    }),
  );
  return { targets };
};

const askForTarget = async ({ context }: State) => {
  const { ask, workspaceRoot, invocationDirectory } = context;
  const projects = listAvailableProjects(context);

  const kind = await ask.select<TargetKind>({
    message: 'What should be reviewed?',
    defaultValue: 'workingChanges',
    choices: [
      { value: 'workingChanges', label: 'Current git changes', hint: 'staged, unstaged and untracked' },
      { value: 'file', label: 'A file' },
      { value: 'folder', label: 'A folder' },
      { value: 'project', label: 'A project', hint: projects.map(({ name }) => name).join(', ') || 'none configured' },
      { value: 'commit', label: 'A commit' },
      { value: 'glob', label: 'A glob pattern' },
    ],
  });

  if (kind === 'workingChanges') return { targets: [{ kind }] };

  if (kind === 'project') {
    const projectName = await ask.select({
      message: 'Which project?',
      choices: projects.map(({ name, root }) => ({ value: name, label: name, hint: path.relative(workspaceRoot, root) })),
    });
    return { targets: [{ kind, project: projects.find(({ name }) => name === projectName)! }] };
  }

  const value = await ask.text({ message: `Enter the ${kind}`, defaultValue: kind === 'commit' ? 'HEAD' : undefined });
  const target = await detectTarget({ value, workspaceRoot, invocationDirectory, projects });
  const matchesRequestedKind = target?.kind === kind;
  if (!matchesRequestedKind) throw new Error(`"${value}" is not a valid ${kind}`);
  return { targets: [target] };
};

/** Explicit file/folder targets must live inside the configured workspace root. */
const validateTargetsWithinWorkspace = ({ context, targets }: State) => {
  const outside = targets.filter(
    (target) =>
      (target.kind === 'file' || target.kind === 'folder') &&
      !isPathInside({ child: target.path, parent: context.workspaceRoot }),
  );
  if (outside.length) {
    const offenders = outside.map((target) => (target as { path: string }).path).join(', ');
    throw new Error(
      `target(s) outside the configured workspace root (${path.relative(context.repositoryRoot ?? context.workspaceRoot, context.workspaceRoot) || '.'}): ${offenders}`,
    );
  }
  return {};
};

const resolveFiles = async ({ context, targets }: State) => {
  const perTarget = await Promise.all(
    targets.map((target) =>
      resolveTargetFiles({ target, workspaceRoot: context.workspaceRoot, repositoryRoot: context.repositoryRoot }),
    ),
  );
  const files = [...new Set(perTarget.flat())].sort();
  const { maxFiles } = context.options;
  if (maxFiles !== undefined && files.length > maxFiles) {
    throw new Error(`the target resolves to ${files.length} files, above --max-files ${maxFiles}; narrow the target or raise the limit`);
  }
  context.logger.step(`target: ${describeTargets(targets, context.workspaceRoot)} → ${files.length} source file(s)`);
  return { files };
};

const confirmFiles = async ({ context, files }: State) => {
  const { logger, ask, workspaceRoot, repositoryRoot } = context;
  if (files.length === 0) {
    logger.warn('the target does not contain reviewable source files');
    return { confirmed: false };
  }

  files.slice(0, MAX_LISTED_FILES).forEach((file) => logger.detail(path.relative(workspaceRoot, file)));
  if (files.length > MAX_LISTED_FILES) logger.detail(`…and ${files.length - MAX_LISTED_FILES} more`);

  if (repositoryRoot && !context.options.allowDirty) {
    const pending = (await listWorkingChanges({ cwd: repositoryRoot, workspaceRoot })).filter(
      (file) => !isPathInside({ child: file, parent: context.run.reviewDirectory }),
    );
    if (pending.length) {
      throw new Error(
        `the git working tree has ${pending.length} uncommitted change(s) (e.g. ${path.relative(workspaceRoot, pending[0])}); commit or stash them so agent edits stay separable, or pass --allow-dirty`,
      );
    }
  }

  const confirmed = await ask.confirm({ message: `Review these ${files.length} file(s)?`, defaultValue: true });
  return { confirmed };
};

export const targetSelectionGraph = new StateGraph(TargetState)
  .addNode('detectTargetsFromArguments', detectTargetsFromArguments)
  .addNode('askForTarget', askForTarget)
  .addNode('validateTargetsWithinWorkspace', validateTargetsWithinWorkspace)
  .addNode('resolveFiles', resolveFiles)
  .addNode('confirmFiles', confirmFiles)
  .addConditionalEdges(START, (state) => (hasTargetArgument(state) ? 'detectTargetsFromArguments' : 'askForTarget'), [
    'detectTargetsFromArguments',
    'askForTarget',
  ])
  .addEdge('detectTargetsFromArguments', 'validateTargetsWithinWorkspace')
  .addEdge('askForTarget', 'validateTargetsWithinWorkspace')
  .addEdge('validateTargetsWithinWorkspace', 'resolveFiles')
  .addEdge('resolveFiles', 'confirmFiles')
  .addEdge('confirmFiles', END)
  .compile({ name: 'target-selection' });

export async function selectTarget(context: ReviewContext): Promise<{ targets: Target[]; files: string[] }> {
  const { targets, files, confirmed } = await targetSelectionGraph.invoke({ context, targets: [] });
  return { targets, files: confirmed ? files : [] };
}
