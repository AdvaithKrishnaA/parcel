import { useState, useEffect } from 'react';
import { decryptPayload, decodeBase64Url } from '@parcel/crypto';
import { fetchShare } from '@parcel/sync';
import { BundlePayload } from '@parcel/types';
import { Shield, ExternalLink, Copy, Eye, EyeOff, Check } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getValidUrl, getHostname } from '@/lib/urls';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function SecretViewer({ content }: { content: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-2 bg-muted/50 p-1 rounded-md border border-border/50">
      <Input
        type={show ? "text" : "password"}
        value={content}
        readOnly
        className="bg-transparent border-0 focus-visible:ring-0 px-2 text-zinc-300 h-8"
      />
      <Button variant="ghost" size="icon" className="size-8 shrink-0 hover:bg-accent text-muted-foreground" onClick={() => setShow(!show)}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}

function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="icon" className={`size-9 bg-card transition-colors ${copied ? 'border-emerald-500/50 text-emerald-500 hover:bg-card hover:text-emerald-500' : 'border-border hover:bg-accent text-muted-foreground'}`} onClick={handleCopy} title="Copy">
      {copied ? <Check className="size-4 animate-in zoom-in duration-200" /> : <Copy className="size-4" />}
    </Button>
  );
}

function App() {
  const [bundle, setBundle] = useState<BundlePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isMissingKey, setIsMissingKey] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const load = async (providedKey?: string) => {
    try {
      const id = window.location.pathname.replace(/^\/+/, ''); // or extract from route
      const hashStr = providedKey || window.location.hash.slice(1);

      if (!id) {
        throw new Error('Invalid secure link. Bundle ID is required.');
      }

      if (!hashStr) {
        setIsMissingKey(true);
        setError(null);
        return;
      }
      setIsMissingKey(false);
      setError(null);

      let cipherBase64: string;
      try {
        cipherBase64 = await fetchShare(API_URL, id);
      } catch (err: any) {
        throw new Error(err.message || 'Could not fetch secure link.');
      }

      try {
        const folderKey = decodeBase64Url(hashStr);
        const data = (await decryptPayload(folderKey, cipherBase64)) as BundlePayload;
        setBundle(data);

        if (providedKey && window.location.hash.slice(1) !== providedKey) {
          window.history.replaceState(null, '', `#${providedKey}`);
        }
      } catch (err: any) {
        setIsMissingKey(true);
        setError('Incorrect decryption key. Please check and try again.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (isMissingKey) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background text-foreground font-sans p-6 text-center">
        <Shield className="size-12 mb-4 text-emerald-500 opacity-50" />
        <h1 className="text-2xl font-bold mb-4">Unlock Collection</h1>
        <p className="max-w-md text-muted-foreground mb-8">This collection is securely encrypted. Please enter the decryption key to view its contents.</p>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="password"
            placeholder="Enter decryption key..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(inputValue)}
            className="text-foreground border-border bg-card"
          />
          <Button onClick={() => load(inputValue)}>Unlock</Button>
        </div>
        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background text-destructive font-sans p-6 text-center">
        <Shield className="size-12 mb-4 text-red-500 opacity-50" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="max-w-md">{error}</p>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground font-sans">
        <div className="animate-pulse flex items-center gap-2">
          <Shield className="size-5" /> Decrypting Secure Link...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6">
      <div className="max-w-3xl mx-auto py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-medium mb-2">{bundle.name || 'Shared Collection'}</h1>
        </div>

        <div className="grid gap-4">
          {bundle.items.map((item) => {
            const itemType = item.type || 'link';
            const isLink = itemType === 'link';
            const validUrl = isLink && item.url ? getValidUrl(item.url) : '';
            const hostname = isLink && item.url ? getHostname(item.url) : '';
            const textToCopy = isLink ? (item.url || '') : (item.content || '');

            return (
              <div key={item.id} className="block p-5 rounded-xl border border-border bg-card hover:bg-accent/50 transition shadow-sm hover:shadow-md group">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                      {item.title || (isLink ? hostname : (itemType === 'text' ? 'Text Note' : 'Secret'))}
                    </h3>
                    {item.note && <p className="text-muted-foreground text-sm mb-2">{item.note}</p>}

                    {itemType === 'link' && (
                      <p className="text-xs text-muted-foreground truncate">{item.mode === 'hidden' ? hostname : validUrl}</p>
                    )}

                    {itemType === 'text' && (
                      <div className="mt-2 text-sm text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md border border-border/50 max-h-60 overflow-y-auto">
                        {item.content || ''}
                      </div>
                    )}

                    {itemType === 'secret' && (
                      <SecretViewer content={item.content || ''} />
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <CopyButton textToCopy={textToCopy} />
                    {isLink && (
                      <Button variant="outline" size="icon" className="size-9 bg-card border-border hover:bg-accent text-muted-foreground" onClick={() => window.open(validUrl, '_blank')} title="Open">
                        <ExternalLink className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Card className="mt-16 w-full max-w-md mx-auto bg-transparent border-border shadow-none p-6 flex flex-col items-center text-center">
          <div className="flex flex-col items-center justify-center mb-6 opacity-70 hover:opacity-100 transition-opacity">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Powered by</span>
            <Logo className="h-5 w-auto text-foreground" />
          </div>
          <div className="bg-muted p-2 rounded-full mb-3">
            <Shield className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground max-w-[250px]">
            This entire collection is end-to-end encrypted. The server cannot read its contents.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default App;
