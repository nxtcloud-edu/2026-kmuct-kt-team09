// 모든 route handler가 공유하는 응답 봉투 헬퍼. 여기 말고 다른 곳에서 Response.json을 직접 부르지 않는다.
import type { ApiResult } from "@/lib/types";

/** 성공 응답: { ok: true, data } */
export function ok<T>(data: T, status = 200): Response {
  const body: ApiResult<T> = { ok: true, data };
  return Response.json(body, { status });
}

/** 실패 응답: { ok: false, error }. 기본 400. */
export function fail(error: string, status = 400): Response {
  const body: ApiResult<never> = { ok: false, error };
  return Response.json(body, { status });
}

/** 요청 본문 파싱. 본문이 없거나 JSON이 아니면 null. 호출부에서 null이면 fail("...")로 응답한다. */
export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** 하이픈 없는 짧은 id. 기본 12자. */
export const uid = (n = 12) => crypto.randomUUID().replace(/-/g, "").slice(0, n);
