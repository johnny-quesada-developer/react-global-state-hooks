import React, { useEffect, useRef } from 'react';
import { cn } from '@src/shared/tools/cn';
import { messagesLog$ } from '@src/pages/main_tab/hooks/messagesLog';
import type { MessagesLog } from '@src/pages/main_tab/hooks/messagesLog';

export type MessagesTabProps = React.HTMLAttributes<HTMLDivElement> & {};

export const MessagesTab: React.FC<MessagesTabProps> = ({ className = '', ...props }: MessagesTabProps) => {
  const rowsContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(messagesLog$.getState());
  const renderedLengthRef = useRef(0);
  const renderedDroppedCountRef = useRef(0);

  useEffect(() => {
    const rowsContainer = rowsContainerRef.current;
    if (!rowsContainer) return;

    const createMessageNodes = (message: MessagesLog, globalIndex: number) => {
      const indexElement = document.createElement('div');
      indexElement.textContent = `${globalIndex}. `;

      const actionWrapper = document.createElement('div');
      actionWrapper.title = 'Click to log the message to the console';

      const actionButton = document.createElement('button');
      actionButton.className = 'text-blue-500 hover:underline';
      actionButton.type = 'button';
      actionButton.dataset.messageId = message.id;
      actionButton.textContent = `${message.action}/${String((message.payload as { action?: unknown })?.action ?? '')}`;
      actionWrapper.appendChild(actionButton);

      const dateElement = document.createElement('div');
      const date = new Date(message.timestamp);
      const time = date.toLocaleTimeString('en-US', { hour12: false });
      const milliseconds = date.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
      dateElement.textContent = `${time} ${milliseconds}ms`;

      const separator = document.createElement('div');
      separator.className = 'h-0.5 col-span-3 border-b';

      return [indexElement, actionWrapper, dateElement, separator];
    };

    const appendFrom = (startIndex: number) => {
      const adapter = messagesRef.current;
      const fragment = document.createDocumentFragment();

      for (let index = startIndex; index < adapter.ids.length; index++) {
        const messageId = adapter.ids[index];
        const message = adapter.get(messageId);
        if (!message) continue;

        const globalIndex = adapter.getBaseIndex() + index + 1;
        const [indexElement, actionWrapper, dateElement, separator] = createMessageNodes(message, globalIndex);

        fragment.appendChild(indexElement);
        fragment.appendChild(actionWrapper);
        fragment.appendChild(dateElement);
        fragment.appendChild(separator);
      }

      rowsContainer.appendChild(fragment);
      renderedLengthRef.current = adapter.length;
      renderedDroppedCountRef.current = adapter.getBaseIndex();
    };

    const rebuildAll = () => {
      rowsContainer.replaceChildren();
      renderedLengthRef.current = 0;
      appendFrom(0);
    };

    const clickHandler = (event: Event) => {
      const buttonElement = (event.target as HTMLElement).closest(
        'button[data-message-id]'
      ) as HTMLButtonElement | null;

      if (!buttonElement) return;

      const messageId = buttonElement.dataset.messageId;
      if (!messageId) return;

      const message = messagesRef.current.get(messageId);
      if (!message) return;

      console.log(message.payload);
    };

    rowsContainer.addEventListener('click', clickHandler);
    rebuildAll();

    const unsubscribe = messagesLog$.subscribe((state) => {
      messagesRef.current = state;

      const didTruncate = renderedDroppedCountRef.current !== state.getBaseIndex();
      const didReset = state.length < renderedLengthRef.current;

      if (didTruncate || didReset) {
        rebuildAll();
        return;
      }

      appendFrom(renderedLengthRef.current);
    });

    return () => {
      unsubscribe?.();
      rowsContainer.removeEventListener('click', clickHandler);
      rowsContainer.replaceChildren();
      renderedLengthRef.current = 0;
      renderedDroppedCountRef.current = 0;
    };
  }, []);

  return (
    <div className={cn('h-full overflow-y-scroll', className)} {...props}>
      <div className="grid grid-cols-3 auto-rows-auto gap-1 py-1 px-2">
        <div>Index</div>
        <div>Action</div>
        <div>Timestamp</div>

        <div ref={rowsContainerRef} className="contents" />
      </div>
    </div>
  );
};

export default MessagesTab;
