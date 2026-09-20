import type { Project, Member, Meeting } from "../types";

export interface BuiltMail {
  subject: string;
  html: string;
}

/** HTML 특수문자 이스케이프 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 흰 배경 단순 HTML 레이아웃. title은 subject를 h2로 표시 */
function layout(title: string, bodyHtml: string): string {
  return `<div style="font-family:sans-serif;max-width:560px"><h2>${esc(title)}</h2>${bodyHtml}</div>`;
}

/** 슬롯 표기: "YYYY-MM-DD HH:MM~HH:MM" */
function when(slot: { date: string; start: string; end: string }): string {
  return `${slot.date} ${slot.start}~${slot.end}`;
}

export function inviteMail(project: Project, member: Member, appUrl: string): BuiltMail {
  const subject = `[${project.name}] 팀 프로젝트에 초대되었습니다`;
  const joinUrl = `${appUrl}/join/${project.id}?token=${member.inviteToken}`;
  const body = `
    <p>${esc(member.name)}님, "${esc(project.name)}" 팀 회의 일정을 맞추려고 합니다.</p>
    <p>목표: ${esc(project.goal)}</p>
    <p>마감: ${esc(project.deadline)}</p>
    <p><a href="${joinUrl}">Google Calendar 연결하기</a></p>
    <p>일정 제목은 읽지 않고 바쁜 시간만 확인합니다.</p>
  `;
  return { subject, html: layout(subject, body) };
}

export function confirmedMail(project: Project, member: Member, meeting: Meeting): BuiltMail {
  const slot = meeting.slot;
  const subject = `[${project.name}] ${meeting.number}회차 회의 확정 — ${when(slot)}`;

  const unavailableNotice = slot.unavailableMembers.includes(member.id)
    ? `<p>캘린더상 이 시간에 다른 일정이 있습니다. 참석이 어려우면 회의 후 정리 메일을 확인하세요.</p>`
    : "";

  const meetLinkHtml = meeting.meetLink
    ? `<p><a href="${meeting.meetLink}" style="color:#1a73e8;font-weight:bold">🔗 Google Meet 참가하기</a></p>`
    : "";

  const agenda = meeting.agenda;
  const agendaHtml = agenda
    ? `
      <p>예상 회의 안건</p>
      <p>${esc(agenda.title)}</p>
      <ul>${agenda.objectives.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
      <ol>${agenda.agendaItems.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>
    `
    : `<p>안건은 회의 전에 다시 안내합니다.</p>`;

  const body = `
    <p>일시: ${when(slot)}</p>
    <p>참석 가능 ${slot.availableMembers.length}/${slot.totalMembers}명</p>
    ${unavailableNotice}
    ${meetLinkHtml}
    ${agendaHtml}
  `;
  return { subject, html: layout(subject, body) };
}

export function reminderMail(project: Project, member: Member, meeting: Meeting): BuiltMail {
  const slot = meeting.slot;
  const subject = `[${project.name}] 내일 ${slot.start} 회의가 있습니다`;

  const meetLinkHtml = meeting.meetLink
    ? `<p><a href="${meeting.meetLink}" style="color:#1a73e8;font-weight:bold">🔗 Google Meet 참가하기</a></p>`
    : "";

  const agendaItems = meeting.agenda?.agendaItems ?? null;
  const agendaHtml = agendaItems
    ? `<ol>${agendaItems.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>`
    : `<p>안건 미정</p>`;

  const body = `
    <p>내일 ${slot.start}~${slot.end}까지 회의가 예정되어 있습니다. 예상 회의 안건은 다음과 같습니다.</p>
    ${meetLinkHtml}
    ${agendaHtml}
  `;
  return { subject, html: layout(subject, body) };
}

export function summaryMail(
  project: Project,
  member: Member,
  meeting: Meeting,
  next: Meeting | null
): BuiltMail {
  const subject = `[${project.name}] ${meeting.number}회차 회의 정리${next ? ` · 다음 회의 ${when(next.slot)}` : ""}`;

  const summary = meeting.summary;
  const summaryHtml = summary
    ? `
      <p>참석하지 못한 분도 아래 내용으로 따라오실 수 있습니다.</p>
      <p>${esc(summary.summary)}</p>
      <ul>${summary.decisions.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
      <table>
        <tbody>
          ${summary.actionItems
            .map((item) => {
              const assignee = item.assignee ?? "미정";
              const dueDate = item.dueDate ?? "-";
              const row = `<tr><td>${esc(assignee)}</td><td>${esc(item.task)}</td><td>${esc(dueDate)}</td></tr>`;
              return item.assignee === member.name ? `<tr><td><b>${esc(assignee)}</b></td><td><b>${esc(item.task)}</b></td><td><b>${esc(dueDate)}</b></td></tr>` : row;
            })
            .join("")}
        </tbody>
      </table>
      <ul>${summary.blockers.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      <ul>${summary.nextAgenda.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      ${next ? `<p>다음 회의: ${when(next.slot)}</p>` : ""}
    `
    : `<p>회의 정리가 아직 없습니다.</p>`;

  return { subject, html: layout(subject, summaryHtml) };
}
