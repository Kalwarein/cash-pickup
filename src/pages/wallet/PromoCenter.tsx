import { useMemo, useState } from 'react';
import { SubPage } from '@/components/wallet/SubPage';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { PromoCodeMarketplace } from '@/components/PromoCodeMarketplace';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Gift, Sparkles, Ticket, Clock, CheckCircle2 } from 'lucide-react';

const PromoCenter = () => {
  const { promoCodes, userPromoCodes, purchasePromoCode, refetch } = usePromoCodes();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [showMarket, setShowMarket] = useState(false);

  const { active, expired } = useMemo(() => {
    const now = new Date();
    return {
      active: userPromoCodes.filter(u => u.is_active && new Date(u.expires_at) > now),
      expired: userPromoCodes.filter(u => !u.is_active || new Date(u.expires_at) <= now),
    };
  }, [userPromoCodes]);

  const redeem = async () => {
    const match = promoCodes.find(p => p.code.toLowerCase() === code.trim().toLowerCase());
    if (!match) { toast({ title: 'Invalid code', description: 'No promo matches that code.', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await purchasePromoCode(match.id);
    setBusy(false);
    if (error) { toast({ title: 'Could not redeem', description: error, variant: 'destructive' }); return; }
    toast({ title: 'Redeemed! 🎉', description: `${match.name} is now active.` });
    setCode('');
    refetch();
  };

  return (
    <SubPage title="Promo Center" subtitle="Redeem codes & manage rewards">
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3"><Ticket className="w-5 h-5 text-primary" /><span className="font-semibold text-sm">Redeem a Code</span></div>
        <div className="flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter promo code"
            className="flex-1 bg-input border border-border rounded-2xl px-4 py-3 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={redeem} disabled={busy || !code.trim()} className="px-5 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 active:scale-95 transition-transform">
            {busy ? '…' : 'Redeem'}
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-success" />
          <span className="font-semibold text-sm">Active Rewards</span>
          <span className="ml-auto text-xs bg-success/20 text-success px-2 py-0.5 rounded-full font-medium">{active.length}</span>
        </div>
        {active.length ? (
          <div className="space-y-2">
            {active.map(u => (
              <div key={u.id} className="p-3 rounded-xl bg-primary/10 border border-primary/25">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{u.promo_code?.name || u.promo_code?.code}</span>
                  <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{u.promo_code?.description}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground"><Clock className="w-3 h-3" /> Expires {new Date(u.expires_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground py-2">No active rewards</p>}
      </div>

      {expired.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-5 h-5 text-muted-foreground" /><span className="font-semibold text-sm">Expired / Used</span></div>
          <div className="space-y-2">
            {expired.map(u => (
              <div key={u.id} className="p-3 rounded-xl bg-muted/40 opacity-70 flex items-center justify-between">
                <span className="text-sm">{u.promo_code?.name || u.promo_code?.code}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(u.expires_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setShowMarket(true)} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        <Gift className="w-5 h-5" /> Browse Promo Marketplace
      </button>

      <PromoCodeMarketplace isOpen={showMarket} onClose={() => setShowMarket(false)} />
    </SubPage>
  );
};

export default PromoCenter;
