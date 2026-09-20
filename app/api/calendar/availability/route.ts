// GET /api/calendar/availability?projectId=... — 멤버별 바쁜 시간대.
// 실제 계산은 lib/google/availability.ts가 한다(추천 API도 같은 함수를 직접 부른다).
import { fail, ok } from "@/lib/http";
import { buildAvailability } from "@/lib/google/availability";
import { getBundle } from "@/lib/store";

export async function GET(req: Request): Promise<Response> {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return fail("projectId is required");

  const bundle = await getBundle(projectId);
  if (!bundle) return fail("not found", 404);

  return ok(await buildAvailability(bundle));
}
