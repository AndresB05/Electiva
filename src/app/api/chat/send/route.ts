import { NextRequest, NextResponse } from 'next/server';

interface ChatRequest {
  chatInput: string;
  topK?: number;
  temperature?: number;
}

interface N8NResponse {
  output: string;
  sources?: string[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

function chunkText(text: string, chunkSize: number = 700): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { chatInput, topK = 5, temperature = 0.7 } = body;

    if (!chatInput) {
      return NextResponse.json({ error: 'chatInput is required' }, { status: 400 });
    }

    const n8nBaseUrl = process.env.N8N_BASE_URL;
    const n8nWebhookPath = process.env.N8N_WEBHOOK_PATH;

    if (!n8nBaseUrl || !n8nWebhookPath) {
      return NextResponse.json({ error: 'N8N configuration missing' }, { status: 500 });
    }

    const n8nUrl = `${n8nBaseUrl}${n8nWebhookPath}`;

    // Create SSE response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Send initial status
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Connecting to AI...' })}\n\n`));

          // Make request to n8n webhook
          const response = await fetch(n8nUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatInput,
              topK,
              temperature,
            }),
          });

          if (!response.ok) {
            throw new Error(`N8N request failed: ${response.status}`);
          }

          const n8nData: N8NResponse = await response.json();

          // Send the response in chunks
          const chunks = chunkText(n8nData.output, 700);
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const isLast = i === chunks.length - 1;
            
            const eventData = {
              type: isLast ? 'complete' : 'chunk',
              content: chunk,
              sources: isLast ? n8nData.sources : undefined,
              usage: isLast ? n8nData.usage : undefined,
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
            
            // Add small delay between chunks to simulate streaming
            if (!isLast) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

        } catch (error) {
          console.error('Error in SSE stream:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error occurred' 
          })}\n\n`));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}