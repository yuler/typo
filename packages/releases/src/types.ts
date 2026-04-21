export interface ReleaseAsset {
  name: string;
  platform: 'macos' | 'linux' | 'windows';
}

export interface ReleaseData {
  version: string;
  date: string; // ISO format
  github_url: string;
  notes: {
    en: string;
    zh: string;
    jp: string;
  };
  assets: ReleaseAsset[];
}
