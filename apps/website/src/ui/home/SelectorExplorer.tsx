import { useState } from 'react';
import { Icon } from '../Icon';
import { CodeList } from './CodeList';

const users = [
  { name: 'Ada', active: true, role: 'admin' },
  { name: 'Grace', active: true, role: 'user' },
  { name: 'Lin', active: true, role: 'admin' },
  { name: 'Sam', active: true, role: 'user' },
  { name: 'Morgan', active: false, role: 'admin' },
  { name: 'Alex', active: false, role: 'user' },
];

const hooks = [
  { name: 'useStore', count: 'source', code: `// users: the six records shown in this example\nconst useStore = createGlobalState({\n  users,\n  theme: 'light'\n});`, emphasis: [1] },
  { name: 'useUsers', count: '6 users', code: `const useUsers =\n  useStore.createSelectorHook(\n    state => state.users\n  );\n// Reuse the same hook across components.`, emphasis: [2] },
  { name: 'useActiveUsers', count: '4 active', code: `const useActiveUsers =\n  useUsers.createSelectorHook(\n    users => users.filter(u => u.active),\n    { isEqual: shallowCompare }\n  );`, emphasis: [2] },
  { name: 'useActiveAdmins', count: '2 admins', code: `const useActiveAdmins =\n  useActiveUsers.createSelectorHook(\n    users => users.filter(u => u.role === 'admin'),\n    { isEqual: shallowCompare }\n  );`, emphasis: [2] },
];

const selected = (index: number) =>
  index === 0
    ? '{ users, theme }'
    : (index === 1 ? users : index === 2 ? users.filter((user) => user.active) : users.filter((user) => user.active && user.role === 'admin'))
        .map((user) => user.name)
        .join(', ');

/** Chainable selector hooks: choose a hook to see its definition and the value it selects. */
export function SelectorExplorer() {
  const [index, setIndex] = useState(3);

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-panel border border-[#e1e4ea] bg-[#fafbfe]">
      <div className="flex items-center justify-between border-b border-[#e5e8ef] px-[21px] py-[15px] font-mono text-9 text-[#636a7a]">
        <span>SELECTOR COMPOSITION</span>
        <Icon name="branch" className="size-[14px]" />
      </div>
      <div className="px-7 pt-[22px] pb-[19px] max-lg:px-[17px] max-lg:py-5 max-sm:p-[21px]" aria-label="Explore nested selector hooks">
        {hooks.map((hook, depth) => (
          <div className="selector-row relative flex pl-[calc(var(--depth)*23px)] max-lg:pl-[calc(var(--depth)*13px)] max-sm:pl-[calc(var(--depth)*15px)] [&+&]:mt-[10px]" style={{ '--depth': depth } as React.CSSProperties} key={hook.name}>
            <button
              type="button"
              className={`flex w-full items-center gap-[10px] rounded-[5px] border px-3 py-[10px] text-left font-mono text-11 transition-[border-color,background] duration-200 hover:border-[#bac5da] max-lg:gap-[7px] max-lg:p-[10px] max-lg:text-9 max-sm:p-[11px] max-sm:text-10 ${index === depth ? 'border-[#b6c3dc] bg-[#eef2fa] text-[#51688e]' : 'border-[#dfe4ed] bg-paper text-[#606b7d]'}`}
              aria-pressed={index === depth}
              onClick={() => setIndex(depth)}
            >
              <span className={`size-[7px] rotate-45 rounded-[2px] border ${index === depth ? 'border-[#7c92b7] bg-[#7c92b7]' : 'border-[#aab8cd]'}`} />
              {hook.name}
              <span className={`ml-auto font-sans text-9 whitespace-nowrap max-lg:text-8 ${index === depth ? 'text-[#5c6b86]' : 'text-[#646b76]'}`}>{hook.count}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-[#e1e6ef] bg-paper px-[22px] py-4 max-lg:p-[15px] max-sm:px-[17px] max-sm:py-4 [&_.emphasis]:bg-[#f0f3fb] [&_.ln]:w-[23px] [&_.ln]:text-9">
        <CodeList code={hooks[index].code} emphasis={hooks[index].emphasis} animationKey={index} label="Selected hook example" className="min-h-[100px] text-11 leading-5 max-lg:text-10 max-sm:text-9" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#edf0f5] px-[23px] py-[11px] font-mono text-9 text-[#626b7a] max-lg:px-[15px] max-lg:text-8 max-sm:px-[18px] max-sm:py-3">
        <span>
          SELECTED → <b className="font-medium text-[#586e94]">{selected(index)}</b>
        </span>
        <span>Click any hook ↑</span>
      </div>
    </div>
  );
}
