"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { RoleSuggestion } from "@/lib/types";

export function RoleSplit({ projectId, memberCount }: { projectId: string; memberCount: number }) {
  const [roles, setRoles] = useState<RoleSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    const result = await api.suggestRoles(projectId);
    if (result.ok) {
      setRoles(result.data.roles);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>역할 나누기</CardTitle>
        <CardDescription className="mt-2">
          프로젝트 목표와 팀원 {memberCount}명에 맞춰 역할을 나눕니다. 누가 맡을지는 첫 회의에서 정하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={run} disabled={loading}>
            {loading ? "나누는 중…" : roles ? "다시 나누기" : "역할 나눠 보기"}
          </Button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>

        {roles && (
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((r, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500">역할 {i + 1}</p>
                <p className="font-semibold mt-1">{r.title}</p>
                <p className="text-sm text-gray-600 mt-1">{r.scope}</p>
                {r.firstTask && (
                  <p className="text-sm mt-2">
                    <span className="text-gray-500">먼저 할 일</span> — {r.firstTask}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {roles && (
          <p className="text-sm text-gray-500">
            아직 아무에게도 배정하지 않았습니다. 1회차 회의 안건에 &quot;역할과 담당 나누기&quot;가 들어갑니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
