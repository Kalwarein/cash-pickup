import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubPage } from '@/components/wallet/SubPage';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useTheme } from '@/contexts/ThemeContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  User, Shield, Palette, Bell, Lock, Globe, LifeBuoy, LogOut, ChevronRight,
  Sun, Moon, Monitor, Fingerprint, KeyRound, Smartphone, Download, Eye,
  ScanFace, MessageSquare, FileText, Info, Pencil, Check,
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

const useToggle = (key: string, initial = false) => {
  const [on, setOn] = useState(() => localStorage.getItem(key) === '1' || (localStorage.getItem(key) === null && initial));
  const toggle = () => setOn(v => { localStorage.setItem(key, v ? '0' : '1'); return !v; });
  return [on, toggle] as const;
};

const Toggle = ({ label, icon: Icon, storageKey, initial = false, onExtra }: { label: string; icon: React.ElementType; storageKey: string; initial?: boolean; onExtra?: (on: boolean) => void }) => {
  const [on, toggle] = useToggle(storageKey, initial);
  return (
    <button onClick={() => { toggle(); onExtra?.(!on); }} className="w-full flex items-center gap-3 py-2.5">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="flex-1 text-left text-sm">{label}</span>
      <span className={cn('w-11 h-6 rounded-full p-0.5 transition-colors', on ? 'bg-primary' : 'bg-muted')}>
        <span className={cn('block w-5 h-5 rounded-full bg-white shadow transition-transform', on && 'translate-x-5')} />
      </span>
    </button>
  );
};

