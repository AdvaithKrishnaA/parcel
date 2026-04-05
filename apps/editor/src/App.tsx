import { useState, useEffect } from 'react';
import { useSync } from './useSync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import type { BundlePayload } from '@parcel/types';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Share, PlusCircle, RefreshCw, ChevronDown, Edit, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { toast, Toaster } from 'sonner';
import { generateKey, encodeBase64Url, encryptPayload } from '@parcel/crypto';
import { createShare } from '@parcel/sync';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function App() {
  const { login, state, setState, isSyncing, hasSession, forceSync, authError } = useSync();
  const [pw, setPw] = useState('');
  const [authKey, setAuthKey] = useState(() => localStorage.getItem('parcel_auth_key') || '');
  const [showAuthOptions, setShowAuthOptions] = useState(() => !localStorage.getItem('parcel_auth_key'));
  const [currentBundleId, setCurrentBundleId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareModalData, setShareModalData] = useState<{ url: string, id: string, key: string } | null>(null);

  useEffect(() => {
    if (authError) {
      setShowAuthOptions(true);
    }
  }, [authError]);

  // Keyboard listener for Cmd/Ctrl + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        forceSync();
        toast.success('Your vault was securely saved!');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [forceSync]);

  if (!hasSession) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <Toaster />
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center justify-center self-center mb-2">
            <Logo className="h-8 w-auto text-foreground" />
          </div>
          <div className="flex flex-col gap-6">
            <Card className="gap-6">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Hello, Friend.</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={e => {
                  e.preventDefault();
                  localStorage.setItem('parcel_auth_key', authKey);
                  login(pw);
                }}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="password">Vault Password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={pw}
                        onChange={e => setPw(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {!showAuthOptions && (
                      <div className="flex justify-start mt-0">
                        <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-ring rounded px-1" onClick={() => setShowAuthOptions(true)}>
                          Need to Reset Auth Key? Click Here
                        </button>
                      </div>
                    )}

                    {showAuthOptions && (
                      <div className="grid gap-2 mt-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="authKey">Parcel API Auth Key</Label>
                          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setAuthKey(crypto.randomUUID())}>
                            Generate New Key
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            id="authKey"
                            type="password"
                            required
                            placeholder="Enter or Generate a Secure Key"
                            value={authKey}
                            onChange={e => setAuthKey(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="shrink-0 px-3 min-w-[60px]"
                            disabled={!authKey}
                            onClick={() => {
                              navigator.clipboard.writeText(authKey);
                              toast.success('Auth Key copied to clipboard!');
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        {authError && (
                          <p className="text-[11px] text-destructive mt-1 font-medium">
                            Check your API Auth Key and try again.
                          </p>
                        )}
                        {authKey && (!localStorage.getItem('parcel_auth_key') || authKey !== localStorage.getItem('parcel_auth_key')) && (
                          <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                            Run <code className="bg-muted px-1 py-0.5 rounded text-foreground">npx wrangler secret put AUTH_KEY</code> in your terminal and paste this value, or add it via the Cloudflare Dashboard to lock it down.
                          </p>
                        )}
                      </div>
                    )}
                    <Button type="submit" className="w-full mt-2">Login</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            <Collapsible className="group/collapsible flex flex-col gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="flex items-center justify-between w-full h-auto py-3 px-4">
                  <h4 className="text-sm font-semibold">How does this work?</h4>
                  <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-2">
                <div className="rounded-md border px-4 py-3 text-sm bg-card text-card-foreground">
                  <p className="font-medium">What is Parcel?</p>
                  <p className="text-muted-foreground mt-1">
                    Parcel is a simple way (kind of) to wrap links/secrets/texts and send them securely.
                  </p>
                </div>
                <div className="rounded-md border px-4 py-3 text-sm bg-card text-card-foreground">
                  <p className="font-medium">What is the Vault Password?</p>
                  <p className="text-muted-foreground mt-1">
                    Unlocks your saved collections. Different passwords create separate vaults. It can’t be recovered if lost.
                  </p>
                </div>
                <div className="rounded-md border px-4 py-3 text-sm bg-card text-card-foreground">
                  <p className="font-medium">What is the Auth Key?</p>
                  <p className="text-muted-foreground mt-1">
                    A secret key for authenticating API requests. It identifies you and your vaults, and can be changed anytime.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    );
  }

  if (!state) return <div className="flex h-screen items-center justify-center bg-background"><Spinner className="size-6 text-muted-foreground" /></div>;

  const createBundle = () => {
    const id = crypto.randomUUID();
    const bundle: BundlePayload = {
      version: 1,
      name: 'Untitled Bundle',
      items: [],
      created_at: Date.now()
    };
    setState({ ...state, bundles: { ...state.bundles, [id]: bundle } });
    setCurrentBundleId(id);
  };

  const currentBundle = currentBundleId ? state.bundles[currentBundleId] : null;

  const shareBundle = async (bundle: BundlePayload, bundleId: string) => {
    setSharingId(bundleId);
    await forceSync(); // ensure state is persisted before sharing
    try {
      // Simulate network wait for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      const folderKeyBytes = generateKey();
      const folderKeyStr = encodeBase64Url(folderKeyBytes);
      const cipher = await encryptPayload(folderKeyBytes, bundle);
      const authHeaderKey = localStorage.getItem('parcel_auth_key') || undefined;
      const res = await createShare(API_URL, cipher, authHeaderKey);

      const viewerUrl = import.meta.env.VITE_VIEWER_URL || 'http://localhost:5174';
      const baseShareUrl = `${viewerUrl}/${res.id}`;
      const shareUrl = `${baseShareUrl}#${folderKeyStr}`;

      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share link copied to clipboard');
      } catch (clipboardErr) {
        // Safari blocks async clipboard writes. Fallback gracefully.
        toast.success('Share link generated');
      }

      setShareModalData({ url: shareUrl, id: baseShareUrl, key: folderKeyStr });
    } catch (e: unknown) {
      toast.error('Share failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSharingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div className="flex items-center cursor-pointer" onClick={() => setCurrentBundleId(null)}>
            <Logo className="h-6 w-auto text-foreground" />
            <span className="ml-3 font-medium text-muted-foreground text-lg tracking-wide hidden sm:inline-block">•  Vault</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {isSyncing ? <span className="flex items-center gap-2"><RefreshCw className="size-4 animate-spin" /> Syncing</span> : 'Synced'}
          </div>
        </header>

        {currentBundle ? (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <Input
                value={currentBundle.name || ''}
                onChange={e => setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, name: e.target.value } } })}
                className="text-3xl font-bold bg-transparent border-0 focus-visible:ring-0 max-w-xs"
              />
              <Button onClick={() => shareBundle(currentBundle, currentBundleId!)} disabled={sharingId === currentBundleId} className="gap-2 transition-all">
                {sharingId === currentBundleId ? <Spinner className="size-4" /> : <Share className="size-4" />}
                Share
              </Button>
            </div>

            <div className="space-y-4 mb-6">
              {currentBundle.items.map((item, idx) => {
                const itemType = item.type || 'link';
                return (
                  <Card key={item.id} className="bg-card border-border relative overflow-hidden">
                    <div className="p-4 flex flex-col gap-4">
                      <div className="flex gap-4 justify-between items-center">
                        <Tabs value={itemType} onValueChange={(v) => {
                          const newItems = [...currentBundle.items];
                          newItems[idx] = { ...newItems[idx], type: v as any };
                          setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, items: newItems } } });
                        }} className="w-[300px]">
                          <TabsList className="grid grid-cols-3">
                            <TabsTrigger value="link">Link</TabsTrigger>
                            <TabsTrigger value="text">Text</TabsTrigger>
                            <TabsTrigger value="secret">Secret</TabsTrigger>
                          </TabsList>
                        </Tabs>
                        <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:bg-destructive/10" onClick={() => {
                          const newItems = currentBundle.items.filter((_, i) => i !== idx);
                          setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, items: newItems } } });
                        }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="flex-1 space-y-3">
                        {itemType === 'link' && (
                          <Input placeholder="URL" value={item.url || ''} onChange={e => {
                            const newItems = [...currentBundle.items];
                            newItems[idx].url = e.target.value;
                            setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, items: newItems } } });
                          }} className="bg-background border-input" />
                        )}
                        {itemType === 'text' && (
                          <Textarea placeholder="Text content" value={item.content || ''} onChange={e => {
                            const newItems = [...currentBundle.items];
                            newItems[idx].content = e.target.value;
                            setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, items: newItems } } });
                          }} className="bg-background border-input min-h-[80px]" />
                        )}
                        {itemType === 'secret' && (
                          <div className="relative">
                            <Input type={item.mode === 'hidden' ? "password" : "text"} placeholder="Secret text" value={item.content || ''} onChange={e => {
                              const newItems = [...currentBundle.items];
                              newItems[idx].content = e.target.value;
                              setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, items: newItems } } });
                            }} className="bg-background border-input pr-10" />
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...currentBundle.items];
                                newItems[idx].mode = item.mode === 'hidden' ? 'visible' : 'hidden';
                                setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, items: newItems } } });
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {item.mode === 'hidden' ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input placeholder="Title (optional)" value={item.title || ''} onChange={e => {
                            const newItems = [...currentBundle.items];
                            newItems[idx].title = e.target.value;
                            setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, items: newItems } } });
                          }} className="bg-background border-input flex-1" />
                          <Input placeholder="Note (optional)" value={item.note || ''} onChange={e => {
                            const newItems = [...currentBundle.items];
                            newItems[idx].note = e.target.value;
                            setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, items: newItems } } });
                          }} className="bg-background border-input flex-1" />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Button variant="outline" className="w-full border-dashed border-border hover:bg-accent text-muted-foreground hover:text-accent-foreground" onClick={() => {
              const newItems = [...currentBundle.items, { id: crypto.randomUUID(), type: 'link' as const, url: '', content: '', title: null, note: null, mode: 'hidden' as const }];
              setState({ ...state, bundles: { ...state.bundles, [currentBundleId!]: { ...currentBundle, items: newItems } } });
            }}>
              <PlusCircle className="size-4 mr-2" /> Add Item
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Your Collections</h2>
              <Button onClick={createBundle}><Plus className="size-4 mr-2" /> New Collection</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(state.bundles).map(([id, bundle]) => (
                <Card key={id} className="gap-2 pt-2 bg-card border-border hover:border-primary/50 transition flex flex-col overflow-hidden">
                  <div onClick={() => setCurrentBundleId(id)}>
                    <CardHeader className="m-2 p-2 border-none rounded flex-1 cursor-pointer hover:bg-muted/20 transition-colors">
                      <CardTitle className="text-lg text-card-foreground truncate">{bundle.name || 'Untitled Collection'}</CardTitle>
                      <CardDescription>{bundle.items.length} item{bundle.items.length !== 1 ? 's' : ''}</CardDescription>
                    </CardHeader>
                  </div>
                  <div className="px-2 pt-2 border-t border-border flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="h-8 px-2 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setCurrentBundleId(id)}>
                      <Edit className="size-4 mr-1" /> Edit
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" disabled={sharingId === id} className="h-8 px-2 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => shareBundle(bundle, id)}>
                        {sharingId === id ? <Spinner className="size-4 mr-1" /> : <Share className="size-4 mr-1" />}
                        {sharingId === id ? 'Sharing...' : 'Share'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-2 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="size-4 mr-1" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete '{bundle.name || 'Untitled Collection'}' and all of its links. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => {
                                const newState = { ...state, bundles: { ...state.bundles } };
                                delete newState.bundles[id];
                                setState(newState);
                              }}
                            >
                              Delete Collection
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!shareModalData} onOpenChange={(open) => !open && setShareModalData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Collection</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="link" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">Full Link</TabsTrigger>
              <TabsTrigger value="split">Separate Link & Key</TabsTrigger>
            </TabsList>
            <TabsContent value="link" className="pt-2">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Ideal for quick sharing. Anyone with this link can instantly view the collection.
                </p>
                <Input readOnly value={shareModalData?.url || ''} className="font-mono text-muted-foreground" />
                <div className="flex justify-end space-x-2">
                  <Button variant="ghost" onClick={() => setShareModalData(null)}>Close</Button>
                  <Button onClick={() => {
                    navigator.clipboard.writeText(shareModalData?.url || '');
                    toast.success('Link copied to clipboard');
                  }}>Copy Link</Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="split" className="pt-2">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Ideal for maximum security. Send the base link and the decryption key separately.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Base Link</Label>
                  <div className="flex items-center space-x-2">
                    <Input readOnly value={shareModalData?.id || ''} className="font-mono text-sm" />
                    <Button variant="secondary" onClick={() => {
                      navigator.clipboard.writeText(shareModalData?.id || '');
                      toast.success('Link copied to clipboard!');
                    }}>Copy</Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Decryption Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input readOnly value={shareModalData?.key || ''} className="font-mono text-sm" />
                    <Button variant="secondary" onClick={() => {
                      navigator.clipboard.writeText(shareModalData?.key || '');
                      toast.success('Key copied to clipboard!');
                    }}>Copy</Button>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="ghost" onClick={() => setShareModalData(null)}>Done</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
