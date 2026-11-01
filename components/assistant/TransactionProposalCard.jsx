'use client';

import { useState } from 'react';
import { AlertCircle, Check, CheckCheck, CheckCircle2, Loader2, Receipt, RotateCcw, Trash2 } from 'lucide-react';

// Interactive transaction proposal parsed from the assistant reply (approve / edit / roll back).
export default function TransactionProposalCard({ initialItems, userCurrency = 'INR', onCreated }) {
  const [items, setItems] = useState(initialItems || []);
  const [status, setStatus] = useState('pending'); // 'pending' | 'saving' | 'approved' | 'rolling_back' | 'rolled_back' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [createdTransactions, setCreatedTransactions] = useState([]);

  const currencySymbol = userCurrency === 'USD' ? '$' : '₹';
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const handleCreateAll = async () => {
    if (items.length === 0 || status === 'saving' || status === 'approved') return;
    setStatus('saving');
    setErrorMsg('');

    try {
      const createdList = [];
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      for (const item of items) {
        const amt = parseFloat(item.amount);
        if (isNaN(amt) || amt <= 0) continue;

        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title?.trim() || 'Untitled Expense',
            amount: amt,
            type: item.type || 'SPENDING',
            useSalaryBalance: item.useSalaryBalance !== false,
            salaryMonth: item.salaryMonth || currentMonth,
            salaryYear: item.salaryYear || currentYear,
            description: item.description || 'Logged via AI Assistant Receipt OCR',
            date: item.date ? new Date(item.date).toISOString() : now.toISOString(),
            isAiGenerated: true
          })
        });

        if (res.ok) {
          const entryData = await res.json();
          createdList.push({
            id: entryData.id,
            title: entryData.title || item.title,
            amount: parseFloat(entryData.amount) || amt,
            type: entryData.type || item.type || 'SPENDING',
            date: entryData.date || item.date || now.toISOString(),
          });
        } else {
          let errText = 'Failed to create transaction.';
          try {
            const errData = await res.json();
            errText = errData.error || errData.message || errText;
          } catch (e) {
            try {
              const raw = await res.text();
              if (raw) errText = raw.slice(0, 100);
            } catch (e2) { }
          }
          throw new Error(errText);
        }
      }

      setCreatedTransactions(createdList);
      setStatus('approved');
      if (onCreated) onCreated(createdList.length, totalAmount);
    } catch (err) {
      console.error('Error creating transactions:', err);
      setErrorMsg(err.message || 'Failed to create transactions.');
      setStatus('error');
    }
  };

  // Undo / Rollback created transactions
  const handleRollback = async () => {
    if (createdTransactions.length === 0 || status === 'rolling_back') return;
    if (!confirm(`Are you sure you want to rollback and delete these ${createdTransactions.length} recorded transactions from your ledger?`)) return;

    setStatus('rolling_back');
    setErrorMsg('');

    try {
      const idsToDelete = createdTransactions.map(t => t.id).filter(Boolean);
      const res = await fetch('/api/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      if (res.ok) {
        setStatus('rolled_back');
        if (onCreated) onCreated(0, 0);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to rollback transactions.');
      }
    } catch (err) {
      console.error('Error during rollback:', err);
      setErrorMsg(err.message || 'Failed to rollback transactions.');
      setStatus('approved'); // keep approved state if rollback fails
    }
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  if (items.length === 0 && status !== 'approved' && status !== 'rolled_back') return null;

  return (
    <div className="my-4 p-4 rounded-xl bg-slate-50/90 dark:bg-[var(--background-elevated)] border border-slate-200/90 dark:border-[var(--border-default)] shadow-sm backdrop-blur-xl text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/90 dark:border-[var(--border-default)] gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-[var(--foreground)] tracking-wide truncate">
              {status === 'approved'
                ? 'Transactions Successfully Added'
                : status === 'rolled_back'
                  ? 'Transactions Rolled Back'
                  : 'Receipt OCR Proposal'}
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-[var(--foreground-muted)] font-mono block">
              {status === 'approved' ? (
                <span>
                  {createdTransactions.length} recorded entries • Total: <strong className="text-emerald-500 font-mono font-bold">{currencySymbol}{totalAmount.toLocaleString()}</strong>
                </span>
              ) : status === 'rolled_back' ? (
                <span className="text-amber-500">
                  {createdTransactions.length} entries removed from ledger
                </span>
              ) : (
                <span>
                  {items.length} {items.length === 1 ? 'item' : 'items'} detected • Total: <strong className="text-emerald-500 font-mono font-bold">{currencySymbol}{totalAmount.toLocaleString()}</strong>
                </span>
              )}
            </span>
          </div>
        </div>

        {status === 'approved' ? (
          <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-mono uppercase tracking-wider rounded-md flex items-center gap-1 shrink-0 font-semibold">
            <CheckCheck className="w-3 h-3" /> Recorded
          </span>
        ) : status === 'rolled_back' ? (
          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-mono uppercase tracking-wider rounded-md flex items-center gap-1 shrink-0 font-semibold">
            <RotateCcw className="w-3 h-3" /> Undone
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-mono uppercase tracking-wider rounded-md shrink-0 font-semibold">
            Pending Approval
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Items List (Pending or Approved) */}
      {status === 'rolled_back' ? (
        <div className="my-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-left">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300 text-xs font-semibold">
            <RotateCcw className="w-4 h-4" />
            <span>All {createdTransactions.length} transactions have been successfully undone and deleted.</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[var(--foreground-muted)] mt-1 font-mono">
            Your e-Passbook balance and monthly deductions have been automatically restored.
          </p>
          <button
            type="button"
            onClick={() => setStatus('pending')}
            className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
          >
            Re-open proposal to edit or re-approve
          </button>
        </div>
      ) : status === 'approved' ? (
        /* Successfully Added List with Total Amount */
        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-800 dark:text-[var(--foreground)] font-medium">Grand Total Added</span>
            <span className="font-mono font-bold text-emerald-500 text-sm">{currencySymbol}{totalAmount.toLocaleString()}</span>
          </div>

          {createdTransactions.map((tx, idx) => (
            <div key={tx.id || idx} className="p-2.5 bg-white dark:bg-[var(--background-base)] border border-emerald-500/15 rounded-lg flex items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-4 h-4 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-bold flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </span>
                <span className="text-xs font-sans text-slate-800 dark:text-[var(--foreground)] truncate font-medium">
                  {tx.title}
                </span>
                <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 font-semibold">
                  {tx.type}
                </span>
              </div>
              <div className="text-xs font-bold text-emerald-500 shrink-0">
                {currencySymbol}{tx.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Pre-approval Editable Items List */
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div key={idx} className="p-2.5 bg-white dark:bg-[var(--background-base)] border border-slate-200/90 dark:border-[var(--border-default)] hover:border-indigo-500/30 rounded-lg flex items-center justify-between gap-3 transition-all">
              <div className="flex-1 min-w-0 flex items-center gap-2 font-mono">
                <span className="w-4 h-4 rounded bg-slate-100 dark:bg-[var(--surface-active)] text-slate-500 dark:text-[var(--foreground-muted)] text-[9px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  disabled={status === 'saving'}
                  value={item.title}
                  onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                  placeholder="Item name"
                  className="bg-transparent border-b border-transparent focus:border-indigo-500 text-xs font-sans text-slate-900 dark:text-[var(--foreground)] placeholder-slate-400 dark:placeholder-[var(--foreground-muted)] focus:outline-none w-full truncate disabled:opacity-80 font-medium"
                />
                <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 font-semibold">
                  {item.type || 'SPENDING'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                  <span>{currencySymbol}</span>
                  <input
                    type="number"
                    disabled={status === 'saving'}
                    value={item.amount}
                    onChange={(e) => handleUpdateItem(idx, 'amount', e.target.value)}
                    className="bg-transparent text-xs font-bold text-emerald-500 focus:outline-none w-14 text-right disabled:opacity-80"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 text-slate-400 dark:text-[var(--foreground-muted)] hover:text-rose-500 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Footer */}
      {status === 'pending' || status === 'saving' || status === 'error' ? (
        <div className="mt-3.5 pt-3 border-t border-slate-200/90 dark:border-[var(--border-default)] flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-500 dark:text-[var(--foreground-muted)] font-mono">
            Deducts from active salary balance
          </span>
          <button
            type="button"
            disabled={status === 'saving' || items.length === 0}
            onClick={handleCreateAll}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all"
          >
            {status === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Approve All ({currencySymbol}{totalAmount.toLocaleString()})</span>
              </>
            )}
          </button>
        </div>
      ) : status === 'approved' ? (
        <div className="mt-3.5 pt-3 border-t border-slate-200/90 dark:border-[var(--border-default)] flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-mono font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Recorded into e-Passbook</span>
          </span>

          {/* Rollback / Undo Button */}
          <button
            type="button"
            disabled={status === 'rolling_back'}
            onClick={handleRollback}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title="Undo and delete newly created transactions"
          >
            {status === 'rolling_back' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Rolling back...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo / Rollback</span>
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
