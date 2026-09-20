// POST /api/stt/transcribe — 음성 파일을 다글로 STT로 보내 텍스트를 받는다.
// 서버 전용. 토큰은 client component에 노출하지 않는다.
import { fail, ok } from "@/lib/http";

const DAGLO_SYNC_URL = "https://apis.daglo.ai/stt/v1/sync/transcripts";

export async function POST(req: Request): Promise<Response> {
  const token = process.env.DAGLO_API_TOKEN;
  if (!token) {
    return fail("음성 인식이 설정되지 않았습니다(DAGLO_API_TOKEN 없음).", 503);
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return fail("multipart/form-data 형식이 아닙니다.", 400);
  }
  if (!file || file.size === 0) {
    return fail("음성 파일(file)이 필요합니다.", 400);
  }
  // 동기 API는 30초 이하만 받는다. 대략적인 상한만 막는다(30초 webm ≈ 1MB 이하).
  if (file.size > 10 * 1024 * 1024) {
    return fail("파일이 너무 큽니다. 30초 이내로 녹음해 주세요.", 413);
  }

  const upstream = new FormData();
  // 다글로 지원 확장자로 맞춘다(브라우저 webm 오디오 = weba).
  upstream.append("file", file, "recording.weba");

  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const res = await fetch(DAGLO_SYNC_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const ms = Date.now() - started;
    if (res.status === 204) {
      console.log(JSON.stringify({ type: "teamflow-stt", ms, status: 204, chars: 0 }));
      return ok({ transcript: "", note: "인식된 음성이 없습니다." });
    }
    if (!res.ok) {
      const body = await res.text();
      console.log(JSON.stringify({ type: "teamflow-stt", ms, status: res.status }));
      return fail(`음성 인식 실패(${res.status}): ${body.slice(0, 160)}`, 502);
    }

    const json = (await res.json()) as { sttResult?: { transcript?: unknown } };
    const raw = json?.sttResult?.transcript;
    const transcript = typeof raw === "string" ? raw.trim() : "";
    console.log(JSON.stringify({ type: "teamflow-stt", ms, status: 200, chars: transcript.length }));
    return ok({ transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`음성 인식 실패: ${message.slice(0, 160)}`, 502);
  }
}
