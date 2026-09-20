// POST /api/email/send — 프로젝트 멤버 전원에게 메일을 보낸다.
// 지금은 실제로 보내지 않고 보낸 수만 센다. C가 Gmail 발송으로 본문만 갈아낀다(응답 모양은 그대로).
import { fail, ok, readJson } from "@/lib/http";
import { getBundle } from "@/lib/store";
import type { EmailKind, EmailReq, EmailRes } from "@/lib/types";

const KINDS: EmailKind[] = [
  "PROJECT_INVITE",
  "MEETING_CONFIRMED",
  "MEETING_REMINDER",
  "MEETING_SUMMARY",
];

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<EmailReq>(req);
  if (!body) return fail("invalid json body");
  if (typeof body.projectId !== "string" || !body.projectId) {
    return fail("projectId must be a non-empty string");
  }
  if (typeof body.kind !== "string" || !KINDS.includes(body.kind)) {
    return fail(`kind must be one of ${KINDS.join(", ")}`);
  }

  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);

  // meetingId는 선택이다. 왔다면 그 프로젝트의 회의여야 한다.
  if (body.meetingId !== undefined) {
    if (typeof body.meetingId !== "string" || !body.meetingId) {
      return fail("meetingId must be a non-empty string");
    }
    if (!bundle.meetings.some((m) => m.id === body.meetingId)) {
      return fail("not found", 404);
    }
  }

  const data: EmailRes = { sent: bundle.members.length, via: "mock" };
  return ok(data);
}
