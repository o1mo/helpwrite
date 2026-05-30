/// <reference lib="deno.ns" />
import Anthropic from '@anthropic-ai/sdk';

const RECALL_API_TOKEN = Deno.env.get("RECALL_API_TOKEN");
const RECALL_API_BASE = Deno.env.get("RECALL_API_BASE") ?? "https://us-west-2.recall.ai/api/v1";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

function addCorsHeaders(headers: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    ...headers
  };
}

async function recallFetch(path: string, init?: RequestInit) {
  return fetch(`${RECALL_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
      "Authorization": `Token ${RECALL_API_TOKEN}`,
      ...init?.headers,
    },
  });
}

function buildBotPayload(meetingUrl: string, botName = "HelpWrite") {
  return {
    meeting_url: meetingUrl,
    bot_name: botName,
    recording_config: {
      transcript: {
        provider: {
          meeting_captions: {}
        }
      }
    }
  };
}

function getBotStatus(bot: Record<string, unknown>): string {
  const statusChanges = bot.status_changes as Array<{ code: string; message?: string | null }> | undefined;
  if (!statusChanges?.length) return "ready";
  return statusChanges[statusChanges.length - 1].code;
}

function getBotStatusMessage(bot: Record<string, unknown>): string | null {
  const statusChanges = bot.status_changes as Array<{ code: string; message?: string | null }> | undefined;
  if (!statusChanges?.length) return null;
  return statusChanges[statusChanges.length - 1].message ?? null;
}

function parseTranscriptDownload(data: unknown): Array<{ speaker: string; text: string; timestamp: number }> {
  if (!Array.isArray(data)) return [];

  return data.flatMap((entry: Record<string, unknown>) => {
    const participant = entry.participant as { name?: string } | undefined;
    const words = entry.words as Array<{ text?: string; start_timestamp?: number | { relative?: number } }> | undefined;
    if (!words?.length) return [];

    const speaker = participant?.name ?? "Unknown";
    const text = words.map((word) => word.text ?? "").join(" ").trim();
    if (!text) return [];

    const rawTimestamp = words[0].start_timestamp;
    const timestamp = typeof rawTimestamp === "number"
      ? rawTimestamp
      : rawTimestamp?.relative ?? Date.now();

    return [{ speaker, text, timestamp }];
  });
}

async function fetchBotTranscript(botId: string) {
  const botResponse = await recallFetch(`/bot/${botId}/`);
  const bot = await botResponse.json();

  if (!botResponse.ok) {
    return { ok: false as const, status: botResponse.status, bot, entries: [] as ReturnType<typeof parseTranscriptDownload> };
  }

  const recordings = bot.recordings as Array<{
    media_shortcuts?: {
      transcript?: {
        data?: { download_url?: string };
      };
    };
  }> | undefined;

  const downloadUrl = recordings
    ?.map((recording) => recording.media_shortcuts?.transcript?.data?.download_url)
    .find(Boolean);

  if (!downloadUrl) {
    return {
      ok: true as const,
      status: botResponse.status,
      bot,
      entries: [] as ReturnType<typeof parseTranscriptDownload>,
    };
  }

  const transcriptResponse = await fetch(downloadUrl);
  const transcriptData = await transcriptResponse.json();

  return {
    ok: transcriptResponse.ok,
    status: transcriptResponse.status,
    bot,
    entries: parseTranscriptDownload(transcriptData),
  };
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log(req);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  if (url.pathname === "/api/bot" && req.method === "POST") {
    const body = await req.json();
    const meetingUrl = body.meeting_url;

    if (!meetingUrl || typeof meetingUrl !== "string") {
      return new Response(JSON.stringify({ error: "meeting_url is required" }), {
        status: 400,
        headers: addCorsHeaders()
      });
    }

    const payload = buildBotPayload(meetingUrl, body.bot_name);
    const response = await recallFetch("/bot/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: addCorsHeaders()
    });
  }

  if (url.pathname.match(/^\/api\/bot\/[^/]+$/) && req.method === "GET") {
    const botId = url.pathname.split("/")[3];

    const response = await recallFetch(`/bot/${botId}/`);
    const bot = await response.json();

    return new Response(JSON.stringify({
      id: bot.id,
      status: getBotStatus(bot),
      status_message: getBotStatusMessage(bot),
      meeting_url: bot.meeting_url,
      bot_name: bot.bot_name,
      recordings: bot.recordings ?? [],
      raw: bot,
    }), {
      status: response.status,
      headers: addCorsHeaders()
    });
  }

  if (url.pathname.startsWith("/api/bot/") && url.pathname.endsWith("/transcript") && req.method === "GET") {
    const botId = url.pathname.split("/")[3];
    console.log("Fetching transcript for bot:", botId);

    try {
      const result = await fetchBotTranscript(botId);

      if (!result.ok && !result.bot?.id) {
        return new Response(JSON.stringify({ error: "Failed to fetch bot", details: result.bot }), {
          status: result.status,
          headers: addCorsHeaders()
        });
      }

      return new Response(JSON.stringify({
        bot_id: botId,
        status: getBotStatus(result.bot),
        status_message: getBotStatusMessage(result.bot),
        entries: result.entries,
      }), {
        headers: addCorsHeaders()
      });
    } catch (error) {
      console.error("Transcript fetch error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch transcript" }), {
        status: 500,
        headers: addCorsHeaders()
      });
    }
  }

  if (url.pathname === "/api/test-anthropic" && req.method === "GET") {
    try {
      console.log(`Calling Anthropic API with model ${ANTHROPIC_MODEL}...`);
      const message = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "Write me a haiku about global payroll" }]
          }
        ]
      });

      return new Response(JSON.stringify(message), {
        headers: addCorsHeaders()
      });
    } catch (error) {
      const err = error as { name?: string; message?: string; type?: string };
      console.error("Anthropic SDK error:", err);
      return new Response(JSON.stringify({ 
        error: "Failed to call Anthropic API",
        details: err.message,
        name: err.name,
        type: err.type,
        model: ANTHROPIC_MODEL,
      }), {
        status: 500,
        headers: addCorsHeaders()
      });
    }
  }

  if (url.pathname === "/api/generate-goals" && req.method === "POST") {
    try {
      console.log("Generating goals from transcript...");
      const body = await req.json();
      const { transcript, articles } = body;
      
      const prompt = `You're analyzing transcripts from calls discussing changes to SaaS knowledge bases for customer support. 
      
Your task is to identify overarching goals for content modifications based on this conversation.

## Guidelines:
- Each goal should start with a verb (Improve, Update, Create, etc.)
- Goal titles must be under 80 characters
- Goal descriptions must be under 280 characters
- Focus on strategic changes to the knowledge base
- Identify 1-3 distinct goals based on the transcript

## Transcript:
${transcript.map((entry: { speaker: string; text: string }) => `${entry.speaker}: ${entry.text}`).join('\n')}

## Knowledge Base Articles:
${articles.map((article: { title: string; content: string }) => `
### ${article.title}
${article.content.substring(0, 300)}... (content truncated)
`).join('\n')}

Provide 1-3 goals in the following JSON array format:
[
  {
    "title": "First goal title starting with a verb (under 80 chars)",
    "description": "Detailed explanation of the first goal (under 280 chars)"
  },
  {
    "title": "Second goal title starting with a verb (under 80 chars)",
    "description": "Detailed explanation of the second goal (under 280 chars)"
  }
]`;

      const message = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }]
          }
        ]
      });

      return new Response(JSON.stringify(message), {
        headers: addCorsHeaders()
      });
    } catch (error) {
      const err = error as { message?: string };
      console.error("Goal generation error:", err);
      return new Response(JSON.stringify({ 
        error: "Failed to generate goals",
        details: err.message
      }), {
        status: 500,
        headers: addCorsHeaders()
      });
    }
  }

  if (url.pathname === "/api/generate-changes" && req.method === "POST") {
    try {
      console.log("Generating article changes...");
      const { goals, articles } = await req.json();
      
      const prompt = `
      Analyze these goals and knowledge base articles. Generate improved versions of articles that need changes.
      
      ## Goals:
      ${goals.map((g: { title: string; description: string }) => `- ${g.title}: ${g.description}`).join('\n')}
      
      ## Articles:
      ${articles.map((a: { id: string; title: string; content: string }) => `
      --- BEGIN ARTICLE: ${a.id} ---
      # ${a.title}
      ${a.content}
      --- END ARTICLE: ${a.id} ---
      `).join('\n\n')}
      
      For each article that needs changes based on the goals, provide the complete updated content.
      Use this exact format for each article you modify:
      
      --- UPDATED ARTICLE: [article_id] ---
      [Complete updated content with all changes incorporated]
      --- END UPDATED ARTICLE: [article_id] ---
      
      Only include articles that need changes. Don't explain the changes, just provide the updated content.
      `;
      
      const message = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 8192,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }]
      });
      
      return new Response(JSON.stringify(message), { 
        headers: addCorsHeaders() 
      });
    } catch (error) {
      const err = error as { message?: string };
      console.error("Generate changes error:", err);
      return new Response(JSON.stringify({ 
        error: "Failed to generate changes",
        details: err.message 
      }), { 
        status: 500, 
        headers: addCorsHeaders() 
      });
    }
  }

  return new Response("Not Found", { 
    status: 404, 
    headers: addCorsHeaders({
      "Content-Type": "text/plain"
    })
  });
}

console.log(`Server running on http://localhost:8000 (Anthropic model: ${ANTHROPIC_MODEL})`);
Deno.serve({ port: 8000 }, handler);
