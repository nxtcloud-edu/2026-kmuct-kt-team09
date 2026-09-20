// 멤버별 바쁜 시간대 계산. route와 추천 API가 같은 함수를 부른다.
// (예전에는 추천 API가 자기 서버를 HTTP로 다시 호출해서, 다른 인스턴스로 가면
//  프로젝트를 못 찾고 "캘린더 조회 실패: not found"가 났다.)
import { fetchBusy } from "./calendar";
import { isMockGoogle, mockAvailability } from "@/lib/mock";
import type { AvailabilityRes, MemberAvailability, ProjectBundle } from "@/lib/types";

const GOOGLE_TIMEOUT_MS = 15_000;
const FALLBACK_WINDOW_DAYS = 14;

export async function buildAvailability(bundle: ProjectBundle): Promise<AvailabilityRes> {
  if (isMockGoogle()) {
    // mock 데이터는 멤버 4명 기준이다. 실제 멤버 순서에 맞춰 memberId만 바꿔 주고,
    // 5번째 멤버부터는 바쁜 시간이 없는 것으로 둔다.
    const availability: MemberAvailability[] = bundle.members.map((m, i) => ({
      memberId: m.id,
      busy: i < mockAvailability.length ? mockAvailability[i].busy : [],
    }));
    return { availability, source: "mock" };
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

  return { availability, source: "google", notConnected };
}
