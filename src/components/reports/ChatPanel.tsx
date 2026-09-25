import { useEffect, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '@/hooks/useChat';

// Styles for rendered Markdown in assistant bubbles, including full documents
// (headings, numbered lists, code) the model writes when asked for a report.
const MARKDOWN_CLS = [
  'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
  '[&_p]:mb-2 last:[&_p]:mb-0 [&_strong]:font-semibold',
  '[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1',
  '[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:mb-2 [&_ol]:mb-2',
  '[&_code]:font-mono [&_code]:text-xs [&_code]:bg-zinc-200 [&_code]:dark:bg-zinc-700 [&_code]:px-1 [&_code]:rounded',
  '[&_pre]:bg-zinc-200 [&_pre]:dark:bg-zinc-700 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-2 [&_blockquote]:text-zinc-500',
  '[&_table]:text-xs [&_th]:text-left [&_th]:border [&_th]:border-zinc-300 [&_th]:dark:border-zinc-700 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-zinc-300 [&_td]:dark:border-zinc-700 [&_td]:px-2 [&_td]:py-1',
].join(' ');

// A wide table scrolls sideways inside the bubble instead of spilling out of the panel.
const MARKDOWN_COMPONENTS: Components = {
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto max-w-full mb-2">
      <table {...props} className="min-w-full border-collapse" />
    </div>
  ),
};

// Mirrors the analytics chat tools: velocity and burndown are lead-only, and a
// non-lead's activity report only ever contains their own actions.
const LEAD_SUGGESTIONS = [
  'How is the current sprint going?',
  "What's our velocity over the last sprints?",
  'Who did what on this project?',
];
const CONTRIBUTOR_SUGGESTIONS = [
  'What have I worked on recently?',
  'Summarize my activity on this project',
];

function ChatIntro({ projectName, isLead, onPick }: { projectName?: string; isLead: boolean; onPick: (q: string) => void }) {
  return (
    <div className="pt-2">
      <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2v-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Ask about {projectName ?? 'this project'}</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
        {isLead
          ? "I answer from this project's data: sprint velocity, burndown, and who worked on what."
          : "I answer from this project's data. As a contributor you can ask about your own activity; velocity and burndown are for project leads."}
      </p>
      <p className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-600 uppercase mt-5 mb-2">Try asking</p>
      <div className="flex flex-col items-start gap-1.5">
        {(isLead ? LEAD_SUGGESTIONS : CONTRIBUTOR_SUGGESTIONS).map(q => (
          <button key={q} type="button" onClick={() => onPick(q)}
            className="text-left text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            {q}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-5">General coding questions and other projects are out of scope.</p>
    </div>
  );
}

export function ChatPanel({ projectId, projectName, isLead, onClose }: {
  projectId: string; projectName?: string; isLead: boolean; onClose: () => void;
}) {
  const { messages, send, sending, error, clear } = useChat(projectId, projectName);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // Keep the newest message in view: jump there when the panel opens (a kept
  // conversation), glide there when a message, "Thinking…" or an error appears.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: hasScrolled.current ? 'smooth' : 'auto' });
    hasScrolled.current = true;
  }, [messages.length, sending, error]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    void send(input);
    setInput('');
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header stays put while the conversation scrolls, so Clear is always reachable. */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex-1">Chat · {projectName ?? 'Project'}</p>
        {messages.length > 0 && !sending && (
          <button type="button" onClick={clear}
            className="px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            Clear
          </button>
        )}
        <button onClick={onClose} aria-label="Close chat"
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !sending && (
          <ChatIntro projectName={projectName} isLead={isLead} onPick={q => void send(q)} />
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}>
            {/* Answers get the full width (tables need it); questions stay compact on the right. */}
            <span className={`inline-block px-3 py-2 rounded-lg text-left ${
              m.role === 'user' ? 'max-w-[85%] bg-indigo-600 text-white whitespace-pre-wrap' : `max-w-full min-w-0 ${MARKDOWN_CLS}`
            }`}>
              {m.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>{m.text}</ReactMarkdown>
              ) : (
                m.text
              )}
            </span>
          </div>
        ))}
        {sending && <p className="text-sm text-zinc-400 dark:text-zinc-500">Thinking…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-zinc-100 dark:border-zinc-800 p-3 flex gap-2">
        <input
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        />
        <button type="submit" disabled={sending || !input.trim()}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
