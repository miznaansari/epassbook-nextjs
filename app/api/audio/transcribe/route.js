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

    const formData = await request.formData();
    const audioFile = formData.get('file');

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided for transcription' },
        { status: 400 }
      );
    }

    // Convert to ArrayBuffer & sanitize MIME type (remove parameters like ;codecs=opus)
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rawType = audioFile.type || 'audio/webm';
    let cleanMimeType = rawType.split(';')[0].trim();
    if (!cleanMimeType || cleanMimeType === 'application/octet-stream') {
      cleanMimeType = 'audio/webm';
    }

    const extension = cleanMimeType.includes('wav')
      ? 'wav'
      : cleanMimeType.includes('mp4')
        ? 'mp4'
        : cleanMimeType.includes('mp3') || cleanMimeType.includes('mpeg')
          ? 'mp3'
          : cleanMimeType.includes('ogg')
            ? 'ogg'
            : 'webm';

    const cleanBlob = new Blob([buffer], { type: cleanMimeType });

    // Build Sarvam AI FormData payload
    const sarvamFormData = new FormData();
    sarvamFormData.append('file', cleanBlob, `audio.${extension}`);
    sarvamFormData.append('model', 'saaras:v3');
    sarvamFormData.append('mode', 'transcribe');

    // Call Sarvam AI Speech-to-Text API
    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamApiKey,
      },
      body: sarvamFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sarvam STT API error:', response.status, errorText);

      // Retry with saaras:v2 or fallback
      const retryResponse = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': sarvamApiKey,
        },
        body: sarvamFormData,
      });

      if (!retryResponse.ok) {
        return NextResponse.json(
          { error: `Sarvam STT failed: ${errorText}` },
          { status: response.status }
        );
      }

      const retryData = await retryResponse.json();
      return NextResponse.json({
        transcript: retryData.transcript || '',
        language_code: retryData.language_code || 'hi-IN',
        provider: 'sarvam-ai',
      });
    }

    const data = await response.json();
    return NextResponse.json({
      transcript: data.transcript || '',
      language_code: data.language_code || 'hi-IN',
      provider: 'sarvam-ai',
    });

  } catch (error) {
    console.error('Error in /api/audio/transcribe:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during transcription' },
      { status: 500 }
    );
  }
}
