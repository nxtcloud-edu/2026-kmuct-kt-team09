import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Member } from "@/lib/types";

interface MemberListProps {
  projectId: string;
  members: Member[];
}

export function MemberList({ projectId, members }: MemberListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyInviteLink = async (member: Member, index: number) => {
    const link = `${location.origin}/join/${projectId}?token=${member.inviteToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      alert("복사 실패");
    }
  };

  return (
    <div className="space-y-3">
      {members.map((member, index) => (
        <div
          key={member.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-200 rounded-lg p-4"
        >
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{member.name}</span>
              <Badge variant={member.role === "leader" ? "default" : "muted"}>
                {member.role === "leader" ? "팀장" : "팀원"}
              </Badge>
              {member.calendarConnected ? (
                <Badge variant="success">캘린더 연결됨</Badge>
              ) : (
                <Badge variant="warning">미연결</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{member.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyInviteLink(member, index)}
          >
            {copiedIndex === index ? "복사됨!" : "초대 링크 복사"}
          </Button>
        </div>
      ))}
    </div>
  );
}
