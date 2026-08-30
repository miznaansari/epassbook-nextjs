import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/mcpAuth';
import { MCP_TOOLS, MCP_RESOURCES, executeMcpTool, executeMcpResourceRead } from '@/lib/mcpTools';

// CORS & SSE Headers configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

// Handle OPTIONS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// GET: Supports SSE stream or Browser / Discovery status
export async function GET(req) {
  try {
    const auth = await authenticateApiKey(req);
    if (!auth) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Invalid or missing API key. Provide ?api_key=... or Authorization: Bearer ...',
        },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { user, apiKey } = auth;
    const acceptHeader = req.headers.get('accept') || '';
    const isSse = acceptHeader.includes('text/event-stream');

    if (isSse) {
      // Return SSE stream for remote MCP SSE transport
      const url = new URL(req.url);
      const endpointUri = `${url.pathname}?api_key=${apiKey.key}`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send initial endpoint event according to MCP SSE spec
          controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUri}\n\n`));

          // Send a keepalive ping
          const keepAlive = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`: ping\n\n`));
            } catch (e) {
              clearInterval(keepAlive);
            }
          }, 25000);

          req.signal?.addEventListener('abort', () => {
            clearInterval(keepAlive);
            controller.close();
          });
        },
      });

      return new Response(stream, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Standard Browser / cURL Status & Discovery response
    return NextResponse.json(
      {
        status: 'online',
        protocol: 'mcp',
        protocolVersion: '2024-11-05',
        server: {
          name: 'passbook-remote-mcp',
          version: '1.0.0',
          description: 'Passbook Personal Finance Remote Model Context Protocol Server',
        },
        authenticatedUser: {
          id: user.id,
          name: user.name,
          email: user.email,
          currency: user.currency,
          salaryCycleDate: user.salaryCycleDate,
        },
        apiKey: {
          name: apiKey.name,
          prefix: apiKey.prefix,
          lastUsedAt: apiKey.lastUsedAt,
        },
        capabilities: {
          toolsCount: MCP_TOOLS.length,
          resourcesCount: MCP_RESOURCES.length,
        },
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
        })),
        resources: MCP_RESOURCES.map((r) => ({
          uri: r.uri,
          name: r.name,
        })),
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[MCP GET Error]:', error);
    return NextResponse.json(
      { error: 'Internal MCP server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// POST: Handles JSON-RPC 2.0 MCP Protocol requests
export async function POST(req) {
  try {
    const auth = await authenticateApiKey(req);
    if (!auth) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32000,
            message: 'Unauthorized: Invalid or missing API key. Provide ?api_key=... or Authorization header.',
          },
        },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { user } = auth;
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON was received by the server.',
          },
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Support single request or batch requests
    const isBatch = Array.isArray(body);
    const requests = isBatch ? body : [body];

    const responses = await Promise.all(
      requests.map(async (jsonRpcReq) => {
        const id = jsonRpcReq?.id ?? null;
        const method = jsonRpcReq?.method;
        const params = jsonRpcReq?.params || {};

        if (!method) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32600, message: 'Invalid Request: Missing method' },
          };
        }

        try {
          switch (method) {
            case 'initialize': {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  protocolVersion: '2024-11-05',
                  capabilities: {
                    tools: { listChanged: false },
                    resources: { subscribe: false, listChanged: false },
                    prompts: { listChanged: false },
                  },
                  serverInfo: {
                    name: 'passbook-remote-mcp',
                    version: '1.0.0',
                  },
                  instructions: `You are connected to ${user.name || user.email}'s Passbook workspace. You have access to real-time cash balance, financial logs, salary deductions, SIPs, and stock holdings. Base currency: ${user.currency}.`,
                },
              };
            }

            case 'notifications/initialized': {
              // Notification - no required response body if notification, but return empty result for standard RPC
              if (id === null || id === undefined) return null;
              return { jsonrpc: '2.0', id, result: {} };
            }

            case 'ping': {
              return { jsonrpc: '2.0', id, result: {} };
            }

            case 'tools/list': {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  tools: MCP_TOOLS,
                },
              };
            }

            case 'tools/call': {
              const toolName = params.name;
              const toolArgs = params.arguments || {};

              if (!toolName) {
                return {
                  jsonrpc: '2.0',
                  id,
                  error: { code: -32602, message: 'Missing tool name in params' },
                };
              }

              try {
                const executionResult = await executeMcpTool(toolName, toolArgs, user);
                return {
                  jsonrpc: '2.0',
                  id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: typeof executionResult === 'string' 
                          ? executionResult 
                          : JSON.stringify(executionResult, null, 2),
                      },
                    ],
                  },
                };
              } catch (toolErr) {
                return {
                  jsonrpc: '2.0',
                  id,
                  result: {
                    isError: true,
                    content: [
                      {
                        type: 'text',
                        text: `Error executing ${toolName}: ${toolErr.message}`,
                      },
                    ],
                  },
                };
              }
            }

            case 'resources/list': {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  resources: MCP_RESOURCES,
                },
              };
            }

            case 'resources/read': {
              const uri = params.uri;
              if (!uri) {
                return {
                  jsonrpc: '2.0',
                  id,
                  error: { code: -32602, message: 'Missing uri in params' },
                };
              }

              const resourceResult = await executeMcpResourceRead(uri, user);
              return {
                jsonrpc: '2.0',
                id,
                result: resourceResult,
              };
            }

            case 'prompts/list': {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  prompts: [],
                },
              };
            }

            default: {
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32601,
                  message: `Method not found: ${method}`,
                },
              };
            }
          }
        } catch (execErr) {
          console.error(`[MCP Error in ${method}]:`, execErr);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: execErr.message || 'Internal JSON-RPC error',
            },
          };
        }
      })
    );

    // Filter out null notification replies
    const validResponses = responses.filter(Boolean);

    if (!isBatch) {
      if (validResponses.length === 0) {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }
      return NextResponse.json(validResponses[0], { headers: CORS_HEADERS });
    }

    return NextResponse.json(validResponses, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('[MCP POST Error]:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: 'Internal Server Error' },
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
