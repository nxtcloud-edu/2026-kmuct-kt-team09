// Gmail 발송. 서버 전용 — token·메일 주소를 로그에 찍지 않는다(개수만).
import { google } from "googleapis";
import { isMockGoogle } from "@/lib/mock";
import { authedClient, googleConfigured } from "@/lib/google/oauth";

export interface MailAttachment {
  /** 파일 이름. 한글이면 encoded-word로 감싼다. */
  filename: string;
  /** 예: "text/markdown" */
  mimeType: string;
  /** 본문(텍스트) */
  content: string;
}

export interface SendTeamEmailOpts {
  leaderMemberId: string;
  recipients: string[];
  subject: string;
  html: string;
  attachments?: MailAttachment[];
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

/** 헤더에 한글을 넣을 때 쓰는 RFC 2047 encoded-word. */
function encodedWord(s: string): string {
  return `=?UTF-8?B?${Buffer.from(s, "utf-8").toString("base64")}?=`;
}

/**
 * RFC 2822 MIME 조립. 테스트용으로 분리. From은 넣지 않는다(Gmail이 인증 계정으로 채운다).
 * 첨부가 없으면 기존과 똑같은 단일 파트 메일을 만든다.
 */
export function buildMime(
  to: string[],
  subject: string,
  html: string,
  attachments: MailAttachment[] = []
): string {
  const subjectHeader = `Subject: ${encodedWord(subject)}`;
  const bodyB64 = wrap76(Buffer.from(html, "utf-8").toString("base64"));

  if (attachments.length === 0) {
    const headers = [
      `To: ${to.join(", ")}`,
      subjectHeader,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
    ];
    return `${headers.join("\r\n")}\r\n\r\n${bodyB64}`;
  }

  const boundary = `teamflow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const headers = [
    `To: ${to.join(", ")}`,
    subjectHeader,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];

  const parts: string[] = [];
  parts.push(
    [
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      bodyB64,
    ].join("\r\n")
  );

  for (const a of attachments) {
    const nameHeader = /^[\x20-\x7e]+$/.test(a.filename) ? `"${a.filename}"` : encodedWord(a.filename);
    parts.push(
      [
        `--${boundary}`,
        `Content-Type: ${a.mimeType}; charset=UTF-8; name=${nameHeader}`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename=${nameHeader}`,
        ``,
        wrap76(Buffer.from(a.content, "utf-8").toString("base64")),
      ].join("\r\n")
    );
  }

  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}\r\n--${boundary}--\r\n`;
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
    const mime = buildMime(opts.recipients, opts.subject, opts.html, opts.attachments ?? []);
    const raw = Buffer.from(mime, "utf-8").toString("base64url");
    const gmail = google.gmail({ version: "v1", auth: client });
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    return { ok: true, via: "gmail" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, via: "gmail", error: message.slice(0, 160) };
  }
}
