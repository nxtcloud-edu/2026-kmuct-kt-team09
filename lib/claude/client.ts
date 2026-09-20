// Server-only. Do not import from client components.
import Anthropic from "@anthropic-ai/sdk";

export function claudeEnabled(): boolean {
  return process.env.MOCK_CLAUDE !== "true" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function askJson<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  validate: (v: unknown) => T | null;
  fallback: T;
}): Promise<{ data: T; source: "claude" | "fallback"; error?: string }> {
  const startMs = Date.now();

  if (!claudeEnabled()) {
    return { data: opts.fallback, source: "fallback", error: "mock" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

  try {
    const client = new Anthropic({ apiKey, maxRetries: 0 });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const msg = await client.messages.create(
      {
        model,
        max_tokens: opts.maxTokens ?? 2000,
        system: opts.system + "\n반드시 JSON 객체 하나만 출력한다. 설명·코드펜스 금지.",
        messages: [{ role: "user", content: opts.user }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const textBlocks = msg.content.filter((c) => c.type === "text");
    const text = textBlocks.map((c) => (c as { text: string }).text).join("");

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      const ms = Date.now() - startMs;
      console.log(JSON.stringify({ type: "teamflow-claude", model, ms, source: "fallback", error: "형식 불일치" }));
      return { data: opts.fallback, source: "fallback", error: "형식 불일치" };
    }

    const jsonText = text.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonText);
    const validated = opts.validate(parsed);

    if (validated === null) {
      const ms = Date.now() - startMs;
      console.log(JSON.stringify({ type: "teamflow-claude", model, ms, source: "fallback", error: "형식 불일치" }));
      return { data: opts.fallback, source: "fallback", error: "형식 불일치" };
    }

    const ms = Date.now() - startMs;
    console.log(JSON.stringify({ type: "teamflow-claude", model, ms, source: "claude" }));
    return { data: validated, source: "claude" };
  } catch (err) {
    const ms = Date.now() - startMs;
    const errorMsg = err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160);
    console.log(JSON.stringify({ type: "teamflow-claude", model, ms, source: "fallback", error: errorMsg }));
    return { data: opts.fallback, source: "fallback", error: errorMsg };
  }
}

export function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

export function strArr(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .slice(0, maxItems)
    .map((x) => x.slice(0, maxLen));
}
