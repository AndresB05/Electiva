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

function chunkText(text: string, minSize: number = 600, maxSize: number = 800): string[] {
  const chunks: string[] = [];
  let currentPos = 0;
  
  while (currentPos < text.length) {
    let chunkEnd = Math.min(currentPos + maxSize, text.length);
    
    // If we're not at the end of the text, try to break at a word boundary
    if (chunkEnd < text.length) {
      const lastSpace = text.lastIndexOf(' ', chunkEnd);
      const lastPeriod = text.lastIndexOf('.', chunkEnd);
      const lastNewline = text.lastIndexOf('\n', chunkEnd);
      
      // Find the best break point (prefer sentence end, then word boundary)
      const bestBreak = Math.max(lastPeriod, lastNewline, lastSpace);
      
      if (bestBreak > currentPos + minSize) {
        chunkEnd = bestBreak + (lastPeriod === bestBreak || lastNewline === bestBreak ? 1 : 0);
      }
    }
    
    chunks.push(text.slice(currentPos, chunkEnd).trim());
    currentPos = chunkEnd;
  }
  
  return chunks.filter(chunk => chunk.length > 0);
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

          // Chunk the output text into 600-800 character pieces
          const chunks = chunkText(n8nData.output, 600, 800);
          
          // Emit message chunks line by line
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const eventData = {
              type: 'message',
              content: chunk,
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
            
            // Add small delay between chunks for smooth streaming
            if (i < chunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          // Emit sources if available
          if (n8nData.sources && n8nData.sources.length > 0) {
            const sourcesData = {
              type: 'sources',
              sources: n8nData.sources,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(sourcesData)}\n\n`));
          }

          // Emit usage statistics if available
          if (n8nData.usage) {
            const usageData = {
              type: 'usage',
              usage: n8nData.usage,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(usageData)}\n\n`));
          }

          // Emit completion event
          const completeData = {
            type: 'complete',
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`));

        } catch (error) {
          console.error('Error in SSE stream:', error);
          const errorData = {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
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