const Select = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="text-sm">{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)} className="bg-muted rounded-lg px-3 py-1.5 text-sm border border-border focus:outline-none">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, refetch } = useProfile();
  const { theme, setTheme } = useTheme();
  const { permission, requestPermission } = usePushNotifications();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const [lang, setLang] = useState(() => localStorage.getItem('pref_lang') || 'English');
  const [currency] = useState('SLE');
  const [tz, setTz] = useState(() => localStorage.getItem('pref_tz') || 'GMT (Freetown)');
  const [dateFmt, setDateFmt] = useState(() => localStorage.getItem('pref_datefmt') || 'DD/MM/YYYY');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('pref_fontsize') || 'Medium');
  const [accent, setAccent] = useState(() => localStorage.getItem('pref_accent') || 'Emerald');

  useEffect(() => {
    if (profile) setForm({ name: profile.name || '', username: '', phone: '' });
  }, [profile]);

  useEffect(() => {
    const map: Record<string, string> = { Small: '14px', Medium: '16px', Large: '18px' };
    document.documentElement.style.fontSize = map[fontSize] || '16px';
    localStorage.setItem('pref_fontsize', fontSize);
  }, [fontSize]);

  const walletId = `CP-${(user?.id || '').slice(0, 8).toUpperCase()}`;
  const accountNo = (user?.id || '').replace(/\D/g, '').slice(0, 10).padEnd(10, '0');

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      username: form.username || null,
      phone: form.phone || null,
    }).eq('id', user.id);
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Profile updated' });
    setEditOpen(false);
    refetch();
  };

  const changePassword = async () => {
    if (!profile?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, { redirectTo: `${window.location.origin}/reset-password` });
    toast({ title: error ? 'Error' : 'Check your email', description: error ? error.message : 'Password reset link sent.' });
  };

  const logoutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    navigate('/auth');
  };

  const downloadData = () => {
    const blob = new Blob([JSON.stringify({ profile, walletId, accountNo }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'my-data.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SubPage title="Settings" subtitle={profile?.email} back="/wallet">
      {/* Profile summary */}
      <button onClick={() => setEditOpen(true)} className="w-full glass-card p-4 flex items-center gap-3 active:scale-[0.99] transition-transform">
        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
          <User className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold">{profile?.name || 'User'}</p>
          <p className="text-xs text-muted-foreground">{walletId}</p>
        </div>
        <Pencil className="w-4 h-4 text-muted-foreground" />
      </button>

      <Accordion type="single" collapsible className="space-y-2">
        {/* Profile */}
        <AccordionItem value="profile" className="glass-card px-4 border-none">
          <AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-3 text-sm font-semibold"><User className="w-4 h-4 text-primary" /> Profile</span></AccordionTrigger>
          <AccordionContent className="space-y-1 text-sm">
            <Row label="Full Name" value={profile?.name || '—'} />
            <Row label="Email" value={profile?.email || '—'} />
            <Row label="Wallet ID" value={walletId} mono />
            <Row label="Account Number" value={accountNo} mono />
            <button onClick={() => setEditOpen(true)} className="w-full mt-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium">Edit Profile</button>
          </AccordionContent>
        </AccordionItem>

        {/* Security */}
        <AccordionItem value="security" className="glass-card px-4 border-none">
          <AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-3 text-sm font-semibold"><Shield className="w-4 h-4 text-primary" /> Security</span></AccordionTrigger>
          <AccordionContent className="space-y-1">
            <button onClick={changePassword} className="w-full flex items-center gap-3 py-2.5"><KeyRound className="w-4 h-4 text-muted-foreground" /><span className="flex-1 text-left text-sm">Change Password</span><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
            <Toggle label="Two-Factor Authentication" icon={Smartphone} storageKey="sec_2fa" />
            <Toggle label="Biometric Login" icon={Fingerprint} storageKey="sec_bio" />
            <Toggle label="Face ID" icon={ScanFace} storageKey="sec_faceid" />
            <button onClick={logoutAll} className="w-full flex items-center gap-3 py-2.5 text-destructive"><LogOut className="w-4 h-4" /><span className="flex-1 text-left text-sm">Log Out All Devices</span></button>
          </AccordionContent>
        </AccordionItem>

        {/* Appearance */}
        <AccordionItem value="appearance" className="glass-card px-4 border-none">
          <AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-3 text-sm font-semibold"><Palette className="w-4 h-4 text-primary" /> Appearance</span></AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }, { id: 'system', label: 'System', icon: Monitor }].map(t => {
                  const active = t.id === 'system' ? false : theme === t.id;
                  return (
                    <button key={t.id} onClick={() => {
                      if (t.id === 'system') { const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; setTheme(sys as 'dark' | 'light'); }
                      else setTheme(t.id as 'dark' | 'light');
                    }} className={cn('py-3 rounded-xl border flex flex-col items-center gap-1 text-xs', active ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                      <t.icon className="w-4 h-4" />{t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Select label="Accent Color" value={accent} options={['Emerald', 'Navy', 'Gold', 'Violet']} onChange={v => { setAccent(v); localStorage.setItem('pref_accent', v); }} />
            <Select label="Font Size" value={fontSize} options={['Small', 'Medium', 'Large']} onChange={setFontSize} />
          </AccordionContent>
        </AccordionItem>

        {/* Notifications */}
        <AccordionItem value="notif" className="glass-card px-4 border-none">
          <AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-3 text-sm font-semibold"><Bell className="w-4 h-4 text-primary" /> Notifications</span></AccordionTrigger>
          <AccordionContent className="space-y-0.5">
            <Toggle label="Push Notifications" icon={Bell} storageKey="ntf_push" initial={permission === 'granted'} onExtra={(on) => { if (on && permission !== 'granted') requestPermission(); }} />
            <Toggle label="Deposits" icon={Bell} storageKey="ntf_deposit" initial />
            <Toggle label="Withdrawals" icon={Bell} storageKey="ntf_withdraw" initial />
            <Toggle label="Investments" icon={Bell} storageKey="ntf_invest" initial />
            <Toggle label="Profits" icon={Bell} storageKey="ntf_profit" initial />
            <Toggle label="Promotions" icon={Bell} storageKey="ntf_promo" />
            <Toggle label="Transfers" icon={Bell} storageKey="ntf_transfer" initial />
            <Toggle label="Market Alerts" icon={Bell} storageKey="ntf_market" />
            <Toggle label="Security Alerts" icon={Shield} storageKey="ntf_security" initial />
            <Toggle label="Email Notifications" icon={Bell} storageKey="ntf_email" />
            <Toggle label="SMS Notifications" icon={Smartphone} storageKey="ntf_sms" />
          </AccordionContent>
        </AccordionItem>

        {/* Privacy */}
        <AccordionItem value="privacy" className="glass-card px-4 border-none">
          <AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-3 text-sm font-semibold"><Lock className="w-4 h-4 text-primary" /> Privacy</span></AccordionTrigger>
          <AccordionContent className="space-y-0.5">
            <Toggle label="Hide Wallet Balance" icon={Eye} storageKey="priv_hide_balance" />
            <Toggle label="Hide Portfolio Value" icon={Eye} storageKey="priv_hide_portfolio" />
            <Toggle label="Blur Sensitive Info" icon={Eye} storageKey="priv_blur" />
            <button onClick={downloadData} className="w-full flex items-center gap-3 py-2.5"><Download className="w-4 h-4 text-muted-foreground" /><span className="flex-1 text-left text-sm">Download My Data</span><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
          </AccordionContent>
        </AccordionItem>

        {/* Language & Region */}
        <AccordionItem value="region" className="glass-card px-4 border-none">
          <AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-3 text-sm font-semibold"><Globe className="w-4 h-4 text-primary" /> Language & Region</span></AccordionTrigger>
          <AccordionContent className="space-y-1">
            <Select label="Language" value={lang} options={['English', 'Krio', 'French']} onChange={v => { setLang(v); localStorage.setItem('pref_lang', v); }} />
            <Row label="Currency" value={currency} />
            <Select label="Time Zone" value={tz} options={['GMT (Freetown)', 'GMT+1', 'GMT-5']} onChange={v => { setTz(v); localStorage.setItem('pref_tz', v); }} />
            <Select label="Date Format" value={dateFmt} options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} onChange={v => { setDateFmt(v); localStorage.setItem('pref_datefmt', v); }} />
          </AccordionContent>
        </AccordionItem>

        {/* Support */}
        <AccordionItem value="support" className="glass-card px-4 border-none">
          <AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-3 text-sm font-semibold"><LifeBuoy className="w-4 h-4 text-primary" /> Support</span></AccordionTrigger>
          <AccordionContent className="space-y-0.5">
            {[
              { label: 'Help Center', icon: LifeBuoy },
              { label: 'Contact Support', icon: MessageSquare },
              { label: 'FAQs', icon: Info },
              { label: 'Report a Problem', icon: MessageSquare },
              { label: 'Terms of Service', icon: FileText },
              { label: 'Privacy Policy', icon: FileText },
              { label: 'About Cash Pickup', icon: Info },
            ].map(s => (
              <button key={s.label} onClick={() => toast({ title: s.label, description: 'Coming soon.' })} className="w-full flex items-center gap-3 py-2.5">
                <s.icon className="w-4 h-4 text-muted-foreground" /><span className="flex-1 text-left text-sm">{s.label}</span><ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <button onClick={signOut} className="w-full glass-card p-4 flex items-center justify-center gap-2 text-destructive font-medium active:scale-[0.99] transition-transform">
        <LogOut className="w-5 h-5" /> Sign Out
      </button>

      {/* Edit profile drawer */}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="max-w-lg mx-auto">
          <DrawerHeader><DrawerTitle>Edit Profile</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-8 space-y-4">
            {[
              { key: 'name', label: 'Full Name', ph: 'Your name' },
              { key: 'username', label: 'Username', ph: 'username' },
              { key: 'phone', label: 'Phone Number', ph: '+232 ...' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground mb-1.5 block">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.ph}
                  className="w-full bg-input border border-border rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Wallet ID (read-only)</label>
              <input value={walletId} readOnly className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 font-mono text-muted-foreground" />
            </div>
            <button onClick={saveProfile} disabled={saving} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              <Check className="w-5 h-5" /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </SubPage>
  );
};

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between py-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn('font-medium', mono && 'font-mono')}>{value}</span>
  </div>
);

export default Settings;
