// Server-only. Do not import from client components.
import type { FinalReport, Meeting, ReportSection } from "@/lib/types";
import { askJson, str } from "./client";

const SECTION_TITLES = [
  "프로젝트 개요",
  "프로젝트 목표",
  "주차별 활동",
  "주요 의사결정",
  "역할 및 Action Item",
  "문제 및 해결 과정",
  "주요 성과",
  "최종 결과",
] as const;

const MAX_BODY_LEN = 4000;

type MeetingInput = {
  number: number;
  date: string;
  agendaTitle: string;
  summary: Meeting["summary"];
};

function buildFallbackSections(input: {
  projectName: string;
  projectGoal: string;
  deadline: string;
  meetings: MeetingInput[];
}): Record<string, string> {
  const { projectName, projectGoal, deadline, meetings } = input;

  const overview = `${projectName} 프로젝트는 ${deadline}을 마감으로 총 ${meetings.length}회의 회의를 진행했다.`;

  const goal = projectGoal;

  const weeklyActivities =
    meetings.length > 0
      ? meetings
          .map((m) => {
            const summaryText = m.summary?.summary ?? "";
            const trimmed = summaryText.slice(0, 120);
            return `${m.number}회차 (${m.date}): ${trimmed}`;
          })
          .join("\n")
      : "기록된 항목 없음";

  const allDecisions = meetings.flatMap((m) => m.summary?.decisions ?? []);
  const decisions = allDecisions.length > 0 ? allDecisions.join("\n") : "기록된 항목 없음";

  const allActionItems = meetings.flatMap((m) => m.summary?.actionItems ?? []);
  const roles =
    allActionItems.length > 0
      ? allActionItems.map((a) => `${a.assignee ?? "미정"} — ${a.task}`).join("\n")
      : "기록된 항목 없음";

  const allBlockers = meetings.flatMap((m) => m.summary?.blockers ?? []);
  const problems = allBlockers.length > 0 ? allBlockers.join("\n") : "기록된 문제 없음";

  const achievements = "회의 기록을 바탕으로 직접 작성해 주세요.";
  const finalResult = "회의 기록을 바탕으로 직접 작성해 주세요.";

  return {
    "프로젝트 개요": overview,
    "프로젝트 목표": goal,
    "주차별 활동": weeklyActivities,
    "주요 의사결정": decisions,
    "역할 및 Action Item": roles,
    "문제 및 해결 과정": problems,
    "주요 성과": achievements,
    "최종 결과": finalResult,
  };
}

function validate(
  v: unknown,
  fallbackByTitle: Record<string, string>
): { sections: ReportSection[] } | null {
  if (typeof v !== "object" || v === null) return null;
  const obj = v as Record<string, unknown>;
  if (!Array.isArray(obj.sections)) return null;

  const bodyByTitle = new Map<string, string>();
  for (const item of obj.sections) {
    if (typeof item !== "object" || item === null) continue;
    const sec = item as Record<string, unknown>;
    if (typeof sec.title !== "string") continue;
    const body = str(sec.body, MAX_BODY_LEN);
    if (body) bodyByTitle.set(sec.title, body);
  }

  const sections: ReportSection[] = SECTION_TITLES.map((title) => {
    const body = bodyByTitle.get(title) || fallbackByTitle[title];
    return { title, body };
  });

  return { sections };
}

export async function generateFinalReport(input: {
  projectId: string;
  projectName: string;
  projectGoal: string;
  deadline: string;
  meetings: Meeting[];
}): Promise<FinalReport> {
  const meetingInputs: MeetingInput[] = input.meetings.map((m) => ({
    number: m.number,
    date: m.slot.date,
    agendaTitle: m.agenda?.title ?? "",
    summary: m.summary,
  }));

  const fallbackByTitle = buildFallbackSections({
    projectName: input.projectName,
    projectGoal: input.projectGoal,
    deadline: input.deadline,
    meetings: meetingInputs,
  });

  const fallback: { sections: ReportSection[] } = {
    sections: SECTION_TITLES.map((title) => ({ title, body: fallbackByTitle[title] })),
  };

  const system =
    "너는 팀 프로젝트의 최종 활동 보고서를 쓰는 작성자다. 회의 기록에 있는 사실만 쓴다.";

  const user = `프로젝트명: ${input.projectName}
프로젝트 목표: ${input.projectGoal}
마감일: ${input.deadline}

회의 기록:
${JSON.stringify(meetingInputs, null, 2)}

다음 JSON 형식으로만 출력한다:
{
  "sections": [
    { "title": "프로젝트 개요", "body": "..." },
    { "title": "프로젝트 목표", "body": "..." },
    { "title": "주차별 활동", "body": "..." },
    { "title": "주요 의사결정", "body": "..." },
    { "title": "역할 및 Action Item", "body": "..." },
    { "title": "문제 및 해결 과정", "body": "..." },
    { "title": "주요 성과", "body": "..." },
    { "title": "최종 결과", "body": "..." }
  ]
}
정확히 이 8개 제목을 이 순서대로 사용한다. body는 3~8문장 또는 줄 목록으로 쓴다.
회의 기록에 없는 성과·수치는 절대 지어내지 않는다.`;

  const { data } = await askJson<{ sections: ReportSection[] }>({
    system,
    user,
    maxTokens: 4000,
    validate: (v) => validate(v, fallbackByTitle),
    fallback,
  });

  return {
    projectId: input.projectId,
    sections: data.sections,
    generatedAt: new Date().toISOString(),
  };
}
