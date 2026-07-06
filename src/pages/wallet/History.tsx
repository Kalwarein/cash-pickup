import { useMemo, useState } from 'react';
import { SubPage } from '@/components/wallet/SubPage';
import { Money } from '@/components/wallet/Money';
import { useWallet } from '@/hooks/useWallet';
import { usePaymentTransactions } from '@/hooks/usePaymentTransactions';
import { cn } from '@/lib/utils';
import { Search, Download, ArrowDownLeft, ArrowUpRight, TrendingUp, Gift, RotateCcw, ArrowLeftRight, Receipt } from 'lucide-react';

interface Row {
  id: string; type: string; amount: number; description: string;
  status: string; date: string; method: string; reference: string; cat: string;
}

const CATS = ['All', 'Deposits', 'Withdrawals', 'Transfers', 'Investments', 'Profits', 'Bonuses', 'Refunds'];

const catOf = (type: string): string => {
  const t = type.toLowerCase();
  if (t.includes('deposit')) return 'Deposits';
  if (t.includes('withdraw')) return 'Withdrawals';
  if (t.includes('transfer')) return 'Transfers';
  if (t.includes('invest')) return 'Investments';
  if (t.includes('profit') || t.includes('claim') || t.includes('return')) return 'Profits';
  if (t.includes('bonus') || t.includes('promo') || t.includes('reward')) return 'Bonuses';
  if (t.includes('refund')) return 'Refunds';
  return 'Deposits';
};

const iconOf = (cat: string) => ({
  Deposits: ArrowDownLeft, Withdrawals: ArrowUpRight, Transfers: ArrowLeftRight,
  Investments: TrendingUp, Profits: TrendingUp, Bonuses: Gift, Refunds: RotateCcw,
}[cat] || Receipt);

const History = () => {
  const { transactions } = useWallet();
  const { paymentTransactions } = usePaymentTransactions();
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');

  const rows: Row[] = useMemo(() => {
    const a: Row[] = transactions.map(t => ({
      id: t.id, type: t.type, amount: Number(t.amount), description: t.description || t.type,
      status: 'completed', date: t.created_at, method: 'Wallet', reference: t.id.slice(0, 8).toUpperCase(), cat: catOf(t.type),
    }));
    const b: Row[] = paymentTransactions.map(t => ({
      id: t.id, type: t.type, amount: t.type === 'withdrawal' ? -t.amount : t.amount,
      description: t.type === 'withdrawal' ? 'Withdrawal' : 'Deposit',
      status: t.status, date: t.created_at, method: t.provider || 'Mobile Money',
      reference: (t.reference || t.id).slice(0, 8).toUpperCase(), cat: catOf(t.type),
    }));
    const seen = new Set(b.map(x => x.reference));
    return [...b, ...a.filter(x => !seen.has(x.reference))].sort((x, y) => +new Date(y.date) - +new Date(x.date));
  }, [transactions, paymentTransactions]);

  const filtered = rows.filter(r =>
    (cat === 'All' || r.cat === cat) &&
    (!q || r.description.toLowerCase().includes(q.toLowerCase()) || r.reference.includes(q.toUpperCase()))
  );

  const receipt = (r: Row) => {
    const text = `CASH PICKUP — RECEIPT\n\nType: ${r.description}\nAmount: ${r.amount.toLocaleString()} SLE\nStatus: ${r.status}\nMethod: ${r.method}\nReference: ${r.reference}\nDate: ${new Date(r.date).toLocaleString()}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = `receipt-${r.reference}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SubPage title="Transaction History" subtitle={`${rows.length} transactions`}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search description or reference"
          className="w-full bg-input border border-border rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} className={cn('px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all', cat === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{c}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length ? filtered.map(r => {
          const Icon = iconOf(r.cat);
          const pos = r.amount >= 0;
          return (
            <div key={r.id} className="glass-card p-3.5 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', pos ? 'bg-success/15' : 'bg-destructive/15')}>
                <Icon className={cn('w-5 h-5', pos ? 'text-success' : 'text-destructive')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.description}</p>
                <p className="text-[11px] text-muted-foreground truncate">{new Date(r.date).toLocaleString()} · {r.method}</p>
                <p className="text-[10px] text-muted-foreground font-mono">Ref {r.reference} · <span className="capitalize">{r.status}</span></p>
              </div>
              <div className="text-right">
                <Money value={r.amount} showSign className={cn('text-sm font-bold', pos ? 'text-success' : 'text-destructive')} />
                <button onClick={() => receipt(r)} className="mt-1 text-[10px] text-primary flex items-center gap-1 ml-auto"><Download className="w-3 h-3" /> Receipt</button>
              </div>
            </div>
          );
        }) : <p className="text-center text-muted-foreground py-10 text-sm">No transactions found</p>}
      </div>
    </SubPage>
  );
};

export default History;
