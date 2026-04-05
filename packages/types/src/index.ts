export type BundleItemMode = 'hidden' | 'visible';
export type BundleItemType = 'link' | 'text' | 'secret';

export interface BundleItem {
  id: string;
  type?: BundleItemType;
  url?: string;
  content?: string;
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
