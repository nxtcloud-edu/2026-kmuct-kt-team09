import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import type { Meeting, Member, Project } from "@/lib/types";

interface MeetingInfoCardProps {
  meeting: Meeting;
  members: Member[];
  project: Project;
}

export function MeetingInfoCard({ meeting, members, project }: MeetingInfoCardProps) {
  const availableNames = meeting.slot.availableMembers
    .map((memberId) => members.find((m) => m.id === memberId)?.name)
    .filter(Boolean)
    .join(", ");

  const unavailableNames = meeting.slot.unavailableMembers
    .map((memberId) => members.find((m) => m.id === memberId)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{meeting.number}회차 회의</h2>
        <Badge variant={meeting.status === "scheduled" ? "warning" : "success"}>
          {meeting.status === "scheduled" ? "예정" : "완료"}
        </Badge>
      </div>

      <div className="space-y-2">
        <div>
          <span className="font-medium">형태:</span>{" "}
          <span className="text-gray-700">
            {project.meetingType === "online" ? "온라인 (Google Meet)" : "오프라인 (직접 만남)"}
          </span>
        </div>
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
      </div>

      {project.meetingType === "online" && meeting.meetLink && (
        <div className="pt-4 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-blue-900">💻 온라인 회의</p>
            <a
              href={meeting.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("default", "lg")}
            >
              Google Meet 참가
            </a>
            <p className="text-xs text-blue-700">
              회의 시간에 위 링크를 클릭하면 자동으로 입장됩니다.
            </p>
          </div>
        </div>
      )}

      {project.meetingType === "offline" && (
        <div className="pt-4 border-t border-gray-200">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              📍 오프라인 회의 - 정해진 장소에서 만나주세요
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
