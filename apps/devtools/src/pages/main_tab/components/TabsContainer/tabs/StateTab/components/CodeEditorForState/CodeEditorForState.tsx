import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@src/shared/tools/cn';
import { stringifyPayload } from '@src/pages/main_tab/util/stringifyPayload';
import { assertIsNonNullable, isError } from '@src/shared/asserts';
import { EditorView, basicSetup } from 'codemirror';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { useSendMessagesToContentScript } from '@src/pages/main_tab/hooks/useSendMessagesToContentScript';
import ErrorBanner from './components/ErrorBanner';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import logsArray$ from '@src/pages/main_tab/hooks/logsArray';
import { wait } from '@src/shared/tools/promises';
import useStateMeta from '@src/pages/main_tab/hooks/globalStates/hooks/useStateMeta';

export type CodeEditorProps = React.HTMLAttributes<HTMLDivElement> & {};

export const CodeEditorForState: React.FC<CodeEditorProps> = ({ className = '', ...props }: CodeEditorProps) => {
  const [trigger, setState] = useState({});
  const forceUpdate = useCallback(() => setState({}), []);

  const errorOutputRef = useRef<HTMLButtonElement | null>(null);
  const editorElementRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);

  const [temporaryStringPayload, setTemporaryStringPayload] = useState<{
    value: string | null;
    logId: string | null;
  }>({
    value: null,
    logId: null,
  });

  const [globalStateId] = selectedGlobalStateId$();
  const [currentState] = useStateMeta(globalStateId, (state) => state?.currentState ?? null);
  const { messageError, sendMessageToContentScript } = useSendMessagesToContentScript();

  const [logs] = logsArray$();
  const payloadExamples = useMemo(() => {
    // takes the last 3 non repetitive payloads for the action as examples
    const last3ExecutedActions = new Map<string, string>();

    for (let index = logs.length - 1; index >= 0; index--) {
      if (last3ExecutedActions.size > 3) break;

      const log = logs[index];
      // only set state examples
      if (log.subAction !== 'setState') continue;

      const payloadString = stringifyPayload(log.payload);
      if (last3ExecutedActions.has(payloadString)) continue;

      last3ExecutedActions.set(payloadString, log.logId);
    }

    return [...last3ExecutedActions.entries()].map(([payload, logId]) => ({
      payload,
      logId,
    }));
  }, [trigger, logs]);

  const [firstExample] = payloadExamples ?? [];

  useEffect(() => {
    setTemporaryStringPayload({
      value: firstExample?.payload ?? null,
      logId: firstExample?.logId ?? null,
    });
  }, [firstExample?.logId, firstExample?.payload]);

  // initialize the code editor
  useEffect(() => {
    const initialState = EditorState.create({
      doc: (() => {
        if (temporaryStringPayload.value) {
          return temporaryStringPayload.value;
        }

        return JSON.stringify(currentState, null, 2);
      })(),
      extensions: [basicSetup, javascript({ typescript: false }), EditorView.lineWrapping, autocompletion({})],
    });

    const editor = new EditorView({
      state: initialState,
      parent: editorElementRef.current!,
    });

    editorRef.current = editor;

    return () => editor?.destroy();
  }, [currentState, temporaryStringPayload]);

  if (messageError) {
    return <ErrorBanner messageError={messageError} />;
  }

  return (
    <div
      className={cn(
        'flex-1 flex flex-col gap-2 border-l h-full px-4 py-4 bg-gray-200 dark:bg-eighties',
        'text-gray-700 dark:text-white',
        className
      )}
      {...props}
    >
      <div className="flex justify-end">
        <button
          ref={errorOutputRef}
          className="_error_output text-red-500"
          onClick={() => {
            assertIsNonNullable(errorOutputRef.current, 'Error output should not be null');

            errorOutputRef.current.innerText = '';
          }}
        ></button>
      </div>

      <div className="flex justify-end">
        <button
          className="bg-blue-500 text-white rounded-md w-20 self-end flex justify-center items-center h-7"
          onClick={async () => {
            assertIsNonNullable(errorOutputRef.current, 'Error output should not be null');
            errorOutputRef.current.innerText = '';

            const editor = editorRef.current;
            if (!editor) return;

            let code = editor.state.doc.toString();

            // remove "," and ";" at the end and beginning of the code
            code = code.replace(/^,+|,+$/g, '');

            try {
              setTemporaryStringPayload({
                value: code,
                logId: null,
              });

              sendMessageToContentScript({
                action: `SET_STATE`,
                payload: {
                  actionName: 'setState',
                  globalStateId,
                  parameters: code,
                },
              });

              await wait(10);

              // force update to refresh the examples
              forceUpdate();
            } catch (error) {
              errorOutputRef.current.innerText = isError(error) ? error.message : 'An error occurred';
            }
          }}
        >
          Set State
        </button>
      </div>

      {Boolean(payloadExamples?.length) && <p>You can use the following examples as a reference:</p>}

      <ul className="flex gap-2">
        {payloadExamples?.map((example, index) => (
          <li key={index} className="flex gap-2">
            <button
              className={cn('hover:underline', {
                'text-blue-500': temporaryStringPayload.logId === example.logId,
              })}
              onClick={() => {
                setTemporaryStringPayload({
                  value: example.payload,
                  logId: example.logId,
                });
              }}
            >
              Example {index + 1}
            </button>
          </li>
        ))}

        {!payloadExamples?.length && <li>No examples available</li>}
      </ul>

      <button
        ref={errorOutputRef}
        className="_error_output text-red-500"
        onClick={() => {
          assertIsNonNullable(errorOutputRef.current, 'Error output should not be null');

          errorOutputRef.current.innerText = '';
        }}
      ></button>

      <div
        ref={editorElementRef}
        className="border border-gray-300 rounded-md w-full bg-white dark:bg-gray-200 dark:text-blue-950"
      ></div>
    </div>
  );
};

export default CodeEditorForState;
