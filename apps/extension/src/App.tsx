/// <reference types="chrome" />
import { useState, useEffect } from 'react';
import { useSync } from '../../editor/src/useSync';
import type { BundlePayload } from '@parcel/types';
import { createShare } from '@parcel/sync';
import { encryptPayload, encodeBase64Url, generateKey } from '@parcel/crypto';

// Copying a generic button style since tailwind might not be setup yet in extension.
const inputClass = "w-full p-2 mb-2 bg-zinc-800 text-white rounded border border-zinc-700";
const btnClass = "w-full p-2 bg-white text-black font-semibold rounded hover:bg-zinc-200 mt-2";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function App() {
  const { login, state, setState, hasSession, isSyncing } = useSync();
  const [pw, setPw] = useState('');
  const [tab, setTab] = useState<{url: string, title?: string} | null>(null);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        if (tabs[0] && tabs[0].url) setTab({ url: tabs[0].url, title: tabs[0].title });
      });
    } else {
      setTab({ url: 'https://example.com', title: 'Test Example' });
    }
  }, []);

  if (!hasSession) {
    return (
      <div className="w-80 p-4 bg-zinc-950 text-white font-sans h-[400px]">
        <h1 className="text-xl font-bold mb-4">Parcel Save</h1>
        <p className="text-sm mb-4">Login to access bundles</p>
        <input type="password" placeholder="Password" required className={inputClass} value={pw} onChange={e => setPw(e.target.value)} />
        <button className={btnClass} onClick={() => login(pw)}>Unlock</button>
      </div>
    );
  }

  if (!state) return <div className="w-80 p-4 bg-zinc-950 text-white">Loading...</div>;

  const createBundleAndShare = async () => {
    if (!tab) return;
    const bundleId = crypto.randomUUID();
    const newBundle: BundlePayload = {
      version: 1,
      name: tab.title || 'New Bundle',
      created_at: Date.now(),
      items: [{ id: crypto.randomUUID(), url: tab.url, title: tab.title || null, note: null, mode: 'hidden' }]
    };
    
    // Save to state
    setState({ ...state, bundles: { ...state.bundles, [bundleId]: newBundle } });

    try {
      const folderKey = generateKey();
      const cipher = await encryptPayload(folderKey, newBundle);
      const res = await createShare(API_URL, cipher);
      const viewerUrl = import.meta.env.VITE_VIEWER_URL || 'http://localhost:5174';
      const url = `${viewerUrl}/${res.id}#${encodeBase64Url(folderKey)}`;
      await navigator.clipboard.writeText(url);
      alert('Shared link copied: ' + url);
    } catch (e: any) {
      alert('Error sharing: ' + e.message);
    }
  };

  const addToBundle = (id: string) => {
    if (!tab) return;
    const bundle = state.bundles[id];
    const newBundle = {
      ...bundle,
      items: [...bundle.items, { id: crypto.randomUUID(), url: tab.url, title: tab.title || null, note: null, mode: 'hidden' as const }]
    };
    setState({ ...state, bundles: { ...state.bundles, [id]: newBundle } });
  };

  return (
    <div className="w-80 p-4 bg-zinc-950 text-white font-sans h-max max-h-[500px] overflow-auto">
      <h1 className="text-lg font-bold mb-2">Parcel Save</h1>
      <p className="text-xs text-zinc-400 mb-4">{isSyncing ? 'Syncing...' : 'Synced'}</p>
      
      {tab && (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded mb-4">
          <p className="text-sm truncate font-medium">{tab.title}</p>
          <p className="text-xs truncate text-zinc-400">{tab.url}</p>
        </div>
      )}

      <button className={btnClass} onClick={createBundleAndShare}>Quick Share Current Tab</button>
      
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Add to existing bundle:</h3>
        <div className="flex flex-col gap-2">
          {Object.entries(state.bundles).map(([id, b]) => (
            <button key={id} onClick={() => addToBundle(id)} className="text-left p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
              {b.name || 'Untitled'} ({b.items.length})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
