// POST /api/email/send — 프로젝트 멤버 전원에게 메일을 보낸다.
// 팀장 Google 계정으로 Gmail API를 호출한다. MOCK_GOOGLE=true거나 미설정이면 lib/email/send.ts가 mock으로 떨어진다.
import { fail, ok, readJson } from "@/lib/http";
import { getBundle } from "@/lib/store";
import { sendTeamEmail } from "@/lib/email/send";
import type { MailAttachment } from "@/lib/email/send";
import { meetingSummaryMarkdown } from "@/lib/email/markdown";
import {
  confirmedMail,
  inviteMail,
  reminderMail,
  summaryMail,
  type BuiltMail,
} from "@/lib/email/templates";
import type { EmailKind, EmailReq, EmailRes, Meeting, Member } from "@/lib/types";

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

  const leader = bundle.members.find((m) => m.role === "leader");
  if (!leader) return fail("팀장이 없습니다", 400);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  // meetingId는 PROJECT_INVITE에는 필요 없고, 나머지 kind는 필수 + 그 프로젝트의 회의여야 한다.
  let meeting: Meeting | null = null;
  if (body.kind !== "PROJECT_INVITE") {
    if (typeof body.meetingId !== "string" || !body.meetingId) {
      return fail("meetingId must be a non-empty string");
    }
    const found = bundle.meetings.find((m) => m.id === body.meetingId);
    if (!found) return fail("not found", 404);
    meeting = found;
  }

  const next: Meeting | null =
    body.kind === "MEETING_SUMMARY" && meeting
      ? bundle.meetings.find((m) => m.number === meeting!.number + 1) ?? null
      : null;

  function buildMail(member: Member): BuiltMail {
    switch (body!.kind) {
      case "PROJECT_INVITE":
        return inviteMail(bundle!.project, member, appUrl);
      case "MEETING_CONFIRMED":
        return confirmedMail(bundle!.project, member, meeting!);
      case "MEETING_REMINDER":
        return reminderMail(bundle!.project, member, meeting!);
      case "MEETING_SUMMARY":
        return summaryMail(bundle!.project, member, meeting!, next);
    }
  }

  let sent = 0;
  let usedGmail = false;
  let firstError: string | undefined;

  // 요약 메일에는 회의록 마크다운을 첨부한다(못 온 사람이 파일로 받게).
  const attachments: MailAttachment[] =
    body.kind === "MEETING_SUMMARY" && meeting
      ? [
          {
            filename: `${meeting.number}회차_회의록.md`,
            mimeType: "text/markdown",
            content: meetingSummaryMarkdown(bundle.project, meeting),
          },
        ]
      : [];

  for (let i = 0; i < bundle.members.length; i++) {
    const member = bundle.members[i];
    const mail = buildMail(member);
    const result = await sendTeamEmail({
      leaderMemberId: leader.id,
      recipients: [member.email],
      subject: mail.subject,
      html: mail.html,
      attachments,
    });

    if (i === 0 && result.error === "NOT_CONNECTED") {
      const data: EmailRes = {
        sent: 0,
        via: "mock",
        error:
          "팀장 Google 계정이 연결되지 않아 메일을 보내지 못했습니다. 대시보드에서 'Google 계정 연결'을 누른 뒤 다시 보내세요.",
      };
      return ok(data);
    }

    if (result.ok) {
      sent += 1;
      if (result.via === "gmail") usedGmail = true;
    } else if (!firstError) {
      firstError = result.error;
    }
  }

  console.log(`[email/send] projectId=${body.projectId} kind=${body.kind} sent=${sent}/${bundle.members.length}`);

  if (bundle.members.length > 0 && sent === 0) {
    return fail(firstError ?? "발송 실패", 502);
  }

  const data: EmailRes = {
    sent,
    via: usedGmail ? "gmail" : "mock",
    ...(firstError ? { error: firstError } : {}),
  };
  return ok(data);
}
