import path from 'node:path';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { isWorkingTreeDirty } from '../../shared/git';
import { listNxProjects } from '../../shared/workspace';
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

const hasTargetArgument = ({ context }: State) => context.options.targets.length > 0;

const detectTargetsFromArguments = async ({ context }: State) => {
  const projects = listNxProjects(context.workspaceRoot);
  const targets = await Promise.all(
    context.options.targets.map(async (value) => {
      const target = await detectTarget({
        value,
        workspaceRoot: context.workspaceRoot,
        invocationDirectory: context.invocationDirectory,
        projects,
      });
      if (!target) throw new Error(`"${value}" is not a file, folder, nx project, commit, glob or "changes"`);
      return target;
    }),
  );
  return { targets };
};

const askForTarget = async ({ context }: State) => {
  const { ask, workspaceRoot, invocationDirectory } = context;
  const projects = listNxProjects(workspaceRoot);

  const kind = await ask.select<TargetKind>({
    message: 'What should be reviewed?',
    defaultValue: 'workingChanges',
    choices: [
      { value: 'workingChanges', label: 'Current git changes', hint: 'staged, unstaged and untracked' },
      { value: 'file', label: 'A file' },
      { value: 'folder', label: 'A folder' },
      { value: 'nxProject', label: 'An app or lib', hint: projects.map(({ name }) => name).join(', ') },
      { value: 'commit', label: 'A commit' },
      { value: 'glob', label: 'A glob pattern' },
    ],
  });

  if (kind === 'workingChanges') return { targets: [{ kind }] };

  if (kind === 'nxProject') {
    const projectName = await ask.select({
      message: 'Which project?',
      choices: projects.map(({ name, root }) => ({
        value: name,
        label: name,
        hint: path.relative(workspaceRoot, root),
      })),
    });
    return { targets: [{ kind, project: projects.find(({ name }) => name === projectName)! }] };
  }

  const value = await ask.text({
    message: `Enter the ${kind}`,
    defaultValue: kind === 'commit' ? 'HEAD' : undefined,
  });
  const target = await detectTarget({ value, workspaceRoot, invocationDirectory, projects });
  const matchesRequestedKind = target?.kind === kind;
  if (!matchesRequestedKind) throw new Error(`"${value}" is not a valid ${kind}`);
  return { targets: [target] };
};

const resolveFiles = async ({ context, targets }: State) => {
  const perTarget = await Promise.all(
    targets.map((target) => resolveTargetFiles({ target, workspaceRoot: context.workspaceRoot })),
  );
  const files = [...new Set(perTarget.flat())].sort();
  context.logger.step(
    `target: ${describeTargets(targets, context.workspaceRoot)} → ${files.length} source file(s)`,
  );
  return { files };
};

const confirmFiles = async ({ context, files }: State) => {
  const { logger, ask, workspaceRoot } = context;
  if (files.length === 0) {
    logger.warn('the target does not contain reviewable source files');
    return { confirmed: false };
  }

  files.slice(0, MAX_LISTED_FILES).forEach((file) => logger.detail(path.relative(workspaceRoot, file)));
  if (files.length > MAX_LISTED_FILES) logger.detail(`…and ${files.length - MAX_LISTED_FILES} more`);

  if (await isWorkingTreeDirty({ cwd: workspaceRoot })) {
    logger.warn('the git working tree has uncommitted changes; agent edits will be mixed with them');
  }

  const confirmed = await ask.confirm({
    message: `Review these ${files.length} file(s)?`,
    defaultValue: true,
  });
  return { confirmed };
};

export const targetSelectionGraph = new StateGraph(TargetState)
  .addNode('detectTargetsFromArguments', detectTargetsFromArguments)
  .addNode('askForTarget', askForTarget)
  .addNode('resolveFiles', resolveFiles)
  .addNode('confirmFiles', confirmFiles)
  .addConditionalEdges(
    START,
    (state) => (hasTargetArgument(state) ? 'detectTargetsFromArguments' : 'askForTarget'),
    ['detectTargetsFromArguments', 'askForTarget'],
  )
  .addEdge('detectTargetsFromArguments', 'resolveFiles')
  .addEdge('askForTarget', 'resolveFiles')
  .addEdge('resolveFiles', 'confirmFiles')
  .addEdge('confirmFiles', END)
  .compile({ name: 'target-selection' });

export async function selectTarget(context: ReviewContext): Promise<{ targets: Target[]; files: string[] }> {
  const { targets, files, confirmed } = await targetSelectionGraph.invoke({ context, targets: [] });
  return { targets, files: confirmed ? files : [] };
}
