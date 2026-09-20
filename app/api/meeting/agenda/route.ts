// POST /api/meeting/agenda — 회의 아젠다를 만들어 회의에 저장한다.
import { fail, ok, readJson } from "@/lib/http";
import { getBundle, updateMeeting } from "@/lib/store";
import type { Agenda, MeetingRef } from "@/lib/types";
import { generateMeetingAgenda } from "@/lib/claude/agenda";

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

  const meeting = bundle.meetings.find((m) => m.id === body.meetingId);
  if (!meeting) return fail("not found", 404);

  // 이전 회의의 summary 찾기
  const previousMeeting = bundle.meetings.find((m) => m.number === meeting.number - 1);
  const previousSummary = previousMeeting?.summary ?? null;

  // 남은 회의 수 계산
  const remaining = Math.max(0, bundle.project.expectedMeetingCount - meeting.number);

  const agenda = await generateMeetingAgenda({
    projectGoal: bundle.project.goal,
    deadline: bundle.project.deadline,
    meetingNumber: meeting.number,
    previousMeetingSummary: previousSummary,
    remainingMeetingCount: remaining,
    meetingDate: meeting.slot.date,
  });

  await updateMeeting(body.meetingId, { agenda });
  const data: { agenda: Agenda } = { agenda };
  return ok(data);
}
