// GET /api/cron/remind — Vercel Cron, 하루 1회. 내일 회의 리마인더 발송.
// 인증: Vercel이 CRON_SECRET 환경변수가 있으면 Authorization: Bearer ${CRON_SECRET}를 자동으로 붙인다.
import { fail, ok } from "@/lib/http";
import { addDays } from "@/lib/time";
import { listActiveBundles, updateMeeting } from "@/lib/store";
import { sendTeamEmail } from "@/lib/email/send";
import { reminderMail } from "@/lib/email/templates";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayKST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return fail("unauthorized", 401);
  }

  const dateParam = new URL(req.url).searchParams.get("date");
  let targetDate: string;
  if (dateParam) {
    if (!DATE_RE.test(dateParam)) return fail("date must be YYYY-MM-DD", 400);
    targetDate = dateParam;
  } else {
    targetDate = addDays(todayKST(), 1);
  }

  const bundles = await listActiveBundles();
  let checked = 0;
  let meetingsCount = 0;
  let sent = 0;

  for (const bundle of bundles) {
    checked += 1;
    const leader = bundle.members.find((m) => m.role === "leader");
    if (!leader) continue;

    const targets = bundle.meetings.filter(
      (m) => m.status === "scheduled" && m.slot.date === targetDate && m.reminderSentAt === null
    );

    for (const meeting of targets) {
      meetingsCount += 1;
      let anyOk = false;

      for (let i = 0; i < bundle.members.length; i++) {
        const member = bundle.members[i];
        const mail = reminderMail(bundle.project, member, meeting);
        const result = await sendTeamEmail({
          leaderMemberId: leader.id,
          recipients: [member.email],
          subject: mail.subject,
          html: mail.html,
        });

        if (i === 0 && result.error === "NOT_CONNECTED") {
          anyOk = false;
          break;
        }

        if (result.ok) {
          anyOk = true;
          sent += 1;
        }
      }

      if (anyOk) {
        await updateMeeting(meeting.id, { reminderSentAt: new Date().toISOString() });
      }
    }
  }

  return ok({ checked, meetings: meetingsCount, sent });
}
