// GET /api/calendar/availability?projectId=... — 멤버별 바쁜 시간대.
// mock이면 고정 데이터, 아니면 Google freeBusy를 병렬로 조회한다.
import { fail, ok } from "@/lib/http";
import { fetchBusy } from "@/lib/google/calendar";
import { isMockGoogle } from "@/lib/mock";
import { mockAvailability } from "@/lib/mock";
import { getBundle } from "@/lib/store";
import type { AvailabilityRes, MemberAvailability } from "@/lib/types";

const GOOGLE_TIMEOUT_MS = 15_000;
const FALLBACK_WINDOW_DAYS = 14;

export async function GET(req: Request): Promise<Response> {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return fail("projectId is required");

  const bundle = await getBundle(projectId);
  if (!bundle) return fail("not found", 404);

  if (isMockGoogle()) {
    // mock 데이터는 멤버 4명 기준이다. 실제 멤버 순서에 맞춰 memberId만 바꿔 주고,
    // 5번째 멤버부터는 바쁜 시간이 없는 것으로 둔다.
    const availability: MemberAvailability[] = bundle.members.map((m, i) => ({
      memberId: m.id,
      busy: i < mockAvailability.length ? mockAvailability[i].busy : [],
    }));

    const data: AvailabilityRes = { availability, source: "mock" };
    return ok(data);
  }

  const now = new Date();
  const deadlineEnd = new Date(`${bundle.project.deadline}T23:59:59+09:00`);
  const fallbackEnd = new Date(now.getTime() + FALLBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const timeMin = now.toISOString();
  const timeMax = (deadlineEnd.getTime() > now.getTime() ? deadlineEnd : fallbackEnd).toISOString();

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GOOGLE_TIMEOUT_MS));

  const results = await Promise.all(
    bundle.members.map(async (m) => {
      const busy = await Promise.race([fetchBusy(m.id, timeMin, timeMax), timeout]);
      return { memberId: m.id, busy };
    })
  );

  const notConnected: string[] = [];
  const availability: MemberAvailability[] = results.map((r) => {
    if (r.busy === null) {
      notConnected.push(r.memberId);
      return { memberId: r.memberId, busy: [] };
    }
    return { memberId: r.memberId, busy: r.busy };
  });

  const data: AvailabilityRes = { availability, source: "google", notConnected };
  return ok(data);
}
