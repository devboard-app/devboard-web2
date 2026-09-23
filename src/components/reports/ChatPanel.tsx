import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '@/hooks/useChat';

export function ChatPanel({ projectId, projectName }: { projectId: string; projectName?: string }) {
  const { messages, send, sending, error } = useChat(projectId, projectName);
  const [input, setInput] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    void send(input);
    setInput('');
  }

  return (
    <div className="max-w-2xl bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-96">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Ask about velocity, burndown, or who's been active.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}>
            <span className={`inline-block px-3 py-2 rounded-lg max-w-[85%] text-left ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white whitespace-pre-wrap'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 [&_table]:text-xs [&_th]:border [&_th]:border-zinc-300 [&_th]:dark:border-zinc-700 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-zinc-300 [&_td]:dark:border-zinc-700 [&_td]:px-2 [&_td]:py-1 [&_p]:mb-2 last:[&_p]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4'
            }`}>
              {m.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
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
