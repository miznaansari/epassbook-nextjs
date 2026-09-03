import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiTools, executeTool } from '@/lib/gemini';
import { requireUser } from '@/lib/requireUser';
import { db } from '@/lib/db';
import { optimizeImageForGemini } from '@/lib/imageProcessor';

// Initialize the Google Generative AI SDK
// Uses GEMINI_API_KEY environment variable
const apiKey = process.env.GEMINI_API_KEY || '';

// Helper to robustly extract function calls from various SDK response formats
const getFunctionCalls = (res) => {
  if (!res) return undefined;
  if (res.response) {
    if (typeof res.response.functionCalls === 'function') {
      const calls = res.response.functionCalls();
      if (calls && calls.length > 0) return calls;
    }
    if (Array.isArray(res.response.functionCalls)) {
      return res.response.functionCalls;
    }
  }
  if (typeof res.functionCalls === 'function') {
    const calls = res.functionCalls();
    if (calls && calls.length > 0) return calls;
  }
  if (Array.isArray(res.functionCalls)) {
    return res.functionCalls;
  }
  try {
    const candidate = res.response?.candidates?.[0] || res.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (parts) {
      const calls = parts.filter(p => p.functionCall).map(p => p.functionCall);
      if (calls.length > 0) return calls;
    }
  } catch (e) {
    console.error("Error parsing functionCalls from candidates:", e);
  }
  return undefined;
};

