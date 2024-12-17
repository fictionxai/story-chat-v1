import { StreamingTextResponse } from 'ai';
import { ChatMessage, MessageContent, OpenAI, TogetherLLM } from 'llamaindex';
import { NextRequest, NextResponse } from 'next/server';
import { createChatEngine } from './engine';
import { LlamaIndexStream } from './llamaindex-stream';
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
  model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  maxTokens: 512,
  apiKey: process.env.TOGETHER_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const streamOutput = 'stream' in body ? body.streamOutput : true;
    const job_id = 'job_id' in body ? body.job_id : null;
    const messages: ChatMessage[] = body.messages;
    const data: any = body.data;

    const userMessage = messages.pop();

    if (!messages || !userMessage || userMessage.role !== 'user') {
      return NextResponse.json(
        {
          code: 400,
          msg: "invalid parameters",
          data: "",
        },
        { status: 200 }
      );
    }

    const chatEngine = await createChatEngine(llm, job_id);

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
      return NextResponse.json({
        code: 200,
        msg: "success",
        data: response.toString(),
      });
    }

  } catch (error) {
    console.error('[LlamaIndex] error:', error);
    return NextResponse.json(
      {
        code: 500,
        msg: 'internal_error',
        data: (error as Error).message,
      },
      {
        status: 200,
      }
    );
  }
}

