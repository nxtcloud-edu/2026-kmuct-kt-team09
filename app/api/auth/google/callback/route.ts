// GET /api/auth/google/callback?code=&state= — Google 동의 후 리다이렉트 지점.
// 토큰 교환·저장 후 초대 페이지로 돌려보낸다. token·secret 값은 응답·로그에 담지 않는다.
import { fail } from "@/lib/http";
import { getMemberByToken, setCalendarConnected } from "@/lib/store";
import { decodeState, oauthClient } from "@/lib/google/oauth";
import { saveTokens, type StoredTokens } from "@/lib/google/tokens";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const state = stateParam ? decodeState(stateParam) : null;
  if (!code || !state) {
    return fail("OAuth state 오류", 400);
  }

  const { projectId, memberId, token } = state;
  const member = await getMemberByToken(projectId, token);
  if (!member || member.id !== memberId) {
    return fail("초대 링크가 올바르지 않습니다", 403);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const joinBase = `${appUrl}/join/${encodeURIComponent(projectId)}?token=${encodeURIComponent(token)}`;

  try {
    const { tokens } = await oauthClient().getToken(code);
    if (!tokens.access_token) {
      throw new Error("Google이 access_token을 돌려주지 않았습니다");
    }

    const stored: StoredTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date: tokens.expiry_date ?? null,
      scope: tokens.scope,
    };
    await saveTokens(memberId, stored);
    await setCalendarConnected(memberId, true);

    return Response.redirect(`${joinBase}&connected=1`, 302);
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    const errParam = encodeURIComponent(message.slice(0, 80));
    return Response.redirect(`${joinBase}&connected=0&error=${errParam}`, 302);
  }
}