export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, sessionId, model: requestModel, image } = await req.json();
    const userId = user.id;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid messages parameter' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in the backend environment.' }, { status: 500 });
    }

    // 1. Resolve or Create the Chat Session
    let activeSessionId = sessionId;
    let session;
    if (!activeSessionId) {
      // Auto-create a session if not provided (fallback)
      session = await db.chatSession.create({
        data: {
          userId: user.id,
          title: 'New Chat',
        },
      });
      activeSessionId = session.id;
    } else {
      session = await db.chatSession.findUnique({
        where: { id: activeSessionId },
      });
      if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
      }
    }

    // 2. Persist the latest User Message in the database
    const lastUserMsg = messages[messages.length - 1];
    let userMessageContent = (lastUserMsg.content || '').trim();
    if (!userMessageContent && image) {
      userMessageContent = "Please scan this receipt/bill image, extract all purchased items with prices, and ask for my approval to create transactions.";
    }

    // If image was attached, append image preview representation for chat persistence
    const dbContentToStore = image?.data
      ? (userMessageContent ? `${userMessageContent}\n\n[Attached Receipt Image]` : `[Attached Receipt Image]`)
      : userMessageContent;

    await db.chatMessage.create({
      data: {
        chatSessionId: activeSessionId,
        role: 'user',
        content: dbContentToStore,
      },
    });

    // Auto update session title if it is still 'New Chat'
    if (session.title === 'New Chat' || !session.title) {
      const truncatedTitle = userMessageContent.length > 35
        ? userMessageContent.substring(0, 32) + '...'
        : (image ? 'Receipt Analysis' : userMessageContent);
      await db.chatSession.update({
        where: { id: activeSessionId },
        data: { title: truncatedTitle },
      });
    }

    // 3. Fetch all historical messages for this session from the database
    const dbMessages = await db.chatMessage.findMany({
      where: { chatSessionId: activeSessionId },
      orderBy: { createdAt: 'asc' },
    });

    // Format for Gemini API (Vercel style role -> Gemini model role)
    let contents = dbMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Google Generative AI SDK requirement: The first message in the history MUST be from the 'user' role.
    const firstUserIndex = contents.findIndex(m => m.role === 'user');
    if (firstUserIndex > 0) {
      contents = contents.slice(firstUserIndex);
    } else if (firstUserIndex === -1) {
      contents = [];
    }

    if (contents.length === 0) {
      return NextResponse.json({ error: 'No user messages found in history' }, { status: 400 });
    }

    // 4. Set up dynamic system instructions with automatic local date & month detection
    const currentDate = new Date();
    const currentMonthNum = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    const currentMonthName = currentDate.toLocaleString('en-US', { month: 'long' });

    // Map requestModel to the exact model name (if image is attached, ensure a vision-capable Gemini model is used)
    let chosenModel = 'gemini-3.1-flash-lite';
    if (image) {
      chosenModel = requestModel === 'gemini-3.5-flash-lite' ? 'gemini-3.5-flash-lite' : 'gemini-3.1-flash-lite';
    } else if (requestModel === 'gemini-3.5-flash-lite') {
      chosenModel = 'gemini-3.5-flash-lite';
    } else if (requestModel === 'gemma-4-26b' || requestModel === 'gemma-4-26b-a4b-it') {
      chosenModel = 'gemma-4-26b-a4b-it';
    } else if (requestModel === 'gemma-4-31b' || requestModel === 'gemma-4-31b-it') {
      chosenModel = 'gemma-4-31b-it';
    } else if (requestModel === 'gemini-3.1-flash-lite') {
      chosenModel = 'gemini-3.1-flash-lite';
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: chosenModel,
      systemInstruction: `You are Antigravity Finance AI, a Gen-Z styled hyper-advanced monthly personal finance assistant for "Manage Monthly Money".
You have real-time access to the user's financial ledger via database tools.
Always maintain a premium, friendly, highly analytical, slightly witty and helpful tone. Feel free to use emojis to keep it engaging and modern!
Always structure calculations beautifully. Format all numerical figures into professional currencies (e.g. ₹1,250.00 or $1,250.00).

CRITICAL DATE & TIME INSTRUCTIONS:
Today is ${currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
The current calendar month is "${currentMonthName}" and the current calendar year is "${currentYear}" (Month Number: ${currentMonthNum}).

DEFAULT MONTH DETECTION RULE:
- By default, if the user asks about 'this month', 'spending', 'transactions', 'salary balance', 'expenses', or does not specify a specific month/year, assume they are asking about the current month (${currentMonthName} ${currentYear}, i.e. month=${currentMonthNum}, year=${currentYear}).
- Always use month=${currentMonthNum} and year=${currentYear} as arguments for the database tools (like getMonthlyExpenses, getSalaryBalance, etc.) unless the user explicitly mentions a different month or year.
- Never make up or hallucinate spending data. Always call the tools to fetch actual records first.
- The user's unique identifier is "${userId}".

IMAGE & RECEIPT SCANNING / EXTRACTION WORKFLOW:
When an image (e.g. receipt, shopping bill, grocery invoice, expense note) is provided by the user:
1. Thoroughly analyze the image and extract all purchased items, individual costs/prices, discounts, vendor/store name, and transaction date.
2. Present a clear, neat Markdown table summarizing: Item Name, Price, Category, and Total.
3. ALWAYS include a structured JSON block in your response formatted exactly as:
\`\`\`json:transaction_proposal
{
  "items": [
    { "title": "Item 1", "amount": 100, "type": "SPENDING", "useSalaryBalance": true },
    { "title": "Item 2", "amount": 50, "type": "SPENDING", "useSalaryBalance": true }
  ]
}
\`\`\`
4. Explicitly ask for user confirmation/approval before creating the transactions (e.g., "Would you like me to record these transactions into your e-Passbook? You can click 'Approve & Create All' above or reply 'Yes' / 'Confirm'!").
5. When the user confirms or gives approval (e.g., says "Yes", "Confirm", "Add them", "Approve"), invoke the "createMultipleTransactions" or "createTransaction" tool to permanently record them into the user's ledger!

DIRECT TRANSACTION CREATION:
If the user explicitly asks to add or log expenses directly (e.g. "Maine 200 ka petrol liya add kardo" or "Yes, create the extracted transactions"):
- Invoke "createTransaction" or "createMultipleTransactions" with useSalaryBalance=true (for SPENDING) so it automatically deducts from the active month's salary balance.
- Inform the user of the newly created entries with their titles and remaining balance!`,
    });

    // 5. Perform Gemini Call with Tool Configurations
    // startChat gets historical logs up to but excluding the very last message
    let chatSession = model.startChat({
      history: contents.slice(0, -1),
      tools: geminiTools,
    });

    // Prepare last message parts (multimodal if image provided)
    const lastParts = [];
    if (image && image.data) {
      // Use Sharp to auto-orient, resize (max 1536px for optimal Gemini tiling), strip EXIF bloat, and MozJPEG compress
      const optimized = await optimizeImageForGemini(image.data, {
        preset: 'balanced', // 1536px max dimension, MozJPEG Q85 with 4:4:4 chroma subsampling
        mimeType: image.mimeType || 'image/jpeg',
      });

      lastParts.push({
        inlineData: {
          data: optimized.data,
          mimeType: optimized.mimeType,
        },
      });
    }
    lastParts.push({ text: userMessageContent });

    let response = await chatSession.sendMessage(lastParts);

    // 6. Handle Potential Tool Calling Loop
    let functionCalls = getFunctionCalls(response);

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
      functionCalls = getFunctionCalls(response);
    }

    // 7. Once all tools are processed, fetch the final model response text
    let textResponse = '';
    if (response.response && typeof response.response.text === 'function') {
      textResponse = response.response.text();
    } else if (typeof response.text === 'function') {
      textResponse = response.text();
    } else if (response.response && typeof response.response.text === 'string') {
      textResponse = response.response.text;
    } else if (typeof response.text === 'string') {
      textResponse = response.text;
    }

    // 8. Persist the Assistant's final response to the database
    await db.chatMessage.create({
      data: {
        chatSessionId: activeSessionId,
        role: 'assistant',
        content: textResponse,
      },
    });

    // Update the ChatSession's updatedAt timestamp to bubble it to top of list
    await db.chatSession.update({
      where: { id: activeSessionId },
      data: { updatedAt: new Date() },
    });

    // 9. Stream the final response to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const words = textResponse.split(/(\s+)/);
        let i = 0;

        function pushNext() {
          if (i < words.length) {
            controller.enqueue(encoder.encode(words[i]));
            i++;
            setTimeout(pushNext, 15); // stream delay
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
        'x-session-id': activeSessionId,
      },
    });

  } catch (error) {
    console.error('Error in /api/chat POST:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
