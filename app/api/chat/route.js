import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiTools, executeTool } from '@/lib/gemini';

// Initialize the Google Generative AI SDK
// Uses GEMINI_API_KEY environment variable
const apiKey = process.env.GEMINI_API_KEY || '';

export async function POST(req) {
  try {
    const { messages, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing or invalid messages parameter' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in the backend environment.' }, { status: 500 });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.0-flash as it is state of the art and super fast!
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are Antigravity Finance AI, a Gen-Z styled hyper-advanced monthly personal finance assistant for "Manage Monthly Money".
You have real-time access to the user's financial ledger via database tools.
Always maintain a premium, friendly, highly analytical, slightly witty and helpful tone. Feel free to use emojis to keep it engaging and modern!
Always structure calculations beautifully. Format all numerical figures into professional currencies (e.g. $1,250.00).
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
The user's unique identifier is "${userId}".

When the user asks questions related to their expenses, salary balances, loans/lending, categories, or monthly comparisons:
1. Always choose and invoke the appropriate tool (e.g. getMonthlyExpenses, compareMonthlySpending, getLoanSummary, getTopSpendingCategory).
2. Wait for the tool output, interpret the exact database records returned, and provide deep analytics. Do not make up fake data.
3. If no salaries or transactions are recorded for a period, let them know and encourage them to log some entries on the dashboard!`,
    });

    // 1. Format messages history for Gemini API
    // Vercel AI SDK style: { role: 'user'|'assistant', content: 'text' }
    // Gemini style: { role: 'user'|'model', parts: [{ text: '...' }] }
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 2. Perform Gemini Call with Tool Configurations
    let chatSession = model.startChat({
      history: contents.slice(0, -1), // feed previous history
      tools: geminiTools,
    });

    const lastMessage = contents[contents.length - 1].parts[0].text;
    let response = await chatSession.sendMessage(lastMessage);

    // 3. Handle Potential Tool Calling Loop
    let functionCalls = response.functionCalls;
    
    // We can loop over multiple function calls if Gemini returns them
    while (functionCalls && functionCalls.length > 0) {
      const toolResults = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        
        try {
          const result = await executeTool(name, args, userId);
          toolResults.push({
            functionResponse: {
              name,
              response: result,
            },
          });
        } catch (err) {
          console.error(`Error executing tool ${name}:`, err);
          toolResults.push({
            functionResponse: {
              name,
              response: { error: err.message },
            },
          });
        }
      }

      // Send the tool execution outputs back to the Gemini conversation session
      response = await chatSession.sendMessage(toolResults);
      functionCalls = response.functionCalls;
    }

    // 4. Once all tools are processed, fetch and stream the final model response text
    const textResponse = response.text;

    // Convert standard static response to stream chunks to make UI feel highly interactive!
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // We chunk the final text slightly to simulate live typing / streaming
        const words = textResponse.split(/(\s+)/);
        let i = 0;
        
        function pushNext() {
          if (i < words.length) {
            controller.enqueue(encoder.encode(words[i]));
            i++;
            setTimeout(pushNext, 15); // stream chunk delay (15ms)
          } else {
            controller.close();
          }
        }
        pushNext();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in /api/chat POST:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
