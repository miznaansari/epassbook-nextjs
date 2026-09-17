import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireUser } from '@/lib/requireUser';
import { parseTransactionPrompt } from '@/lib/quickParser';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const text = (body.text || body.prompt || '').trim();

    if (!text) {
      return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 });
    }

    // Baseline local NLP parsing (works instantly with 100% reliability)
    const localParsed = parseTransactionPrompt(text);

    // If Gemini API key is available, attempt enhanced AI extraction for complex sentences
    if (apiKey && text.length > 5) {
      const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3.1-flash-lite'];
      const ai = new GoogleGenerativeAI(apiKey);

      for (const modelName of candidateModels) {
        try {
          const model = ai.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            }
          });

          const systemPrompt = `You are a financial transaction parser assistant.
The user enters a short sentence, note, or prompt describing a financial transaction in English or Hindi/Hinglish (e.g. "10rs cocacola", "₹500 groceries", "lent 1000 to rahul", "sip 2500 in axis mutual fund", "kal dukan se 150 rs ka saman liya").

Extract the transaction details into the following strict JSON schema:
{
  "amount": "number as string, e.g. '10', '500', '1250.50'",
  "title": "Clean, capitalized title of the transaction or item (e.g. 'Coca-Cola', 'Groceries', 'Lent to Rahul', 'SIP Axis Mutual Fund', 'Petrol / Fuel')",
  "type": "Must be one of: 'SPENDING', 'SAVINGS', 'LENDING', 'LOAN', 'ADVANCE'",
  "description": "Short natural note (e.g. 'Quick AI Entry: 10rs cocacola')",
  "useSalaryBalance": true or false (true for SPENDING, false for SAVINGS, LENDING, LOAN, ADVANCE),
  "date": "YYYY-MM-DD format (today: ${new Date().toISOString().split('T')[0]}, yesterday if mentioned)",
  "isAiPrefilled": true
}

Rules:
- If user spent money on food, drinks, transport, shopping, utilities, entertainment -> type is 'SPENDING', useSalaryBalance is true.
- If user lent money to someone -> type is 'LENDING', useSalaryBalance is false.
- If user took loan/borrowed -> type is 'LOAN', useSalaryBalance is false.
- If user invested in SIP, stocks, mutual funds, gold -> type is 'SAVINGS', useSalaryBalance is false.
- If user received salary, bonus, freelance income, refund -> type is 'ADVANCE', useSalaryBalance is false.
- If no specific amount found, set amount to empty string "".

User Input: "${text}"`;

          const result = await model.generateContent(systemPrompt);
          const responseText = result.response.text();
          const parsedAi = JSON.parse(responseText);

          if (parsedAi && (parsedAi.amount || parsedAi.title)) {
            return NextResponse.json({
              success: true,
              transaction: {
                amount: parsedAi.amount ? String(parsedAi.amount) : localParsed.amount,
                title: parsedAi.title || localParsed.title,
                description: parsedAi.description || localParsed.description,
                type: parsedAi.type || localParsed.type,
                useSalaryBalance: parsedAi.useSalaryBalance !== undefined ? Boolean(parsedAi.useSalaryBalance) : localParsed.useSalaryBalance,
                date: parsedAi.date || localParsed.date,
                isAiPrefilled: true
              },
              source: 'gemini'
            });
          }
        } catch (geminiErr) {
          console.warn(`Gemini quick-parse fallback on ${modelName}:`, geminiErr.message);
          // Continue to next model or fallback to local
        }
      }
    }

    // Return instant local parsed result
    return NextResponse.json({
      success: true,
      transaction: localParsed,
      source: 'local-nlp'
    });

  } catch (error) {
    console.error('Quick parse API error:', error);
    return NextResponse.json({ error: 'Failed to parse transaction' }, { status: 500 });
  }
}
