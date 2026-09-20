"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button, buttonClass } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { ProjectBundle } from "@/lib/types";

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    const result = await api.generateReport(id);

    if (result.ok) {
      setBundle((prev) => {
        if (!prev) return prev;
        return { ...prev, report: result.data.report };
      });
    } else {
      setError(result.error);
    }

    setGenerating(false);
  };

  const handlePrint = () => {
    window.print();
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

  const { project, meetings, report } = bundle;
  const doneCount = meetings.filter((m) => m.status === "done").length;

  // 보고서가 없을 때
  if (!report) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {generating && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
            Claude가 전체 회의 기록을 정리하는 중…
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>최종 보고서</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              프로젝트를 종료하고 보고서를 만듭니다.
            </p>
            <p className="text-sm text-gray-600">
              완료된 회의: {doneCount}개
            </p>
            {doneCount === 0 ? (
              <div className="space-y-2">
                <Button disabled>최종 보고서 생성</Button>
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                  완료된 회의가 없어 보고서를 만들 수 없습니다.
                </p>
              </div>
            ) : (
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? "생성하는 중…" : "최종 보고서 생성"}
              </Button>
            )}
            <Link href={`/projects/${id}`} className={buttonClass("outline")}>
              대시보드로
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 보고서가 있을 때
  const generatedAt = new Date(report.generatedAt);
  const formattedDate = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "medium",
  }).format(generatedAt);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{project.name} 최종 활동 보고서</CardTitle>
          <p className="text-sm text-gray-500 mt-2">생성 시각: {formattedDate}</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              인쇄
            </Button>
            <Link href={`/projects/${id}`} className={buttonClass("outline")}>
              대시보드로
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 섹션들 */}
      {report.sections.map((section, index) => (
        <Card key={index}>
          <CardHeader>
            <h2 className="text-2xl font-bold">{section.title}</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {section.body}
            </p>
          </CardContent>
        </Card>
      ))}

      {/* 하단 버튼 */}
      <div className="flex justify-center gap-2 py-4">
        <Button variant="outline" onClick={handlePrint}>
          인쇄
        </Button>
        <Link href={`/projects/${id}`} className={buttonClass("outline")}>
          대시보드로
        </Link>
      </div>
    </div>
  );
}
