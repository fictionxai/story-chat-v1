import {
  serviceContextFromDefaults,
  SimpleDirectoryReader,
  storageContextFromDefaults,
  VectorStoreIndex,
  TogetherEmbedding,
} from 'llamaindex';
import path from 'path';
import fs from 'fs';
import { CHUNK_SIZE, CHUNK_OVERLAP, STORAGE_CACHE_DIR, STORAGE_DIR } from '../constants';

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

export async function prepareDatasource(job_id: string, premise: string, plan: string, story: string): Promise<boolean> {
  const dataDir = path.join(STORAGE_DIR, job_id);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    if (!premise.startsWith("http") || !plan.startsWith("http") || !story.startsWith("http")) {
      return false;
    }

    const fetchWithTimeout = async (url: string, timeoutMs = 15000) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        return response;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    };

    // Fetch and save all files
    const [premiseResponse, planResponse, storyResponse] = await Promise.all([
      fetchWithTimeout(premise),
      fetchWithTimeout(plan),
      fetchWithTimeout(story)
    ]);

    await Promise.all([
      // Save premise
      premiseResponse.blob()
        .then(blob => blob.arrayBuffer())
        .then(arrayBuffer => {
          fs.writeFileSync(path.join(dataDir, job_id + "_premise.json"), Buffer.from(arrayBuffer));
        }),

      // Save plan
      planResponse.blob()
        .then(blob => blob.arrayBuffer())
        .then(arrayBuffer => {
          fs.writeFileSync(path.join(dataDir, job_id + "_plan.json"), Buffer.from(arrayBuffer));
        }),

      // Save story
      storyResponse.blob()
        .then(blob => blob.arrayBuffer())
        .then(arrayBuffer => {
          fs.writeFileSync(path.join(dataDir, job_id + "_story.txt"), Buffer.from(arrayBuffer));
        })
    ]);

    console.log(`Datasource successfully prepared for job ${job_id}.`);

    return true;
  } catch (error) {
    console.error('[prepareDatasource] error:', error);
    return false;
  }
}
