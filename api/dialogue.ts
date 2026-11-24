// Vercel Serverless Function (Node.js runtime)
// Proxy for LLM dialogue generation. API key is held exclusively in server env vars.

export interface DialogueRequestBody {
  nodeId: string;
  emotion: 'hope' | 'sadness' | 'curiosity' | 'fear';
  act: 1 | 2 | 3;
  speaker: 'narrator' | 'clock' | 'book' | 'crystal';
  recentContext?: string;
}

export interface DialogueResponseBody {
  dialogue: string;
  hint: string;
  mood: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'LLM_API_KEY not configured on server. Use fallback dialogue.' });
  }

  const { nodeId, emotion, act, speaker, recentContext } = req.body as DialogueRequestBody;

  if (!nodeId || !emotion || !act || !speaker) {
    return res.status(400).json({ error: 'Missing required parameters: nodeId, emotion, act, speaker.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const prompt = `You are the storytelling AI for "EMOTIONVERSE: THE LAST LIGHT".
Current context:
- Story Node: ${nodeId}
- Current Act: ${act}
- Dominant Emotion: ${emotion}
- Speaker: ${speaker}
${recentContext ? `- Context: ${recentContext}` : ''}

Respond with ONLY valid JSON adhering strictly to this schema:
{
  "dialogue": "A short, evocative atmospheric line (max 60 words) spoken in character fitting the ${emotion} tone.",
  "hint": "A gentle hint for the player regarding the next step.",
  "mood": "${emotion}"
}`;

    const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream LLM error: ${response.statusText}` });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(502).json({ error: 'Empty response from LLM.' });
    }

    const parsed = JSON.parse(rawText);
    return res.status(200).json(parsed);
  } catch (error: any) {
    clearTimeout(timeoutId);
    return res.status(502).json({ error: error.message || 'LLM generation timed out or failed.' });
  }
}
