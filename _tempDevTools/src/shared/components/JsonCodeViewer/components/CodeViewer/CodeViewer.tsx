import React, { ComponentProps, useEffect, useRef, useState } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion } from '@codemirror/autocomplete';
import { isNumber } from 'json-storage-formatter/isNumber';
import { isNil } from 'json-storage-formatter/isNil';
import { useMountEffect } from '@src/pages/main_tab/hooks/useMountEffect';
import { CodeEditorElement } from '../../../CodeEditorElement';
import { codeViewer$ } from '../../stores';
import { useStableCallback } from '@src/pages/main_tab/hooks/useStableCallback';
import { tryCatch } from 'easy-cancelable-promise/tryCatch';
import { foldAll, unfoldAll } from '@codemirror/language';
import { cn } from '@src/shared/tools/cn';

export type CodeViewerProps = ComponentProps<'div'>;

export const CodeViewer: React.FC<CodeViewerProps> = ({ className = '', children, ...props }) => {
  const { metadata } = codeViewer$.use.api();
  const src = codeViewer$.use.select(({ src }) => src);
  const collapsed = codeViewer$.use.select(({ collapsed }) => collapsed);

  const [temporaryOutput, setTemporaryOutput] = useState('');
  const [error, setError] = useState<Error | null>(null);

  const codeEditorElementRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  const onChange = useStableCallback((doc: string) => {
    setTemporaryOutput(doc);
  });

  const commitTemporaryOutput = () => {
    const { result: envelop, error } = tryCatch(() => JSON.parse(temporaryOutput) as { value: unknown });

    if (error) {
      setError(new Error('Invalid JSON'));
      return;
    }

    metadata.onEdit?.(envelop.value);
    setTemporaryOutput('');
    setError(null);
  };

  const discardTemporaryOutput = () => {
    editorRef.current?.dispatch({
      changes: {
        from: 0,
        to: editorRef.current.state.doc.length,
        insert: JSON.stringify(src, null, 4),
      },
    });

    setTemporaryOutput('');
  };

  useMountEffect(function initializeCodeEditor() {
    const editor = new EditorView({
      parent: codeEditorElementRef.current!,
    });

    editorRef.current = editor;

    return () => editor?.destroy();
  });

  useEffect(
    function syncSrc() {
      if (!editorRef.current) return;

      const editorState = EditorState.create({
        doc: JSON.stringify(src, null, 4),
        extensions: codeEditorExtensions({
          editable: !isNil(metadata.onEdit),
          onChange,
        }),
      });

      editorRef.current.setState(editorState);
    },
    [onChange, metadata, src]
  );

  useEffect(
    function syncCollapsed() {
      if (!editorRef.current) return;

      const shouldUnfold = isNumber(collapsed) || collapsed === false;
      (shouldUnfold ? unfoldAll : foldAll)(editorRef.current);
    },
    [collapsed]
  );

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      {metadata.onEdit && (
        <div className="flex items-center justify-end gap-2 pt-2">
          {Boolean(temporaryOutput) && (
            <button
              type="button"
              onClick={discardTemporaryOutput}
              className="rounded-md border border-gray-400 px-3 py-1 text-xs text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Discard
            </button>
          )}

          {!error && (
            <button
              disabled={!temporaryOutput}
              type="button"
              onClick={commitTemporaryOutput}
              className={cn(
                'rounded-md bg-blue-500 px-3 py-1 text-xs text-white  disabled:cursor-not-allowed disabled:opacity-50',
                {
                  'hover:bg-blue-600': !!temporaryOutput,
                }
              )}
            >
              Set State
            </button>
          )}
        </div>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error.message}</div>}

      <CodeEditorElement ref={codeEditorElementRef} className={cn('h-full flex-1 min-h-0 relative')}>
        {children}
      </CodeEditorElement>
    </div>
  );
};

function codeEditorExtensions({
  editable = false,
  onChange,
}: {
  editable: boolean;
  onChange?: (doc: string) => void;
}): any[] {
  return [
    basicSetup,
    javascript({ typescript: false }),
    EditorView.lineWrapping,
    autocompletion({}),
    EditorState.readOnly.of(!editable),
    EditorView.editable.of(editable),

    EditorView.theme({
      '.cm-activeLine': { backgroundColor: 'transparent' },
      '.cm-activeLineGutter': { backgroundColor: 'transparent' },
    }),

    EditorView.updateListener.of((update) => {
      if (!update.docChanged || !onChange) return;
      onChange(update.state.doc.toString());
    }),
  ];
}

export default CodeViewer;
