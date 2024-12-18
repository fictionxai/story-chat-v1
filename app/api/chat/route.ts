import { StreamingTextResponse } from 'ai';
import { ChatMessage, MessageContent, TogetherLLM } from 'llamaindex';
import { NextRequest } from 'next/server';
import { createChatEngine } from './engine';
import { LlamaIndexStream } from './stream';
import { APIResponse } from '../response';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const convertMessageContent = (
  textMessage: string,
  imageUrl: string | undefined
): MessageContent => {
  if (!imageUrl) return textMessage;
  return [
    {
      type: 'text',
      text: textMessage,
    },
    {
      type: 'image_url',
      image_url: {
        url: imageUrl,
      },
    },
  ];
};

const llm = new TogetherLLM({
  model: process.env.MODEL_NAME,
  maxTokens: 512,
  apiKey: process.env.TOGETHER_API_KEY,
});

// key is job_id, value is chat engine instance
const engines = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const streamOutput = 'stream' in body ? body.stream : true;
    const job_id = 'job_id' in body ? body.job_id : "dbafa0ef-717d-4f65-978c-84e19580618f";
    const messages: ChatMessage[] = body.messages;
    const data: any = body.data;

    const userMessage = messages.pop();

    if (!messages || !userMessage || userMessage.role !== 'user') {
      return APIResponse.invalidParameters();
    }

    let chatEngine = engines.get(job_id);
    if (!chatEngine) {
      chatEngine = await createChatEngine(llm, job_id);
      engines.set(job_id, chatEngine);
    }

    // Convert message content from Vercel/AI format to LlamaIndex/OpenAI format
    const userMessageContent = convertMessageContent(
      userMessage.content,
      data?.imageUrl
    );

    if (streamOutput) {
      // Calling LlamaIndex's ChatEngine to get a streamed response
      const response = await chatEngine.chat({
        message: userMessageContent,
        chatHistory: messages,
        stream: true,
      });

      // Transform LlamaIndex stream to Vercel/AI format
      const { stream, data: streamData } = LlamaIndexStream(response, {
        parserOptions: {
          image_url: data?.imageUrl,
        },
      });

      // Return a StreamingTextResponse, which can be consumed by the Vercel/AI client
      return new StreamingTextResponse(stream, {}, streamData);
    } else {
      const response = await chatEngine.chat({
        message: userMessageContent,
        chatHistory: messages,
      });
      return APIResponse.success(response.toString());
    }

  } catch (error) {
    console.error('[LlamaIndex] error:', error);
    return APIResponse.error((error as Error).message);
  }
}

