import {
  ContextChatEngine,
  LLM,
  serviceContextFromDefaults,
  SimpleDocumentStore,
  storageContextFromDefaults,
  TogetherEmbedding,
  VectorStoreIndex,
} from 'llamaindex';
import path from 'path';
import { CHUNK_SIZE, CHUNK_OVERLAP, STORAGE_CACHE_DIR } from '../constants';

async function getDataSource(llm: LLM, job_id: string) {
  const jobCacheDir = path.join(STORAGE_CACHE_DIR, job_id);

  const serviceContext = serviceContextFromDefaults({
    llm,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    embedModel: new TogetherEmbedding(),
  });
  let storageContext = await storageContextFromDefaults({
    persistDir: jobCacheDir,
  });

  const numberOfDocs = Object.keys(
    (storageContext.docStore as SimpleDocumentStore).toDict()
  ).length;
  if (numberOfDocs === 0) {
    throw new Error(
      `call /api/generate?job_id= to generate the storage first`
    );
  }
  return await VectorStoreIndex.init({
    storageContext,
    serviceContext,
  });
}

export async function createChatEngine(llm: LLM, job_id: string) {
  console.log('createChatEngine job_id:', job_id);

  const index = await getDataSource(llm, job_id);
  const retriever = index.asRetriever();
  retriever.similarityTopK = 5;

  return new ContextChatEngine({
    chatModel: llm,
    retriever,
  });
}
