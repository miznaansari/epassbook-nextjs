import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const sarvamApiKey = process.env.SARVAM_API_KEY;
    if (!sarvamApiKey) {
      return NextResponse.json(
        { error: 'SARVAM_API_KEY is not configured in .env' },
        { status: 400 }
      );
    }

    const body = await request.json();
    let { text, language_code = 'hi-IN', speaker = 'shubh', pace = 1.05 } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text string is required for speech synthesis' },
        { status: 400 }
      );
    }

    // Clean markdown, raw JSON transaction proposal blocks, and code formatting from spoken speech
    const cleanSpokenText = text
      .replace(/```json:transaction_proposal[\s\S]*?```/g, 'I have created a transaction approval proposal card for your review.')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*_~`>[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2400); // Sarvam bulbul limit

    if (!cleanSpokenText) {
      return NextResponse.json(
        { error: 'No readable speech text after filtering markdown' },
        { status: 400 }
      );
    }

    // Attempt 1: Sarvam Bulbul v3 schema
    let response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: cleanSpokenText,
        language_code: language_code,
        model: 'bulbul:v3',
        speaker: speaker,
        pace: pace,
      }),
    });

    // Fallback: If bulbul:v3 gives 400 or expects inputs/target_language_code
    if (!response.ok) {
      const firstErr = await response.text();
      console.warn('Sarvam bulbul:v3 request failed, trying bulbul:v2 fallback...', firstErr);

      response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'api-subscription-key': sarvamApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [cleanSpokenText],
          target_language_code: language_code,
          speaker: 'meera',
          model: 'bulbul:v1',
          pitch: 0,
          pace: pace,
          loudness: 1.5,
          speech_sample_rate: 16000,
          enable_preprocessing: true,
        }),
      });

      if (!response.ok) {
        const secondErr = await response.text();
        console.error('Sarvam TTS API Error:', response.status, secondErr);
        return NextResponse.json(
          { error: `Sarvam TTS API returned ${response.status}: ${secondErr}` },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    const audioBase64 = Array.isArray(data.audios) ? data.audios[0] : (data.audio || null);

    if (!audioBase64) {
      return NextResponse.json(
        { error: 'No audio data received from Sarvam TTS' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      audio: audioBase64,
      mimeType: 'audio/wav',
      provider: 'sarvam-ai',
      model: 'bulbul:v3',
    });

  } catch (error) {
    console.error('Error in /api/audio/speech:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during speech synthesis' },
      { status: 500 }
    );
  }
}
