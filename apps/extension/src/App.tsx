/// <reference types="chrome" />
import { useState, useEffect } from 'react';
import { useSync } from '../../editor/src/useSync';
import type { BundlePayload } from '@parcel/types';
import { createShare } from '@parcel/sync';
import { encryptPayload, encodeBase64Url, generateKey } from '@parcel/crypto';
import { useTheme } from '@/components/theme-provider';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';
import { CheckCircle2, ChevronRight, Share, PlusCircle, RefreshCw, Sun, Moon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function App() {
  const { login, state, setState, hasSession, isSyncing, authError, forceSync } = useSync();
  const { theme, setTheme } = useTheme();
  const [pw, setPw] = useState('');
  const [authKey, setAuthKey] = useState(localStorage.getItem('parcel_auth_key') || '');
  const [showAuthOptions, setShowAuthOptions] = useState(() => !localStorage.getItem('parcel_auth_key'));
  const [tab, setTab] = useState<{ url: string, title?: string } | null>(null);

  const [sharingId, setSharingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authError) {
      setShowAuthOptions(true);
    }
  }, [authError]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        if (tabs[0] && tabs[0].url) setTab({ url: tabs[0].url, title: tabs[0].title });
      });
    } else {
      setTab({ url: 'https://example.com', title: 'Test Example' });
    }
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  if (!hasSession) {
    return (
      <div className="w-[360px] p-6 bg-background text-foreground font-sans min-h-[400px] flex flex-col justify-center">
        <div className="flex justify-center mb-6 relative">
          <Logo className="h-8 w-auto text-foreground" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-muted-foreground hover:text-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground hover:text-foreground" />}
          </Button>
        </div>
        <Card className="border border-border shadow-none ring-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">SNAP</CardTitle>
            <CardDescription>Login to access your vaults</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={e => {
              e.preventDefault();
              localStorage.setItem('parcel_auth_key', authKey);
              login(pw);
            }}>
              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Vault Password</Label>
                  <Input id="password" type="password" required value={pw} onChange={e => setPw(e.target.value)} />
                </div>

                {!showAuthOptions && (
                  <div className="flex justify-start mt-[-8px]">
                    <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-ring rounded px-1" onClick={() => setShowAuthOptions(true)}>
                      Need to Reset Auth Key? Click Here
                    </button>
                  </div>
                )}

                {showAuthOptions && (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="authKey">Parcel API Auth Key</Label>
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setAuthKey(crypto.randomUUID())}>
                        Generate New Key
                      </button>
                    </div>
                    <Input id="authKey" type="password" required placeholder="Enter or Generate a Secure Key" value={authKey} onChange={e => setAuthKey(e.target.value)} />
                    {authError && (
                      <p className="text-[11px] text-destructive mt-1 font-medium">Check your API Auth Key and try again.</p>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full mt-2">Unlock</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!state) return <div className="w-[360px] h-[200px] flex items-center justify-center bg-background"><Spinner /></div>;

  const performShare = async (newBundle: BundlePayload, label: string) => {
    try {
      const folderKey = generateKey();
      const cipher = await encryptPayload(folderKey, newBundle);
      const currentAuthKey = localStorage.getItem('parcel_auth_key') || undefined;
      const res = await createShare(API_URL, cipher, currentAuthKey);
      const viewerUrl = import.meta.env.VITE_VIEWER_URL || 'http://localhost:5174';
      const url = `${viewerUrl}/${res.id}#${encodeBase64Url(folderKey)}`;
      await navigator.clipboard.writeText(url);
      showSuccess(`Added to ${label} and link copied!`);
    } catch (e: unknown) {
      alert('Error sharing: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const createBundleAndShare = async () => {
    if (!tab) return;
    setSharingId('quick');
    const bundleId = crypto.randomUUID();
    const newBundle: BundlePayload = {
      version: 1,
      name: tab.title || 'New Bundle',
      created_at: Date.now(),
      items: [{ id: crypto.randomUUID(), type: 'link', url: tab.url, title: tab.title || null, note: null, mode: 'hidden' }]
    };

    const newState = { ...state, bundles: { ...state.bundles, [bundleId]: newBundle } };
    setState(newState);
    await forceSync(newState);

    await performShare(newBundle, 'new bundle');
    setSharingId(null);
  };

  const addToBundle = async (id: string, name: string) => {
    if (!tab) return;
    const bundle = state.bundles[id];
    const exists = bundle.items.some(item => item.url === tab.url);
    if (exists) {
      showSuccess(`Already exists in ${name}`);
      return;
    }

    setSharingId(id);
    const newBundle = {
      ...bundle,
      items: [...bundle.items, { id: crypto.randomUUID(), type: 'link' as const, url: tab.url, title: tab.title || null, note: null, mode: 'hidden' as const }]
    };
    const newState = { ...state, bundles: { ...state.bundles, [id]: newBundle } };
    setState(newState);
    await forceSync(newState);

    await performShare(newBundle, name);
    setSharingId(null);
  };

  return (
    <div className="w-[360px] p-4 bg-background text-foreground font-sans h-max max-h-[500px] overflow-auto antialiased">
      <header className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <div className="flex items-center">
          <Logo className="h-4 w-auto text-foreground mr-2" />
          <h1 className="text-md font-semibold">SNAP</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-muted-foreground flex items-center">
            {isSyncing ? <><RefreshCw className="size-3 animate-spin mr-1" /> Syncing</> : 'Synced'}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
        </div>
      </header>

      {successMsg && (
        <Alert className="mb-4 bg-primary/10 border-primary/20 text-primary py-2 px-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <AlertTitle className="text-sm font-medium mb-0">{successMsg}</AlertTitle>
          </div>
        </Alert>
      )}

      {tab && (
        <Card className="mb-4 bg-card shadow-none border border-border ring-0">
          <CardContent className="p-3">
            <p className="text-sm truncate font-medium tracking-tight font-sans">{tab.title || 'Unknown Title'}</p>
            <p className="text-xs truncate text-muted-foreground mt-1 opacity-80">{tab.url}</p>
          </CardContent>
        </Card>
      )}

      <Button className="w-full mb-6 relative overflow-hidden" onClick={createBundleAndShare} disabled={!!sharingId && sharingId !== 'quick'}>
        {sharingId === 'quick' ? <Spinner className="mr-2 h-4 w-4" /> : <Share className="size-4 mr-2" />}
        Quick Share Current Tab
      </Button>

      <div>
        <h3 className="text-[11px] font-semibold mb-3 text-muted-foreground tracking-wider uppercase opacity-70">Add to Collection</h3>
        <div className="flex flex-col gap-3">
          {Object.entries(state.bundles).map(([id, b]) => {
            const isAdded = tab && b.items.some(item => item.url === tab.url);
            return (
              <Card
                key={id}
                className={`group relative overflow-hidden transition-all border border-border shadow-none rounded-xl cursor-pointer select-none focus:outline-none focus:ring-0 ring-0 ${sharingId === id ? 'opacity-70 pointer-events-none' : ''
                  } ${isAdded ? 'bg-muted/30 border-muted-foreground/10' : 'hover:bg-muted/30 active:scale-[0.98]'}`}
                onClick={() => !sharingId && addToBundle(id, b.name || 'Untitled')}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-2 rounded-lg transition-colors ${isAdded ? 'bg-primary/20' : 'bg-muted group-hover:bg-primary/10'}`}>
                      {isAdded ? (
                        <CheckCircle2 className="size-4 text-primary" />
                      ) : (
                        <PlusCircle className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate leading-none mb-1">{b.name || 'Untitled'}</p>
                      <p className="text-[10px] text-muted-foreground">{b.items.length} item{b.items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {sharingId === id ? (
                      <Spinner className="size-3" />
                    ) : isAdded ? (
                      <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded-md">In Vault</span>
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {Object.keys(state.bundles).length === 0 && (
            <Card className="border-dashed border-2 opacity-50">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No collections found in your vault.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
