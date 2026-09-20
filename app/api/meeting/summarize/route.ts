// POST /api/meeting/summarize — 회의록 원문을 Claude로 요약해 저장하고 회의를 done으로 바꾼다.
// 다음 회의 후보는 화면이 이어서 /api/schedule/recommend를 부른다.
import { summarizeMeeting } from "@/lib/claude/summary";
import { fail, ok, readJson } from "@/lib/http";
import { getBundle, updateMeeting } from "@/lib/store";
import type { MeetingSummary, SummarizeReq } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<SummarizeReq>(req);
  if (!body) return fail("invalid json body");
  if (typeof body.projectId !== "string" || !body.projectId) {
    return fail("projectId must be a non-empty string");
  }
  if (typeof body.meetingId !== "string" || !body.meetingId) {
    return fail("meetingId must be a non-empty string");
  }
  if (typeof body.rawNotes !== "string" || body.rawNotes.trim().length < 10) {
    return fail("회의록을 10자 이상 입력하세요");
  }

  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);
  const meeting = bundle.meetings.find((m) => m.id === body.meetingId);
  if (!meeting) return fail("not found", 404);

  const summary = await summarizeMeeting({
    projectGoal: bundle.project.goal,
    rawMeetingNotes: body.rawNotes,
    memberNames: bundle.members.map((m) => m.name),
  });

  await updateMeeting(body.meetingId, {
    rawNotes: body.rawNotes,
    summary,
    status: "done",
  });

  const data: { summary: MeetingSummary } = { summary };
  return ok(data);
}
