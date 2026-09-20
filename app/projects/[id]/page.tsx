"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { MemberList } from "@/components/member-list";
import { api } from "@/lib/api-client";
import type { ProjectBundle } from "@/lib/types";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [reloadKey, setReloadKey] = useState(0);
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; via: string; error?: string } | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      const result = await api.getProject(id);
      if (!alive) return;

      if (result.ok) {
        setBundle(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setReloadKey((k) => k + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleSendInvite = async () => {
    setEmailSending(true);
    setEmailResult(null);

    const result = await api.sendEmail({
      projectId: id,
      kind: "PROJECT_INVITE",
    });

    if (result.ok) {
      setEmailResult(result.data);
    } else {
      setEmailResult({ sent: 0, via: "mock", error: result.error });
    }

    setEmailSending(false);
  };

  if (loading && !bundle) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            불러오는 중…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">프로젝트를 찾을 수 없습니다.</p>
            {error && <p className="text-sm text-gray-500 mt-2">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, members, meetings } = bundle;
  const leader = members.find((m) => m.role === "leader");
  const notConnectedCount = members.filter((m) => !m.calendarConnected).length;
  const scheduledMeeting = meetings.find((m) => m.status === "scheduled");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 카드 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl">{project.name}</CardTitle>
                <CardDescription className="mt-2">{project.goal}</CardDescription>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="muted">마감 {project.deadline}</Badge>
              <Badge variant="muted">
                회의 {meetings.length}/{project.expectedMeetingCount}
              </Badge>
              {project.status === "closed" && <Badge variant="success">종료</Badge>}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 다음 행동 카드 */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle>다음 행동</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scheduledMeeting ? (
            <>
              <Link href={`/projects/${id}/schedule`} className={buttonClass("default", "lg")}>
                회의 일정 추천 받기
              </Link>
              {notConnectedCount > 0 && (
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                  ⚠️ 미연결 {notConnectedCount}명은 항상 가능한 것으로 계산됩니다.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>예정</Badge>
                  <span className="font-medium">{scheduledMeeting.number}회차 회의</span>
                </div>
                <p className="text-sm text-gray-600">
                  {scheduledMeeting.slot.date} {scheduledMeeting.slot.start}~{scheduledMeeting.slot.end}
                </p>
                {scheduledMeeting.agenda && (
                  <p className="text-sm font-medium mt-2">{scheduledMeeting.agenda.title}</p>
                )}
              </div>
              <Link
                href={`/projects/${id}/meetings/${scheduledMeeting.id}`}
                className={buttonClass("default", "lg")}
              >
                회의 페이지로
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 팀원과 캘린더 연결 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>팀원과 캘린더 연결</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {leader && !leader.calendarConnected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-yellow-800">
                ⚠️ 팀장 Google 계정을 먼저 연결하세요 — 캘린더 확인과 메일 발송에 필요합니다.
              </p>
              <a
                href={`/api/auth/google?projectId=${id}&memberId=${leader.id}&token=${leader.inviteToken}`}
                className={buttonClass()}
              >
                Google 계정 연결
              </a>
            </div>
          )}

          <MemberList projectId={id} members={members} />

          <div className="pt-2 space-y-2">
            <Button variant="outline" onClick={handleSendInvite} disabled={emailSending}>
              {emailSending ? "보내는 중…" : "초대 메일 보내기"}
            </Button>
            {emailResult && (
              <div className="text-sm">
                <p className="text-gray-600">
                  {emailResult.sent}통 ({emailResult.via})
                </p>
                {emailResult.error && (
                  <p className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-2">
                    {emailResult.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 회의 기록 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>회의 기록</CardTitle>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">아직 회의가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/projects/${id}/meetings/${meeting.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{meeting.number}회차</span>
                        <Badge variant={meeting.status === "scheduled" ? "warning" : "success"}>
                          {meeting.status === "scheduled" ? "예정" : "완료"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {meeting.slot.date} {meeting.slot.start}~{meeting.slot.end}
                      </p>
                      {meeting.agenda && (
                        <p className="text-sm text-gray-900 mt-1">{meeting.agenda.title}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최종 보고서 */}
      <div className="flex justify-center">
        <Link href={`/projects/${id}/report`} className={buttonClass("outline")}>
          최종 보고서
        </Link>
      </div>
    </div>
  );
}
