/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOUTUBE_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MUSICBRAINZ_API_URL: string;
  // Last.fm — dot in name requires bracket access: import.meta.env['VITE_LAST.FM_API_KEY']
  readonly [key: string]: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
