import {
  serviceContextFromDefaults,
  SimpleDirectoryReader,
  storageContextFromDefaults,
  VectorStoreIndex,
  TogetherEmbedding,
} from 'llamaindex';
import path from 'path';
import { CHUNK_SIZE, CHUNK_OVERLAP } from '../constants';

export const STORAGE_DIR = path.join(process.cwd(), 'story', 'data');
export const STORAGE_CACHE_DIR = path.join(process.cwd(), 'story', 'cache');

async function getRuntime(func: () => Promise<any>) {
  const start = Date.now();
  await func();
  const end = Date.now();
  return end - start;
}

async function generateDatasource(serviceContext: any, job_id: string) {
  const jobCacheDir = path.join(STORAGE_CACHE_DIR, job_id);
  const jobDataDir = path.join(STORAGE_DIR, job_id);

  // Split documents, create embeddings and store them in the storage context
  const ms = await getRuntime(async () => {
    const storageContext = await storageContextFromDefaults({
      persistDir: jobCacheDir,
    });
    const documents = await new SimpleDirectoryReader().loadData({
      directoryPath: jobDataDir,
    });
    console.log(`Loaded ${documents.length} documents for job ${job_id}.`);
    await VectorStoreIndex.fromDocuments(documents, {
      storageContext,
      serviceContext,
    });
  });
  console.log(`Storage context successfully generated in ${ms / 1000}s.`);
}

export async function generateStoryIndex(job_id: string) {
  const serviceContext = serviceContextFromDefaults({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    embedModel: new TogetherEmbedding(),
  });

  await generateDatasource(serviceContext, job_id);
}

// (async () => {
//   const serviceContext = serviceContextFromDefaults({
//     chunkSize: CHUNK_SIZE,
//     chunkOverlap: CHUNK_OVERLAP,
//     embedModel: new TogetherEmbedding(),
//   });

//   await generateDatasource(serviceContext);
//   console.log('Finished generating storage.');
// })();
