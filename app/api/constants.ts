import path from 'path';

export const CHUNK_SIZE = 512;
export const CHUNK_OVERLAP = 20;
export const STORAGE_DIR = path.join(process.cwd(), 'story', 'data');
export const STORAGE_CACHE_DIR = path.join(process.cwd(), 'story', 'cache');