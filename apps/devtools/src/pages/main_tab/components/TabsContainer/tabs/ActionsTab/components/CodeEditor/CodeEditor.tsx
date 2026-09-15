import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@src/shared/tools/cn';
import { useActionParametersLength, useActionsKeys, useSelectedActionKey } from '../../context/actionsContext';
import { stringifyPayload } from '@src/pages/main_tab/util/stringifyPayload';
import { assertIsNonNullable, isError } from '@src/shared/asserts';
import { EditorView, basicSetup } from 'codemirror';
import isNil from 'json-storage-formatter/isNil';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { useSendMessagesToContentScript } from '@src/pages/main_tab/hooks/useSendMessagesToContentScript';
import ErrorBanner from './components/ErrorBanner';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import { useSelectedActionJson } from '../../hooks/useSelectedActionJson';
import { wait } from '@src/shared/tools/promises';
import useStateMeta from '@src/pages/main_tab/hooks/globalStates/hooks/useStateMeta';
import { useActionPerActionKey, useGroupedActionLogs } from '@src/pages/main_tab/hooks/globalStates';

export type CodeEditorProps = React.HTMLAttributes<HTMLDivElement> & {};

export const CodeEditor: React.FC<CodeEditorProps> = ({ className = '', ...props }: CodeEditorProps) => {
  const [trigger, setState] = useState({});
  const forceUpdate = useCallback(() => setState({}), []);

  const actionsKeys = useActionsKeys();
  const errorOutputRef = useRef<HTMLButtonElement>(null);
  const editorElementRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  const [temporaryStringPayload, setTemporaryStringPayload] = useState<{
    value: string | null;
    logId: string | null;
  }>({
    value: null,
    logId: null,
  });

  const [globalStateId] = selectedGlobalStateId$();
  const selectedActionKey = useSelectedActionKey();
  const actionParametersLength = useActionParametersLength();
  const actionJson = useSelectedActionJson();

  const { messageError, sendMessageToContentScript } = useSendMessagesToContentScript();

  const [actions] = useStateMeta(globalStateId, (state) => state?.actions ?? null, [selectedActionKey]);

  const actionPerActionKey = useActionPerActionKey({ stateId: globalStateId });
  const groupedByActionStateLogs = useGroupedActionLogs({ stateId: globalStateId });

  const [payloadExamples] = useStateMeta(globalStateId, () => {
    if (isNil(selectedActionKey)) return null;
    if (isNil(actionPerActionKey)) return null;
    if (isNil(groupedByActionStateLogs)) return null;

    if (isNil(actions) || !Object.keys(actions).length || !actions[selectedActionKey]?.length) {
      // build examples for setState
      return null;
    }

    const callsByActionKey = actionPerActionKey.get(selectedActionKey);
    if (isNil(callsByActionKey)) return null;

    // takes the last 3 non repetitive payloads for the action as examples
    const last3ExecutedActions = new Map<string, string>();

    for (let index = callsByActionKey.length - 1; index >= 0; index--) {
      if (last3ExecutedActions.size > 3) break;

      const actionId = callsByActionKey[index];
      const action = groupedByActionStateLogs.get(actionId);
      if (!action) continue;

      const firstLog = action.logs[0];
      const payloadString = stringifyPayload(firstLog.payload);

      if (last3ExecutedActions.has(payloadString)) continue;

      last3ExecutedActions.set(payloadString, firstLog.logId);
    }

    return [...last3ExecutedActions.entries()].map(([payload, logId]) => ({
      payload,
      logId,
    }));
  }, [trigger, selectedActionKey, actions, actionPerActionKey, groupedByActionStateLogs]);

  const [firstExample] = payloadExamples ?? [];

  const executeActionHandler = useExecuteActionHandler({
    errorOutputRef,
    editorRef,
    setTemporaryStringPayload,
    selectedActionKey,
    globalStateId,
    sendMessageToContentScript,
    forceUpdate,
  });

  useEffect(() => {
    setTemporaryStringPayload({
      value: firstExample?.payload ?? null,
      logId: firstExample?.logId ?? null,
    });
  }, [firstExample?.logId, firstExample?.payload, selectedActionKey]);

  // initialize the code editor
  useEffect(() => {
    const initialState = EditorState.create({
      doc: (() => {
        if (actionsKeys.length && actionParametersLength === 0) {
          return '';
        }

        if (temporaryStringPayload.value) {
          return temporaryStringPayload.value;
        }

        return new Array(actionParametersLength)
          .fill(0)
          .map((_, index) => `param${index + 1}`)
          .join(', ');
      })(),
      extensions: [basicSetup, javascript({ typescript: false }), EditorView.lineWrapping, autocompletion({})],
    });

    const editor = new EditorView({
      state: initialState,
      parent: editorElementRef.current!,
    });

    editorRef.current = editor;

    return () => editor?.destroy();
  }, [actionJson, actionParametersLength, actionsKeys.length, temporaryStringPayload]);

  // clear the error output when the selected action key changes
  useEffect(() => {
    if (isNil(errorOutputRef.current)) return;

    errorOutputRef.current.innerText = '';
  }, [selectedActionKey]);

  if (messageError) {
    return <ErrorBanner messageError={messageError} />;
  }

  return (
    <div
      className={cn(
        'flex-1 flex flex-col gap-2 border-l h-full px-4 py-4 bg-gray-200 dark:bg-eighties',
        'text-gray-700 dark:text-white',
        {
          'w-full': !actionsKeys.length,
        },
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
      <div className="flex justify-end gap-8">
        <h1 className="flex-1 justify-start font-bold border-b">{selectedActionKey}</h1>
        <button
          className="bg-blue-500 text-white rounded-md w-20 self-end flex justify-center items-center h-7"
          title={!actionParametersLength ? 'There are no actions to execute' : ''}
          onClick={executeActionHandler}
        >
          Execute
        </button>
      </div>
      <button
        ref={errorOutputRef}
        className="_error_output text-red-500"
        onClick={() => {
          assertIsNonNullable(errorOutputRef.current, 'Error output should not be null');

          errorOutputRef.current.innerText = '';
        }}
      ></button>

      {Boolean(actionsKeys.length) && (
        <div className="text-sm flex flex-col gap-2">
          <p className="">
            Enter the parameters for the selected action; This action requires {actionParametersLength} parameter
            {actionParametersLength === 1 ? '' : 's'}.
          </p>

          {Boolean(actionParametersLength) && (
            <>
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
            </>
          )}
        </div>
      )}

      {(!selectedActionKey || Boolean(actionParametersLength)) && (
        <div
          ref={editorElementRef}
          className="_editorElementRef border border-gray-300 rounded-md w-full bg-gray-100  dark:bg-gray-300 text-eighties dark:text-blue-700"
        ></div>
      )}

      {selectedActionKey && !actionParametersLength && (
        <div className=" border border-gray-300 rounded-md p-2 ">
          <p>This action doesn't require any parameters.</p>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;

const useExecuteActionHandler = ({
  errorOutputRef,
  editorRef,
  setTemporaryStringPayload,
  selectedActionKey,
  globalStateId,
  sendMessageToContentScript,
  forceUpdate,
}: {
  errorOutputRef: React.RefObject<HTMLButtonElement | null>;
  editorRef: React.RefObject<EditorView | undefined | null>;
  setTemporaryStringPayload: React.Dispatch<React.SetStateAction<{ value: string | null; logId: string | null }>>;
  selectedActionKey: string | null;
  globalStateId: string | null;
  sendMessageToContentScript: ReturnType<typeof useSendMessagesToContentScript>['sendMessageToContentScript'];
  forceUpdate: () => void;
}) => {
  return useCallback(async () => {
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
        action: 'EXECUTE_ACTION',
        payload: {
          actionName: selectedActionKey,
          globalStateId,
          parameters: code,
        },
      });

      await wait(10);

      forceUpdate();
    } catch (error) {
      errorOutputRef.current.innerText = isError(error) ? error.message : 'An error occurred';
    }
  }, [
    errorOutputRef,
    editorRef,
    setTemporaryStringPayload,
    sendMessageToContentScript,
    selectedActionKey,
    globalStateId,
    forceUpdate,
  ]);
};
