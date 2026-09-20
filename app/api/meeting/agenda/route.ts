// POST /api/meeting/agenda — 회의 아젠다를 만들어 회의에 저장한다.
// 지금은 mockAgenda 고정. D1이 Claude 호출로 본문만 갈아낀다(응답 모양은 그대로).
import { fail, ok, readJson } from "@/lib/http";
import { mockAgenda } from "@/lib/mock";
import { getBundle, updateMeeting } from "@/lib/store";
import type { Agenda, MeetingRef } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<MeetingRef>(req);
  if (!body) return fail("invalid json body");
  if (typeof body.projectId !== "string" || !body.projectId) {
    return fail("projectId must be a non-empty string");
  }
  if (typeof body.meetingId !== "string" || !body.meetingId) {
    return fail("meetingId must be a non-empty string");
  }

  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);
  // 다른 프로젝트의 회의 id로는 못 고치게 막는다.
  if (!bundle.meetings.some((m) => m.id === body.meetingId)) {
    return fail("not found", 404);
  }

  await updateMeeting(body.meetingId, { agenda: mockAgenda });
  const data: { agenda: Agenda } = { agenda: mockAgenda };
  return ok(data);
}
