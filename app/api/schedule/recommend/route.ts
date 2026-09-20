// POST /api/schedule/recommend — 회의 시간 후보를 돌려준다.
import { fail, ok, readJson } from "@/lib/http";
import { MOCK_NOW, isMockGoogle } from "@/lib/mock";
import { buildAvailability } from "@/lib/google/availability";
import { recommend, type ScheduleInput } from "@/lib/scheduler";
import { getBundle } from "@/lib/store";
import type { RecommendReq, RecommendRes, AvailabilityRes } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  // 1. body 검증
  const body = await readJson<RecommendReq>(req);
  if (!body) return fail("invalid json body");
  if (typeof body.projectId !== "string" || !body.projectId) {
    return fail("projectId, excludedSlotIds 필요", 400);
  }
  const excludedSlotIds = Array.isArray(body.excludedSlotIds) ? body.excludedSlotIds : [];

  // 2. bundle 조회
  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);
  if (bundle.project.status === "closed") {
    return fail("종료된 프로젝트", 409);
  }

  // 3. availability 조회 — 같은 인스턴스에서 직접 계산한다.
  //    (자기 서버를 HTTP로 다시 부르면 다른 인스턴스로 가서 프로젝트를 못 찾을 수 있다)
  let availabilityRes: AvailabilityRes;
  try {
    availabilityRes = await buildAvailability(bundle);
  } catch (err) {
    return fail("캘린더 조회 실패: " + String(err).slice(0, 160), 502);
  }

  // 4. now 결정
  const now = isMockGoogle() ? MOCK_NOW : new Date().toISOString();

  // 5. ScheduleInput 구성
  const { project, members, meetings } = bundle;
  const input: ScheduleInput = {
    now,
    deadline: project.deadline,
    weekdays: project.weekdays,
    availableStart: project.availableStart,
    availableEnd: project.availableEnd,
    preferredStart: project.preferredStart,
    preferredEnd: project.preferredEnd,
    minMeetingMinutes: project.minMeetingMinutes,
    maxMeetingMinutes: project.maxMeetingMinutes,
    memberIds: members.map((m) => m.id),
    availability: availabilityRes.availability,
    excludedSlotIds,
    meetingNumber: meetings.length + 1,
    excludedDates: meetings.map((m) => m.slot.date),
  };

  // 6. 스케줄링
  const result = recommend(input);
  const data: RecommendRes = {
    slots: result.slots,
    remaining: result.remaining,
    reason: result.reason,
  };
  return ok(data);
}
