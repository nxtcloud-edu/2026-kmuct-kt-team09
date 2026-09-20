// 프로젝트 목표와 팀원 수를 보고 역할을 나눈다. 사람에게 배정하지는 않는다.
// 서버 전용 — client component에서 import하지 않는다.
import { askJson, str } from "./client";
import type { RoleSuggestion } from "@/lib/types";

function fallbackRoles(memberCount: number): RoleSuggestion[] {
  const base: RoleSuggestion[] = [
    { title: "기획·문서", scope: "요구사항 정리와 산출물 문서", firstTask: "요구사항 초안 쓰기" },
    { title: "구현", scope: "핵심 기능 개발", firstTask: "기능 목록 나누기" },
    { title: "설계·디자인", scope: "화면 구성과 사용자 흐름", firstTask: "화면 목록 그리기" },
    { title: "조사·발표", scope: "사례 조사와 발표 자료", firstTask: "비슷한 사례 3개 찾기" },
    { title: "일정·품질", scope: "진행 점검과 마무리 검수", firstTask: "마감 역산 일정 짜기" },
    { title: "데이터·검증", scope: "자료 수집과 결과 확인", firstTask: "필요한 자료 목록 만들기" },
  ];
  return base.slice(0, Math.max(2, Math.min(memberCount, base.length)));
}

export async function suggestRoles(input: {
  projectGoal: string;
  projectName: string;
  deadline: string;
  memberCount: number;
  expectedMeetingCount: number;
}): Promise<{ roles: RoleSuggestion[]; source: "claude" | "fallback" }> {
  const count = Math.max(2, Math.min(input.memberCount, 8));

  const system =
    "너는 대학생 팀 프로젝트의 역할을 나누는 사람이다. " +
    "특정 사람에게 배정하지 않고 역할 자체만 나눈다. " +
    "입력에 없는 기술·도구·사람 이름을 지어내지 않는다.";

  const user =
    JSON.stringify({
      프로젝트: input.projectName,
      목표: input.projectGoal,
      마감: input.deadline,
      팀원수: count,
      예상회의횟수: input.expectedMeetingCount,
    }) +
    `\n규칙: roles를 정확히 ${count}개 만든다. ` +
    "각 역할은 title(12자 이내 역할 이름), scope(그 역할이 맡는 범위 한 줄, 40자 이내), " +
    "firstTask(1회차 회의 직후 바로 시작할 수 있는 일 한 줄, 40자 이내). " +
    "역할끼리 하는 일이 겹치지 않게 나눈다. 목표에 맞는 이름을 쓴다(개발 과제가 아니면 프론트·백엔드 같은 말을 쓰지 않는다). " +
    '{"roles":[{"title":"","scope":"","firstTask":""}]} 형태로만 출력한다.';

  const validate = (v: unknown): RoleSuggestion[] | null => {
    const raw = (v as { roles?: unknown })?.roles;
    if (!Array.isArray(raw)) return null;
    const roles = raw
      .map((r) => {
        const o = r as Record<string, unknown>;
        return {
          title: str(o.title, 24),
          scope: str(o.scope, 80),
          firstTask: str(o.firstTask, 80),
        };
      })
      .filter((r) => r.title.length > 0)
      .slice(0, count);
    return roles.length >= 2 ? roles : null;
  };

  const result = await askJson<RoleSuggestion[]>({
    system,
    user,
    maxTokens: 900,
    validate,
    fallback: fallbackRoles(count),
  });
  return { roles: result.data, source: result.source };
}
