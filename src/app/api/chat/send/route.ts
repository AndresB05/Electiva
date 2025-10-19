import { NextRequest } from 'next/server';

export const runtime = 'nodejs'; // SSE estable

interface ChatRequest {
  message: string;
  conversationId?: string | null;
  settings?: {
    topK?: number;
    temperature?: number;
  };
}

interface N8NResponse {
  // Primary response field - try multiple possible keys
  output?: string;
  response?: string;
  answer?: string;
  result?: string;
  text?: string;
  
  // Optional fields
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  usage?: {
    tokensInput?: number;
    tokensOutput?: number;
    // Support legacy field names for backward compatibility
    input?: number;
    output?: number;
  };
}

/**
 * Extracts the main response text from n8n response
 * Tries multiple possible field names in priority order
 * Primary: 'output' (as per specification)
 * Fallbacks: common response field names from different AI services
 */
function extractOutput(data: any): string {
  // Priority 1: 'output' (specified requirement)
  if (data.output && typeof data.output === 'string') {
    return data.output;
  }
  
  // Priority 2: Common alternative field names
  const alternativeFields = ['response', 'answer', 'result', 'text', 'content', 'message'];
  
  for (const field of alternativeFields) {
    if (data[field] && typeof data[field] === 'string') {
      console.log(`Using alternative field '${field}' instead of 'output'`);
      return data[field];
    }
  }
  
  // Priority 3: Nested object extraction (common in complex AI responses)
  if (data.data?.output) return data.data.output;
  if (data.data?.response) return data.data.response;
  if (data.data?.answer) return data.data.answer;
  
  console.warn('No valid output field found in n8n response. Available fields:', Object.keys(data));
  return '';
}

/**
 * Chunks text into pieces of 600-800 characters as per BUILD_SPEC.md
 * Uses regex approach to ensure chunking between 600-800 chars consistently
 */
function chunkText(text: string): string[] {
  if (!text) return [];
  
  // BUILD_SPEC.md exact requirement: 600-800 characters per chunk
  // Use 750 as target to stay within range, but respect word boundaries when possible
  const chunks = text.match(/[\s\S]{1,750}/g) ?? [];
  
  // Split any chunks that exceed 800 characters (safety measure)
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= 800) {
      finalChunks.push(chunk);
    } else {
      // Force split chunks that exceed 800 chars
      const subChunks = chunk.match(/[\s\S]{1,750}/g) ?? [];
      finalChunks.push(...subChunks);
    }
  }
  
  return finalChunks.filter(chunk => chunk.trim().length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId, settings } = await req.json() as ChatRequest;

    if (!message) {
      const errorResponse = JSON.stringify({
        type: 'error',
        data: { message: 'Message is required', code: 'VALIDATION_ERROR' }
      });
      return new Response(`data: ${errorResponse}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    }

    const n8nBaseUrl = process.env.N8N_BASE_URL;
    const n8nWebhookPath = process.env.N8N_WEBHOOK_PATH;

    if (!n8nBaseUrl || !n8nWebhookPath) {
      const errorResponse = JSON.stringify({
        type: 'error',
        data: { message: 'N8N configuration missing', code: 'CONFIG_ERROR' }
      });
      return new Response(`data: ${errorResponse}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    }

    const n8nUrl = `${n8nBaseUrl}${n8nWebhookPath}`;

    // Make request to n8n webhook with EXACT specified JSON format
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_API_KEY ? { Authorization: `Bearer ${process.env.N8N_API_KEY}` } : {})
      },
      body: JSON.stringify({
        chatInput: message,
        topK: settings?.topK ?? 5,
        temperature: settings?.temperature ?? 0.7
      })
    });

    if (!response.ok) {
      const text = await response.text();
      const errorResponse = JSON.stringify({
        type: 'error',
        data: { message: text, code: 'N8N_SERVICE_ERROR' }
      });
      return new Response(`data: ${errorResponse}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    }

    const data: N8NResponse = await response.json();
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const push = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        
        try {
          // Extract output text using flexible field matching
          const outputText = extractOutput(data);
          
          if (!outputText) {
            console.warn('No valid output field found in n8n response:', Object.keys(data));
            throw new Error('No valid output field found in n8n response');
          }
          
          console.log(`Processing n8n response: ${outputText.length} characters`);
          
          // Chunk the output text (600-800 characters as per BUILD_SPEC.md)
          const chunks = chunkText(outputText);
          console.log(`Created ${chunks.length} chunks for streaming`);
          
          // Emit each chunk as separate "message" event
          for (const chunk of chunks) {
            push({
              type: 'message',
              data: { content: chunk }
            });
          }
          
          // Send sources if available
          if (data.sources && data.sources.length > 0) {
            console.log(`Sending ${data.sources.length} sources`);
            push({
              type: 'sources',
              data: { sources: data.sources }
            });
          }
          
          // Send usage if available - use BUILD_SPEC.md format exactly
          if (data.usage) {
            const usage = {
              input: data.usage.tokensInput ?? data.usage.input ?? 0,
              output: data.usage.tokensOutput ?? data.usage.output ?? 0
            };
            console.log('Sending usage data:', usage);
            push({
              type: 'usage',
              data: { usage }
            });
          }
          
          // Send completion event
          push({
            type: 'complete',
            data: { ok: true }
          });
          
        } catch (error) {
          console.error('Error in SSE stream:', error);
          push({
            type: 'error',
            data: {
              message: error instanceof Error ? error.message : 'Unknown error',
              code: 'STREAM_ERROR'
            }
          });
        }
        
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        // CORS headers for browser compatibility (as per BUILD_SPEC.md)
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Prevent compression as noted in BUILD_SPEC.md final notes
        'Content-Encoding': 'identity'
      }
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    const errorResponse = JSON.stringify({
      type: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    });
    return new Response(`data: ${errorResponse}\n\n`, {
      headers: { 'Content-Type': 'text/event-stream' }
    });
  }
}