// Google OAuth 클라이언트 생성·state 인코딩. 서버 전용 — token·secret을 로그에 찍지 않는다.
import { google } from "googleapis";
import { loadTokens, saveTokens } from "./tokens";

export type GoogleClient = InstanceType<typeof google.auth.OAuth2>;

export const SCOPES_MEMBER = ["https://www.googleapis.com/auth/calendar.freebusy"];
export const SCOPES_LEADER = [
  ...SCOPES_MEMBER,
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.send",
];

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI
  );
}

export function oauthClient(): GoogleClient {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function authUrl(state: string, leader: boolean): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    // select_account: 브라우저에 물려 있는 계정으로 자동 진입하지 않고 항상 계정 선택 화면을 띄운다
    // (학교 계정이 기본이면 access_denied가 난다)
    prompt: "select_account consent",
    include_granted_scopes: true,
    scope: leader ? SCOPES_LEADER : SCOPES_MEMBER,
    state,
  });
}

export async function authedClient(memberId: string): Promise<GoogleClient | null> {
  const tokens = await loadTokens(memberId);
  if (!tokens) return null;

  const client = oauthClient();
  client.setCredentials(tokens);
  client.on("tokens", (t) => {
    if (t.access_token) {
      void saveTokens(memberId, {
        access_token: t.access_token,
        refresh_token: t.refresh_token ?? null,
        expiry_date: t.expiry_date ?? null,
        scope: t.scope,
      });
    }
  });
  return client;
}

export interface OAuthState {
  projectId: string;
  memberId: string;
  token: string;
}

export function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

export function decodeState(s: string): OAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(s, "base64url").toString("utf-8"));
    if (
      parsed &&
      typeof parsed.projectId === "string" &&
      typeof parsed.memberId === "string" &&
      typeof parsed.token === "string"
    ) {
      return parsed as OAuthState;
    }
    return null;
  } catch {
    return null;
  }
}
