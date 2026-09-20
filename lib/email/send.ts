// Gmail 발송. 서버 전용 — token·메일 주소를 로그에 찍지 않는다(개수만).
import { google } from "googleapis";
import { isMockGoogle } from "@/lib/mock";
import { authedClient, googleConfigured } from "@/lib/google/oauth";

export interface SendTeamEmailOpts {
  leaderMemberId: string;
  recipients: string[];
  subject: string;
  html: string;
}

export interface SendTeamEmailResult {
  ok: boolean;
  via: "gmail" | "mock";
  error?: string;
}

/** 76자마다 CRLF로 접는다. */
function wrap76(b64: string): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    lines.push(b64.slice(i, i + 76));
  }
  return lines.join("\r\n");
}

/** RFC 2822 MIME 조립. 테스트용으로 분리. From은 넣지 않는다(Gmail이 인증 계정으로 채운다). */
export function buildMime(to: string[], subject: string, html: string): string {
  const subjectB64 = Buffer.from(subject, "utf-8").toString("base64");
  const bodyB64 = wrap76(Buffer.from(html, "utf-8").toString("base64"));
  const headers = [
    `To: ${to.join(", ")}`,
    `Subject: =?UTF-8?B?${subjectB64}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
  ];
  return `${headers.join("\r\n")}\r\n\r\n${bodyB64}`;
}

/** 팀장 계정으로 멤버에게 메일 하나를 보낸다. */
export async function sendTeamEmail(opts: SendTeamEmailOpts): Promise<SendTeamEmailResult> {
  if (isMockGoogle() || !googleConfigured()) {
    return { ok: true, via: "mock" };
  }

  const client = await authedClient(opts.leaderMemberId);
  if (!client) {
    return { ok: false, via: "mock", error: "NOT_CONNECTED" };
  }

  try {
    const mime = buildMime(opts.recipients, opts.subject, opts.html);
    const raw = Buffer.from(mime, "utf-8").toString("base64url");
    const gmail = google.gmail({ version: "v1", auth: client });
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    return { ok: true, via: "gmail" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, via: "gmail", error: message.slice(0, 160) };
  }
}
