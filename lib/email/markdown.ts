// 메일에 첨부할 마크다운 문서를 만든다. 서버·클라이언트 어디서든 쓸 수 있는 순수 함수.
import type { Meeting, Project } from "@/lib/types";

/** 회의 한 건의 회의록·요약을 마크다운으로. */
export function meetingSummaryMarkdown(project: Project, meeting: Meeting): string {
  const s = meeting.summary;
  const slot = meeting.slot;
  const lines: string[] = [];

  lines.push(`# ${project.name} — ${meeting.number}회차 회의록`);
  lines.push("");
  lines.push(`- 일시: ${slot.date} ${slot.start}~${slot.end}`);
  lines.push(`- 참석: ${slot.availableMembers.length}/${slot.totalMembers}명`);
  lines.push(`- 프로젝트 마감: ${project.deadline}`);
  if (meeting.agenda) {
    lines.push("");
    lines.push(`## 안건 — ${meeting.agenda.title}`);
    for (const item of meeting.agenda.agendaItems) lines.push(`1. ${item}`);
  }

  if (s) {
    lines.push("");
    lines.push("## 요약");
    lines.push(s.summary);

    lines.push("");
    lines.push("## 결정 사항");
    if (s.decisions.length === 0) lines.push("- 기록된 항목 없음");
    for (const d of s.decisions) lines.push(`- ${d}`);

    lines.push("");
    lines.push("## Action Item");
    if (s.actionItems.length === 0) {
      lines.push("- 기록된 항목 없음");
    } else {
      lines.push("| 담당 | 할 일 | 기한 |");
      lines.push("| --- | --- | --- |");
      for (const a of s.actionItems) {
        lines.push(`| ${a.assignee ?? "미정"} | ${a.task} | ${a.dueDate ?? "-"} |`);
      }
    }

    lines.push("");
    lines.push("## 막힌 것");
    if (s.blockers.length === 0) lines.push("- 기록된 항목 없음");
    for (const b of s.blockers) lines.push(`- ${b}`);

    lines.push("");
    lines.push("## 다음 회의 안건");
    if (s.nextAgenda.length === 0) lines.push("- 기록된 항목 없음");
    for (const n of s.nextAgenda) lines.push(`1. ${n}`);
  }

  if (meeting.rawNotes) {
    lines.push("");
    lines.push("## 회의록 원문");
    lines.push("");
    lines.push("```");
    lines.push(meeting.rawNotes);
    lines.push("```");
  }

  lines.push("");
  lines.push(`_맞춤이 정리했습니다._`);
  return lines.join("\n");
}
