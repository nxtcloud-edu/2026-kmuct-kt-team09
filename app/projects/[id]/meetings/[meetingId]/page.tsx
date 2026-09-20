"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "@/components/voice-recorder";
import { SummaryView } from "@/components/summary-view";
import { api } from "@/lib/api-client";
import type { ProjectBundle } from "@/lib/types";

export default function MeetingPage({
  params,
}: {
  params: Promise<{ id: string; meetingId: string }>;
}) {
  const { id, meetingId } = use(params);

  const [reloadKey, setReloadKey] = useState(0);
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rawNotes, setRawNotes] = useState("");
  const [summarizing, setSummarizing] = useState(false);

  const [creatingAgenda, setCreatingAgenda] = useState(false);
  const [sendingAgendaMail, setSendingAgendaMail] = useState(false);
  const [agendaMailResult, setAgendaMailResult] = useState<{
    sent: number;
    via: string;
    error?: string;
  } | null>(null);

  const [sendingSummaryMail, setSendingSummaryMail] = useState(false);
  const [summaryMailResult, setSummaryMailResult] = useState<{
    sent: number;
    via: string;
    error?: string;
  } | null>(null);

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

  const handleCreateAgenda = async () => {
    setCreatingAgenda(true);
    setError(null);

    const result = await api.agenda({ projectId: id, meetingId });

    if (result.ok) {
      setReloadKey((k) => k + 1);
    } else {
      setError(result.error);
    }

    setCreatingAgenda(false);
  };

  const handleSendAgendaMail = async () => {
    setSendingAgendaMail(true);
    setAgendaMailResult(null);

    const result = await api.sendEmail({
      projectId: id,
      kind: "MEETING_CONFIRMED",
      meetingId,
    });

    if (result.ok) {
      setAgendaMailResult(result.data);
    } else {
      setAgendaMailResult({ sent: 0, via: "mock", error: result.error });
    }

    setSendingAgendaMail(false);
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setError(null);

    const result = await api.summarize({
      projectId: id,
      meetingId,
      rawNotes: rawNotes.trim(),
    });

    if (result.ok) {
      setRawNotes("");
      setReloadKey((k) => k + 1);
    } else {
      setError(result.error);
    }

    setSummarizing(false);
  };

  const handleSendSummaryMail = async () => {
    setSendingSummaryMail(true);
    setSummaryMailResult(null);

    const result = await api.sendEmail({
      projectId: id,
      kind: "MEETING_SUMMARY",
      meetingId,
    });

    if (result.ok) {
      setSummaryMailResult(result.data);
    } else {
      setSummaryMailResult({ sent: 0, via: "mock", error: result.error });
    }

    setSendingSummaryMail(false);
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

  if (error && !bundle) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bundle) {
    return null;
  }

  const { project, members, meetings } = bundle;
  const meeting = meetings.find((m) => m.id === meetingId);

  if (!meeting) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-700">회의를 찾을 수 없습니다.</p>
            <Link href={`/projects/${id}`} className={buttonClass("outline")}>
              대시보드로
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableNames = meeting.slot.availableMembers
    .map((memberId) => members.find((m) => m.id === memberId)?.name)
    .filter(Boolean)
    .join(", ");

  const unavailableNames = meeting.slot.unavailableMembers
    .map((memberId) => members.find((m) => m.id === memberId)?.name)
    .filter(Boolean)
    .join(", ");

  const doneCount = meetings.filter((m) => m.status === "done").length;
  const canGenerateReport = doneCount >= project.expectedMeetingCount;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 에러 배너 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 진행 중 메시지 */}
      {summarizing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
          Claude가 회의 내용을 정리하는 중…
        </div>
      )}

      {/* 구역 1: 회의 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>{meeting.number}회차 회의</CardTitle>
            <Badge variant={meeting.status === "scheduled" ? "warning" : "success"}>
              {meeting.status === "scheduled" ? "예정" : "완료"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="font-medium">일시:</span>{" "}
            <span className="text-gray-700">
              {meeting.slot.date} {meeting.slot.start}~{meeting.slot.end}
            </span>
          </div>
          {availableNames && (
            <div>
              <span className="font-medium">참석 가능:</span>{" "}
              <span className="text-gray-700">{availableNames}</span>
            </div>
          )}
          {unavailableNames && (
            <div>
              <span className="font-medium">불참 예상:</span>{" "}
              <span className="text-gray-700">{unavailableNames}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 구역 2: 예상 안건 */}
      <Card>
        <CardHeader>
          <CardTitle>예상 안건</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meeting.agenda ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{meeting.agenda.title}</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">목표:</span>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {meeting.agenda.objectives.map((obj, index) => (
                        <li key={index} className="text-gray-700">
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium">세부 항목:</span>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      {meeting.agenda.agendaItems.map((item, index) => (
                        <li key={index} className="text-gray-700">
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSendAgendaMail}
                  disabled={sendingAgendaMail}
                >
                  {sendingAgendaMail ? "보내는 중…" : "안건 메일 다시 보내기"}
                </Button>
              </div>
              {agendaMailResult && (
                <div className="text-sm">
                  <p className="text-gray-600">
                    {agendaMailResult.sent}통 ({agendaMailResult.via})
                  </p>
                  {agendaMailResult.error && (
                    <p className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-2">
                      {agendaMailResult.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-500">안건이 아직 생성되지 않았습니다.</p>
              <Button variant="outline" onClick={handleCreateAgenda} disabled={creatingAgenda}>
                {creatingAgenda ? "만드는 중…" : "안건 만들기"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 구역 3: 회의록 입력 (scheduled일 때만) */}
      {meeting.status === "scheduled" && (
        <Card>
          <CardHeader>
            <CardTitle>회의록 입력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={12}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="회의하며 적은 내용을 그대로 붙여 넣으세요"
            />
            <VoiceRecorder
              onTranscript={(text) =>
                setRawNotes((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text))
              }
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{rawNotes.length}자</span>
              <Button
                onClick={handleSummarize}
                disabled={rawNotes.trim().length < 10 || summarizing}
              >
                {summarizing ? "정리하는 중…" : "회의 내용 정리하기"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 구역 4: 회의 요약 (summary가 있을 때) */}
      {meeting.summary && (
        <Card>
          <CardHeader>
            <CardTitle>회의 요약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SummaryView summary={meeting.summary} />

            <div className="pt-4 border-t border-gray-200 space-y-4">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={handleSendSummaryMail}
                  disabled={sendingSummaryMail}
                >
                  {sendingSummaryMail ? "보내는 중…" : "요약 메일 보내기"}
                </Button>
                {summaryMailResult && (
                  <div className="text-sm">
                    <p className="text-gray-600">
                      {summaryMailResult.sent}통 ({summaryMailResult.via})
                    </p>
                    {summaryMailResult.error && (
                      <p className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-2">
                        {summaryMailResult.error}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {project.status !== "closed" && (
                  <Link
                    href={`/projects/${id}/schedule`}
                    className={buttonClass("default", "lg")}
                  >
                    다음 회의 일정 추천 받기
                  </Link>
                )}
                {canGenerateReport && (
                  <Link href={`/projects/${id}/report`} className={buttonClass("default", "lg")}>
                    최종 보고서 만들기
                  </Link>
                )}
                <Link href={`/projects/${id}`} className={buttonClass("outline")}>
                  대시보드로
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
