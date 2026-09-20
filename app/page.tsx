import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="space-y-16">
      {/* 히어로 섹션 */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-black">
          팀플 회의, 시간 맞추기부터
          <br />
          회의록 정리까지
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Google 캘린더로 팀원 일정을 자동 수집하고, Claude AI가 안건·회의록·최종 보고서를 만들어 드립니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/projects/new" className={buttonClass("default", "lg")}>
            프로젝트 만들기
          </Link>
          <Link href="/projects/demo" className={buttonClass("outline", "lg")}>
            데모 프로젝트 보기
          </Link>
        </div>
      </section>

      {/* 3칸 카드 섹션 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">① 캘린더로 시간 찾기</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              팀원들의 Google 캘린더를 연결하면 모두가 참석 가능한 시간대를 자동으로 추천해 드립니다.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">② 안건과 메일 자동 발송</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              프로젝트 목표와 회의 차수에 맞춰 AI가 안건을 생성하고, 확정된 일정을 Gmail로 발송합니다.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">③ 회의록 정리와 최종 보고서</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              회의 메모를 입력하면 결정 사항·담당별 할 일·다음 안건으로 정리하고, 프로젝트가 끝나면 최종 보고서를 생성합니다.
            </CardDescription>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
