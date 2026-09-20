// Server-only. Do not import from client components.
// 주최측 OpenAI 호환 게이트웨이(AWS Bedrock)를 부른다. 모델은 별칭으로 지정한다(예: bedrock-haiku).
const DEFAULT_BASE_URL = "https://52.79.201.46/v1";
const DEFAULT_MODEL = "bedrock-haiku";

function apiKey(): string {
  // 게이트웨이 키. 예전 변수명도 그대로 받는다.
  return process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || "";
}

function baseUrl(): string {
  return (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function claudeEnabled(): boolean {
  return process.env.MOCK_CLAUDE !== "true" && Boolean(apiKey());
}

export async function askJson<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  validate: (v: unknown) => T | null;
  fallback: T;
}): Promise<{ data: T; source: "claude" | "fallback"; error?: string }> {
  const startMs = Date.now();
  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;

  if (!claudeEnabled()) {
    return { data: opts.fallback, source: "fallback", error: "mock" };
  }

  const log = (source: "claude" | "fallback", error?: string) => {
    console.log(
      JSON.stringify({ type: "teamflow-claude", model, ms: Date.now() - startMs, source, error })
    );
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const res = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 2000,
        messages: [
          {
            role: "system",
            content: opts.system + "\n반드시 JSON 객체 하나만 출력한다. 설명·코드펜스 금지.",
          },
          { role: "user", content: opts.user },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = (await res.text()).slice(0, 160);
      log("fallback", `HTTP ${res.status}: ${body}`);
      return { data: opts.fallback, source: "fallback", error: `HTTP ${res.status}` };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const raw = json?.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : "";

    // 모델이 ```json 펜스나 설명을 붙여도 첫 { 부터 마지막 } 까지만 쓴다.
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      log("fallback", "형식 불일치");
      return { data: opts.fallback, source: "fallback", error: "형식 불일치" };
    }

    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
    const validated = opts.validate(parsed);
    if (validated === null) {
      log("fallback", "형식 불일치");
      return { data: opts.fallback, source: "fallback", error: "형식 불일치" };
    }

    log("claude");
    return { data: validated, source: "claude" };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160);
    log("fallback", errorMsg);
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
