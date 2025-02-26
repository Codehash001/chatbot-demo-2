import { initObservability } from "@/app/observability";
import { LlamaIndexAdapter, Message, StreamData } from "ai";
import { ChatMessage, Settings } from "llamaindex";
import { NextRequest, NextResponse } from "next/server";
import { createChatEngine } from "./engine/chat";
import { initSettings } from "./engine/settings";
import {
  isValidMessages,
  retrieveDocumentIds,
  retrieveMessageContent,
} from "./llamaindex/streaming/annotations";
import { createCallbackManager } from "./llamaindex/streaming/events";
import { generateNextQuestions } from "./llamaindex/streaming/suggestion";

initObservability();
initSettings();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Init Vercel AI StreamData and timeout
  const vercelStreamData = new StreamData();

  try {
    // Parse request body once and validate
    const body: { messages: Message[]; data?: unknown } = await request.json();
    const { messages, data } = body;
    if (!isValidMessages(messages)) {
      return NextResponse.json(
        {
          error:
            "messages are required in the request body and the last message must be from the user",
        },
        { status: 400 },
      );
    }

    // retrieve document ids from the annotations of all messages (if any)
    const ids = retrieveDocumentIds(messages);
    // create chat engine with index using the document ids
    const chatEngine = await createChatEngine(ids, data);

    // retrieve user message content from Vercel/AI format
    const userMessageContent = retrieveMessageContent(messages);

    // Setup callbacks
    const callbackManager = createCallbackManager(vercelStreamData);
    const chatHistory: ChatMessage[] = messages.slice(0, -1) as ChatMessage[];

    // Create an AbortController for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort('Request timed out after 60 seconds');
    }, 60000);

    try {
      // Calling LlamaIndex's ChatEngine to get a streamed response
      const response = await Settings.withCallbackManager(callbackManager, () => {
        return chatEngine.chat({
          message: userMessageContent,
          chatHistory,
          stream: true,
        });
      });

      const onCompletion = (content: string) => {
        try {
          chatHistory.push({ role: "assistant", content: content });
        } finally {
          clearTimeout(timeoutId);
          vercelStreamData.close();
        }
      };

      // Use LlamaIndex adapter for streaming response with proper buffering
      const streamingResponse = await LlamaIndexAdapter.toDataStreamResponse(response, {
        data: vercelStreamData,
        callbacks: { 
          onCompletion,
          onStart: () => {
            vercelStreamData.append("\n"); // Ensure clean start
          },
          onToken: (token) => {
            try {
              // Ensure proper token handling
              if (token.trim()) {
                vercelStreamData.append(token);
              }
            } catch (e) {
              console.error('Token handling error:', e);
              throw e;
            }
          },
        }
      });

      try {
        // Return the streaming response with proper headers for Vercel
        return new Response(streamingResponse.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Transfer-Encoding': 'chunked',
            'X-Content-Type-Options': 'nosniff',
            'X-Accel-Buffering': 'no'
          },
        });
      } catch (error) {
        console.error('Streaming error:', error);
        clearTimeout(timeoutId);
        vercelStreamData.close();
        throw error;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error("[LlamaIndex]", error);
    return NextResponse.json(
      {
        detail: (error as Error).message,
      },
      {
        status: 500,
      },
    );
  }
}
