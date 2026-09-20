"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectBundle } from "@/lib/types";

// 한국 날짜 기준 남은 일수
function daysUntil(deadline: string): number {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const [ty, tm, td] = today.split("-").map(Number);
  const [dy, dm, dd] = deadline.split("-").map(Number);
  if (!dy || !dm || !dd) return 0;
  const ms = Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td);
  return Math.round(ms / 86_400_000);
}

export function ProjectProgress({ bundle }: { bundle: ProjectBundle }) {
  const { project, members, meetings } = bundle;

  const done = meetings.filter((m) => m.status === "done");
  const total = Math.max(project.expectedMeetingCount, done.length);
  const percent = total === 0 ? 0 : Math.round((done.length / total) * 100);
  const left = daysUntil(project.deadline);

  // 가장 최근에 정리된 회의에서 넘어온 것들
  const last = [...done].sort((a, b) => b.number - a.number).find((m) => m.summary);
  const summary = last?.summary ?? null;
  const carried = summary ? summary.nextAgenda.slice(0, 3) : [];
  const blockers = summary ? summary.blockers.slice(0, 2) : [];
  const openTasks = summary ? summary.actionItems.slice(0, 4) : [];

  const notConnected = members.filter((m) => !m.calendarConnected).length;

  // 지금 이 팀이 해야 할 한 가지
  let headline: string;
  if (project.status === "closed") {
    headline = "프로젝트가 끝났습니다. 최종 보고서를 확인하세요.";
  } else if (notConnected > 0 && meetings.length === 0) {
    headline = `팀원 ${notConnected}명이 아직 캘린더를 연결하지 않았습니다. 초대 링크를 보내세요.`;
  } else if (blockers.length > 0) {
    headline = `${last?.number ?? ""}회차에서 막힌 것부터 푸세요 — ${blockers[0]}`;
  } else if (carried.length > 0) {
    headline = `다음 회의에서 "${carried[0]}"부터 다루세요.`;
  } else if (done.length === 0) {
    headline = "첫 회의 시간을 잡고 주제와 역할을 정하세요.";
  } else if (left <= 7) {
    headline = `마감까지 ${left}일. 남은 일을 줄이고 마무리에 들어가세요.`;
  } else {
    headline = "다음 회의 일정을 잡으세요.";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>진행 상황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted">
            회의 {done.length}/{total}회 완료
          </Badge>
          <Badge variant={left <= 7 ? "warning" : "muted"}>
            {left > 0 ? `마감까지 ${left}일` : left === 0 ? "오늘이 마감" : `마감 ${-left}일 지남`}
          </Badge>
          {notConnected > 0 && <Badge variant="muted">캘린더 미연결 {notConnected}명</Badge>}
        </div>

        <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
          <div className="h-full bg-black" style={{ width: `${percent}%` }} />
        </div>

        <p className="text-sm font-medium">{headline}</p>

        {openTasks.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
              {last?.number}회차에서 넘어온 할 일
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              {openTasks.map((t, i) => (
                <li key={i}>
                  <span className="font-medium">{t.assignee ?? "미정"}</span> — {t.task}
                  {t.dueDate ? ` (${t.dueDate})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {carried.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">다음 회의에서 다룰 것</p>
            <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
              {carried.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
