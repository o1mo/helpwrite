/// <reference lib="deno.ns" />
import Anthropic from '@anthropic-ai/sdk';

const RECALL_API_TOKEN = Deno.env.get("RECALL_API_TOKEN");
const RECALL_API_BASE = Deno.env.get("RECALL_API_BASE") ?? "https://us-west-2.recall.ai/api/v1";
const RECALL_PUBLIC_URL = Deno.env.get("RECALL_PUBLIC_URL")?.replace(/\/$/, "");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

type TranscriptEntry = {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
};

const liveTranscripts = new Map<string, TranscriptEntry[]>();
const sseSubscribers = new Map<string, Set<(entry: TranscriptEntry) => void>>();

function addCorsHeaders(headers: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    ...headers
  };
}

function getRealtimeWebhookUrl(): string | null {
  if (!RECALL_PUBLIC_URL) return null;
  return `${RECALL_PUBLIC_URL}/api/recall/webhook`;
}

function isLiveTranscriptEnabled(): boolean {
  return getRealtimeWebhookUrl() !== null;
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
  const recording_config: Record<string, unknown> = {
    transcript: {
      provider: {
        recallai_streaming: {
          mode: "prioritize_low_latency",
          language_code: "en",
        },
      },
    },
  };

  const webhookUrl = getRealtimeWebhookUrl();
  if (webhookUrl) {
    recording_config.realtime_endpoints = [
      {
        type: "webhook",
        url: webhookUrl,
        events: ["transcript.data"],
      },
    ];
  }

  return {
    meeting_url: meetingUrl,
    bot_name: botName,
    recording_config,
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

function parseTranscriptDownload(data: unknown): TranscriptEntry[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((entry: Record<string, unknown>, index: number) => {
    const participant = entry.participant as { name?: string } | undefined;
    const words = entry.words as Array<{ text?: string; start_timestamp?: number | { relative?: number } }> | undefined;
    if (!words?.length) return [];

    const speaker = participant?.name ?? "Unknown";
    const text = words.map((word) => word.text ?? "").join(" ").trim();
    if (!text) return [];

    const rawTimestamp = words[0].start_timestamp;
    const timestamp = typeof rawTimestamp === "number"
      ? rawTimestamp
      : rawTimestamp?.relative != null
        ? Math.round(rawTimestamp.relative * 1000)
        : Date.now();

    return [{
      id: `download-${index}-${timestamp}`,
      speaker,
      text,
      timestamp,
    }];
  });
}

function parseRealtimeTranscriptEvent(body: Record<string, unknown>): { botId: string; entry: TranscriptEntry } | null {
  if (body.event !== "transcript.data") return null;

  const envelope = body.data as Record<string, unknown> | undefined;
  const part = envelope?.data as Record<string, unknown> | undefined;
  if (!part) return null;

  const bot = envelope?.bot as { id?: string } | undefined;
  const botId = bot?.id;
  if (!botId) return null;

  const participant = part.participant as { name?: string | null; id?: number | null } | undefined;
  const words = part.words as Array<{
    text?: string;
    start_timestamp?: { relative?: number } | number;
  }> | undefined;
  if (!words?.length) return null;

  const speaker = participant?.name
    ?? (participant?.id != null ? `Participant ${participant.id}` : "Unknown");
  const text = words.map((word) => word.text ?? "").join(" ").trim();
  if (!text) return null;

  const rawTimestamp = words[0].start_timestamp;
  const timestamp = typeof rawTimestamp === "number"
    ? rawTimestamp
    : rawTimestamp?.relative != null
      ? Math.round(rawTimestamp.relative * 1000)
      : Date.now();

  return {
    botId,
    entry: {
      id: crypto.randomUUID(),
      speaker,
      text,
      timestamp,
    },
  };
}

function appendLiveEntry(botId: string, entry: TranscriptEntry) {
  const existing = liveTranscripts.get(botId) ?? [];
  if (existing.some((e) => e.id === entry.id)) return;

  const updated = [...existing, entry].sort((a, b) => a.timestamp - b.timestamp);
  liveTranscripts.set(botId, updated);

  for (const notify of sseSubscribers.get(botId) ?? []) {
    notify(entry);
  }
}

function mergeTranscriptEntries(live: TranscriptEntry[], downloaded: TranscriptEntry[]): TranscriptEntry[] {
  const merged = [...live];
  for (const entry of downloaded) {
    const duplicate = merged.some(
      (e) => e.speaker === entry.speaker && e.text === entry.text,
    );
    if (!duplicate) merged.push(entry);
  }
  return merged.sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchBotTranscript(botId: string) {
  const botResponse = await recallFetch(`/bot/${botId}/`);
  const bot = await botResponse.json();

  if (!botResponse.ok) {
    return { ok: false as const, status: botResponse.status, bot, entries: [] as TranscriptEntry[] };
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
      entries: [] as TranscriptEntry[],
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

  if (url.pathname === "/api/recall/webhook" && req.method === "POST") {
    try {
      const body = await req.json() as Record<string, unknown>;
      const parsed = parseRealtimeTranscriptEvent(body);

      if (parsed) {
        appendLiveEntry(parsed.botId, parsed.entry);
        console.log(`[live] ${parsed.entry.speaker}: ${parsed.entry.text}`);
      } else if (body.event) {
        console.log(`[webhook] unhandled event: ${body.event}`);
      }
    } catch (error) {
      console.error("Webhook error:", error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: addCorsHeaders(),
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

    if (response.ok && data.id) {
      liveTranscripts.set(data.id, []);
    }

    return new Response(JSON.stringify({
      ...data,
      live_transcript_enabled: isLiveTranscriptEnabled(),
      live_transcript_webhook: getRealtimeWebhookUrl(),
    }), {
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
      live_transcript_enabled: isLiveTranscriptEnabled(),
    }), {
      status: response.status,
      headers: addCorsHeaders()
    });
  }

  if (url.pathname.match(/^\/api\/bot\/[^/]+\/transcript\/stream$/) && req.method === "GET") {
    const botId = url.pathname.split("/")[3];
    const encoder = new TextEncoder();

    let cleanup: (() => void) | undefined;

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        for (const entry of liveTranscripts.get(botId) ?? []) {
          send("entry", entry);
        }

        const listener = (entry: TranscriptEntry) => send("entry", entry);
        const listeners = sseSubscribers.get(botId) ?? new Set();
        listeners.add(listener);
        sseSubscribers.set(botId, listeners);

        const keepalive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          } catch {
            clearInterval(keepalive);
          }
        }, 15000);

        cleanup = () => {
          clearInterval(keepalive);
          listeners.delete(listener);
          if (listeners.size === 0) sseSubscribers.delete(botId);
        };
      },
      cancel() {
        cleanup?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (url.pathname.startsWith("/api/bot/") && url.pathname.endsWith("/transcript") && req.method === "GET") {
    const botId = url.pathname.split("/")[3];

    try {
      const live = liveTranscripts.get(botId) ?? [];
      const result = await fetchBotTranscript(botId);

      if (!result.ok && !result.bot?.id) {
        return new Response(JSON.stringify({ error: "Failed to fetch bot", details: result.bot }), {
          status: result.status,
          headers: addCorsHeaders()
        });
      }

      const entries = mergeTranscriptEntries(live, result.entries);

      return new Response(JSON.stringify({
        bot_id: botId,
        status: getBotStatus(result.bot),
        status_message: getBotStatusMessage(result.bot),
        entries,
        live_count: live.length,
        live_transcript_enabled: isLiveTranscriptEnabled(),
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

const liveNote = isLiveTranscriptEnabled()
  ? `live transcript webhook: ${getRealtimeWebhookUrl()}`
  : "live transcript disabled — set RECALL_PUBLIC_URL to your ngrok/https tunnel (see README)";

console.log(`Server running on http://localhost:8000 (${liveNote})`);
Deno.serve({ port: 8000 }, handler);
