// Vercel Serverless Function (Node.js runtime)
// Proxy for LLM dialogue generation. API key is held exclusively in server env vars.

export interface DialogueRequestBody {
  nodeId: string;
  emotion: 'hope' | 'sadness' | 'curiosity' | 'fear';
  act: 1 | 2 | 3;
  speaker: 'narrator' | 'clock' | 'book' | 'crystal';
  recentContext?: string;
  availableChoiceLabels?: string[];
}

export interface DialogueResponseBody {
  dialogue: string;
  hint: string;
  mood: string;
}

interface IncomingMessageLike {
  method?: string;
  body?: unknown;
}

interface ServerResponseLike {
  status: (code: number) => ServerResponseLike;
  json: (data: unknown) => void;
}

const EMOTION_PROMPTS: Record<'hope' | 'sadness' | 'curiosity' | 'fear', string> = {
  hope: 'Tone: Warm, uplifting, golden dawn imagery. Emphasize renewal, resilience, and faith in tomorrow.',
  sadness: 'Tone: Melancholic, misty blue atmosphere. Emphasize quiet beauty, poetic grief, and honoring what was lost.',
  curiosity: 'Tone: Inquisitive, mystical emerald/cyan glow. Emphasize ancient ciphers, hidden mechanisms, and starlit wonder.',
  fear: 'Tone: Tense, shadowy, ominous storm atmosphere. Emphasize vigilance, heavy silence, and trembling courage against the dark.',
};

export default async function handler(req: IncomingMessageLike, res: ServerResponseLike) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'LLM_API_KEY not configured on server. Use fallback dialogue.' });
  }

  const body = (req.body ?? {}) as Partial<DialogueRequestBody>;
  const { nodeId, emotion, act, speaker, recentContext, availableChoiceLabels } = body;

  if (!nodeId || !emotion || !act || !speaker) {
    return res.status(400).json({ error: 'Missing required parameters: nodeId, emotion, act, speaker.' });
  }

  const emotionGuidance = EMOTION_PROMPTS[emotion] || EMOTION_PROMPTS.hope;
  const choicesContext = availableChoiceLabels && availableChoiceLabels.length > 0
    ? `- Possible directions for player: ${availableChoiceLabels.join(' | ')}`
    : '';

  const prompt = `You are the atmospheric narrator for the indie dark fantasy game "EMOTIONVERSE: THE LAST LIGHT".
World context: The world's primordial light is fading, leaving only emotional energy. The player is the last keeper.

Current situation:
- Story Node: ${nodeId}
- Current Act: ${act} of 3
- Dominant Emotion: ${emotion.toUpperCase()} (${emotionGuidance})
- Speaker: ${speaker.toUpperCase()}
${recentContext ? `- Recent context: ${recentContext}` : ''}
${choicesContext}

Task: Generate an evocative line and a contextual hint in character.
Adhere strictly to this JSON schema (NO prose, NO markdown code fences, ONLY raw JSON):
{
  "dialogue": "Atmospheric spoken line in character (1 to 2 sentences, maximum 60 words, deep emotional resonance).",
  "hint": "A gentle contextual hint guiding the player toward their next action without spoiling the mystery (1 sentence, max 25 words).",
  "mood": "${emotion}"
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const isGemini = !apiKey.startsWith('sk-');
    let rawText = '';

    if (isGemini) {
      // Gemini API
      const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
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
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(502).json({ error: `Upstream LLM error: ${response.statusText}` });
      }

      const data = await response.json();
      rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } else {
      // OpenAI-compatible endpoint
      const model = process.env.LLM_MODEL || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are the storyteller for EMOTIONVERSE. Respond with raw JSON only.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(502).json({ error: `Upstream LLM error: ${response.statusText}` });
      }

      const data = await response.json();
      rawText = data?.choices?.[0]?.message?.content ?? '';
    }

    if (!rawText.trim()) {
      return res.status(502).json({ error: 'Empty response from LLM.' });
    }

    const parsed = JSON.parse(rawText);
    return res.status(200).json(parsed);
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : 'LLM request failed or timed out.';
    return res.status(502).json({ error: msg });
  }
}
