'use client';

import TransactionProposalCard from './TransactionProposalCard';

// Parse message content to render markdown elements (bold, inline code, tables, lists, HR, and interactive proposal cards)
export const formatMessageContent = (content, isAi = false, userCurrency = 'INR', onCreated = null) => {
  if (!content) return [];

  // Check for embedded proposal JSON blocks
  const proposalRegex = /```(?:json:transaction_proposal|json)\s*([\s\S]*?\{[\s\S]*?"items"[\s\S]*?\})\s*```/;
  const proposalMatch = content.match(proposalRegex);

  let proposalItems = null;
  let textToRender = content;

  if (proposalMatch) {
    try {
      const parsed = JSON.parse(proposalMatch[1]);
      if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
        proposalItems = parsed.items;
      }
    } catch (err) {
      console.error('Error parsing transaction proposal JSON:', err);
    }
    // Remove the raw proposal code block from textual render
    textToRender = content.replace(proposalRegex, '').trim();
  }

  const renderTextWithFormatting = (text) => {
    if (!text) return '';
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = text.split(regex);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={idx} className="font-extrabold text-slate-900 dark:text-[var(--foreground)] bg-slate-200/80 dark:bg-[var(--surface-active)] px-1 py-0.5 rounded">
            {boldText}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.slice(1, -1);
        return (
          <code key={idx} className="font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold">
            {codeText}
          </code>
        );
      }
      return part;
    });
  };

  const renderCellContent = (cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith('+')) {
      return <span className="text-emerald-500 font-semibold font-mono">{renderTextWithFormatting(cell)}</span>;
    }
    if (trimmed.startsWith('-') && !trimmed.startsWith('---')) {
      return <span className="text-rose-500 font-semibold font-mono">{renderTextWithFormatting(cell)}</span>;
    }
    return renderTextWithFormatting(cell);
  };

  const lines = textToRender.split('\n');
  const elements = [];
  let currentTable = null;
  let currentList = null; // { type: 'ul'|'ol', items: [] }
  let paragraphText = [];

  const flushParagraph = (key) => {
    if (paragraphText.length > 0) {
      const text = paragraphText.join('\n').trim();
      if (text) {
        elements.push(
          <p key={`p-${key}`} className="whitespace-pre-line break-words mb-3 last:mb-0 leading-relaxed text-slate-800 dark:text-[var(--foreground)]">
            {renderTextWithFormatting(text)}
          </p>
        );
      }
      paragraphText = [];
    }
  };

  const flushTable = (key) => {
    if (currentTable) {
      elements.push(
        <div key={`table-wrapper-${key}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200/90 dark:border-[var(--border-default)] bg-white dark:bg-[var(--background-elevated)] shadow-xs">
          <table className="w-full border-collapse text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-200/90 dark:border-[var(--border-default)] bg-slate-50 dark:bg-[var(--surface-hover)]">
                {currentTable.headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-slate-600 dark:text-[var(--foreground-muted)] font-bold">
                    {renderTextWithFormatting(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-[var(--border-default)]">
              {currentTable.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-[var(--surface-hover)] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5 text-slate-900 dark:text-[var(--foreground)]">
                      {renderCellContent(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = null;
    }
  };

  const flushList = (key) => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${key}`} className="list-disc list-inside space-y-1.5 my-3 pl-2 leading-relaxed text-slate-800 dark:text-[var(--foreground)]">
            {currentList.items.map((item, itemIdx) => (
              <li key={itemIdx}>
                {renderTextWithFormatting(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${key}`} className="list-decimal list-inside space-y-1.5 my-3 pl-2 leading-relaxed text-slate-800 dark:text-[var(--foreground)]">
            {currentList.items.map((item, itemIdx) => (
              <li key={itemIdx}>
                {renderTextWithFormatting(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  const flushAll = (key) => {
    flushParagraph(key);
    flushTable(key);
    flushList(key);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Table parsing
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushParagraph(i);
      flushList(i);

      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator) {
        continue;
      }

      if (!currentTable) {
        currentTable = {
          headers: cells,
          rows: [],
        };
      } else {
        const rowCells = [...cells];
        while (rowCells.length < currentTable.headers.length) {
          rowCells.push('');
        }
        currentTable.rows.push(rowCells.slice(0, currentTable.headers.length));
      }
    }
    // 2. Unordered list parsing
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph(i);
      flushTable(i);

      const itemText = trimmed.slice(2).trim();
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(itemText);
      } else {
        flushList(i);
        currentList = {
          type: 'ul',
          items: [itemText],
        };
      }
    }
    // 3. Ordered list parsing
    else if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph(i);
      flushTable(i);

      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      const itemText = match ? match[2].trim() : trimmed;
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(itemText);
      } else {
        flushList(i);
        currentList = {
          type: 'ol',
          items: [itemText],
        };
      }
    }
    // 4. Horizontal Rule
    else if (trimmed === '---' || trimmed === '***') {
      flushAll(i);
      elements.push(<hr key={`hr-${i}`} className="my-4 border-slate-200/90 dark:border-[var(--border-default)]" />);
    }
    // 5. Normal text / empty line
    else {
      if (trimmed === '') {
        flushAll(i);
      } else {
        flushTable(i);
        flushList(i);
        paragraphText.push(line);
      }
    }
  }

  flushAll(lines.length);

  // If there are proposed transactions, append the interactive proposal card
  if (proposalItems) {
    elements.push(
      <TransactionProposalCard
        key="proposal-card"
        initialItems={proposalItems}
        userCurrency={userCurrency}
        onCreated={onCreated}
      />
    );
  }

  return elements;
};

export default formatMessageContent;
