export type BundleItemMode = 'hidden' | 'visible';

export interface BundleItem {
  id: string;
  url: string;
  title: string | null;
  note: string | null;
  mode: BundleItemMode;
}

export interface BundlePayload {
  version: 1;
  name: string | null;
  items: BundleItem[];
  created_at: number;
}

export interface ServerRecord {
  id: string;
  blob_key: string;
  expires_at: number | null;
  max_views: number | null;
  views: number;
}
