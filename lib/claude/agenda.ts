// Server-only. Do not import from client components.
import type { Agenda, MeetingSummary } from "@/lib/types";
import { askJson, str, strArr } from "./client";

export async function generateMeetingAgenda(input: {
  projectGoal: string;
  deadline: string;
  meetingNumber: number;
  previousMeetingSummary: MeetingSummary | null;
  remainingMeetingCount: number;
  meetingDate: string;
}): Promise<Agenda> {
  const isFirstMeeting = input.meetingNumber <= 1;
  const isLastMeeting = input.remainingMeetingCount <= 1;

  const system = "너는 대학생 팀프로젝트의 회의 안건을 짜는 진행자다. 입력에 없는 기술·수치·사람 이름을 지어내지 않는다.";

  let userPrompt = JSON.stringify(input, null, 2);
  userPrompt += "\n\n규칙:\n";
  userPrompt += "- title: 30자 이내 한 줄\n";
  userPrompt += "- objectives: 2~3개 배열\n";
  userPrompt += "- agendaItems: 3~5개 배열(각 40자 이내, 회의에서 바로 다룰 수 있는 행동형)\n";

  if (input.previousMeetingSummary) {
    userPrompt += "- 이전 회의 요약의 nextAgenda·미완 actionItems를 먼저 반영\n";
  }

  if (isFirstMeeting) {
    userPrompt += "- 첫 회의이므로 주제 확정·역할 분담·일정 합의를 포함\n";
  }

  if (isLastMeeting) {
    userPrompt += "- 남은 회의 수가 1이므로 마무리·점검 중심\n";
  }

  const validate = (v: unknown): Agenda | null => {
    if (typeof v !== "object" || v === null) return null;
    const obj = v as Record<string, unknown>;

    const title = str(obj.title, 60);
    const objectives = strArr(obj.objectives, 3, 80);
    const agendaItems = strArr(obj.agendaItems, 5, 80);

    if (!title || agendaItems.length === 0) return null;

    return { title, objectives, agendaItems };
  };

  let fallback: Agenda;

  if (isFirstMeeting) {
    fallback = {
      title: "1회차: 주제 확정과 역할 분담",
      objectives: ["프로젝트 목표 합의", "역할 분담"],
      agendaItems: [
        "프로젝트 목표와 산출물 확인",
        "역할과 담당 나누기",
        "다음 회의까지 할 일 정하기",
      ],
    };
  } else {
    const items =
      input.previousMeetingSummary?.nextAgenda && input.previousMeetingSummary.nextAgenda.length > 0
        ? input.previousMeetingSummary.nextAgenda
        : ["지난 회의 Action Item 점검", "남은 일정 확인", "다음 할 일 정하기"];

    fallback = {
      title: `${input.meetingNumber}회차 회의`,
      objectives: ["지난 회의 후속 점검", "다음 할 일 확정"],
      agendaItems: items.slice(0, 5).map((x) => x.slice(0, 80)),
    };
  }

  const result = await askJson({
    system,
    user: userPrompt,
    maxTokens: 1000,
    validate,
    fallback,
  });

  return result.data;
}
