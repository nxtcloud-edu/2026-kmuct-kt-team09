// GET /api/auth/google?projectId=&memberId=&token= — 캘린더 연결 시작.
// mock이거나 Google 설정이 없으면 바로 연결 처리, 아니면 Google 동의 화면으로 보낸다.
import { fail } from "@/lib/http";
import { isMockGoogle } from "@/lib/mock";
import { getMemberByToken, setCalendarConnected } from "@/lib/store";
import { authUrl, encodeState, googleConfigured } from "@/lib/google/oauth";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const memberId = url.searchParams.get("memberId");
  const token = url.searchParams.get("token");

  if (!projectId || !memberId || !token) {
    return fail("초대 링크가 올바르지 않습니다", 403);
  }

  const member = await getMemberByToken(projectId, token);
  if (!member || member.id !== memberId) {
    return fail("초대 링크가 올바르지 않습니다", 403);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  if (isMockGoogle() || !googleConfigured()) {
    await setCalendarConnected(memberId, true);
    const redirectUrl = `${appUrl}/join/${encodeURIComponent(projectId)}?token=${encodeURIComponent(token)}&connected=mock`;
    return Response.redirect(redirectUrl, 302);
  }

  const state = encodeState({ projectId, memberId, token });
  const target = authUrl(state, member.role === "leader");
  return Response.redirect(target, 302);
}
