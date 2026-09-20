import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TimeSlot, Member } from "@/lib/types";

interface SlotCardProps {
  slot: TimeSlot;
  members: Member[];
  rank: number;
  onSelect: (slot: TimeSlot) => void;
  disabled: boolean;
}

export function SlotCard({ slot, members, rank, onSelect, disabled }: SlotCardProps) {
  const { date, start, end, availableMembers, unavailableMembers, totalMembers, attendanceRate, isPreferredTime } = slot;

  // 요일 계산 (UTC 기준)
  const [y, m, d] = date.split("-").map(Number);
  const weekday = "일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

  // 참석률 퍼센트
  const attendancePercent = Math.round(attendanceRate * 100);

  // 불참 예상 멤버 이름
  const unavailableNames = unavailableMembers
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="relative">
      <div className="absolute top-3 left-3 bg-black text-white text-xs font-semibold px-2 py-1 rounded">
        추천 {rank}
      </div>
      <CardContent className="pt-12 pb-6 space-y-4">
        {/* 날짜와 시간 */}
        <div className="space-y-1">
          <p className="text-lg font-semibold">
            {date} ({weekday})
          </p>
          <p className="text-2xl font-bold text-black">
            {start} ~ {end}
          </p>
        </div>

        {/* 참석 정보 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">참석 가능</span>
            <span className="font-medium">
              {availableMembers.length}명 / {totalMembers}명
            </span>
          </div>

          {/* 참석률 진행 막대 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">참석률</span>
              <Badge variant={attendancePercent === 100 ? "success" : "warning"}>
                {attendancePercent}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  attendancePercent === 100 ? "bg-green-500" : "bg-yellow-500"
                }`}
                style={{ width: `${attendancePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 선호 시간 여부 */}
        <div>
          <Badge variant={isPreferredTime ? "success" : "muted"}>
            {isPreferredTime ? "선호 시간" : "선호 시간 아님"}
          </Badge>
        </div>

        {/* 불참 예상 */}
        {unavailableNames && (
          <p className="text-sm text-gray-500">
            불참 예상: {unavailableNames}
          </p>
        )}

        {/* 확정 버튼 */}
        <Button
          className="w-full"
          onClick={() => onSelect(slot)}
          disabled={disabled}
        >
          이 시간으로 확정
        </Button>
      </CardContent>
    </Card>
  );
}
