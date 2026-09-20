// POST /api/meeting/summarize — 회의록 원문을 요약해 저장하고 회의를 done으로 바꾼다.
// 지금은 mockSummary 고정. D1이 Claude 호출로 본문만 갈아낀다(응답 모양은 그대로).
import { fail, ok, readJson } from "@/lib/http";
import { mockSummary } from "@/lib/mock";
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
  if (typeof body.rawNotes !== "string" || !body.rawNotes) {
    return fail("rawNotes must be a non-empty string");
  }

  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);
  if (!bundle.meetings.some((m) => m.id === body.meetingId)) {
    return fail("not found", 404);
  }

  await updateMeeting(body.meetingId, {
    rawNotes: body.rawNotes,
    summary: mockSummary,
    status: "done",
  });
  const data: { summary: MeetingSummary } = { summary: mockSummary };
  return ok(data);
}
