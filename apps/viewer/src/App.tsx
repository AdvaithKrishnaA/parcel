import { useState, useEffect } from 'react';
import { decryptPayload, decodeBase64Url } from '@parcel/crypto';
import { fetchShare } from '@parcel/sync';
import { BundlePayload } from '@parcel/types';
import { Shield, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getValidUrl, getHostname } from '@/lib/urls';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

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
      <div className="flex flex-col h-screen items-center justify-center bg-zinc-950 text-zinc-50 font-sans p-6 text-center dark">
        <Shield className="size-12 mb-4 text-emerald-500 opacity-50" />
        <h1 className="text-2xl font-bold mb-4">Unlock Collection</h1>
        <p className="max-w-md text-zinc-400 mb-8">This collection is securely encrypted. Please enter the decryption key to view its contents.</p>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="password"
            placeholder="Enter decryption key..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(inputValue)}
            className="text-white border-zinc-700 bg-zinc-900"
          />
          <Button onClick={() => load(inputValue)}>Unlock</Button>
        </div>
        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-zinc-950 text-red-400 font-sans p-6 text-center">
        <Shield className="size-12 mb-4 text-red-500 opacity-50" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="max-w-md">{error}</p>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400 font-sans">
        <div className="animate-pulse flex items-center gap-2">
          <Shield className="size-5" /> Decrypting Secure Link...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 dark">
      <div className="max-w-3xl mx-auto py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{bundle.name || 'Secure Link Bundle'}</h1>
        </div>

        <div className="grid gap-4">
          {bundle.items.map((item) => {
            const validUrl = getValidUrl(item.url);
            const hostname = getHostname(item.url);
            return (
              <a key={item.id} href={validUrl} target="_blank" rel="noopener noreferrer" className="block p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                      {item.title || hostname}
                    </h3>
                    {item.note && <p className="text-zinc-400 text-sm mb-2">{item.note}</p>}
                    <p className="text-xs text-zinc-500 truncate max-w-sm">{item.mode === 'hidden' ? hostname : validUrl}</p>
                  </div>
                  <ExternalLink className="size-5 text-zinc-600 group-hover:text-zinc-300" />
                </div>
              </a>
            );
          })}
        </div>

        <Card className="mt-16 gap-0 w-full max-w-md mx-auto bg-transparent border-border shadow-none p-6 flex flex-col items-center text-center">
          <div className="bg-muted p-2 rounded-full mb-2">
            <Shield className="size-5 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-4 whitespace-nowrap">Powered by Parcel</h3>
          <p className="text-sm text-muted-foreground">
            This entire collection is end-to-end encrypted. The server cannot read its contents.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default App;
