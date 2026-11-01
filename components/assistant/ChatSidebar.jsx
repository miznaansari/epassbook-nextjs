'use client';

import { useMemo, useState } from 'react';
import { MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/States';

const DAY = 24 * 60 * 60 * 1000;

function groupSessions(sessions) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const groups = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] },
  ];
  for (const s of sessions) {
    const at = new Date(s.updatedAt || s.createdAt || 0).getTime();
    if (at >= t0) groups[0].items.push(s);
    else if (at >= t0 - DAY) groups[1].items.push(s);
    else if (at >= t0 - 7 * DAY) groups[2].items.push(s);
    else groups[3].items.push(s);
  }
  return groups.filter(g => g.items.length);
}

/** Chat history list: search, new chat, sessions grouped by recency. */
export default function ChatSidebar({ sessions, activeSessionId, isLoading, onSelect, onCreate, onDelete }) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? sessions.filter(s => (s.title || '').toLowerCase().includes(q)) : sessions;
    return groupSessions(list);
  }, [sessions, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-fg shadow-glow-primary hover:bg-primary-hover transition cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> New chat
        </button>
        <label className="flex items-center gap-2 rounded-xl bg-card-2 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
          <span className="sr-only">Search chats</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
          />
        </label>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 sidebar-scrollbar" aria-label="Chat history">
        {isLoading ? (
          <div className="space-y-2 px-1 pt-1">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-9 rounded-lg" />)}
          </div>
        ) : groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-ink-3">{query ? 'No chats match your search.' : 'No chats yet. Ask anything to start one.'}</p>
        ) : (
          groups.map(group => (
            <div key={group.label} className="mt-2 first:mt-0">
              <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map(s => {
                  const active = s.id === activeSessionId;
                  return (
                    <li key={s.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(s.id)}
                        aria-current={active ? 'true' : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-lg py-2 pl-2.5 pr-9 text-left text-[13px] transition-colors cursor-pointer ${
                          active ? 'bg-primary-soft font-semibold text-primary-ink' : 'text-ink-2 hover:bg-card-2 hover:text-ink'
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                        <span className="truncate">{s.title || 'New chat'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => onDelete(e, s.id)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-3 hover:bg-danger-soft hover:text-danger-ink md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition cursor-pointer"
                        aria-label={`Delete chat ${s.title || ''}`}
                        title="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
    </div>
  );
}
