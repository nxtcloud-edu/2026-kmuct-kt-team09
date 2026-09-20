"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonClass } from "@/components/ui/button";
import { SlotCard } from "@/components/slot-card";
import { api } from "@/lib/api-client";
import type { ProjectBundle, TimeSlot } from "@/lib/types";

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [reloadKey, setReloadKey] = useState(0);
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [shownIds, setShownIds] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [reason, setReason] = useState<string | null>(null);
  const [usedMore, setUsedMore] = useState(false);
  const [initialEmpty, setInitialEmpty] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmStep, setConfirmStep] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      // 프로젝트 불러오기
      const bundleResult = await api.getProject(id);
      if (!alive) return;

      if (!bundleResult.ok) {
        setError(bundleResult.error);
        setLoading(false);
        return;
      }

      setBundle(bundleResult.data);

      // 추천 받기 - reloadKey가 변경될 때마다 현재 shownIds 상태를 사용
      setShownIds((currentShownIds) => {
        (async () => {
          const recommendResult = await api.recommend({
            projectId: id,
            excludedSlotIds: currentShownIds,
          });

          if (!alive) return;

          if (!recommendResult.ok) {
            setError(recommendResult.error);
            setLoading(false);
            return;
          }

          const { slots: newSlots, remaining: newRemaining, reason: newReason } = recommendResult.data;

          if (currentShownIds.length === 0 && newSlots.length === 0) {
            setInitialEmpty(true);
          }

          setSlots(newSlots);
          setRemaining(newRemaining);
          setReason(newReason || null);

          if (newSlots.length > 0) {
            setShownIds((prev) => [...prev, ...newSlots.map((s) => s.id)]);
          }

          setLoading(false);
        })();

        return currentShownIds;
      });
    })();

    return () => {
      alive = false;
    };
  }, [id, reloadKey]);

  const handleMoreOptions = async () => {
    setLoading(true);
    setError(null);
    setUsedMore(true);

    const result = await api.recommend({
      projectId: id,
      excludedSlotIds: shownIds,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const { slots: newSlots, remaining: newRemaining, reason: newReason } = result.data;

    if (newSlots.length > 0) {
      setSlots(newSlots);
      setShownIds((prev) => [...prev, ...newSlots.map((s) => s.id)]);
    }

    setRemaining(newRemaining);
    setReason(newReason || null);
    setLoading(false);
  };

  const handleReset = () => {
    setShownIds([]);
    setUsedMore(false);
    setReloadKey((k) => k + 1);
  };

  const handleConfirm = async (slot: TimeSlot) => {
    setConfirming(true);
    setError(null);

    // ① 일정 확정
    setConfirmStep("일정 확정 중…");
    const confirmResult = await api.confirm({ projectId: id, slot });

    if (!confirmResult.ok) {
      setError(confirmResult.error);
      setConfirming(false);
      setConfirmStep("");
      return;
    }

    const { meeting } = confirmResult.data;

    // ② 안건 생성
    setConfirmStep("Claude가 안건을 만드는 중…");
    await api.agenda({ projectId: id, meetingId: meeting.id });

    // ③ 메일 발송
    setConfirmStep("팀원에게 메일 보내는 중…");
    await api.sendEmail({ projectId: id, kind: "MEETING_CONFIRMED", meetingId: meeting.id });

    // 완료 - 회의 페이지로
    router.push(`/projects/${id}/meetings/${meeting.id}`);
  };

  if (loading && !bundle) {
    return (
      <div className="max-w-6xl mx-auto">
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
      <div className="max-w-6xl mx-auto">
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

  const { members, meetings } = bundle;
  const nextMeetingNumber = meetings.length + 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <CardTitle>{nextMeetingNumber}회차 회의 일정 추천</CardTitle>
          <CardDescription>
            가까운 날짜 → 참석률 → 선호 시간 순으로 계산했습니다. 시간 계산에는 AI를 쓰지 않습니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 에러 배너 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 확정 중 */}
      {confirming && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
          {confirmStep}
        </div>
      )}

      {/* 처음부터 0개 */}
      {initialEmpty ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-gray-700 font-medium">추천할 시간이 없습니다.</p>
            {reason && <p className="text-sm text-gray-500">{reason}</p>}
            <Link href={`/projects/${id}`} className={buttonClass("outline")}>
              대시보드로
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 슬롯 카드 */}
          {slots.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slots.map((slot, index) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  members={members}
                  rank={index + 1}
                  onSelect={handleConfirm}
                  disabled={confirming || loading}
                />
              ))}
            </div>
          )}

          {/* 하단 버튼 */}
          <Card>
            <CardContent className="py-6 space-y-4">
              <p className="text-sm text-gray-700">다른 옵션도 보시겠습니까?</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  variant="outline"
                  onClick={handleMoreOptions}
                  disabled={remaining === 0 || loading || confirming}
                >
                  다른 옵션 보기
                </Button>
                {remaining === 0 && (
                  <span className="text-sm text-gray-500">더 볼 후보가 없습니다.</span>
                )}
                {usedMore && (
                  <Button variant="ghost" onClick={handleReset} disabled={loading || confirming}>
                    처음 추천으로
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
