"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { ProjectBundle } from "@/lib/types";

export default function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const searchParamsValue = use(searchParams);

  const token = typeof searchParamsValue.token === "string" ? searchParamsValue.token : "";
  const connected = typeof searchParamsValue.connected === "string" ? searchParamsValue.connected : "";
  const error = typeof searchParamsValue.error === "string" ? searchParamsValue.error : "";

  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setLoadError(null);
      const result = await api.getProject(id);
      if (!alive) return;

      if (result.ok) {
        setBundle(result.data);
      } else {
        setLoadError(result.error);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            불러오는 중…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !bundle) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">프로젝트를 찾을 수 없습니다.</p>
            {loadError && <p className="text-sm text-gray-500 mt-2">{loadError}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, members } = bundle;
  const member = members.find((m) => m.inviteToken === token);

  if (!member) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">초대 링크가 올바르지 않습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConnected = member.calendarConnected || connected === "1" || connected === "mock";

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {member.name}님, &quot;{project.name}&quot; 팀에 초대되었습니다
          </CardTitle>
          <CardDescription className="space-y-2 mt-3">
            <p>{project.goal}</p>
            <p className="text-sm">
              <strong>마감:</strong> {project.deadline}
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
            💡 일정 제목은 읽지 않고 바쁜 시간(Free/Busy)만 확인합니다.
          </p>

          {isConnected ? (
            <div className="space-y-3">
              <Badge variant="success">Google Calendar 연결됨</Badge>
              <p className="text-gray-700">
                이제 창을 닫아도 됩니다. 회의 일정이 정해지면 메일로 알려드립니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <a
                href={`/api/auth/google?projectId=${id}&memberId=${member.id}&token=${token}`}
                className={buttonClass("default", "lg")}
              >
                Google Calendar 연결하기
              </a>
              {error && (
                <p className="text-sm text-red-600">
                  연결 실패: {error}
                </p>
              )}
            </div>
          )}

          {member.role === "leader" && (
            <div className="pt-4 border-t border-gray-200">
              <Link href={`/projects/${id}`} className={buttonClass("outline")}>
                팀 대시보드로
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
