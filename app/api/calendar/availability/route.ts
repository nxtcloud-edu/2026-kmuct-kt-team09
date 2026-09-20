// GET /api/calendar/availability?projectId=... — 멤버별 바쁜 시간대.
// 지금은 mock. C가 Google freeBusy 호출로 본문만 갈아낀다(응답 모양은 그대로).
import { fail, ok } from "@/lib/http";
import { mockAvailability } from "@/lib/mock";
import { getBundle } from "@/lib/store";
import type { AvailabilityRes, MemberAvailability } from "@/lib/types";

export async function GET(req: Request): Promise<Response> {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return fail("projectId is required");

  const bundle = await getBundle(projectId);
  if (!bundle) return fail("not found", 404);

  // mock 데이터는 멤버 4명 기준이다. 실제 멤버 순서에 맞춰 memberId만 바꿔 주고,
  // 5번째 멤버부터는 바쁜 시간이 없는 것으로 둔다.
  const availability: MemberAvailability[] = bundle.members.map((m, i) => ({
    memberId: m.id,
    busy: i < mockAvailability.length ? mockAvailability[i].busy : [],
  }));

  const data: AvailabilityRes = { availability, source: "mock" };
  return ok(data);
}
